-- Read-only catalog review after installing the migration in a test database.
-- Keep the RPC owner distinct from client roles. Table owners normally bypass
-- RLS on their own table unless FORCE ROW LEVEL SECURITY is enabled.
SELECT
    proc.oid::regprocedure AS rpc,
    owner.rolname AS function_owner,
    table_owner.rolname AS profiles_owner,
    owner.rolsuper AS owner_is_superuser,
    owner.rolbypassrls AS owner_has_bypassrls,
    pg_catalog.pg_has_role(proc.proowner, profiles.relowner, 'USAGE') AS owner_has_table_owner_privileges,
    profiles.relrowsecurity AS profiles_rls_enabled,
    profiles.relforcerowsecurity AS profiles_force_rls,
    proc.prosecdef AS security_definer,
    proc.proconfig AS function_settings,
    pg_catalog.has_function_privilege('anon', proc.oid, 'EXECUTE') AS anon_can_execute,
    pg_catalog.has_function_privilege('authenticated', proc.oid, 'EXECUTE') AS authenticated_can_execute,
    EXISTS (
        SELECT 1
        FROM pg_catalog.aclexplode(COALESCE(proc.proacl, pg_catalog.acldefault('f', proc.proowner))) AS acl
        WHERE acl.grantee = 0 AND acl.privilege_type = 'EXECUTE'
    ) AS public_can_execute
FROM pg_catalog.pg_proc AS proc
JOIN pg_catalog.pg_roles AS owner ON owner.oid = proc.proowner
JOIN pg_catalog.pg_class AS profiles ON profiles.oid = 'public.profiles'::regclass
JOIN pg_catalog.pg_roles AS table_owner ON table_owner.oid = profiles.relowner
WHERE proc.oid IN (
    pg_catalog.to_regprocedure('public.bridge_m20261119_fetch_public_profile(text)'),
    pg_catalog.to_regprocedure('public.bridge_m20261119_search_public_profiles(text,text[],text[],text[],text,text,integer,integer)'),
    pg_catalog.to_regprocedure('public.bridge_m20261117_current_school_email_verified()')
)
ORDER BY proc.oid::regprocedure::text;

SELECT policyname, permissive, roles, cmd, qual
FROM pg_catalog.pg_policies
WHERE schemaname = 'public' AND tablename = 'profiles'
ORDER BY policyname;

-- Dev/production: execute only the catalog queries above in the SQL editor.
-- Expected: both RPCs are SECURITY DEFINER with empty search_path, PUBLIC and
-- anon cannot execute, authenticated can, and profiles has owner-only RLS.
-- Record actual owners, BYPASSRLS and FORCE RLS before choosing a rollout.
-- Use an authorized school account through the app/PostgREST to verify behavior
-- against approved test profiles. The SQL editor role does not represent it.
-- Run everything below only after loading public_profile_rpc_fixture.sql
-- and the two RPC migration functions in an isolated PostgreSQL database.
BEGIN;
SET LOCAL plpgsql.check_asserts = on;
DO $$
DECLARE
    rpc regprocedure;
    info record;
BEGIN
    IF current_setting('bridge.public_profile_fixture', true) IS DISTINCT FROM 'on' THEN
        RAISE EXCEPTION 'Run behavioral checks only in the disposable fixture database';
    END IF;

    ASSERT (SELECT relrowsecurity AND NOT relforcerowsecurity
            FROM pg_catalog.pg_class WHERE oid = 'public.profiles'::regclass);
    FOREACH rpc IN ARRAY ARRAY[
        'public.bridge_m20261119_fetch_public_profile(text)'::regprocedure,
        'public.bridge_m20261119_search_public_profiles(text,text[],text[],text[],text,text,integer,integer)'::regprocedure
    ] LOOP
        SELECT p.prosecdef, p.proconfig, r.rolname, r.rolsuper, r.rolbypassrls, p.proowner, p.proacl
        INTO STRICT info
        FROM pg_catalog.pg_proc AS p
        JOIN pg_catalog.pg_roles AS r ON r.oid = p.proowner
        WHERE p.oid = rpc;
        ASSERT info.prosecdef AND info.proconfig @> ARRAY['search_path=""'];
        ASSERT info.rolname = 'bridge_fixture_owner' AND NOT info.rolsuper AND NOT info.rolbypassrls;
        ASSERT info.proowner = (SELECT relowner FROM pg_catalog.pg_class WHERE oid = 'public.profiles'::regclass);
        ASSERT NOT pg_catalog.has_function_privilege('anon', rpc, 'EXECUTE');
        ASSERT pg_catalog.has_function_privilege('authenticated', rpc, 'EXECUTE');
        ASSERT NOT EXISTS (
            SELECT 1 FROM pg_catalog.aclexplode(COALESCE(info.proacl, pg_catalog.acldefault('f', info.proowner))) AS acl
            WHERE acl.grantee = 0 AND acl.privilege_type = 'EXECUTE'
        );
    END LOOP;
