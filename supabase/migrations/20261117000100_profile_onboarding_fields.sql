BEGIN;

-- Add only the fields used by the onboarding form. Existing rows are retained.
ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS department TEXT,
    ADD COLUMN IF NOT EXISTS tech_proficiency JSONB NOT NULL DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS activity_types TEXT[] NOT NULL DEFAULT '{}'::text[],
    ADD COLUMN IF NOT EXISTS activity_goals TEXT[] NOT NULL DEFAULT '{}'::text[],
    ADD COLUMN IF NOT EXISTS activity_mode TEXT,
    ADD COLUMN IF NOT EXISTS activity_duration TEXT,
    ADD COLUMN IF NOT EXISTS availability_status TEXT;

DO $column_shape_check$
DECLARE
    expected RECORD;
    actual_type TEXT;
    actual_nullable TEXT;
    actual_default TEXT;
BEGIN
    FOR expected IN
        SELECT * FROM (VALUES
            ('department', 'text', 'YES', false),
            ('tech_proficiency', 'jsonb', 'NO', true),
            ('activity_types', 'ARRAY', 'NO', true),
            ('activity_goals', 'ARRAY', 'NO', true),
            ('activity_mode', 'text', 'YES', false),
            ('activity_duration', 'text', 'YES', false),
            ('availability_status', 'text', 'YES', false)
        ) AS expected_columns(column_name, data_type, is_nullable, needs_default)
    LOOP
        SELECT data_type, is_nullable, column_default
        INTO actual_type, actual_nullable, actual_default
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'profiles'
          AND column_name = expected.column_name;

        IF actual_type IS DISTINCT FROM expected.data_type
           OR actual_nullable IS DISTINCT FROM expected.is_nullable
           OR (expected.needs_default AND actual_default IS NULL) THEN
            RAISE EXCEPTION 'Unexpected profiles. column shape for %', expected.column_name;
        END IF;
    END LOOP;
END
$column_shape_check$;

-- Fail closed if the existing owner policies or published-opportunity policy drift.
DO $existing_policy_preflight$
DECLARE
    p RECORD;
    policy_count INTEGER;
BEGIN
    SELECT count(*) INTO policy_count
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'profiles';
    IF policy_count <> 3 THEN
        RAISE EXCEPTION 'Expected exactly 3 existing profiles policies; found %', policy_count;
    END IF;

    SELECT * INTO p FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'profiles'
      AND policyname = 'Users can read own profile';
    IF NOT FOUND OR p.permissive <> 'PERMISSIVE'
       OR p.roles <> ARRAY['authenticated']::name[] OR p.cmd <> 'SELECT'
       OR (p.qual IS DISTINCT FROM 'auth.uid() = id'
           AND p.qual IS DISTINCT FROM '(auth.uid() = id)')
       OR p.with_check IS DISTINCT FROM NULL::text THEN
        RAISE EXCEPTION 'Unexpected definition: Users can read own profile';
    END IF;

    SELECT * INTO p FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'profiles'
      AND policyname = 'Users can insert own profile';
    IF NOT FOUND OR p.permissive <> 'PERMISSIVE'
       OR p.roles <> ARRAY['authenticated']::name[] OR p.cmd <> 'INSERT'
       OR p.qual IS DISTINCT FROM NULL::text
       OR (p.with_check IS DISTINCT FROM 'auth.uid() = id'
           AND p.with_check IS DISTINCT FROM '(auth.uid() = id)') THEN
        RAISE EXCEPTION 'Unexpected definition: Users can insert own profile';
    END IF;

    SELECT * INTO p FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'profiles'
      AND policyname = 'Users can update own profile';
    IF NOT FOUND OR p.permissive <> 'PERMISSIVE'
       OR p.roles <> ARRAY['authenticated']::name[] OR p.cmd <> 'UPDATE'
       OR (p.qual IS DISTINCT FROM 'auth.uid() = id'
           AND p.qual IS DISTINCT FROM '(auth.uid() = id)')
       OR (p.with_check IS DISTINCT FROM 'auth.uid() = id'
           AND p.with_check IS DISTINCT FROM '(auth.uid() = id)') THEN
        RAISE EXCEPTION 'Unexpected definition: Users can update own profile';
    END IF;

    IF EXISTS (SELECT 1 FROM pg_policies
               WHERE schemaname = 'public' AND tablename = 'profiles'
                 AND cmd = 'DELETE') THEN
        RAISE EXCEPTION 'Unexpected DELETE policy on profiles';
    END IF;

    SELECT count(*) INTO policy_count
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'opportunities';
    IF policy_count <> 1 THEN
        RAISE EXCEPTION 'Expected exactly one existing opportunities policy; found %', policy_count;
    END IF;

    SELECT * INTO p FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'opportunities'
      AND policyname = 'Public can read published opportunities';
    IF NOT FOUND OR p.permissive <> 'PERMISSIVE'
       OR p.roles <> ARRAY['anon', 'authenticated']::name[] OR p.cmd <> 'SELECT'
       OR p.qual <> '(status <> ''draft''::text)' OR p.with_check IS NOT NULL THEN
        RAISE EXCEPTION 'Unexpected definition: Public can read published opportunities';
    END IF;
