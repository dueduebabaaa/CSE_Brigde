import { GRADE_OPTIONS, MAJOR_TRACKS } from '../../constants/majors';
import type { ProfileUpdate, UserProfile } from '../../services/profileService';

export const EDITABLE_FIELDS = ['name', 'nickname', 'grade', 'track', 'department', 'bio', 'long_bio', 'interests', 'desired_roles', 'tech_stacks', 'tech_proficiency', 'wanted_tech_stacks', 'activity_types', 'activity_goals', 'activity_mode', 'activity_duration', 'availability_status', 'github_url', 'portfolio_url', 'visibility'] as const;
export type ProfileDraft = Pick<UserProfile, typeof EDITABLE_FIELDS[number]>;
export function toProfileDraft(profile: UserProfile): ProfileDraft {
  return JSON.parse(JSON.stringify(Object.fromEntries(EDITABLE_FIELDS.map(key => [key, profile[key]])))) as ProfileDraft;
}
const equal = (left: unknown, right: unknown): boolean => {
  if (left === right) return true;
  if (left === null || right === null || typeof left !== 'object' || typeof right !== 'object') return false;
  if (Array.isArray(left) || Array.isArray(right)) return Array.isArray(left) && Array.isArray(right) && left.length === right.length && left.every((value, index) => equal(value, right[index]));
  const a = left as Record<string, unknown>, b = right as Record<string, unknown>;
  return Object.keys(a).length === Object.keys(b).length && Object.keys(a).every(key => Object.prototype.hasOwnProperty.call(b, key) && equal(a[key], b[key]));
};
export function buildProfilePatch(original: ProfileDraft, draft: ProfileDraft): ProfileUpdate {
  const patch: Record<string, unknown> = {};
  for (const key of EDITABLE_FIELDS) if (!equal(original[key], draft[key])) patch[key] = draft[key];
  if (Object.prototype.hasOwnProperty.call(patch, 'visibility')) patch.is_public = draft.visibility === 'public';
  return patch as ProfileUpdate;
}
export function validateProfileDraft(draft: ProfileDraft, original?: ProfileDraft): string[] {
  const errors: string[] = [];
  // Temporary UI safeguard only: an existing empty nickname stays optional.
  if (original && draft.nickname !== original.nickname && !draft.nickname.trim()) errors.push('닉네임 삭제는 회원 분기 정책 보완 전까지 잠시 제한됩니다. 기존 닉네임을 유지하거나 새 닉네임을 입력해 주세요.');
  if (!draft.name.trim()) errors.push('이름을 입력해 주세요.');
  if (!GRADE_OPTIONS.includes(draft.grade)) errors.push('학년을 선택해 주세요.');
  if (!MAJOR_TRACKS.includes(draft.track)) errors.push('세부전공을 선택해 주세요.');
  if (!draft.interests?.length) errors.push('관심 분야를 최소 1개 선택하거나 직접 추가해 주세요.');
  if (!draft.desired_roles?.length) errors.push('희망 역할을 최소 1개 선택하거나 직접 추가해 주세요.');
  if ((draft.bio?.length ?? 0) > 60) errors.push('한 줄 소개는 60자 이내로 입력해 주세요.');
  if ((draft.long_bio?.length ?? 0) > 500) errors.push('상세 소개는 500자 이내로 입력해 주세요.');
  for (const [label, value] of [['GitHub', draft.github_url], ['포트폴리오', draft.portfolio_url]]) {
    if (!value) continue;
    try {
      const url = new URL(value);
      if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || !url.hostname.includes('.')) throw new Error();
      if (label === 'GitHub' && (url.hostname !== 'github.com' || !/^\/[A-Za-z0-9-]+\/?$/.test(url.pathname) || url.search || url.hash)) throw new Error();
    } catch { errors.push(`${label} URL을 확인해 주세요.`); }
  }
  if (Object.keys(draft.tech_proficiency ?? {}).some(tech => !draft.tech_stacks?.includes(tech))) errors.push('보유하지 않은 기술의 숙련도를 제거해 주세요.');
  return errors;
}
export const INTERESTS = ['웹 개발', '앱 개발', '인공지능', '데이터 분석', '정보보안', '게임 개발', '임베디드 및 IoT', '클라우드', 'UI/UX 디자인', '서비스 기획', '마케팅', '창업', '알고리즘', '오픈소스'];
export const ROLES = ['Frontend', 'Backend', 'AI/ML', 'Data', 'UI/UX', 'PM/기획', 'Mobile', 'DevOps', 'Security', 'Marketing'];
export const ACTIVITY_TYPES = ['공모전', '해커톤', '대외활동', '사이드 프로젝트', '스터디', '창업'];
export const ACTIVITY_GOALS = ['수상 목표', '실무 경험', '포트폴리오', '기술 학습', '네트워킹'];
