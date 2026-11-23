-- Run only on an isolated local test database after applying the migrations.
BEGIN;

INSERT INTO auth.users (id, email, email_confirmed_at) VALUES
    ('c0000000-0000-4000-8000-000000000001', 'bridge-contact-owner@knu.ac.kr', now()),
    ('c0000000-0000-4000-8000-000000000002', 'bridge-contact-applicant@knu.ac.kr', now()),
    ('c0000000-0000-4000-8000-000000000003', 'bridge-contact-peer@knu.ac.kr', now()),
    ('c0000000-0000-4000-8000-000000000004', 'bridge-contact-outsider@knu.ac.kr', now());
INSERT INTO public.profiles (id, email, name, nickname, grade, track)
SELECT id, email, 'Fixture', split_part(email, '@', 1), '1학년', '플랫폼소프트웨어'
FROM auth.users WHERE id IN (
    'c0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000002',
    'c0000000-0000-4000-8000-000000000003', 'c0000000-0000-4000-8000-000000000004'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.recruitments (
    id, title, content, expected_duration, activity_type, author_id, status
) VALUES
    ('contact-test-rec', 'Fixture', 'Fixture', '1 week', 'online', 'c0000000-0000-4000-8000-000000000001', 'completed'),
    ('contact-test-pending-rec', 'Fixture', 'Fixture', '1 week', 'online', 'c0000000-0000-4000-8000-000000000001', 'recruiting'),
    ('contact-test-rejected-rec', 'Fixture', 'Fixture', '1 week', 'online', 'c0000000-0000-4000-8000-000000000001', 'recruiting'),
    ('contact-test-cancelled-rec', 'Fixture', 'Fixture', '1 week', 'online', 'c0000000-0000-4000-8000-000000000001', 'recruiting'),
    ('contact-test-closed-rec', 'Fixture', 'Fixture', '1 week', 'online', 'c0000000-0000-4000-8000-000000000001', 'cancelled');

INSERT INTO public.applications (id, recruitment_id, applicant_id, applied_role, message, status) VALUES
    ('contact-test-accepted', 'contact-test-rec', 'c0000000-0000-4000-8000-000000000002', 'Developer', 'Fixture', 'accepted'),
    ('contact-test-peer', 'contact-test-rec', 'c0000000-0000-4000-8000-000000000003', 'Developer', 'Fixture', 'accepted'),
    ('contact-test-pending', 'contact-test-pending-rec', 'c0000000-0000-4000-8000-000000000002', 'Developer', 'Fixture', 'pending'),
    ('contact-test-rejected', 'contact-test-rejected-rec', 'c0000000-0000-4000-8000-000000000002', 'Developer', 'Fixture', 'rejected'),
    ('contact-test-cancelled', 'contact-test-cancelled-rec', 'c0000000-0000-4000-8000-000000000002', 'Developer', 'Fixture', 'cancelled'),
    ('contact-test-closed', 'contact-test-closed-rec', 'c0000000-0000-4000-8000-000000000002', 'Developer', 'Fixture', 'accepted');

DO $test$
DECLARE
    client TEXT;
    signature TEXT;
BEGIN
    FOREACH client IN ARRAY ARRAY['anon', 'authenticated', 'service_role'] LOOP
        IF has_schema_privilege(client, 'bridge_private', 'USAGE')
            OR has_table_privilege(client, 'bridge_private.recruitment_contacts', 'SELECT,INSERT,UPDATE,DELETE') THEN
            RAISE EXCEPTION 'Client has direct contact access: %', client;
        END IF;
    END LOOP;
    FOREACH signature IN ARRAY ARRAY[
        'public.bridge_get_my_recruitment_contact()',
        'public.bridge_save_my_recruitment_contact(text,boolean)',
        'public.bridge_revoke_my_recruitment_contact_sharing()',
        'public.bridge_delete_my_recruitment_contact()',
        'public.bridge_get_accepted_application_contact(text)'
    ] LOOP
        IF has_function_privilege('anon', signature, 'EXECUTE')
            OR has_function_privilege('service_role', signature, 'EXECUTE')
            OR NOT has_function_privilege('authenticated', signature, 'EXECUTE') THEN
            RAISE EXCEPTION 'Unexpected RPC permissions: %', signature;
        END IF;
    END LOOP;
END;
$test$;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"c0000000-0000-4000-8000-000000000001","email":"bridge-contact-owner@knu.ac.kr"}', true);
DO $test$
BEGIN
    PERFORM public.bridge_save_my_recruitment_contact('owner-fixture', true);
    IF public.bridge_get_accepted_application_contact('contact-test-accepted') IS NOT NULL THEN
        RAISE EXCEPTION 'Disclosure before applicant registration';
    END IF;
END;
$test$;

SELECT set_config('request.jwt.claims', '{"sub":"c0000000-0000-4000-8000-000000000002","email":"bridge-contact-applicant@knu.ac.kr"}', true);
DO $test$
DECLARE
    denied_id TEXT;
