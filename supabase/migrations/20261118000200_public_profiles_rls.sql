-- ==============================================================================
-- Migration: 20261118000200_public_profiles_rls.sql
-- Description: Enable public profile discovery while preserving school email verification
--              and owner-only write protections.
-- ==============================================================================
--
-- [Security Analysis & Background]
-- 1. In migration 20261117000100_profile_onboarding_fields.sql, the following restrictive
--    policy was introduced:
--      bridge_m20261117_profiles_school_owner_guard ON public.profiles
--      AS RESTRICTIVE FOR ALL TO public
--      USING (id = auth.uid() AND lower(coalesce(auth.jwt() ->> 'email', '')) LIKE '%@knu.ac.kr')
--
-- 2. Because PostgreSQL combines all RESTRICTIVE policies with AND across all operations
--    specified in FOR ALL (SELECT, INSERT, UPDATE, DELETE), the condition `id = auth.uid()`
--    strictly prevents any user from ever SELECTing another user's profile, even if
--    permissive policies are added for public profile queries.
--
-- 3. This migration refines the policies so that:
--    a) INSERT, UPDATE, and DELETE each retain owner-only restrictive guards.
--    b) Read operations permit verified school users to read their own profile
--       OR a public profile whose legacy is_public flag is not false.
--    c) The restrictive email verification guard (`bridge_m20261117_profiles_verified_email_guard`)
--       remains intact, ensuring unverified or non-school users cannot access public profiles.
--    d) A security_invoker view `public.public_profiles` is provided to ensure sensitive
--       fields like `email` are never exposed through public discovery endpoints.
-- ==============================================================================

BEGIN;

-- 1. Ensure RLS remains enabled on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 2. Add PERMISSIVE policy to allow authenticated users to read public profiles
--    (Existing 'Users can read own profile' policy handles own profile SELECT)
DO $policy_public_select$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'profiles'
          AND policyname = 'bridge_m20261118_profiles_public_select'
    ) THEN
        CREATE POLICY bridge_m20261118_profiles_public_select ON public.profiles
            AS PERMISSIVE FOR SELECT TO authenticated
            USING (
                (visibility = 'public' AND is_public IS DISTINCT FROM false)
                OR (visibility IS NULL AND is_public = true)
            );
    END IF;
END
$policy_public_select$;

-- 3. Transition the restrictive guard from FOR ALL (which blocked SELECT of other users)
--    to targeted write and read guards.
DO $policy_transition$
BEGIN
    -- Drop the restrictive guard that blocked SELECT of others if it exists
    IF EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'profiles'
          AND policyname = 'bridge_m20261117_profiles_school_owner_guard'
    ) THEN
        DROP POLICY bridge_m20261117_profiles_school_owner_guard ON public.profiles;
    END IF;

    -- A. Restrictive INSERT guard. This does not grant INSERT by itself;
    --    the existing permissive owner policy still controls the grant.
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'profiles'
          AND policyname = 'bridge_m20261118_profiles_school_owner_insert_guard'
    ) THEN
        CREATE POLICY bridge_m20261118_profiles_school_owner_insert_guard ON public.profiles
            AS RESTRICTIVE FOR INSERT TO public
            WITH CHECK (
                id = auth.uid()
                AND lower(coalesce(auth.jwt() ->> 'email', '')) LIKE '%@knu.ac.kr'
            );
    END IF;

    -- B. Restrictive UPDATE guard, both before and after the update.
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'profiles'
          AND policyname = 'bridge_m20261118_profiles_school_owner_update_guard'
    ) THEN
        CREATE POLICY bridge_m20261118_profiles_school_owner_update_guard ON public.profiles
            AS RESTRICTIVE FOR UPDATE TO public
            USING (
                id = auth.uid()
                AND lower(coalesce(auth.jwt() ->> 'email', '')) LIKE '%@knu.ac.kr'
            )
            WITH CHECK (
                id = auth.uid()
                AND lower(coalesce(auth.jwt() ->> 'email', '')) LIKE '%@knu.ac.kr'
            );
    END IF;

    -- C. Restrictive DELETE guard. There is no permissive DELETE policy, so
    --    DELETE remains denied while any future grant stays owner-only.
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'profiles'
          AND policyname = 'bridge_m20261118_profiles_school_owner_delete_guard'
    ) THEN
        CREATE POLICY bridge_m20261118_profiles_school_owner_delete_guard ON public.profiles
            AS RESTRICTIVE FOR DELETE TO public
            USING (
                id = auth.uid()
                AND lower(coalesce(auth.jwt() ->> 'email', '')) LIKE '%@knu.ac.kr'
            );
    END IF;

    -- D. Restrictive read guard. Own-profile reads remain available; other rows
    --    must satisfy the same public predicate as the permissive policy/view.
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'profiles'
          AND policyname = 'bridge_m20261118_profiles_school_read_guard'
    ) THEN
        CREATE POLICY bridge_m20261118_profiles_school_read_guard ON public.profiles
            AS RESTRICTIVE FOR SELECT TO public
            USING (
                lower(coalesce(auth.jwt() ->> 'email', '')) LIKE '%@knu.ac.kr'
                AND (
                    id = auth.uid()
                    OR (visibility = 'public' AND is_public IS DISTINCT FROM false)
                    OR (visibility IS NULL AND is_public = true)
                )
            );
    END IF;
END
$policy_transition$;

-- 4. Create a security_invoker view that excludes email and sensitive data
CREATE OR REPLACE VIEW public.public_profiles
WITH (security_invoker = true) AS
SELECT
    id,
    name,
    nickname,
    grade,
    track,
    department,
    bio,
    long_bio,
    interests,
    tech_stacks,
    tech_proficiency,
    wanted_tech_stacks,
    desired_roles,
    activity_types,
    activity_goals,
    activity_mode,
    activity_duration,
    availability_status,
    experiences,
    github_url,
    portfolio_url,
    is_public,
    visibility,
    created_at,
    updated_at
FROM public.profiles
WHERE (visibility = 'public' AND is_public IS DISTINCT FROM false)
   OR (visibility IS NULL AND is_public = true);

-- The view uses caller privileges and base-table RLS, so it cannot bypass
-- school verification or the public visibility predicates.
GRANT SELECT ON public.public_profiles TO authenticated;

-- Comments for documentation and ownership tracking
COMMENT ON POLICY bridge_m20261118_profiles_public_select ON public.profiles
    IS 'bridge migration 20261118 allows authenticated users to read public profiles';
COMMENT ON POLICY bridge_m20261118_profiles_school_owner_insert_guard ON public.profiles
    IS 'bridge migration 20261118 restricts profile inserts to the verified owner';
COMMENT ON POLICY bridge_m20261118_profiles_school_owner_update_guard ON public.profiles
    IS 'bridge migration 20261118 restricts profile updates to the verified owner';
COMMENT ON POLICY bridge_m20261118_profiles_school_owner_delete_guard ON public.profiles
    IS 'bridge migration 20261118 restricts profile deletes to the verified owner';
COMMENT ON POLICY bridge_m20261118_profiles_school_read_guard ON public.profiles
    IS 'bridge migration 20261118 restricts profile reads to knu accounts and public/own scope';
COMMENT ON VIEW public.public_profiles
    IS 'bridge migration 20261118 public profiles discovery view excluding email';

COMMIT;
