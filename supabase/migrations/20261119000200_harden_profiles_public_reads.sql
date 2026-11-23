-- Restrict direct profile reads to the caller and expose other users only through
-- fixed-column, school-verified RPCs.
-- SECURITY DEFINER ownership is intentionally not reassigned here: repository
-- files do not establish the migration execution role. PostgreSQL assigns a
-- newly created function to the role executing CREATE FUNCTION. Confirm both
-- resulting owners and their RLS-bypass privileges in the target database
-- before release. Do not infer a role such as postgres from this migration.
BEGIN;

-- Revoke table-level SELECT before granting the columns needed for own-profile
-- CRUD. RLS below limits these direct column grants to the authenticated owner.
REVOKE SELECT ON TABLE public.profiles FROM PUBLIC, anon, authenticated;
-- Also clear any pre-existing column-level grants before restoring the owner
-- service allowlist. Table-level REVOKE does not clear column ACL entries.
DO $revoke_profile_column_select$
DECLARE
    profile_column RECORD;
BEGIN
    FOR profile_column IN
        SELECT attribute.attname
        FROM pg_catalog.pg_attribute AS attribute
        WHERE attribute.attrelid = 'public.profiles'::pg_catalog.regclass
          AND attribute.attnum > 0
          AND NOT attribute.attisdropped
    LOOP
        EXECUTE pg_catalog.format(
            'REVOKE SELECT (%I) ON TABLE public.profiles FROM PUBLIC',
            profile_column.attname
        );
        EXECUTE pg_catalog.format(
            'REVOKE SELECT (%I) ON TABLE public.profiles FROM anon',
            profile_column.attname
        );
        EXECUTE pg_catalog.format(
            'REVOKE SELECT (%I) ON TABLE public.profiles FROM authenticated',
            profile_column.attname
        );
    END LOOP;
END;
$revoke_profile_column_select$;

GRANT SELECT (
    id, email, name, nickname, grade, track, department, bio, long_bio,
    interests, tech_stacks, tech_proficiency, wanted_tech_stacks, desired_roles,
    activity_types, activity_goals, activity_mode, activity_duration,
    availability_status, experiences, github_url, portfolio_url, is_public,
    visibility, created_at, updated_at
) ON TABLE public.profiles TO authenticated;

-- Remove public row access from the base table. The restrictive policy remains
-- an AND-boundary even if another permissive SELECT policy exists.
DROP POLICY IF EXISTS bridge_m20261118_profiles_public_select ON public.profiles;
DROP POLICY IF EXISTS bridge_m20261118_profiles_school_read_guard ON public.profiles;
CREATE POLICY bridge_m20261118_profiles_school_read_guard ON public.profiles
    AS RESTRICTIVE FOR SELECT TO public
    USING (
        id = (SELECT auth.uid())
        AND public.bridge_m20261117_current_school_email_verified()
    );

-- The security_invoker view is no longer a public discovery interface. Older
-- deployments may have it while the current target database may not; revoke
-- access only when the relation exists so absence does not abort this migration.
DO $revoke_public_profiles_view$
BEGIN
    IF pg_catalog.to_regclass('public.public_profiles') IS NOT NULL THEN
        EXECUTE 'REVOKE SELECT ON TABLE public.public_profiles FROM PUBLIC, anon, authenticated';
    END IF;
END;
$revoke_public_profiles_view$;

-- Refuse collisions before defining either privileged function. CREATE FUNCTION
-- below (without OR REPLACE) also fails closed if a concurrent DDL change races
-- this check. An existing function is never adopted or overwritten implicitly.
DO $profile_rpc_collision_check$
BEGIN
    IF pg_catalog.to_regprocedure('public.bridge_m20261119_fetch_public_profile(text)') IS NOT NULL THEN
        RAISE EXCEPTION USING ERRCODE = '42723', MESSAGE =
            'Existing function collision: public.bridge_m20261119_fetch_public_profile(text)';
    END IF;
    IF pg_catalog.to_regprocedure('public.bridge_m20261119_search_public_profiles(text,text[],text[],text[],text,text,integer,integer)') IS NOT NULL THEN
        RAISE EXCEPTION USING ERRCODE = '42723', MESSAGE =
            'Existing function collision: public.bridge_m20261119_search_public_profiles(text,text[],text[],text[],text,text,integer,integer)';
    END IF;
END;
$profile_rpc_collision_check$;

