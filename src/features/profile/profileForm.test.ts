import { describe, expect, it } from 'vitest';
import { buildProfilePatch, toProfileDraft, validateProfileDraft } from './profileForm';
import { profileFixture } from './profileFixture';
describe('프로필 편집 경계', () => {
  it('원본을 복제하고 변경한 필드만 전송한다', () => {
    const row = profileFixture(); const original = toProfileDraft(row); const draft = toProfileDraft(row);
    draft.bio = '새 소개';
    expect(buildProfilePatch(original, draft)).toEqual({ bio: '새 소개' });
    draft.interests!.push('추가');
    expect(row.interests).not.toContain('추가');
    expect(buildProfilePatch(original, draft)).not.toHaveProperty('id');
    expect(buildProfilePatch(original, draft)).not.toHaveProperty('email');
    expect(buildProfilePatch(original, draft)).not.toHaveProperty('experiences');
  });
  it('미선택 null·기타 문자열·공개 범위를 보존하며 변경이 없으면 빈 patch다', () => {
    const original = toProfileDraft(profileFixture({ visibility: null }));
    expect(buildProfilePatch(original, { ...original })).toEqual({});
    expect(original.activity_mode).toBeNull();
    expect(original.tech_proficiency?.React).toBeNull();
    expect(original.interests).toContain('양자컴퓨팅');
    expect(original.visibility).toBeNull();
  });
  it('공개 범위를 바꿀 때만 호환 boolean을 함께 전송한다', () => {
    const original = toProfileDraft(profileFixture());
    expect(buildProfilePatch(original, { ...original, visibility: 'public' })).toEqual({ visibility: 'public', is_public: true });
    expect(buildProfilePatch(original, { ...original, visibility: 'private' })).toEqual({ visibility: 'private', is_public: false });
  });
  it('숙련도 객체의 키 순서만 다르면 변경으로 처리하지 않는다', () => {
    const original = toProfileDraft(profileFixture({ tech_proficiency: { React: null, Rust: '입문' } }));
    expect(buildProfilePatch(original, { ...original, tech_proficiency: { Rust: '입문', React: null } })).toEqual({});
  });
  it('필수값·소개 길이·외부 링크 및 숙련도 연결을 검증한다', () => {
    const draft = toProfileDraft(profileFixture());
    expect(validateProfileDraft(draft)).toEqual([]);
    expect(validateProfileDraft({ ...draft, name: ' ', interests: [], desired_roles: [], bio: 'x'.repeat(61), long_bio: 'x'.repeat(501), github_url: 'javascript:alert(1)', portfolio_url: 'https://u:p@example.com' })).toHaveLength(7);
    expect(validateProfileDraft({ ...draft, tech_proficiency: { Rust: '입문' } })).toContain('보유하지 않은 기술의 숙련도를 제거해 주세요.');
  });
});