END
$existing_policy_preflight$;

-- RLS와 별도인 테이블 권한을 검증한다. 이 마이그레이션은 권한을 부여/회수하지 않는다.
DO $grant_preflight$
BEGIN
    IF NOT has_table_privilege('authenticated', 'public.profiles', 'SELECT')
       OR NOT has_table_privilege('authenticated', 'public.profiles', 'INSERT')
       OR NOT has_table_privilege('authenticated', 'public.profiles', 'UPDATE')
       OR NOT has_table_privilege('authenticated', 'public.profiles', 'DELETE') THEN
        RAISE EXCEPTION 'Unexpected authenticated CRUD grants on profiles';
    END IF;

    IF NOT has_table_privilege('anon', 'public.opportunities', 'SELECT')
       OR NOT has_table_privilege('anon', 'public.opportunities', 'INSERT')
       OR NOT has_table_privilege('anon', 'public.opportunities', 'UPDATE')
       OR NOT has_table_privilege('anon', 'public.opportunities', 'DELETE')
       OR NOT has_table_privilege('authenticated', 'public.opportunities', 'SELECT')
       OR NOT has_table_privilege('authenticated', 'public.opportunities', 'INSERT')
       OR NOT has_table_privilege('authenticated', 'public.opportunities', 'UPDATE')
       OR NOT has_table_privilege('authenticated', 'public.opportunities', 'DELETE') THEN
        RAISE EXCEPTION 'Unexpected opportunities CRUD grants';
    END IF;

    IF has_table_privilege('anon', 'public.opportunities', 'TRUNCATE')
       OR has_table_privilege('authenticated', 'public.opportunities', 'TRUNCATE')
       OR has_table_privilege('anon', 'public.opportunities', 'TRIGGER')
       OR has_table_privilege('authenticated', 'public.opportunities', 'TRIGGER')
       OR has_table_privilege('anon', 'public.opportunities', 'REFERENCES')
       OR has_table_privilege('authenticated', 'public.opportunities', 'REFERENCES') THEN
        RAISE EXCEPTION 'Unexpected TRUNCATE, TRIGGER, or REFERENCES grant on opportunities';
    END IF;
END
$grant_preflight$;

-- RLS policies below are additive. Existing policies, including public opportunity reads,
-- are not dropped or replaced.
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.opportunities ENABLE ROW LEVEL SECURITY;

DO $function_collision_check$
BEGIN
    IF to_regprocedure('public.bridge_m20261117_tech_proficiency_valid(jsonb)') IS NOT NULL THEN
        RAISE EXCEPTION 'Existing function collision: bridge_m20261117_tech_proficiency_valid(jsonb)';
    END IF;

    IF to_regprocedure('public.bridge_m20261117_current_school_email_verified()') IS NOT NULL THEN
        RAISE EXCEPTION 'Existing function collision: bridge_m20261117_current_school_email_verified()';
    END IF;
END
$function_collision_check$;

CREATE FUNCTION public.bridge_m20261117_tech_proficiency_valid(value JSONB)
RETURNS BOOLEAN
LANGUAGE SQL
IMMUTABLE
PARALLEL SAFE
AS $$
    SELECT CASE
       WHEN jsonb_typeof(value) IS DISTINCT FROM 'object' THEN false
       ELSE NOT EXISTS (
            SELECT 1
            FROM jsonb_each(value) AS item(technology, level)
            WHERE item.level <> 'null'::jsonb
              AND (
                  jsonb_typeof(item.level) <> 'string'
                  OR item.level #>> '{}' NOT IN ('입문', '활용 가능', '숙련')
              )
       )
       END;
$$;

-- Supabase access JWTs do not include email_verified. Read the authoritative
-- confirmation timestamp from auth.users for the caller only.
CREATE FUNCTION public.bridge_m20261117_current_school_email_verified()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM auth.users AS auth_user
        WHERE auth_user.id = (SELECT auth.uid())
          AND auth_user.email_confirmed_at IS NOT NULL
          AND lower(auth_user.email) LIKE '%@knu.ac.kr'
          AND lower(auth_user.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
    );
