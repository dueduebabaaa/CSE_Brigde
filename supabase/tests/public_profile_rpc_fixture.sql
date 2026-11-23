-- Disposable PostgreSQL only. Run with an admin connection in an empty DB.
-- Load this fixture, then the school verification function and its grants from
-- 20261117000100_profile_onboarding_fields.sql, then the complete
-- 20261119000200 migration, then public_profile_rpc_security.sql.
-- The same connection must be kept throughout. The migration must run under
-- bridge_fixture_owner so the non-superuser, NOBYPASSRLS path is exercised.
CREATE ROLE anon;
CREATE ROLE authenticated;
CREATE ROLE bridge_fixture_owner NOSUPERUSER NOBYPASSRLS;
CREATE SCHEMA auth AUTHORIZATION bridge_fixture_owner;
GRANT USAGE ON SCHEMA auth TO authenticated;
GRANT CREATE, USAGE ON SCHEMA public TO bridge_fixture_owner;
SET ROLE bridge_fixture_owner;
SET bridge.public_profile_fixture = 'on';

CREATE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql STABLE AS $$
    SELECT COALESCE(NULLIF(current_setting('request.jwt.claims', true), '')::jsonb, '{}'::jsonb)
$$;
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
    SELECT (auth.jwt()->>'sub')::uuid
$$;
CREATE TABLE auth.users (id uuid PRIMARY KEY, email text, email_confirmed_at timestamptz);
INSERT INTO auth.users VALUES
    ('00000000-0000-4000-8000-000000000013', 'viewer@knu.ac.kr', now()),
    ('00000000-0000-4000-8000-000000000014', 'unverified@knu.ac.kr', NULL);

CREATE TABLE public.profiles (
    id uuid PRIMARY KEY, email text, phone text, kakao_id text, name text, nickname text,
    grade text, track text, department text, bio text, long_bio text, interests text[],
    tech_stacks text[], tech_proficiency jsonb, wanted_tech_stacks text[], desired_roles text[],
    activity_types text[], activity_goals text[], activity_mode text, activity_duration text,
    availability_status text, experiences text[], github_url text, portfolio_url text,
    is_public boolean, visibility text, created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY fixture_owner_select ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid());
CREATE POLICY fixture_owner_guard ON public.profiles AS RESTRICTIVE FOR ALL USING (id = auth.uid());
GRANT SELECT ON public.profiles TO authenticated;

INSERT INTO public.profiles (id, email, phone, kakao_id, visibility, is_public)
SELECT ('00000000-0000-4000-8000-' || lpad(fixture.n::text, 12, '0'))::uuid,
       CASE WHEN fixture.n = 13 THEN 'viewer@knu.ac.kr' ELSE 'private@example.test' END,
       'fixture-phone', 'fixture-kakao', fixture.visibility, fixture.is_public
FROM (VALUES
    (1, 'public', true), (2, 'public', false), (3, 'public', NULL),
    (4, NULL, true), (5, NULL, false), (6, NULL, NULL),
    (7, 'private', true), (8, 'private', false), (9, 'private', NULL),
    (10, 'team_only', true), (11, 'team_only', false), (12, 'team_only', NULL),
    (13, 'public', true)
) AS fixture(n, visibility, is_public);
