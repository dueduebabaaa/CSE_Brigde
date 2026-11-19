import type { UserProfile as AlgorithmUserProfile } from '../types';
import type { PublicProfile, UserProfile as ServiceUserProfile } from '../services/profileService';
import { GRADE_OPTIONS, MAJOR_TRACKS } from '../constants/majors';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const requireString = (row: Record<string, unknown>, field: string): string => {
  const value = row[field];
  if (typeof value !== 'string') {
    throw new Error(`프로필 필드 형식이 올바르지 않습니다: ${field}`);
  }
  return value;
};

const isOneOf = <T extends string>(options: readonly T[], value: string): value is T =>
  options.some((option) => option === value);

const optionalString = (row: Record<string, unknown>, field: string): string | undefined => {
  const value = row[field];
  if (value === null || value === undefined) return undefined;
  if (typeof value !== 'string') {
    throw new Error(`프로필 필드 형식이 올바르지 않습니다: ${field}`);
  }
  return value;
};

const optionalNullableString = (row: Record<string, unknown>, field: string): string | null => {
  const value = row[field];
  if (value === null || value === undefined) return null;
  if (typeof value !== 'string') {
    throw new Error(`프로필 필드 형식이 올바르지 않습니다: ${field}`);
  }
  return value;
};

const stringArray = (row: Record<string, unknown>, field: string): string[] => {
  const value = row[field];
  if (value === null || value === undefined) return [];
  if (!Array.isArray(value) || !value.every((item) => typeof item === 'string')) {
    throw new Error(`프로필 배열 필드 형식이 올바르지 않습니다: ${field}`);
  }
  // Keep the caller's array, its values, and its order unchanged.
  return [...value];
};

/**
 * Convert the snake_case profile returned by profileService into the existing
 * camelCase contract consumed by the algorithms. Keep this object internal:
 * AlgorithmUserProfile requires email, so callers must never serialize this
 * result as a public profile response.
 *
 * Proficiency is intentionally not mapped because current algorithms do not
 * consume it and must not infer a score from it.
 */
export function toAlgorithmProfile(source: ServiceUserProfile): AlgorithmUserProfile {
  if (!isRecord(source)) throw new Error('프로필 데이터 형식이 올바르지 않습니다.');

  const id = requireString(source, 'id');
  const email = requireString(source, 'email');
  const name = requireString(source, 'name');
  const nickname = requireString(source, 'nickname');
  const grade = requireString(source, 'grade');
  const track = requireString(source, 'track');
  if (!isOneOf(GRADE_OPTIONS, grade)) throw new Error('학년 값이 올바르지 않습니다.');
  if (!isOneOf(MAJOR_TRACKS, track)) throw new Error('전공 트랙 값이 올바르지 않습니다.');
  const createdAt = requireString(source, 'created_at');
  const updatedAt = requireString(source, 'updated_at');
  const bio = optionalNullableString(source, 'bio') ?? '';
  const visibility = source.visibility;

  return {
    id,
    email,
    name,
    nickname,
    grade,
    track,
    bio,
    longBio: optionalString(source, 'long_bio'),
    interests: stringArray(source, 'interests'),
    techStacks: stringArray(source, 'tech_stacks'),
    wantedTechStacks: stringArray(source, 'wanted_tech_stacks'),
    desiredRoles: stringArray(source, 'desired_roles'),
    experiences: stringArray(source, 'experiences'),
    githubUrl: optionalNullableString(source, 'github_url'),
    portfolioUrl: optionalNullableString(source, 'portfolio_url'),
    visibility: visibility === 'public' || visibility === 'team_only' || visibility === 'private'
      ? visibility
      : undefined,
    // A legacy is_public=true value alone is not enough to assert public visibility.
    isPublic: visibility === 'public',
    createdAt,
    updatedAt,
  };
}

/**
 * Convert a PublicProfile (without email) into the camelCase contract consumed by algorithms.
 * An empty string is supplied for email to satisfy the type while ensuring private email is never stored or exposed.
 */
export function publicProfileToAlgorithmProfile(source: PublicProfile): AlgorithmUserProfile {
  if (!isRecord(source)) throw new Error('프로필 데이터 형식이 올바르지 않습니다.');

  const id = requireString(source, 'id');
  const name = requireString(source, 'name');
  const nickname = requireString(source, 'nickname');
  const grade = requireString(source, 'grade');
  const track = requireString(source, 'track');
  if (!isOneOf(GRADE_OPTIONS, grade)) throw new Error('학년 값이 올바르지 않습니다.');
  if (!isOneOf(MAJOR_TRACKS, track)) throw new Error('전공 트랙 값이 올바르지 않습니다.');
  const createdAt = requireString(source, 'created_at');
  const updatedAt = requireString(source, 'updated_at');
  const bio = optionalNullableString(source, 'bio') ?? '';
  const visibility = source.visibility;

  return {
    id,
    email: '',
    name,
    nickname,
    grade,
    track,
    bio,
    longBio: optionalString(source, 'long_bio'),
    interests: stringArray(source, 'interests'),
    techStacks: stringArray(source, 'tech_stacks'),
    wantedTechStacks: stringArray(source, 'wanted_tech_stacks'),
    desiredRoles: stringArray(source, 'desired_roles'),
    experiences: stringArray(source, 'experiences'),
    githubUrl: optionalNullableString(source, 'github_url'),
    portfolioUrl: optionalNullableString(source, 'portfolio_url'),
    visibility: visibility === 'public' || visibility === 'team_only' || visibility === 'private'
      ? visibility
      : undefined,
    isPublic: visibility === 'public' || (visibility === null && source.is_public === true),
    createdAt,
    updatedAt,
  };
}