$$;

REVOKE ALL ON FUNCTION public.bridge_m20261117_current_school_email_verified() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.bridge_m20261117_current_school_email_verified() FROM anon;
GRANT EXECUTE ON FUNCTION public.bridge_m20261117_current_school_email_verified() TO authenticated;

COMMENT ON FUNCTION public.bridge_m20261117_tech_proficiency_valid(JSONB)
    IS 'bridge migration 20261117 owns tech proficiency helper';
COMMENT ON FUNCTION public.bridge_m20261117_current_school_email_verified()
    IS 'bridge migration 20261117 owns verified school email helper';

DO $migration$
DECLARE
    existing_name TEXT;
    existing_comment TEXT;
BEGIN
    -- Refuse to silently adopt same-named objects from another migration.
    FOR existing_name, existing_comment IN
        SELECT conname, obj_description(oid, 'pg_constraint')
        FROM pg_constraint
        WHERE conrelid = 'public.profiles'::regclass
          AND conname = ANY (ARRAY[
              'bridge_m20261117_profiles_tech_proficiency_check',
              'bridge_m20261117_profiles_activity_types_check',
              'bridge_m20261117_profiles_activity_goals_check',
              'bridge_m20261117_profiles_activity_mode_check',
              'bridge_m20261117_profiles_activity_duration_check',
              'bridge_m20261117_profiles_availability_status_check'
          ])
    LOOP
        -- A marker comment is not proof that the constraint definition is correct.
        -- Stop on every collision; do not adopt, alter, or skip an existing constraint.
        RAISE EXCEPTION 'Existing constraint collision; inspect definition: %', existing_name;
    END LOOP;

    FOR existing_name, existing_comment IN
        SELECT polname, obj_description(oid, 'pg_policy')
        FROM pg_policy
        WHERE polrelid IN ('public.profiles'::regclass, 'public.opportunities'::regclass)
          AND polname = ANY (ARRAY[
              'bridge_m20261117_profiles_school_owner_guard',
              'bridge_m20261117_profiles_verified_email_guard',
              'bridge_m20261117_opportunities_admin_select',
              'bridge_m20261117_opportunities_admin_insert',
              'bridge_m20261117_opportunities_admin_insert_guard',
              'bridge_m20261117_opportunities_admin_update',
              'bridge_m20261117_opportunities_admin_update_guard',
              'bridge_m20261117_opportunities_admin_delete',
              'bridge_m20261117_opportunities_admin_delete_guard'
          ])
    LOOP
        RAISE EXCEPTION 'Existing migration policy collision: %', existing_name;
    END LOOP;

    -- Reject invalid legacy values before adding CHECK constraints; never rewrite them.
    IF EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE EXISTS (SELECT 1 FROM unnest(p.activity_types) x(value) WHERE x.value IS NULL)
           OR NOT (p.activity_types <@ ARRAY[
               '공모전', '해커톤', '대외활동', '사이드 프로젝트', '스터디', '창업'
           ]::text[])
    ) THEN
        RAISE EXCEPTION 'Existing activity_types contains NULL or unsupported values';
    END IF;
    IF EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE EXISTS (SELECT 1 FROM unnest(p.activity_goals) x(value) WHERE x.value IS NULL)
           OR NOT (p.activity_goals <@ ARRAY[
               '수상 목표', '실무 경험', '포트폴리오', '기술 학습', '네트워킹'
           ]::text[])
    ) THEN
        RAISE EXCEPTION 'Existing activity_goals contains NULL or unsupported values';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'public.profiles'::regclass
          AND conname = 'bridge_m20261117_profiles_tech_proficiency_check'
    ) THEN
        ALTER TABLE public.profiles
            ADD CONSTRAINT bridge_m20261117_profiles_tech_proficiency_check
            CHECK (public.bridge_m20261117_tech_proficiency_valid(tech_proficiency));
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'public.profiles'::regclass
          AND conname = 'bridge_m20261117_profiles_activity_types_check'
    ) THEN
        ALTER TABLE public.profiles
            ADD CONSTRAINT bridge_m20261117_profiles_activity_types_check
            CHECK (array_position(activity_types, NULL::text) IS NULL
               AND activity_types <@ ARRAY[
                '공모전', '해커톤', '대외활동', '사이드 프로젝트', '스터디', '창업'
            ]::text[]);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'public.profiles'::regclass
          AND conname = 'bridge_m20261117_profiles_activity_goals_check'
    ) THEN
        ALTER TABLE public.profiles
            ADD CONSTRAINT bridge_m20261117_profiles_activity_goals_check
            CHECK (array_position(activity_goals, NULL::text) IS NULL
               AND activity_goals <@ ARRAY[
                '수상 목표', '실무 경험', '포트폴리오', '기술 학습', '네트워킹'
            ]::text[]);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'public.profiles'::regclass
          AND conname = 'bridge_m20261117_profiles_activity_mode_check'
    ) THEN
        ALTER TABLE public.profiles
            ADD CONSTRAINT bridge_m20261117_profiles_activity_mode_check
            CHECK (activity_mode IS NULL OR activity_mode IN ('대면', '비대면', '혼합'));
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'public.profiles'::regclass
          AND conname = 'bridge_m20261117_profiles_activity_duration_check'
    ) THEN
        ALTER TABLE public.profiles
            ADD CONSTRAINT bridge_m20261117_profiles_activity_duration_check
            CHECK (
                activity_duration IS NULL
                OR activity_duration IN ('단기 (1개월 이내)', '장기 (3개월 이상)', '무관')
            );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'public.profiles'::regclass
          AND conname = 'bridge_m20261117_profiles_availability_status_check'
    ) THEN
        ALTER TABLE public.profiles
            ADD CONSTRAINT bridge_m20261117_profiles_availability_status_check
            CHECK (
                availability_status IS NULL
                OR availability_status IN ('팀 구하는 중', '제안 환영', '활동 중', '참여 어려움')
            );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'profiles'
          AND policyname = 'bridge_m20261117_profiles_school_owner_guard'
    ) THEN
        CREATE POLICY bridge_m20261117_profiles_school_owner_guard ON public.profiles
            AS RESTRICTIVE FOR ALL TO public
            USING (
                id = auth.uid()
                AND lower(coalesce(auth.jwt() ->> 'email', '')) LIKE '%@knu.ac.kr'
            )
            WITH CHECK (
                id = auth.uid()
                AND lower(coalesce(auth.jwt() ->> 'email', '')) LIKE '%@knu.ac.kr'
            );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'profiles'
          AND policyname = 'bridge_m20261117_profiles_verified_email_guard'
    ) THEN
        CREATE POLICY bridge_m20261117_profiles_verified_email_guard ON public.profiles
            AS RESTRICTIVE FOR ALL TO authenticated
            USING (public.bridge_m20261117_current_school_email_verified())
            WITH CHECK (public.bridge_m20261117_current_school_email_verified());
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'opportunities'
          AND policyname = 'bridge_m20261117_opportunities_admin_select'
    ) THEN
        CREATE POLICY bridge_m20261117_opportunities_admin_select ON public.opportunities
            AS PERMISSIVE FOR SELECT TO authenticated
            USING (
                auth.jwt() -> 'app_metadata' ->> 'role' = 'admin'
                AND public.bridge_m20261117_current_school_email_verified()
            );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'opportunities'
          AND policyname = 'bridge_m20261117_opportunities_admin_insert'
    ) THEN
        CREATE POLICY bridge_m20261117_opportunities_admin_insert ON public.opportunities
            AS PERMISSIVE FOR INSERT TO authenticated
            WITH CHECK (
                auth.jwt() -> 'app_metadata' ->> 'role' = 'admin'
                AND public.bridge_m20261117_current_school_email_verified()
            );
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'opportunities'
          AND policyname = 'bridge_m20261117_opportunities_admin_insert_guard'
    ) THEN
        CREATE POLICY bridge_m20261117_opportunities_admin_insert_guard ON public.opportunities
            AS RESTRICTIVE FOR INSERT TO authenticated
            WITH CHECK (
                auth.jwt() -> 'app_metadata' ->> 'role' = 'admin'
                AND public.bridge_m20261117_current_school_email_verified()
            );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'opportunities'
          AND policyname = 'bridge_m20261117_opportunities_admin_update'
    ) THEN
        CREATE POLICY bridge_m20261117_opportunities_admin_update ON public.opportunities
            AS PERMISSIVE FOR UPDATE TO authenticated
            USING (
                auth.jwt() -> 'app_metadata' ->> 'role' = 'admin'
                AND public.bridge_m20261117_current_school_email_verified()
            )
            WITH CHECK (
                auth.jwt() -> 'app_metadata' ->> 'role' = 'admin'
                AND public.bridge_m20261117_current_school_email_verified()
            );
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'opportunities'
          AND policyname = 'bridge_m20261117_opportunities_admin_update_guard'
    ) THEN
        CREATE POLICY bridge_m20261117_opportunities_admin_update_guard ON public.opportunities
            AS RESTRICTIVE FOR UPDATE TO authenticated
            USING (
                auth.jwt() -> 'app_metadata' ->> 'role' = 'admin'
                AND public.bridge_m20261117_current_school_email_verified()
            )
            WITH CHECK (
                auth.jwt() -> 'app_metadata' ->> 'role' = 'admin'
                AND public.bridge_m20261117_current_school_email_verified()
            );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'opportunities'
          AND policyname = 'bridge_m20261117_opportunities_admin_delete'
    ) THEN
        CREATE POLICY bridge_m20261117_opportunities_admin_delete ON public.opportunities
            AS PERMISSIVE FOR DELETE TO authenticated
            USING (
                auth.jwt() -> 'app_metadata' ->> 'role' = 'admin'
                AND public.bridge_m20261117_current_school_email_verified()
            );
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'opportunities'
          AND policyname = 'bridge_m20261117_opportunities_admin_delete_guard'
    ) THEN
        CREATE POLICY bridge_m20261117_opportunities_admin_delete_guard ON public.opportunities
            AS RESTRICTIVE FOR DELETE TO authenticated
            USING (
                auth.jwt() -> 'app_metadata' ->> 'role' = 'admin'
                AND public.bridge_m20261117_current_school_email_verified()
            );
    END IF;