BEGIN
    IF public.bridge_get_my_recruitment_contact() IS NOT NULL THEN
        RAISE EXCEPTION 'Own-contact RPC returned another account';
    END IF;
    PERFORM public.bridge_save_my_recruitment_contact('applicant-fixture', false);
    IF public.bridge_get_accepted_application_contact('contact-test-accepted') IS NOT NULL THEN
        RAISE EXCEPTION 'Disclosure with one-sided consent';
    END IF;
    PERFORM public.bridge_save_my_recruitment_contact('applicant-updated', true);
    IF public.bridge_get_accepted_application_contact('contact-test-accepted') IS DISTINCT FROM 'owner-fixture' THEN
        RAISE EXCEPTION 'Applicant did not receive author contact';
    END IF;
    FOREACH denied_id IN ARRAY ARRAY[
        'contact-test-pending', 'contact-test-rejected', 'contact-test-cancelled', 'contact-test-closed', 'contact-test-missing'
    ] LOOP
        BEGIN
            PERFORM public.bridge_get_accepted_application_contact(denied_id);
            RAISE EXCEPTION 'Unauthorized status or missing ID was allowed';
        EXCEPTION WHEN raise_exception THEN
            IF SQLERRM <> 'FORBIDDEN' THEN RAISE; END IF;
        END;
    END LOOP;
END;
$test$;

SELECT set_config('request.jwt.claims', '{"sub":"c0000000-0000-4000-8000-000000000003","email":"bridge-contact-peer@knu.ac.kr"}', true);
DO $test$
BEGIN
    PERFORM public.bridge_save_my_recruitment_contact('peer-fixture', true);
    IF public.bridge_get_accepted_application_contact('contact-test-peer') IS DISTINCT FROM 'owner-fixture' THEN
        RAISE EXCEPTION 'Accepted peer cannot read their own counterpart';
    END IF;
    BEGIN
        PERFORM public.bridge_get_accepted_application_contact('contact-test-accepted');
        RAISE EXCEPTION 'Accepted peer can access another application';
    EXCEPTION WHEN raise_exception THEN
        IF SQLERRM <> 'FORBIDDEN' THEN RAISE; END IF;
    END;
END;
$test$;

SELECT set_config('request.jwt.claims', '{"sub":"c0000000-0000-4000-8000-000000000004","email":"bridge-contact-outsider@knu.ac.kr"}', true);
DO $test$
BEGIN
    BEGIN
        PERFORM public.bridge_get_accepted_application_contact('contact-test-accepted');
        RAISE EXCEPTION 'Unrelated account was allowed';
    EXCEPTION WHEN raise_exception THEN
        IF SQLERRM <> 'FORBIDDEN' THEN RAISE; END IF;
    END;
END;
$test$;

SELECT set_config('request.jwt.claims', '{"sub":"c0000000-0000-4000-8000-000000000002","email":"bridge-contact-applicant@knu.ac.kr","is_anonymous":true}', true);
DO $test$
BEGIN
    BEGIN
        PERFORM public.bridge_get_accepted_application_contact('contact-test-accepted');
        RAISE EXCEPTION 'Anonymous auth account was allowed';
    EXCEPTION WHEN raise_exception THEN
        IF SQLERRM <> 'UNAUTHENTICATED' THEN RAISE; END IF;
    END;
END;
$test$;

SELECT set_config('request.jwt.claims', '{"sub":"c0000000-0000-4000-8000-000000000001","email":"bridge-contact-owner@knu.ac.kr"}', true);
DO $test$
BEGIN
    IF public.bridge_get_accepted_application_contact('contact-test-accepted') IS DISTINCT FROM 'applicant-updated'
        OR public.bridge_get_accepted_application_contact('contact-test-peer') IS DISTINCT FROM 'peer-fixture' THEN
        RAISE EXCEPTION 'Author did not receive the selected applicant contact';
    END IF;
    PERFORM public.bridge_revoke_my_recruitment_contact_sharing();
    IF public.bridge_get_my_recruitment_contact() IS DISTINCT FROM '{"kakaoId":"owner-fixture","sharingEnabled":false}'::jsonb
        OR public.bridge_get_accepted_application_contact('contact-test-accepted') IS NOT NULL THEN
        RAISE EXCEPTION 'Revocation did not stop sharing while retaining the stored ID';
    END IF;
    PERFORM public.bridge_delete_my_recruitment_contact();
    IF public.bridge_get_my_recruitment_contact() IS NOT NULL THEN
        RAISE EXCEPTION 'Delete did not remove own contact';
    END IF;
END;
$test$;

SELECT set_config('request.jwt.claims', '{"sub":"c0000000-0000-4000-8000-000000000002","email":"bridge-contact-applicant@knu.ac.kr"}', true);
DO $test$
BEGIN
    IF public.bridge_get_accepted_application_contact('contact-test-accepted') IS NOT NULL THEN
        RAISE EXCEPTION 'Deleted author contact is still shared';
    END IF;
END;
$test$;

ROLLBACK;
