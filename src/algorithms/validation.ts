import { filterValidAvailabilities, parseOpportunityTimestamp } from './inputSafety';
import type { ProfileVisibility } from './inputSafety';
export { filterValidAvailabilities, isValidAvailabilityItem } from './inputSafety';

/** Compatibility projection for algorithms, not a lossless DTO mapper or DB payload. */
export interface AlgorithmUserProfile extends UserProfile {
  visibility: ProfileVisibility | null;
  otherInterest?: string;
  otherRole?: string;
}

/**
 * BRIDGE — 알고리즘 입력 데이터 변환 및 검증 유틸리티
 * 
 * B(백엔드)가 제공할 camelCase 공통 DTO를 알고리즘 입력 형식으로 검증 및 정제합니다.
 * 
 * [원칙 - DATA_CONTRACT.md 준수]
 * 1. 필수 필드 누락 검사 및 타입 가드 제공
 * 2. 요일(0~6), 슬롯(0~47)의 정수 여부 및 범위 검증 (소수, NaN, 음수 필터링)
 * 3. 빈 기술 스택 배열(techStacks: [])을 정상 입력으로 허용
 * 4. 사용자가 직접 입력한 '기타' 자유 문자열(otherRole, otherInterest) 손실 방지
 * 5. 원본 데이터의 불변성을 유지하고 새로운 정제 객체 반환
 */

import { UserProfile, Opportunity, Availability } from '../types';
import { getCanonicalTag, normalizeInterest } from './tagClassification';
import { normalizeRole } from './memberMatching';

export interface ValidationResult<T> {
  isValid: boolean;
  errors: string[];
  data?: T;
}

/**
 * 팀 맵을 정제합니다. 사용자 ID 불일치는 제외하고 상충 슬롯은 false 우선입니다.
 */
export function validateAndCleanTeamAvailabilities(
  input: unknown
): Record<string, Availability[]> {
  const result: Record<string, Availability[]> = {};
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return result;
  }

  const record = input as Record<string, unknown>;
  for (const [userId, slots] of Object.entries(record)) {
    if (typeof userId !== 'string' || !userId.trim()) continue;
    const validSlots = filterValidAvailabilities(slots);
    // userId가 일치하는 슬롯만 보존
    result[userId] = validSlots.filter((s) => s.userId === userId);
  }

  return result;
}

/**
 * UserProfile DTO를 검증하고 알고리즘 입력용으로 정제합니다.
 * - techStacks: 빈 배열 [] 정상 허용
 * - desiredRoles, interests: 정규화 적용 및 자유 입력값 보존
 * - visibility/isPublic 호환성 매핑
 */
