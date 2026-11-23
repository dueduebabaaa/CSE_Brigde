-- Private, opt-in KakaoTalk contact exchange for accepted recruitment applications.
BEGIN;

-- SECURITY DEFINER ownership is intentional: postgres is the trusted migration
-- role and must be able to read PR #11 rows under RLS. Client roles cannot assume it.
CREATE SCHEMA bridge_private AUTHORIZATION postgres;
REVOKE ALL ON SCHEMA bridge_private FROM PUBLIC, anon, authenticated, service_role;

CREATE TABLE bridge_private.recruitment_contacts (
    user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    revision UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',
    kakao_id TEXT CHECK (
        pg_catalog.char_length(kakao_id) BETWEEN 1 AND 64
        AND kakao_id !~ '[[:space:][:cntrl:]]'
    ),
    consent_at TIMESTAMPTZ,
    consent_version INTEGER,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.now(),
    CHECK ((consent_at IS NULL) = (consent_version IS NULL)),
    CHECK (kakao_id IS NOT NULL OR consent_at IS NULL)
);

ALTER TABLE bridge_private.recruitment_contacts OWNER TO postgres;
ALTER TABLE bridge_private.recruitment_contacts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE bridge_private.recruitment_contacts FROM PUBLIC, anon, authenticated, service_role;

CREATE FUNCTION bridge_private.contact_caller()
RETURNS UUID
LANGUAGE plpgsql
STABLE
SET search_path = ''
AS $function$
DECLARE
    caller UUID := auth.uid();
BEGIN
    IF caller IS NULL OR auth.jwt() ->> 'is_anonymous' = 'true' THEN
        RAISE EXCEPTION USING MESSAGE = 'UNAUTHENTICATED';
    END IF;
    IF NOT public.bridge_m20261117_current_school_email_verified() THEN
        RAISE EXCEPTION USING MESSAGE = 'SCHOOL_EMAIL_REQUIRED';
    END IF;
    RETURN caller;
END;
$function$;

CREATE FUNCTION public.bridge_get_my_recruitment_contact()
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
    caller UUID := bridge_private.contact_caller();
    contact JSONB;
BEGIN
    SELECT pg_catalog.jsonb_build_object(
        'kakaoId', c.kakao_id,
        'sharingEnabled', (c.consent_at IS NOT NULL AND c.consent_version IS NOT DISTINCT FROM 1),
        'revision', c.revision
    )
    INTO contact
    FROM bridge_private.recruitment_contacts AS c
    WHERE c.user_id = caller;
    RETURN COALESCE(contact, '{"kakaoId":null,"sharingEnabled":false,"revision":"00000000-0000-0000-0000-000000000000"}'::jsonb);
END;
$function$;

