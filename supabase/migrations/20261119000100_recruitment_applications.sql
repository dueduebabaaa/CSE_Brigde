-- Recruitment and application storage, access policies, and safe application RPCs.
-- Table columns and status values follow docs/DATA_SCHEMA.md and src/types/index.ts.

BEGIN;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS public.recruitments (
    id TEXT PRIMARY KEY DEFAULT ('rec-' || uuid_generate_v4()),
    opportunity_id TEXT REFERENCES public.opportunities(id) ON DELETE SET NULL,
    custom_opportunity_title TEXT,
    custom_opportunity_url TEXT,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    target_member_count INT NOT NULL DEFAULT 4 CHECK (target_member_count >= 1),
    current_member_count INT NOT NULL DEFAULT 1
        CHECK (current_member_count >= 1 AND current_member_count <= target_member_count),
    roles TEXT[] NOT NULL DEFAULT '{}',
    required_tech_stacks TEXT[] NOT NULL DEFAULT '{}',
    deadline TIMESTAMPTZ,
    expected_duration TEXT NOT NULL,
    activity_type TEXT NOT NULL CHECK (activity_type IN ('online', 'offline', 'hybrid')),
    status TEXT NOT NULL DEFAULT 'recruiting'
        CHECK (status IN ('recruiting', 'completed', 'cancelled')),
    author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.applications (
    id TEXT PRIMARY KEY DEFAULT ('app-' || uuid_generate_v4()),
    recruitment_id TEXT NOT NULL REFERENCES public.recruitments(id) ON DELETE CASCADE,
    applicant_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    applied_role TEXT NOT NULL,
    message TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'accepted', 'rejected', 'cancelled')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (recruitment_id, applicant_id)
);

CREATE INDEX IF NOT EXISTS bridge_recruitments_status_created_idx
    ON public.recruitments (status, created_at DESC);
CREATE INDEX IF NOT EXISTS bridge_recruitments_author_created_idx
    ON public.recruitments (author_id, created_at DESC);
CREATE INDEX IF NOT EXISTS bridge_applications_recruitment_created_idx
    ON public.applications (recruitment_id, created_at ASC);
CREATE INDEX IF NOT EXISTS bridge_applications_applicant_created_idx
    ON public.applications (applicant_id, created_at DESC);

ALTER TABLE public.recruitments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;

DO $policies$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'recruitments'
          AND policyname = 'bridge_recruitments_verified_select'
    ) THEN
        CREATE POLICY bridge_recruitments_verified_select ON public.recruitments
            AS PERMISSIVE FOR SELECT TO authenticated
            USING (public.bridge_m20261117_current_school_email_verified());
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'recruitments'
          AND policyname = 'bridge_recruitments_owner_insert'
    ) THEN
        CREATE POLICY bridge_recruitments_owner_insert ON public.recruitments
            AS PERMISSIVE FOR INSERT TO authenticated
            WITH CHECK (
                author_id = (SELECT auth.uid())
                AND public.bridge_m20261117_current_school_email_verified()
            );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'recruitments'
          AND policyname = 'bridge_recruitments_owner_update'
    ) THEN
        CREATE POLICY bridge_recruitments_owner_update ON public.recruitments
            AS PERMISSIVE FOR UPDATE TO authenticated
            USING (
                author_id = (SELECT auth.uid())
                AND public.bridge_m20261117_current_school_email_verified()
            )
            WITH CHECK (
                author_id = (SELECT auth.uid())
                AND public.bridge_m20261117_current_school_email_verified()
            );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'recruitments'
          AND policyname = 'bridge_recruitments_owner_delete'
    ) THEN
        CREATE POLICY bridge_recruitments_owner_delete ON public.recruitments
            AS PERMISSIVE FOR DELETE TO authenticated
            USING (
                author_id = (SELECT auth.uid())
                AND public.bridge_m20261117_current_school_email_verified()
            );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'applications'
          AND policyname = 'bridge_applications_applicant_or_recruitment_author_select'
    ) THEN
        CREATE POLICY bridge_applications_applicant_or_recruitment_author_select
            ON public.applications AS PERMISSIVE FOR SELECT TO authenticated
            USING (
                public.bridge_m20261117_current_school_email_verified()
                AND (
                    applicant_id = (SELECT auth.uid())
                    OR EXISTS (
                        SELECT 1 FROM public.recruitments AS recruitment
                        WHERE recruitment.id = applications.recruitment_id
                          AND recruitment.author_id = (SELECT auth.uid())
                    )
                )
            );
    END IF;
END
$policies$;

-- Authenticated clients can read recruitments and only the application rows
-- permitted by RLS. Sensitive application writes go through the checked RPCs.
REVOKE ALL ON TABLE public.recruitments FROM anon, authenticated;
REVOKE ALL ON TABLE public.applications FROM anon, authenticated;
GRANT SELECT ON TABLE public.recruitments, public.applications TO authenticated;
GRANT INSERT (
    opportunity_id, custom_opportunity_title, custom_opportunity_url, title, content,
    target_member_count, roles, required_tech_stacks, deadline, expected_duration,
    activity_type, status, author_id
) ON TABLE public.recruitments TO authenticated;
GRANT UPDATE (
    opportunity_id, custom_opportunity_title, custom_opportunity_url, title, content,
    target_member_count, roles, required_tech_stacks, deadline, expected_duration,
    activity_type, status, updated_at
) ON TABLE public.recruitments TO authenticated;
GRANT DELETE ON TABLE public.recruitments TO authenticated;

CREATE OR REPLACE FUNCTION public.bridge_apply_to_recruitment(
    p_recruitment_id TEXT,
    p_applied_role TEXT,
    p_message TEXT
)
RETURNS public.applications
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
    v_recruitment public.recruitments%ROWTYPE;
    v_application public.applications%ROWTYPE;
    v_applicant_id UUID := auth.uid();