export function validateUserProfile(dto: unknown): ValidationResult<AlgorithmUserProfile> {
  const errors: string[] = [];

  if (!dto || typeof dto !== 'object' || Array.isArray(dto)) {
    return { isValid: false, errors: ['UserProfile 데이터가 객체 형식이 아닙니다.'] };
  }

  const u = dto as Record<string, unknown>;

  if (typeof u.id !== 'string' || !u.id.trim()) {
    errors.push('id는 필수 문자열이어야 합니다.');
  }

  if (typeof u.name !== 'string' || !u.name.trim()) {
    errors.push('name은 필수 문자열이어야 합니다.');
  }

  if (!u.grade || typeof u.grade !== 'string') {
    errors.push('grade는 필수 문자열이어야 합니다.');
  }

  if (typeof u.grade === 'string' && !['1학년', '2학년', '3학년', '4학년', '대학원생'].includes(u.grade)) {
    errors.push('grade가 유효한 학년이 아닙니다.');
  }

  if (!u.track || typeof u.track !== 'string') {
    errors.push('track은 필수 문자열이어야 합니다.');
  }

  // techStacks: 배열이어야 함 (빈 배열 정상 허용)
  let cleanedTechStacks: string[] = [];
  if (Array.isArray(u.techStacks)) {
    cleanedTechStacks = Array.from(
      new Set(
        u.techStacks
          .filter((t): t is string => typeof t === 'string' && t.trim().length > 0)
          .map((t) => getCanonicalTag(t))
          .filter((t) => t.length > 0)
      )
    );
  } else if (u.techStacks === undefined || u.techStacks === null) {
    cleanedTechStacks = [];
  } else {
    errors.push('techStacks는 문자열 배열이어야 합니다.');
  }

  // interests: 배열 검증 및 정규화
  let cleanedInterests: string[] = [];
  if (Array.isArray(u.interests)) {
    cleanedInterests = Array.from(
      new Set(
        u.interests
          .filter((i): i is string => typeof i === 'string' && i.trim().length > 0)
          .map((i) => normalizeInterest(i))
          .filter((i) => i.length > 0)
      )
    );
  } else if (u.interests === undefined || u.interests === null) {
    cleanedInterests = [];
  } else {
    errors.push('interests는 문자열 배열이어야 합니다.');
  }

  // desiredRoles: 배열 검증 및 정규화 (자유 입력값 보존)
  let cleanedDesiredRoles: string[] = [];
  if (Array.isArray(u.desiredRoles)) {
    cleanedDesiredRoles = Array.from(
      new Set(
        u.desiredRoles
          .filter((r): r is string => typeof r === 'string' && r.trim().length > 0)
          .map((r) => normalizeRole(r))
          .filter((r) => r.length > 0)
      )
    );
  } else if (u.desiredRoles === undefined || u.desiredRoles === null) {
    cleanedDesiredRoles = [];
  } else {
    errors.push('desiredRoles는 문자열 배열이어야 합니다.');
  }

  // wantedTechStacks
  let cleanedWantedTechStacks: string[] = [];
  if (Array.isArray(u.wantedTechStacks)) {
    cleanedWantedTechStacks = Array.from(
      new Set(
        u.wantedTechStacks
          .filter((t): t is string => typeof t === 'string' && t.trim().length > 0)
          .map((t) => getCanonicalTag(t))
          .filter((t) => t.length > 0)
      )
    );
  }

  // isPublic / visibility 호환성
  for (const field of ['techStacks', 'interests', 'desiredRoles', 'wantedTechStacks']) {
    const value = u[field];
    if (value != null && (!Array.isArray(value) || Array.from(value).some(item => typeof item !== 'string'))) errors.push(field + ': expected string array');
  }
  for (const [selection, detail] of [['interests', 'otherInterest'], ['desiredRoles', 'otherRole']] as const) {
    if (u[detail] != null && typeof u[detail] !== 'string') errors.push(detail + ': expected string');
    if (Array.isArray(u[selection]) && u[selection].includes('기타') &&
        (typeof u[detail] !== 'string' || !u[detail].trim())) errors.push(detail + ': required for other selection');
  }
  let visibility: ProfileVisibility | null = null;
  if (u.visibility !== undefined) {
    if (u.visibility === 'public' || u.visibility === 'team_only' || u.visibility === 'private') visibility = u.visibility;
    else errors.push('visibility: invalid scope');
  }
  if (u.isPublic !== undefined && typeof u.isPublic !== 'boolean') errors.push('isPublic: expected boolean');
  if (visibility !== null && typeof u.isPublic === 'boolean' && u.isPublic !== (visibility === 'public')) errors.push('visibility/isPublic: conflicting scopes');
  if (u.visibility === undefined && u.isPublic === true) visibility = 'public';
  const isPublic = visibility === 'public';

  if (errors.length > 0) {
    return { isValid: false, errors };
  }

  const profile: AlgorithmUserProfile = {
    id: (u.id as string).trim(),
    email: typeof u.email === 'string' ? u.email.trim() : '',
    name: (u.name as string).trim(),
    nickname: typeof u.nickname === 'string' && u.nickname.trim() ? u.nickname.trim() : (u.name as string).trim(),
    grade: u.grade as UserProfile['grade'],
    track: u.track as UserProfile['track'],
    bio: typeof u.bio === 'string' ? u.bio.trim() : '',
    interests: cleanedInterests,
    techStacks: cleanedTechStacks,
    wantedTechStacks: cleanedWantedTechStacks,
    desiredRoles: cleanedDesiredRoles,
    experiences: Array.isArray(u.experiences) ? u.experiences.filter((e): e is string => typeof e === 'string') : [],
    githubUrl: typeof u.githubUrl === 'string' ? u.githubUrl.trim() : null,
    portfolioUrl: typeof u.portfolioUrl === 'string' ? u.portfolioUrl.trim() : null,
    isPublic,
    visibility,
    otherInterest: typeof u.otherInterest === 'string' ? u.otherInterest.trim() : undefined,
    otherRole: typeof u.otherRole === 'string' ? u.otherRole.trim() : undefined,
    createdAt: typeof u.createdAt === 'string' ? u.createdAt : '',
    updatedAt: typeof u.updatedAt === 'string' ? u.updatedAt : '',
  };

  return { isValid: true, errors: [], data: profile };
}