CREATE FUNCTION public.bridge_m20261119_fetch_public_profile(p_user_id TEXT)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
    v_profile JSONB;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'UNAUTHENTICATED';
    END IF;
    IF NOT public.bridge_m20261117_current_school_email_verified() THEN
        RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'SCHOOL_EMAIL_REQUIRED';
    END IF;

    SELECT pg_catalog.jsonb_build_object(
        'id', p.id, 'name', p.name, 'nickname', p.nickname,
        'grade', p.grade, 'track', p.track, 'department', p.department,
        'bio', p.bio, 'long_bio', p.long_bio, 'interests', p.interests,
        'tech_stacks', p.tech_stacks, 'tech_proficiency', p.tech_proficiency,
        'wanted_tech_stacks', p.wanted_tech_stacks, 'desired_roles', p.desired_roles,
        'activity_types', p.activity_types, 'activity_goals', p.activity_goals,
        'activity_mode', p.activity_mode, 'activity_duration', p.activity_duration,
        'availability_status', p.availability_status, 'experiences', p.experiences,
        'github_url', p.github_url, 'portfolio_url', p.portfolio_url,
        'is_public', p.is_public, 'visibility', p.visibility,
        'created_at', p.created_at, 'updated_at', p.updated_at
    )
    INTO v_profile
    FROM public.profiles AS p
    WHERE p.id::TEXT = p_user_id
      AND (
          p.visibility = 'public' AND p.is_public IS TRUE
      );

    RETURN v_profile;
END;
$function$;

