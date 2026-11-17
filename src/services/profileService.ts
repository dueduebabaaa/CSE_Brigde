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
  profile && profile.name?.trim() && profile.nickname?.trim()
  && profile.grade && profile.track && profile.visibility
  && profile.interests?.length && profile.desired_roles?.length
  && Array.isArray(profile.tech_stacks)
);
