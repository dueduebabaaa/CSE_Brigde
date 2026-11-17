import type { UserProfile } from '../../services/profileService';
// Explicit test fixture only; never used by production components.
export function profileFixture(overrides: Partial<UserProfile> = {}): UserProfile {
  return {
    id: 'user-a', email: 'test@knu.ac.kr', name: '테스트 학생', nickname: '별칭', grade: '2학년', track: '플랫폼소프트웨어전공',
    department: '저장된 학부', bio: '기존 소개', long_bio: null, interests: ['웹 개발', '양자컴퓨팅'], desired_roles: ['Frontend', '기존 자유 역할'],
    tech_stacks: ['React'], tech_proficiency: { React: null }, wanted_tech_stacks: ['미등록 기술'],
    activity_types: ['기존 활동'], activity_goals: ['기존 목표'], activity_mode: null, activity_duration: null, availability_status: null,
    experiences: ['변경하지 않을 경험'], github_url: null, portfolio_url: null, visibility: 'team_only', is_public: false,
    created_at: '2026-11-01T00:00:00Z', updated_at: '2026-11-01T00:00:00Z', ...overrides,
  };
}