CREATE FUNCTION public.bridge_save_my_recruitment_contact(p_kakao_id TEXT, p_expected_revision UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
    caller UUID := bridge_private.contact_caller();
    contact_id TEXT := pg_catalog.btrim(p_kakao_id);
BEGIN
    IF contact_id IS NULL OR pg_catalog.char_length(contact_id) NOT BETWEEN 1 AND 64
        OR contact_id ~ '[[:space:][:cntrl:]]' THEN
        RAISE EXCEPTION USING MESSAGE = 'VALIDATION_ERROR';
    END IF;

    -- Materialize the initial revision, then compare under the row update lock.
    INSERT INTO bridge_private.recruitment_contacts (user_id)
    VALUES (caller)
    ON CONFLICT (user_id) DO NOTHING;

    UPDATE bridge_private.recruitment_contacts AS c
    SET kakao_id = contact_id,
        consent_at = CASE WHEN c.kakao_id = contact_id THEN c.consent_at END,
        consent_version = CASE WHEN c.kakao_id = contact_id THEN c.consent_version END,
        revision = pg_catalog.gen_random_uuid(),
        updated_at = pg_catalog.now()
    WHERE c.user_id = caller AND c.revision = p_expected_revision;

    IF NOT FOUND THEN
        RAISE EXCEPTION USING ERRCODE = 'PT409', MESSAGE = 'CONTACT_REVISION_CONFLICT';
    END IF;
END;
$function$;

CREATE FUNCTION public.bridge_enable_my_recruitment_contact_sharing(p_expected_revision UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
    caller UUID := bridge_private.contact_caller();
BEGIN
    UPDATE bridge_private.recruitment_contacts AS c
    SET consent_at = pg_catalog.now(), consent_version = 1,
        revision = pg_catalog.gen_random_uuid(), updated_at = pg_catalog.now()
    WHERE c.user_id = caller AND c.revision = p_expected_revision AND c.kakao_id IS NOT NULL;

    IF NOT FOUND THEN
        RAISE EXCEPTION USING ERRCODE = 'PT409', MESSAGE = 'CONTACT_REVISION_CONFLICT';
    END IF;
END;
$function$;

CREATE FUNCTION public.bridge_revoke_my_recruitment_contact_sharing()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
    caller UUID := bridge_private.contact_caller();
BEGIN
    INSERT INTO bridge_private.recruitment_contacts (user_id, revision)
    VALUES (caller, pg_catalog.gen_random_uuid())
    ON CONFLICT (user_id) DO UPDATE
    SET consent_at = NULL, consent_version = NULL,
        revision = EXCLUDED.revision, updated_at = pg_catalog.now();
END;
$function$;

CREATE FUNCTION public.bridge_delete_my_recruitment_contact()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
    caller UUID := bridge_private.contact_caller();
BEGIN
    -- Keep only a revision marker so no previously loaded revision can recreate the ID.
    INSERT INTO bridge_private.recruitment_contacts (user_id, revision)
    VALUES (caller, pg_catalog.gen_random_uuid())
    ON CONFLICT (user_id) DO UPDATE
    SET kakao_id = NULL, consent_at = NULL, consent_version = NULL,
        revision = EXCLUDED.revision, updated_at = pg_catalog.now();
END;
$function$;

CREATE FUNCTION public.bridge_get_accepted_application_contact(p_application_id TEXT)
RETURNS TEXT
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
    caller UUID := bridge_private.contact_caller();
    counterpart UUID;
    contact_id TEXT;
BEGIN
    SELECT CASE WHEN r.author_id = caller THEN a.applicant_id ELSE r.author_id END
    INTO counterpart
    FROM public.applications AS a
    JOIN public.recruitments AS r ON r.id = a.recruitment_id
    WHERE a.id = p_application_id
      AND a.status = 'accepted'
      AND r.status IN ('recruiting', 'completed')
      AND a.applicant_id <> r.author_id
      AND caller IN (r.author_id, a.applicant_id);

    IF NOT FOUND THEN
        RAISE EXCEPTION USING MESSAGE = 'FORBIDDEN';
    END IF;

    SELECT theirs.kakao_id INTO contact_id
    FROM bridge_private.recruitment_contacts AS mine
    JOIN bridge_private.recruitment_contacts AS theirs ON theirs.user_id = counterpart
    WHERE mine.user_id = caller
      AND mine.consent_at IS NOT NULL AND mine.consent_version = 1
      AND theirs.consent_at IS NOT NULL AND theirs.consent_version = 1;

    RETURN contact_id;
END;
$function$;

ALTER FUNCTION bridge_private.contact_caller() OWNER TO postgres;
ALTER FUNCTION public.bridge_get_my_recruitment_contact() OWNER TO postgres;
ALTER FUNCTION public.bridge_save_my_recruitment_contact(TEXT, UUID) OWNER TO postgres;
ALTER FUNCTION public.bridge_enable_my_recruitment_contact_sharing(UUID) OWNER TO postgres;
ALTER FUNCTION public.bridge_revoke_my_recruitment_contact_sharing() OWNER TO postgres;
ALTER FUNCTION public.bridge_delete_my_recruitment_contact() OWNER TO postgres;
ALTER FUNCTION public.bridge_get_accepted_application_contact(TEXT) OWNER TO postgres;

REVOKE ALL ON FUNCTION bridge_private.contact_caller() FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION
    public.bridge_get_my_recruitment_contact(),
    public.bridge_save_my_recruitment_contact(TEXT, UUID),
    public.bridge_enable_my_recruitment_contact_sharing(UUID),
    public.bridge_revoke_my_recruitment_contact_sharing(),
    public.bridge_delete_my_recruitment_contact(),
    public.bridge_get_accepted_application_contact(TEXT)
FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION
    public.bridge_get_my_recruitment_contact(),
    public.bridge_save_my_recruitment_contact(TEXT, UUID),
    public.bridge_enable_my_recruitment_contact_sharing(UUID),
    public.bridge_revoke_my_recruitment_contact_sharing(),
    public.bridge_delete_my_recruitment_contact(),
    public.bridge_get_accepted_application_contact(TEXT)
TO authenticated;

COMMIT;