END
$migration$;

COMMENT ON CONSTRAINT bridge_m20261117_profiles_tech_proficiency_check ON public.profiles
    IS 'bridge migration 20261117 owns constraint bridge_m20261117_profiles_tech_proficiency_check';
COMMENT ON CONSTRAINT bridge_m20261117_profiles_activity_types_check ON public.profiles
    IS 'bridge migration 20261117 owns constraint bridge_m20261117_profiles_activity_types_check';
COMMENT ON CONSTRAINT bridge_m20261117_profiles_activity_goals_check ON public.profiles
    IS 'bridge migration 20261117 owns constraint bridge_m20261117_profiles_activity_goals_check';
COMMENT ON CONSTRAINT bridge_m20261117_profiles_activity_mode_check ON public.profiles
    IS 'bridge migration 20261117 owns constraint bridge_m20261117_profiles_activity_mode_check';
COMMENT ON CONSTRAINT bridge_m20261117_profiles_activity_duration_check ON public.profiles
    IS 'bridge migration 20261117 owns constraint bridge_m20261117_profiles_activity_duration_check';
COMMENT ON CONSTRAINT bridge_m20261117_profiles_availability_status_check ON public.profiles
    IS 'bridge migration 20261117 owns constraint bridge_m20261117_profiles_availability_status_check';