BEGIN
    IF v_applicant_id IS NULL THEN
        RAISE EXCEPTION USING MESSAGE = 'UNAUTHENTICATED';
    END IF;
    IF NOT public.bridge_m20261117_current_school_email_verified() THEN
        RAISE EXCEPTION USING MESSAGE = 'SCHOOL_EMAIL_REQUIRED';
    END IF;
    IF p_applied_role IS NULL OR length(btrim(p_applied_role)) = 0
       OR p_message IS NULL OR length(btrim(p_message)) = 0 THEN
        RAISE EXCEPTION USING MESSAGE = 'VALIDATION_ERROR';
    END IF;

    -- Serialize applications and acceptances for this recruitment.
    SELECT * INTO v_recruitment
    FROM public.recruitments
    WHERE id = p_recruitment_id
    FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION USING MESSAGE = 'NOT_FOUND';
    END IF;
    IF v_recruitment.author_id = v_applicant_id THEN
        RAISE EXCEPTION USING MESSAGE = 'SELF_APPLICATION';
    END IF;
    IF v_recruitment.status <> 'recruiting'
       OR (v_recruitment.deadline IS NOT NULL AND v_recruitment.deadline < now()) THEN
        RAISE EXCEPTION USING MESSAGE = 'RECRUITMENT_CLOSED';
    END IF;
    IF v_recruitment.current_member_count >= v_recruitment.target_member_count THEN
        RAISE EXCEPTION USING MESSAGE = 'RECRUITMENT_FULL';
    END IF;

    INSERT INTO public.applications (recruitment_id, applicant_id, applied_role, message)
    VALUES (p_recruitment_id, v_applicant_id, btrim(p_applied_role), btrim(p_message))
    RETURNING * INTO v_application;
    RETURN v_application;
EXCEPTION
    WHEN unique_violation THEN
        RAISE EXCEPTION USING MESSAGE = 'DUPLICATE_APPLICATION';
END;
$function$;

CREATE OR REPLACE FUNCTION public.bridge_update_application_status(
    p_application_id TEXT,
    p_status TEXT
)
RETURNS public.applications
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
    v_application public.applications%ROWTYPE;
    v_recruitment public.recruitments%ROWTYPE;
    v_recruitment_id TEXT;
    v_authorized_user UUID := auth.uid();
BEGIN
    IF v_authorized_user IS NULL THEN
        RAISE EXCEPTION USING MESSAGE = 'UNAUTHENTICATED';
    END IF;
    IF NOT public.bridge_m20261117_current_school_email_verified() THEN
        RAISE EXCEPTION USING MESSAGE = 'SCHOOL_EMAIL_REQUIRED';
    END IF;
    IF p_status IS NULL OR p_status NOT IN ('accepted', 'rejected') THEN
        RAISE EXCEPTION USING MESSAGE = 'VALIDATION_ERROR';
    END IF;

    SELECT recruitment_id INTO v_recruitment_id
    FROM public.applications
    WHERE id = p_application_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION USING MESSAGE = 'NOT_FOUND';
    END IF;

    SELECT * INTO v_recruitment
    FROM public.recruitments
    WHERE id = v_recruitment_id
    FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION USING MESSAGE = 'NOT_FOUND';
    END IF;
    IF v_recruitment.author_id <> v_authorized_user THEN
        RAISE EXCEPTION USING MESSAGE = 'FORBIDDEN';
    END IF;

    SELECT * INTO v_application
    FROM public.applications
    WHERE id = p_application_id
    FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION USING MESSAGE = 'NOT_FOUND';
    END IF;
    IF v_application.status <> 'pending' THEN
        RAISE EXCEPTION USING MESSAGE = 'APPLICATION_ALREADY_REVIEWED';
    END IF;

    IF p_status = 'accepted' THEN
        IF v_recruitment.status <> 'recruiting'
           OR (v_recruitment.deadline IS NOT NULL AND v_recruitment.deadline < now()) THEN
            RAISE EXCEPTION USING MESSAGE = 'RECRUITMENT_CLOSED';
        END IF;
        IF v_recruitment.current_member_count >= v_recruitment.target_member_count THEN
            RAISE EXCEPTION USING MESSAGE = 'RECRUITMENT_FULL';
        END IF;

        UPDATE public.recruitments
        SET current_member_count = current_member_count + 1,
            status = CASE
                WHEN current_member_count + 1 >= target_member_count THEN 'completed'
                ELSE status
            END,
            updated_at = now()
        WHERE id = v_recruitment_id;
    END IF;

    UPDATE public.applications
    SET status = p_status, updated_at = now()
    WHERE id = p_application_id
    RETURNING * INTO v_application;
    RETURN v_application;
END;
$function$;

REVOKE ALL ON FUNCTION public.bridge_apply_to_recruitment(TEXT, TEXT, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.bridge_update_application_status(TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bridge_apply_to_recruitment(TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.bridge_update_application_status(TEXT, TEXT) TO authenticated;

COMMENT ON TABLE public.recruitments IS 'BRIDGE team recruitment posts; ownership and reads are enforced by RLS.';
COMMENT ON TABLE public.applications IS 'BRIDGE recruitment applications; applicant and recruitment owner reads are enforced by RLS.';
COMMENT ON FUNCTION public.bridge_apply_to_recruitment(TEXT, TEXT, TEXT)
    IS 'Creates an application after locking and validating its recruitment.';
COMMENT ON FUNCTION public.bridge_update_application_status(TEXT, TEXT)
    IS 'Allows the recruitment owner to accept or reject a pending application atomically.';

COMMIT;
