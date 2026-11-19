import { supabase } from '../lib/supabase';
import { GRADE_OPTIONS, MAJOR_TRACKS, type GradeOption, type MajorTrack } from '../constants/majors';

export type ProfileVisibility = 'public' | 'team_only' | 'private';
export type TechProficiency = '입문' | '활용 가능' | '숙련';
export type ActivityMode = '대면' | '비대면' | '혼합';
export type ActivityDuration = '단기 (1개월 이내)' | '장기 (3개월 이상)' | '무관';
export type AvailabilityStatus = '팀 구하는 중' | '제안 환영' | '활동 중' | '참여 어려움';

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  nickname: string;
  grade: GradeOption;
  track: MajorTrack;
  department: string | null;
  bio: string | null;
  long_bio: string | null;
  interests: string[] | null;
  tech_stacks: string[] | null;
  tech_proficiency: Record<string, TechProficiency | null> | null;
  wanted_tech_stacks: string[] | null;
  desired_roles: string[] | null;
  activity_types: string[] | null;
  activity_goals: string[] | null;
  activity_mode: ActivityMode | null;
  activity_duration: ActivityDuration | null;
  availability_status: AvailabilityStatus | null;
  experiences: string[] | null;
  github_url: string | null;
  portfolio_url: string | null;
  is_public: boolean | null;
  visibility: ProfileVisibility | null;
  created_at: string;
  updated_at: string;
}

/**
 * 공개 사용자 프로필 (이메일 등 민감 개인정보 및 인증 정보 제외)
 */
export type PublicProfile = Omit<UserProfile, 'email'>;

export interface SearchPublicProfilesOptions {
  keyword?: string;
  grade?: GradeOption | GradeOption[];
  track?: MajorTrack | MajorTrack[];
  techStacks?: string[];
  techStackMatch?: 'any' | 'all';
  excludeUserId?: string;
  page?: number;
  pageSize?: number;
}