COMMENT ON POLICY bridge_m20261117_profiles_school_owner_guard ON public.profiles
    IS 'bridge migration 20261117 owns policy bridge_m20261117_profiles_school_owner_guard';
COMMENT ON POLICY bridge_m20261117_profiles_verified_email_guard ON public.profiles
    IS 'bridge migration 20261117 owns policy bridge_m20261117_profiles_verified_email_guard';
COMMENT ON POLICY bridge_m20261117_opportunities_admin_select ON public.opportunities
    IS 'bridge migration 20261117 owns policy bridge_m20261117_opportunities_admin_select';
COMMENT ON POLICY bridge_m20261117_opportunities_admin_insert ON public.opportunities
    IS 'bridge migration 20261117 owns policy bridge_m20261117_opportunities_admin_insert';
COMMENT ON POLICY bridge_m20261117_opportunities_admin_insert_guard ON public.opportunities
    IS 'bridge migration 20261117 owns policy bridge_m20261117_opportunities_admin_insert_guard';
COMMENT ON POLICY bridge_m20261117_opportunities_admin_update ON public.opportunities
    IS 'bridge migration 20261117 owns policy bridge_m20261117_opportunities_admin_update';
COMMENT ON POLICY bridge_m20261117_opportunities_admin_update_guard ON public.opportunities
    IS 'bridge migration 20261117 owns policy bridge_m20261117_opportunities_admin_update_guard';
COMMENT ON POLICY bridge_m20261117_opportunities_admin_delete ON public.opportunities
    IS 'bridge migration 20261117 owns policy bridge_m20261117_opportunities_admin_delete';
COMMENT ON POLICY bridge_m20261117_opportunities_admin_delete_guard ON public.opportunities
    IS 'bridge migration 20261117 owns policy bridge_m20261117_opportunities_admin_delete_guard';

COMMENT ON COLUMN public.profiles.department IS '학부/소속 정보 입력값';
COMMENT ON COLUMN public.profiles.tech_proficiency IS '기술명별 숙련도. 미선택 항목은 key를 생략';

COMMIT;