CREATE FUNCTION public.bridge_m20261119_search_public_profiles(
    p_keyword TEXT DEFAULT '',
    p_grades TEXT[] DEFAULT '{}',
    p_tracks TEXT[] DEFAULT '{}',
    p_tech_stacks TEXT[] DEFAULT '{}',
    p_tech_stack_match TEXT DEFAULT 'any',
    p_exclude_user_id TEXT DEFAULT NULL,
    p_page INTEGER DEFAULT 1,
    p_page_size INTEGER DEFAULT 12
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
    v_page INTEGER := GREATEST(1, COALESCE(p_page, 1));
    v_page_size INTEGER := LEAST(100, GREATEST(1, COALESCE(p_page_size, 12)));
    v_keyword TEXT := pg_catalog.regexp_replace(
        pg_catalog.btrim(COALESCE(p_keyword, '')), '[%_,()]', '', 'g'
    );
    v_total_count BIGINT;
    v_profiles JSONB;
    v_total_pages INTEGER;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'UNAUTHENTICATED';
    END IF;
    IF NOT public.bridge_m20261117_current_school_email_verified() THEN
        RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'SCHOOL_EMAIL_REQUIRED';
    END IF;
    IF COALESCE(p_tech_stack_match, 'any') NOT IN ('any', 'all') THEN
        RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'INVALID_TECH_STACK_MATCH';
    END IF;

    WITH eligible AS MATERIALIZED (
        SELECT
            p.id, p.name, p.nickname, p.grade, p.track, p.department, p.bio,
            p.long_bio, p.interests, p.tech_stacks, p.tech_proficiency,
            p.wanted_tech_stacks, p.desired_roles, p.activity_types,
            p.activity_goals, p.activity_mode, p.activity_duration,
            p.availability_status, p.experiences, p.github_url, p.portfolio_url,
            p.is_public, p.visibility, p.created_at, p.updated_at
        FROM public.profiles AS p
        WHERE (
            p.visibility = 'public' AND p.is_public IS TRUE
        )
          AND p.id <> auth.uid()
          AND (p_exclude_user_id IS NULL OR p.id::TEXT <> p_exclude_user_id)
          AND (
              v_keyword = ''
              OR p.name ILIKE '%' || v_keyword || '%'
              OR p.nickname ILIKE '%' || v_keyword || '%'
              OR p.bio ILIKE '%' || v_keyword || '%'
          )
          AND (
              COALESCE(pg_catalog.cardinality(p_grades), 0) = 0
              OR p.grade = ANY(p_grades)
          )
          AND (
              COALESCE(pg_catalog.cardinality(p_tracks), 0) = 0
              OR p.track = ANY(p_tracks)
          )
          AND (
              COALESCE(pg_catalog.cardinality(p_tech_stacks), 0) = 0
              OR (
                  COALESCE(p_tech_stack_match, 'any') = 'all'
                  AND COALESCE(p.tech_stacks, ARRAY[]::TEXT[]) @> p_tech_stacks
              )
              OR (
                  COALESCE(p_tech_stack_match, 'any') = 'any'
                  AND COALESCE(p.tech_stacks, ARRAY[]::TEXT[]) && p_tech_stacks
              )
          )
    ),
    counts AS (
        SELECT pg_catalog.count(*) AS total_count FROM eligible
    ),
    page_rows AS (
        SELECT eligible.*
        FROM eligible
        ORDER BY eligible.updated_at DESC, eligible.id ASC
        OFFSET (v_page::BIGINT - 1) * v_page_size
        LIMIT v_page_size
    )
    SELECT
        counts.total_count,
        COALESCE(
            (
                SELECT pg_catalog.jsonb_agg(
                    pg_catalog.jsonb_build_object(
                        'id', p.id, 'name', p.name, 'nickname', p.nickname,
                        'grade', p.grade, 'track', p.track, 'department', p.department,
                        'bio', p.bio, 'long_bio', p.long_bio, 'interests', p.interests,
                        'tech_stacks', p.tech_stacks, 'tech_proficiency', p.tech_proficiency,
                        'wanted_tech_stacks', p.wanted_tech_stacks, 'desired_roles', p.desired_roles,
                        'activity_types', p.activity_types, 'activity_goals', p.activity_goals,
                        'activity_mode', p.activity_mode, 'activity_duration', p.activity_duration,
                        'availability_status', p.availability_status, 'experiences', p.experiences,
                        'github_url', p.github_url, 'portfolio_url', p.portfolio_url,
                        'is_public', p.is_public, 'visibility', p.visibility,
                        'created_at', p.created_at, 'updated_at', p.updated_at
                    )
                    ORDER BY p.updated_at DESC, p.id ASC
                )
                FROM page_rows AS p
            ),
            '[]'::JSONB
        )
    INTO v_total_count, v_profiles
    FROM counts;

    v_total_pages := pg_catalog.ceil(v_total_count::NUMERIC / v_page_size)::INTEGER;

    RETURN pg_catalog.jsonb_build_object(
        'profiles', v_profiles, 'totalCount', v_total_count,
        'page', v_page, 'pageSize', v_page_size,
        'totalPages', v_total_pages, 'hasMore', v_page < v_total_pages
    );
END;
$function$;

REVOKE ALL ON FUNCTION public.bridge_m20261119_fetch_public_profile(TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.bridge_m20261119_search_public_profiles(TEXT, TEXT[], TEXT[], TEXT[], TEXT, TEXT, INTEGER, INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.bridge_m20261119_fetch_public_profile(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.bridge_m20261119_search_public_profiles(TEXT, TEXT[], TEXT[], TEXT[], TEXT, TEXT, INTEGER, INTEGER) TO authenticated;

DO $security_assertions$
BEGIN
    IF pg_catalog.has_table_privilege('anon', 'public.profiles', 'SELECT')
       OR pg_catalog.has_table_privilege('authenticated', 'public.profiles', 'SELECT') THEN
        RAISE EXCEPTION 'profiles must not have table-level SELECT grants for client roles';
    END IF;
    IF pg_catalog.has_column_privilege('anon', 'public.profiles', 'email', 'SELECT') THEN
        RAISE EXCEPTION 'anon must not read profiles.email';
    END IF;
    IF NOT pg_catalog.has_column_privilege('authenticated', 'public.profiles', 'email', 'SELECT') THEN
        RAISE EXCEPTION 'authenticated must retain own-profile email column access';
    END IF;
    IF pg_catalog.has_function_privilege('anon', 'public.bridge_m20261119_fetch_public_profile(text)', 'EXECUTE')
       OR pg_catalog.has_function_privilege('anon', 'public.bridge_m20261119_search_public_profiles(text,text[],text[],text[],text,text,integer,integer)', 'EXECUTE')
       OR NOT pg_catalog.has_function_privilege('authenticated', 'public.bridge_m20261119_fetch_public_profile(text)', 'EXECUTE')
       OR NOT pg_catalog.has_function_privilege('authenticated', 'public.bridge_m20261119_search_public_profiles(text,text[],text[],text[],text,text,integer,integer)', 'EXECUTE') THEN
        RAISE EXCEPTION 'public profile RPC execute grants are not restricted as expected';
    END IF;
    IF EXISTS (
        SELECT 1 FROM pg_catalog.pg_policies
        WHERE schemaname = 'public' AND tablename = 'profiles'
          AND policyname = 'bridge_m20261118_profiles_public_select'
    ) THEN
        RAISE EXCEPTION 'profiles public SELECT policy must be removed';
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_catalog.pg_policies
        WHERE schemaname = 'public' AND tablename = 'profiles'
          AND policyname = 'bridge_m20261118_profiles_school_read_guard'
          AND permissive = 'RESTRICTIVE'
          AND cmd = 'SELECT'
    ) THEN
        RAISE EXCEPTION 'profiles owner-only restrictive SELECT guard is missing';
    END IF;
END;
$security_assertions$;

COMMENT ON FUNCTION public.bridge_m20261119_fetch_public_profile(TEXT)
    IS 'Returns only the allowlisted public profile fields to verified school users.';
COMMENT ON FUNCTION public.bridge_m20261119_search_public_profiles(TEXT, TEXT[], TEXT[], TEXT[], TEXT, TEXT, INTEGER, INTEGER)
    IS 'Searches only public profiles and returns allowlisted fields and pagination metadata.';

COMMIT;