export interface PublicProfileSearchResult {
  profiles: PublicProfile[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasMore: boolean;
}

export interface ProfileUpsert {
  id: string;
  email: string;
  name: string;
  nickname: string;
  grade: GradeOption;
  track: MajorTrack;
  department: string;
  bio: string;
  long_bio: string;
  interests: string[];
  tech_stacks: string[];
  tech_proficiency: Record<string, TechProficiency | null>;
  wanted_tech_stacks: string[];
  desired_roles: string[];
  activity_types: string[];
  activity_goals: string[];
  activity_mode: ActivityMode | null;
  activity_duration: ActivityDuration | null;
  availability_status: AvailabilityStatus | null;
  experiences?: string[];
  github_url: string | null;
  portfolio_url: string | null;
  visibility: ProfileVisibility;
  is_public: boolean;
  updated_at: string;
}

type EditableProfileField = Exclude<keyof UserProfile, 'id' | 'email' | 'created_at' | 'updated_at'>;
export type ProfileUpdate = Partial<Pick<UserProfile, EditableProfileField>>;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const requiredString = (row: Record<string, unknown>, key: string) => {
  const value = row[key];
  if (typeof value !== 'string') throw new Error(`프로필 필드 형식 오류: ${key}`);
  return value;
};

const isOneOf = <T extends string>(options: readonly T[], value: string): value is T =>
  options.some((option) => option === value);

const nullableString = (row: Record<string, unknown>, key: string) => {
  const value = row[key];
  if (value === null || value === undefined) return null;
  if (typeof value !== 'string') throw new Error(`프로필 필드 형식 오류: ${key}`);
  return value;
};

const stringArray = (row: Record<string, unknown>, key: string) => {
  const value = row[key];
  if (value === null || value === undefined) return null;
  if (!Array.isArray(value) || !value.every((item): item is string => typeof item === 'string')) {
    throw new Error(`프로필 필드 형식 오류: ${key}`);
  }
  return value;
};

const nullableEnum = <T extends string>(row: Record<string, unknown>, key: string, options: readonly T[]): T | null => {
  const value = nullableString(row, key);
  if (value === null) return null;
  if (!isOneOf(options, value)) throw new Error(`프로필 필드 값이 올바르지 않습니다: ${key}`);
  return value;
};

export const profileVisibilityFromRow = (
  visibility: unknown,
  isPublic: unknown
): ProfileVisibility | null => {
  if (visibility === 'public' || visibility === 'team_only' || visibility === 'private') {
    return visibility;
  }
  // `false` cannot distinguish team_only from private, so do not reverse-map it.
  return isPublic === true ? 'public' : null;
};

export const mapProfileRow = (value: unknown): UserProfile => {
  if (!isRecord(value)) throw new Error('프로필 응답 형식이 올바르지 않습니다.');
  const gradeValue = requiredString(value, 'grade');
  const trackValue = requiredString(value, 'track');
  if (!isOneOf(GRADE_OPTIONS, gradeValue)) throw new Error('저장된 학년 값이 올바르지 않습니다.');
  if (!isOneOf(MAJOR_TRACKS, trackValue)) throw new Error('저장된 전공 값이 올바르지 않습니다.');

  const proficiencyValue = value.tech_proficiency;
  let techProficiency: UserProfile['tech_proficiency'] = null;
  if (proficiencyValue !== null && proficiencyValue !== undefined) {
    if (!isRecord(proficiencyValue)) throw new Error('저장된 기술 숙련도 형식이 올바르지 않습니다.');
    const parsed: Record<string, TechProficiency | null> = {};
    for (const [technology, level] of Object.entries(proficiencyValue)) {
      if (level === null || level === '입문' || level === '활용 가능' || level === '숙련') parsed[technology] = level;
      else throw new Error(`저장된 기술 숙련도 값이 올바르지 않습니다: ${technology}`);
    }
    techProficiency = parsed;
  }

  const visibilityValue = value.visibility;
  const isPublicValue = value.is_public;
  if (isPublicValue !== null && isPublicValue !== undefined && typeof isPublicValue !== 'boolean') {
    throw new Error('저장된 공개 범위 형식이 올바르지 않습니다.');
  }

  return {
    id: requiredString(value, 'id'),
    email: requiredString(value, 'email'),
    name: requiredString(value, 'name'),
    nickname: requiredString(value, 'nickname'),
    grade: gradeValue,
    track: trackValue,
    department: nullableString(value, 'department'),
    bio: nullableString(value, 'bio'),
    long_bio: nullableString(value, 'long_bio'),
    interests: stringArray(value, 'interests'),
    tech_stacks: stringArray(value, 'tech_stacks'),
    tech_proficiency: techProficiency,
    wanted_tech_stacks: stringArray(value, 'wanted_tech_stacks'),
    desired_roles: stringArray(value, 'desired_roles'),
    activity_types: stringArray(value, 'activity_types'),
    activity_goals: stringArray(value, 'activity_goals'),
    activity_mode: nullableEnum(value, 'activity_mode', ['대면', '비대면', '혼합']),
    activity_duration: nullableEnum(value, 'activity_duration', ['단기 (1개월 이내)', '장기 (3개월 이상)', '무관']),
    availability_status: nullableEnum(value, 'availability_status', ['팀 구하는 중', '제안 환영', '활동 중', '참여 어려움']),
    experiences: stringArray(value, 'experiences'),
    github_url: nullableString(value, 'github_url'),
    portfolio_url: nullableString(value, 'portfolio_url'),
    is_public: typeof isPublicValue === 'boolean' ? isPublicValue : null,
    visibility: profileVisibilityFromRow(visibilityValue, isPublicValue),
    created_at: requiredString(value, 'created_at'),
    updated_at: requiredString(value, 'updated_at'),
  };
};

export const PUBLIC_PROFILE_COLUMNS = [
  'id',
  'name',
  'nickname',
  'grade',
  'track',
  'department',
  'bio',
  'long_bio',
  'interests',
  'tech_stacks',
  'tech_proficiency',
  'wanted_tech_stacks',
  'desired_roles',
  'activity_types',
  'activity_goals',
  'activity_mode',
  'activity_duration',
  'availability_status',
  'experiences',
  'github_url',
  'portfolio_url',
  'is_public',
  'visibility',
  'created_at',
  'updated_at',
].join(',');

// Keep aligned with the profile RLS policies and public_profiles view.
// Explicit public visibility is honored unless is_public explicitly disables it;
// legacy rows are public only when is_public is true.
const PUBLIC_PROFILE_SCOPE_FILTER = [
  'and(visibility.eq.public,is_public.eq.true)',
  'and(visibility.eq.public,is_public.is.null)',
  'and(visibility.is.null,is_public.eq.true)',
].join(',');

const buildPublicProfileSearchFilter = (keyword?: string): string => {
  if (!keyword) return PUBLIC_PROFILE_SCOPE_FILTER;
  const sanitized = keyword.replace(/[%_,()]/g, '');
  if (!sanitized) return PUBLIC_PROFILE_SCOPE_FILTER;
  const keywordFilter = [
    `name.ilike.%${sanitized}%`,
    `nickname.ilike.%${sanitized}%`,
    `bio.ilike.%${sanitized}%`,
  ].join(',');
  // Keep scope and keyword search in one PostgREST `or` parameter.
  return `and(or(${PUBLIC_PROFILE_SCOPE_FILTER}),or(${keywordFilter}))`;
};

export const isPublicProfileRow = (row: unknown): boolean => {
  if (!isRecord(row)) return false;
  const visibility = row.visibility;
  const isPublic = row.is_public;
  const eff = profileVisibilityFromRow(visibility, isPublic);
  return eff === 'public' && isPublic !== false;
};

export const mapPublicProfileRow = (value: unknown): PublicProfile => {
  if (!isRecord(value)) throw new Error('프로필 응답 형식이 올바르지 않습니다.');
  const gradeValue = requiredString(value, 'grade');
  const trackValue = requiredString(value, 'track');
  if (!isOneOf(GRADE_OPTIONS, gradeValue)) throw new Error('저장된 학년 값이 올바르지 않습니다.');
  if (!isOneOf(MAJOR_TRACKS, trackValue)) throw new Error('저장된 전공 값이 올바르지 않습니다.');

  const proficiencyValue = value.tech_proficiency;
  let techProficiency: PublicProfile['tech_proficiency'] = null;
  if (proficiencyValue !== null && proficiencyValue !== undefined) {
    if (!isRecord(proficiencyValue)) throw new Error('저장된 기술 숙련도 형식이 올바르지 않습니다.');
    const parsed: Record<string, TechProficiency | null> = {};
    for (const [technology, level] of Object.entries(proficiencyValue)) {
      if (level === null || level === '입문' || level === '활용 가능' || level === '숙련') parsed[technology] = level;
      else throw new Error(`저장된 기술 숙련도 값이 올바르지 않습니다: ${technology}`);
    }
    techProficiency = parsed;
  }

  const visibilityValue = value.visibility;
  const isPublicValue = value.is_public;
  if (isPublicValue !== null && isPublicValue !== undefined && typeof isPublicValue !== 'boolean') {
    throw new Error('저장된 공개 범위 형식이 올바르지 않습니다.');
  }

  return {
    id: requiredString(value, 'id'),
    name: requiredString(value, 'name'),
    nickname: requiredString(value, 'nickname'),
    grade: gradeValue,
    track: trackValue,
    department: nullableString(value, 'department'),
    bio: nullableString(value, 'bio'),
    long_bio: nullableString(value, 'long_bio'),
    interests: stringArray(value, 'interests'),
    tech_stacks: stringArray(value, 'tech_stacks'),
    tech_proficiency: techProficiency,
    wanted_tech_stacks: stringArray(value, 'wanted_tech_stacks'),
    desired_roles: stringArray(value, 'desired_roles'),
    activity_types: stringArray(value, 'activity_types'),
    activity_goals: stringArray(value, 'activity_goals'),
    activity_mode: nullableEnum(value, 'activity_mode', ['대면', '비대면', '혼합']),
    activity_duration: nullableEnum(value, 'activity_duration', ['단기 (1개월 이내)', '장기 (3개월 이상)', '무관']),
    availability_status: nullableEnum(value, 'availability_status', ['팀 구하는 중', '제안 환영', '활동 중', '참여 어려움']),
    experiences: stringArray(value, 'experiences'),
    github_url: nullableString(value, 'github_url'),
    portfolio_url: nullableString(value, 'portfolio_url'),
    is_public: typeof isPublicValue === 'boolean' ? isPublicValue : null,
    visibility: profileVisibilityFromRow(visibilityValue, isPublicValue),
    created_at: requiredString(value, 'created_at'),
    updated_at: requiredString(value, 'updated_at'),
  };
};

export const fetchPublicProfileById = async (userId: string): Promise<PublicProfile | null> => {
  if (typeof userId !== 'string' || !userId.trim()) {
    return null;
  }

  const { data, error } = await supabase
    .from('profiles')
    .select(PUBLIC_PROFILE_COLUMNS)
    .eq('id', userId.trim())
    .maybeSingle();

  if (error) {
    throw new Error(`공개 프로필 조회 실패: ${error.message}`);
  }

  if (!data) {
    return null;
  }

  if (!isPublicProfileRow(data)) {
    return null;
  }

  return mapPublicProfileRow(data);
};

export const searchPublicProfiles = async (
  options: SearchPublicProfilesOptions = {}
): Promise<PublicProfileSearchResult> => {
  const page = Math.max(1, Math.floor(options.page ?? 1));
  const pageSize = Math.max(1, Math.min(100, Math.floor(options.pageSize ?? 12)));
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from('profiles')
    .select(PUBLIC_PROFILE_COLUMNS, { count: 'exact' });

  // Filter rows and exact counts on the server using the same public scope.
  const keyword = typeof options.keyword === 'string' ? options.keyword.trim() : '';
  query = query.or(buildPublicProfileSearchFilter(keyword));

  // 2. 본인 계정 제외 (옵션)
  if (typeof options.excludeUserId === 'string' && options.excludeUserId.trim()) {
    query = query.neq('id', options.excludeUserId.trim());
  }

  // 3. 학년 필터 (단일 또는 복수)
  if (options.grade) {
    if (Array.isArray(options.grade)) {
      const validGrades = options.grade.filter((g) => isOneOf(GRADE_OPTIONS, g));
      if (validGrades.length > 0) {
        query = query.in('grade', validGrades);
      }
    } else if (isOneOf(GRADE_OPTIONS, options.grade)) {
      query = query.eq('grade', options.grade);
    }
  }

  // 4. 전공 트랙 필터 (단일 또는 복수)
  if (options.track) {
    if (Array.isArray(options.track)) {
      const validTracks = options.track.filter((t) => isOneOf(MAJOR_TRACKS, t));
      if (validTracks.length > 0) {
        query = query.in('track', validTracks);
      }
    } else if (isOneOf(MAJOR_TRACKS, options.track)) {
      query = query.eq('track', options.track);
    }
  }

  // 5. 기술 스택 필터
  if (Array.isArray(options.techStacks) && options.techStacks.length > 0) {
    const cleanedTechs = options.techStacks
      .filter((t): t is string => typeof t === 'string' && t.trim().length > 0)
      .map((t) => t.trim());
    if (cleanedTechs.length > 0) {
      if (options.techStackMatch === 'all') {
        query = query.contains('tech_stacks', cleanedTechs);
      } else {
        query = query.overlaps('tech_stacks', cleanedTechs);
      }
    }
  }

  // 6. 정렬 및 페이지네이션
  query = query.order('updated_at', { ascending: false }).range(from, to);

  const { data, error, count } = await query;

  if (error) {
    throw new Error(`공개 프로필 목록 검색 실패: ${error.message}`);
  }

  if (!Array.isArray(data)) {
    throw new Error('프로필 응답 형식이 올바르지 않습니다.');
  }

  // DB 필터링 외에도 애플리케이션 레벨에서 비공개 프로필 재차 방어 필터링
  const profiles = data
    .filter(isPublicProfileRow)
    .map(mapPublicProfileRow);

  const totalCount = typeof count === 'number' ? count : profiles.length;
  const totalPages = Math.ceil(totalCount / pageSize);
  const hasMore = page < totalPages;

  return {
    profiles,
    totalCount,
    page,
    pageSize,
    totalPages,
    hasMore,
  };
};

export const fetchMyProfile = async (userId: string) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('id,email,name,nickname,grade,track,department,bio,long_bio,interests,tech_stacks,tech_proficiency,wanted_tech_stacks,desired_roles,activity_types,activity_goals,activity_mode,activity_duration,availability_status,experiences,github_url,portfolio_url,is_public,visibility,created_at,updated_at')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    throw new Error(`프로필 조회 실패: ${error.message}`);
  }

  return data === null ? null : mapProfileRow(data);
};

