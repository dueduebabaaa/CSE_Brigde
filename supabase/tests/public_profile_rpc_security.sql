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
