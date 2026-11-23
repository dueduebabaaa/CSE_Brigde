import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(
  resolve(process.cwd(), 'supabase/migrations/20261119000200_harden_profiles_public_reads.sql'),
  'utf8',
);
const securityDoc = readFileSync(resolve(process.cwd(), 'docs/PROFILE_SECURITY.md'), 'utf8');

describe('legacy public_profiles view revocation guard', () => {
  const block = migration.match(/DO \$revoke_public_profiles_view\$([\s\S]*?)\$revoke_public_profiles_view\$;/)?.[1] ?? '';

  it('runs the revoke inside an existence guard when the relation is present', () => {
    const existenceGuard = block.indexOf("IF pg_catalog.to_regclass('public.public_profiles') IS NOT NULL THEN");
    const guardedRevoke = block.indexOf("EXECUTE 'REVOKE SELECT ON TABLE public.public_profiles FROM PUBLIC, anon, authenticated'");
    const guardEnd = block.indexOf('END IF;');
    expect(existenceGuard).toBeGreaterThanOrEqual(0);
    expect(guardedRevoke).toBeGreaterThan(existenceGuard);
    expect(guardEnd).toBeGreaterThan(guardedRevoke);
  });

  it('has no unconditional revoke that would fail when the relation is absent', () => {
    expect(migration).not.toContain('REVOKE SELECT ON TABLE public.public_profiles FROM PUBLIC, anon, authenticated;');
  });
});

describe('공개 프로필 개인정보 경계 migration 정적 검토', () => {
  it('테이블 SELECT를 회수하고 본인 프로필용 컬럼 권한만 재부여한다', () => {
    expect(migration).toContain(
      'REVOKE SELECT ON TABLE public.profiles FROM PUBLIC, anon, authenticated;',
    );
    expect(migration).toMatch(/GRANT SELECT \([\s\S]*?email[\s\S]*?\) ON TABLE public\.profiles TO authenticated;/);
    expect(migration).toContain('DO $revoke_public_profiles_view$');
  });

  it('직접 profiles 조회는 인증된 본인 행으로 제한한다', () => {
    expect(migration).toMatch(
      /CREATE POLICY bridge_m20261118_profiles_school_read_guard ON public\.profiles\s+AS RESTRICTIVE FOR SELECT TO public\s+USING \(\s*id = \(SELECT auth\.uid\(\)\)\s+AND public\.bridge_m20261117_current_school_email_verified\(\)/,
    );
    expect(migration).toContain('DROP POLICY IF EXISTS bridge_m20261118_profiles_public_select ON public.profiles;');
  });

  it('공개 RPC는 고정 search_path와 학교 인증을 사용하고 공개 필드만 구성한다', () => {
    const rpcBodies = migration.match(/CREATE FUNCTION public\.bridge_m20261119_(?:fetch_public_profile|search_public_profiles)[\s\S]*?\$function\$;/g) ?? [];
    expect(rpcBodies).toHaveLength(2);
    for (const body of rpcBodies) {
      expect(body).toContain('SECURITY DEFINER');
      expect(body).toContain("SET search_path = ''");
      expect(body).toContain('auth.uid()');
      expect(body).toContain('public.bridge_m20261117_current_school_email_verified()');
      expect(body).toContain('FROM public.profiles AS p');
      expect(body).toContain("p.visibility = 'public'");
      expect(body).toContain('p.is_public IS DISTINCT FROM false');
      expect(body).toContain('p.visibility IS NULL AND p.is_public IS TRUE');
      expect(body).not.toMatch(/'email'\s*,/);
      expect(body).not.toContain('SELECT p.*');
    }
  });

  it('RPC 실행은 authenticated에만 부여한다', () => {
    expect(migration).toContain(
      'REVOKE ALL ON FUNCTION public.bridge_m20261119_fetch_public_profile(TEXT) FROM PUBLIC, anon, authenticated;',
    );
    expect(migration).toContain(
      'REVOKE ALL ON FUNCTION public.bridge_m20261119_search_public_profiles(TEXT, TEXT[], TEXT[], TEXT[], TEXT, TEXT, INTEGER, INTEGER) FROM PUBLIC, anon, authenticated;',
    );
    expect(migration).toContain(
      'GRANT EXECUTE ON FUNCTION public.bridge_m20261119_fetch_public_profile(TEXT) TO authenticated;',
    );
    expect(migration).toContain(
      'GRANT EXECUTE ON FUNCTION public.bridge_m20261119_search_public_profiles(TEXT, TEXT[], TEXT[], TEXT[], TEXT, TEXT, INTEGER, INTEGER) TO authenticated;',
    );
  });

  it('동일 시그니처 함수 충돌 시 실패하고 기존 함수를 교체하지 않는다', () => {
    const guard = migration.indexOf('DO $profile_rpc_collision_check$');
    const fetchDefinition = migration.indexOf('CREATE FUNCTION public.bridge_m20261119_fetch_public_profile');
    const searchDefinition = migration.indexOf('CREATE FUNCTION public.bridge_m20261119_search_public_profiles');
    expect(guard).toBeGreaterThanOrEqual(0);
    expect(guard).toBeLessThan(fetchDefinition);
    expect(guard).toBeLessThan(searchDefinition);
    expect(migration).toContain("pg_catalog.to_regprocedure('public.bridge_m20261119_fetch_public_profile(text)')");
    expect(migration).toContain("pg_catalog.to_regprocedure('public.bridge_m20261119_search_public_profiles(text,text[],text[],text[],text,text,integer,integer)')");
    expect(migration).toContain('Existing function collision: public.bridge_m20261119_fetch_public_profile(text)');
    expect(migration).toContain('Existing function collision: public.bridge_m20261119_search_public_profiles(');
    expect(migration).not.toContain('CREATE OR REPLACE FUNCTION public.bridge_m20261119_');
  });

  it('검색 페이지 계산 함수는 pg_catalog로 한정한다', () => {
    expect(migration).toContain('pg_catalog.ceil(');
    expect(migration).not.toMatch(/(?<!\.)\bceil\s*\(/i);
  });

  it('함수 소유자와 migration 실행 역할이 미확정임을 기록하고 OWNER를 임의 지정하지 않는다', () => {
    expect(migration).toContain('SECURITY DEFINER ownership is intentionally not reassigned here');
    expect(migration).toContain('files do not establish the migration execution role');
    expect(migration).not.toMatch(/ALTER\s+FUNCTION[\s\S]*?OWNER\s+TO\s+postgres/i);
    expect(securityDoc).toContain('대상 DB의 함수 소유자, 실행 역할, RLS 우회 권한');
    expect(securityDoc).toContain('실제 소유자와 유효 권한은 정적 검토로 증명할 수 없다');
  });

  it('공개 필드 allowlist와 별도 정책 확인이 필요한 개인정보를 문서화한다', () => {
    for (const field of ['bio', 'long_bio', 'experiences', 'activity_types', 'activity_goals', 'activity_mode', 'activity_duration', 'availability_status', 'github_url', 'portfolio_url']) {
      expect(securityDoc).toContain(`\`${field}\``);
    }
    expect(securityDoc).toContain('명시적 공개 동의');
    expect(securityDoc).toContain('`email`');
  });
});