export const saveMyProfile = async (profile: ProfileUpsert) => {
  const { data, error } = await supabase
    .from('profiles')
    .upsert(profile, { onConflict: 'id' })
    .select()
    .single();

  if (error) {
    throw new Error(`프로필 저장 실패: ${error.message}`);
  }

  return mapProfileRow(data);
};

const PROFILE_UPDATE_FIELDS = new Set<EditableProfileField>([
  'name', 'nickname', 'grade', 'track', 'department', 'bio', 'long_bio',
  'interests', 'tech_stacks', 'tech_proficiency', 'wanted_tech_stacks',
  'desired_roles', 'activity_types', 'activity_goals', 'activity_mode',
  'activity_duration', 'availability_status', 'experiences', 'github_url',
  'portfolio_url', 'is_public', 'visibility',
]);

const validateProfileUpdate = (updates: ProfileUpdate): ProfileUpdate => {
  if (!isRecord(updates)) throw new Error('프로필 수정 데이터 형식이 올바르지 않습니다.');
  const row = updates as Record<string, unknown>;

  for (const [field, value] of Object.entries(row)) {
    if (!PROFILE_UPDATE_FIELDS.has(field as EditableProfileField)) {
      throw new Error(`수정할 수 없는 프로필 필드입니다: ${field}`);
    }
    if (value === undefined) {
      throw new Error(`프로필 필드를 생략하거나 유효한 값으로 전달해 주세요: ${field}`);
    }

    if (field === 'grade') {
      if (typeof value !== 'string' || !isOneOf(GRADE_OPTIONS, value)) {
        throw new Error('저장된 학년 값이 올바르지 않습니다.');
      }
    } else if (field === 'track') {
      if (typeof value !== 'string' || !isOneOf(MAJOR_TRACKS, value)) {
        throw new Error('저장된 전공 값이 올바르지 않습니다.');
      }
    } else if (['name', 'nickname'].includes(field)) {
      if (typeof value !== 'string') throw new Error(`프로필 필드 형식 오류: ${field}`);
    } else if (['department', 'bio', 'long_bio', 'github_url', 'portfolio_url'].includes(field)) {
      if (value !== null && typeof value !== 'string') {
        throw new Error(`프로필 필드 형식 오류: ${field}`);
      }
    } else if ([
      'interests', 'tech_stacks', 'wanted_tech_stacks', 'desired_roles',
      'activity_types', 'activity_goals', 'experiences',
    ].includes(field)) {
      if (value !== null && (!Array.isArray(value) || !value.every((item) => typeof item === 'string'))) {
        throw new Error(`프로필 필드 형식 오류: ${field}`);
      }
    } else if (field === 'tech_proficiency') {
      if (value !== null) {
        if (!isRecord(value)) throw new Error('저장된 기술 숙련도 형식이 올바르지 않습니다.');
        for (const [technology, level] of Object.entries(value)) {
          if (level !== null && level !== '입문' && level !== '활용 가능' && level !== '숙련') {
            throw new Error(`저장된 기술 숙련도 값이 올바르지 않습니다: ${technology}`);
          }
        }
      }
    } else if (field === 'activity_mode') {
      nullableEnum({ activity_mode: value }, 'activity_mode', ['대면', '비대면', '혼합']);
    } else if (field === 'activity_duration') {
      nullableEnum(
        { activity_duration: value },
        'activity_duration',
        ['단기 (1개월 이내)', '장기 (3개월 이상)', '무관'],
      );
    } else if (field === 'availability_status') {
      nullableEnum(
        { availability_status: value },
        'availability_status',
        ['팀 구하는 중', '제안 환영', '활동 중', '참여 어려움'],
      );
    } else if (field === 'visibility') {
      if (value !== null && value !== 'public' && value !== 'team_only' && value !== 'private') {
        throw new Error('저장된 공개 범위 값이 올바르지 않습니다.');
      }
    } else if (field === 'is_public' && value !== null && typeof value !== 'boolean') {
      throw new Error('저장된 공개 범위 형식이 올바르지 않습니다.');
    }
  }

  return { ...updates };
};

/**
 * Update only the explicitly supplied fields on the signed-in user's profile.
 * An empty patch performs no write and returns the current profile (or null).
 */
export const updateMyProfile = async (updates: ProfileUpdate): Promise<UserProfile | null> => {
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError) throw new Error(`로그인 사용자 확인 실패: ${authError.message}`);
  const userId = authData.user?.id;
  if (!userId) throw new Error('로그인한 사용자만 프로필을 수정할 수 있습니다.');

  const patch = validateProfileUpdate(updates);
  if (Object.keys(patch).length === 0) {
    return fetchMyProfile(userId);
  }

  const { data, error } = await supabase
    .from('profiles')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', userId)
    .select()
    .maybeSingle();

  if (error) throw new Error(`프로필 수정 실패: ${error.message}`);
  if (data === null) throw new Error('수정할 내 프로필을 찾지 못했습니다.');
  return mapProfileRow(data);
};

export const isProfileComplete = (profile: UserProfile | null) => Boolean(
  profile && profile.name?.trim()
  && profile.grade && profile.track && profile.visibility
  && profile.interests?.length && profile.desired_roles?.length
  && Array.isArray(profile.tech_stacks)
);