/**
 * Opportunity DTO를 검증하고 알고리즘 입력용으로 정제합니다.
 */
export function validateOpportunity(dto: unknown): ValidationResult<Opportunity> {
  const errors: string[] = [];

  if (!dto || typeof dto !== 'object' || Array.isArray(dto)) {
    return { isValid: false, errors: ['Opportunity 데이터가 객체 형식이 아닙니다.'] };
  }

  const o = dto as Record<string, unknown>;

  if (typeof o.id !== 'string' || !o.id.trim()) {
    errors.push('id는 필수 문자열이어야 합니다.');
  }

  if (typeof o.title !== 'string' || !o.title.trim()) {
    errors.push('title은 필수 문자열이어야 합니다.');
  }

  const validStatuses = ['active', 'closed', 'needs_confirmation', 'draft'];
  if (typeof o.status !== 'string' || !validStatuses.includes(o.status)) {
    errors.push(`status는 ${validStatuses.join(', ')} 중 하나여야 합니다.`);
  }

  // tags
  let cleanedTags: string[] = [];
  if (Array.isArray(o.tags)) {
    cleanedTags = Array.from(
      new Set(
        o.tags
          .filter((t): t is string => typeof t === 'string' && t.trim().length > 0)
          .map((t) => t.trim())
      )
    );
  }

  // deadline ISO 파싱 확인
  const postedAt = parseOpportunityTimestamp(o.postedAt);
  if (o.postedAt == null || o.postedAt === '') errors.push('postedAt: unknown publication time');
  else if (!postedAt) errors.push('postedAt: invalid timestamp');
  const optionalDate = (field: 'deadline' | 'applicationStart'): string | null => {
    if (o[field] == null) return null;
    const parsed = parseOpportunityTimestamp(o[field]);
    if (!parsed) errors.push(field + ': invalid timestamp; unknown must be null');
    return parsed;
  };
  const deadline = optionalDate('deadline');
  const applicationStart = optionalDate('applicationStart');

  if (errors.length > 0) {
    return { isValid: false, errors };
  }

  const opportunity: Opportunity = {
    ...o,
    id: (o.id as string).trim(),
    title: (o.title as string).trim(),
    description: typeof o.description === 'string' ? o.description : '',
    category: (o.category as Opportunity['category']) ?? '공모전',
    tags: cleanedTags,
    organizer: typeof o.organizer === 'string' ? o.organizer : '컴퓨터학부',
    postedAt: postedAt!,
    applicationStart,
    deadline,
    sourceType: (o.sourceType as Opportunity['sourceType']) ?? 'knu_cse_official',
    status: o.status as Opportunity['status'],
    collectedAt: typeof o.collectedAt === 'string' ? o.collectedAt : '',
    updatedAt: typeof o.updatedAt === 'string' ? o.updatedAt : '',
  };

  return { isValid: true, errors: [], data: opportunity };
}