END
$$;

SET LOCAL ROLE anon;
DO $$
BEGIN
    BEGIN
        PERFORM public.bridge_m20261119_search_public_profiles();
        RAISE EXCEPTION 'Anon search was allowed';
    EXCEPTION WHEN insufficient_privilege THEN NULL;
    END;
    BEGIN
        PERFORM public.bridge_m20261119_fetch_public_profile('00000000-0000-4000-8000-000000000001');
        RAISE EXCEPTION 'Anon detail was allowed';
    EXCEPTION WHEN insufficient_privilege THEN NULL;
    END;
END
$$;

SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"sub":"00000000-0000-4000-8000-000000000014","email":"unverified@knu.ac.kr"}';
DO $$
BEGIN
    BEGIN
        PERFORM public.bridge_m20261119_search_public_profiles();
        RAISE EXCEPTION 'Unverified search was allowed';
    EXCEPTION WHEN insufficient_privilege THEN
        ASSERT SQLERRM = 'SCHOOL_EMAIL_REQUIRED';
    END;
    BEGIN
        PERFORM public.bridge_m20261119_fetch_public_profile('00000000-0000-4000-8000-000000000001');
        RAISE EXCEPTION 'Unverified detail was allowed';
    EXCEPTION WHEN insufficient_privilege THEN
        ASSERT SQLERRM = 'SCHOOL_EMAIL_REQUIRED';
    END;
END
$$;

SET LOCAL request.jwt.claims = '{"sub":"00000000-0000-4000-8000-000000000013","email":"viewer@knu.ac.kr"}';
DO $$
DECLARE
    result jsonb;
    detail jsonb;
    publicly_visible text := '00000000-0000-4000-8000-000000000001';
    fixture_id text;
BEGIN
    result := public.bridge_m20261119_search_public_profiles();
    ASSERT (result->>'totalCount')::integer = 1;
    ASSERT jsonb_array_length(result->'profiles') = 1;
    ASSERT result->'profiles'->0->>'id' = publicly_visible;
    detail := public.bridge_m20261119_fetch_public_profile(publicly_visible);
    ASSERT detail->>'id' = publicly_visible;
    ASSERT NOT detail ?| ARRAY['email', 'phone', 'phone_number', 'kakao_id', 'kakao_talk_id'];
    ASSERT NOT (result->'profiles'->0) ?| ARRAY['email', 'phone', 'phone_number', 'kakao_id', 'kakao_talk_id'];
    FOR i IN 2..12 LOOP
        fixture_id := '00000000-0000-4000-8000-' || lpad(i::text, 12, '0');
        ASSERT public.bridge_m20261119_fetch_public_profile(fixture_id) IS NULL;
    END LOOP;
    ASSERT (SELECT array_agg(id::text) FROM public.profiles) = ARRAY['00000000-0000-4000-8000-000000000013'];
    ASSERT (SELECT email FROM public.profiles) = 'viewer@knu.ac.kr';
END
$$;

SET LOCAL ROLE bridge_fixture_owner;
ALTER TABLE public.profiles FORCE ROW LEVEL SECURITY;
SET LOCAL ROLE authenticated;
DO $$
BEGIN
    ASSERT (public.bridge_m20261119_search_public_profiles()->>'totalCount')::integer = 0;
    ASSERT public.bridge_m20261119_fetch_public_profile('00000000-0000-4000-8000-000000000001') IS NULL;
END
$$;
ROLLBACK;
