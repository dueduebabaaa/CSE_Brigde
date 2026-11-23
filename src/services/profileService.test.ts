import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MAJOR_TRACKS } from '../constants/majors';

const supabaseMocks = vi.hoisted(() => {
  const queryResult = { data: [] as unknown[] | null, error: null as unknown, count: 0 as number | null };
  return {
    getUser: vi.fn(),
    from: vi.fn(),
    rpc: vi.fn(),
    upsert: vi.fn(),
    single: vi.fn(),
    update: vi.fn(),
    eq: vi.fn(),
    select: vi.fn(),
    maybeSingle: vi.fn(),
    or: vi.fn(),
    neq: vi.fn(),
    in: vi.fn(),
    contains: vi.fn(),
    overlaps: vi.fn(),
    order: vi.fn(),
    range: vi.fn(),
    queryResult,
  };
});

vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: { getUser: supabaseMocks.getUser },
    from: supabaseMocks.from,
    rpc: supabaseMocks.rpc,
  },
}));

import {
  isProfileComplete,
  isPublicProfileRow,
  mapProfileRow,
  mapPublicProfileRow,
  profileVisibilityFromRow,
  updateMyProfile,
  fetchMyProfile,
  saveMyProfile,
  fetchPublicProfileById,
  searchPublicProfiles,
} from './profileService';

const baseProfile = {
  id: 'user-1',
  email: 'student@knu.ac.kr',
  name: '학생',
  nickname: '닉네임',
  grade: '1학년',
  track: '플랫폼소프트웨어전공',
  department: '경북대학교 컴퓨터학부',
  bio: '',
  long_bio: '',
  interests: ['웹 개발', '컴퓨터 그래픽스'],
  tech_stacks: ['React'],
  tech_proficiency: { React: null },
  wanted_tech_stacks: ['Rust'],
  desired_roles: ['Frontend', '신규 역할'],
  activity_types: ['해커톤'],
  activity_goals: ['기술 학습'],
  activity_mode: '혼합',
  activity_duration: null,
  availability_status: '제안 환영',
  experiences: [],
  github_url: null,
  portfolio_url: null,
  is_public: false,
  visibility: 'team_only',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

const publicRow = {
  ...baseProfile,
  id: 'user-public-1',
  name: '공개학생',
  nickname: '공개닉네임',
  bio: '공개 사용자 한 줄 소개',
  is_public: true,
  visibility: 'public',
  tech_stacks: ['React', 'TypeScript'],
};

const query: Record<string, unknown> = {
  update: supabaseMocks.update,
  eq: supabaseMocks.eq,
  select: supabaseMocks.select,
  maybeSingle: supabaseMocks.maybeSingle,
  upsert: supabaseMocks.upsert,
  single: supabaseMocks.single,
  or: supabaseMocks.or,
  neq: supabaseMocks.neq,
  in: supabaseMocks.in,
  contains: supabaseMocks.contains,
  overlaps: supabaseMocks.overlaps,
  order: supabaseMocks.order,
  range: supabaseMocks.range,
  then(onfulfilled: (res: unknown) => unknown, onrejected?: (err: unknown) => unknown) {
    return Promise.resolve(supabaseMocks.queryResult).then(onfulfilled, onrejected);
  },
};

supabaseMocks.from.mockReturnValue(query);
supabaseMocks.update.mockReturnValue(query);
supabaseMocks.eq.mockReturnValue(query);
supabaseMocks.select.mockReturnValue(query);
supabaseMocks.or.mockReturnValue(query);
supabaseMocks.neq.mockReturnValue(query);
supabaseMocks.in.mockReturnValue(query);
supabaseMocks.contains.mockReturnValue(query);
supabaseMocks.overlaps.mockReturnValue(query);
supabaseMocks.order.mockReturnValue(query);
supabaseMocks.range.mockReturnValue(query);

describe('프로필 행 변환', () => {
  it('입력한 목록, 자유 입력과 숙련도 미입력을 그대로 복원한다', () => {
    const profile = mapProfileRow(baseProfile);
    expect(profile.interests).toEqual(['웹 개발', '컴퓨터 그래픽스']);
    expect(profile.desired_roles).toEqual(['Frontend', '신규 역할']);
    expect(profile.tech_proficiency).toEqual({ React: null });
    expect(profile.activity_types).toEqual(['해커톤']);
  });

  it('유효한 visibility를 is_public보다 우선하고 legacy true만 public으로 변환한다', () => {
    expect(profileVisibilityFromRow('team_only', true)).toBe('team_only');
    expect(profileVisibilityFromRow(null, true)).toBe('public');
    expect(profileVisibilityFromRow(null, false)).toBeNull();
  });

  it('잘못된 저장값을 조용히 버리지 않고 조회 오류로 처리한다', () => {
    expect(() => mapProfileRow({ ...baseProfile, tech_proficiency: { React: '초급' } })).toThrow();
  });
});

describe('프로필 완료 판정', () => {
  it('nickname이 빈 문자열이어도 프로필을 완료로 판정한다', () => {
    expect(isProfileComplete(mapProfileRow({ ...baseProfile, nickname: '' }))).toBe(true);
  });

  it('name이 빈 문자열이면 프로필을 미완료로 판정한다', () => {
    expect(isProfileComplete(mapProfileRow({ ...baseProfile, name: '' }))).toBe(false);
  });
});

describe('내 프로필 부분 수정', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    supabaseMocks.getUser.mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    });
    supabaseMocks.from.mockReturnValue(query);
    supabaseMocks.update.mockReturnValue(query);
    supabaseMocks.eq.mockReturnValue(query);
    supabaseMocks.select.mockReturnValue(query);
    supabaseMocks.maybeSingle.mockResolvedValue({ data: baseProfile, error: null });
  });

  it('명시적으로 전달한 빈 문자열, null, 빈 배열만 update하고 기존 필드는 유지한다', async () => {
    const updatedRow = { ...baseProfile, bio: '', long_bio: null, interests: [] };
    supabaseMocks.maybeSingle.mockResolvedValueOnce({ data: updatedRow, error: null });

    const result = await updateMyProfile({ bio: '', long_bio: null, interests: [] });

    expect(supabaseMocks.update).toHaveBeenCalledWith(expect.objectContaining({
      bio: '',
      long_bio: null,
      interests: [],
      updated_at: expect.any(String),
    }));
    const payload = supabaseMocks.update.mock.calls[0][0];
    expect(payload).not.toHaveProperty('name');
    expect(payload).not.toHaveProperty('grade');
    expect(payload).not.toHaveProperty('tech_stacks');
    expect(result).toMatchObject({
      name: baseProfile.name,
      nickname: baseProfile.nickname,
      bio: '',
      long_bio: null,
      interests: [],
      tech_stacks: baseProfile.tech_stacks,
    });
  });

  it('name만 전달하면 name과 updated_at만 update한다', async () => {
    supabaseMocks.maybeSingle.mockResolvedValueOnce({
      data: { ...baseProfile, name: '새 이름' },
      error: null,
    });

    const result = await updateMyProfile({ name: '새 이름' });

    const payload = supabaseMocks.update.mock.calls[0][0];
    expect(payload).toEqual({ name: '새 이름', updated_at: expect.any(String) });
    expect(payload).not.toHaveProperty('nickname');
    expect(result?.name).toBe('새 이름');
  });

  it('nickname만 전달하면 nickname과 updated_at만 update한다', async () => {
    supabaseMocks.maybeSingle.mockResolvedValueOnce({
      data: { ...baseProfile, nickname: '새 닉네임' },
      error: null,
    });

    const result = await updateMyProfile({ nickname: '새 닉네임' });

    const payload = supabaseMocks.update.mock.calls[0][0];
    expect(payload).toEqual({ nickname: '새 닉네임', updated_at: expect.any(String) });
    expect(payload).not.toHaveProperty('name');
    expect(result?.nickname).toBe('새 닉네임');
  });

  it('로그인한 사용자 ID를 update 조건에 사용한다', async () => {
    await updateMyProfile({ nickname: '새 닉네임' });

    expect(supabaseMocks.from).toHaveBeenCalledWith('profiles');
    expect(supabaseMocks.eq).toHaveBeenCalledWith('id', 'user-1');
  });

  it('저장 실패를 오류로 전달한다', async () => {
    supabaseMocks.maybeSingle.mockResolvedValueOnce({
      data: null,
      error: { message: 'permission denied' },
    });

    await expect(updateMyProfile({ bio: '수정 소개' }))
      .rejects.toThrow('프로필 수정 실패: permission denied');
  });

  it('변경 필드가 없으면 update하지 않고 현재 프로필을 조회한다', async () => {
    const result = await updateMyProfile({});

    expect(supabaseMocks.update).not.toHaveBeenCalled();
    expect(supabaseMocks.eq).toHaveBeenCalledWith('id', 'user-1');
    expect(result).toMatchObject({ id: 'user-1', name: baseProfile.name });
  });
});

describe('isPublicProfileRow', () => {
  it('visibility가 public이고 is_public이 false가 아닐 때 참을 반환한다', () => {
    expect(isPublicProfileRow({ visibility: 'public', is_public: true })).toBe(true);
    expect(isPublicProfileRow({ visibility: 'public', is_public: null })).toBe(true);
  });

  it('visibility가 public이어도 is_public이 명시적 false이면 거짓을 반환한다', () => {
    expect(isPublicProfileRow({ visibility: 'public', is_public: false })).toBe(false);
  });

  it('visibility가 team_only 또는 private이면 항상 거짓을 반환한다', () => {
    expect(isPublicProfileRow({ visibility: 'team_only', is_public: true })).toBe(false);
    expect(isPublicProfileRow({ visibility: 'private', is_public: true })).toBe(false);
  });

  it('legacy 데이터에서 visibility가 null이고 is_public이 true인 경우 참을 반환한다', () => {
    expect(isPublicProfileRow({ visibility: null, is_public: true })).toBe(true);
    expect(isPublicProfileRow({ visibility: null, is_public: false })).toBe(false);
    expect(isPublicProfileRow({ visibility: null, is_public: null })).toBe(false);
  });

  it('잘못된 입력값에 대해 false를 반환한다', () => {
    expect(isPublicProfileRow(null)).toBe(false);
    expect(isPublicProfileRow(undefined)).toBe(false);
    expect(isPublicProfileRow('string')).toBe(false);
  });
});

describe('mapPublicProfileRow', () => {
  it('이메일(email) 필드가 결과 객체에 절대 포함되지 않는다', () => {
    const result = mapPublicProfileRow({
      ...publicRow,
      email: 'sensitive@knu.ac.kr',
    });

    expect(result).not.toHaveProperty('email');
    expect((result as Record<string, unknown>).email).toBeUndefined();
    expect(result.id).toBe('user-public-1');
    expect(result.name).toBe('공개학생');
    expect(result.nickname).toBe('공개닉네임');
    expect(result.track).toBe('플랫폼소프트웨어전공');
    expect(result.grade).toBe('1학년');
  });

  it('유효하지 않은 학년이나 전공 값은 에러를 발생시킨다', () => {
    expect(() => mapPublicProfileRow({ ...publicRow, grade: '10학년' })).toThrow(/학년/);
    expect(() => mapPublicProfileRow({ ...publicRow, track: '경영학과' })).toThrow(/전공/);
  });
});

describe('public profile security RPC client', () => {
  const payload = { profiles: [publicRow], totalCount: 1, page: 1, pageSize: 12, totalPages: 1, hasMore: false };
  beforeEach(() => {
    vi.clearAllMocks();
    supabaseMocks.from.mockReturnValue(query);
    supabaseMocks.select.mockReturnValue(query);
    supabaseMocks.eq.mockReturnValue(query);
    supabaseMocks.maybeSingle.mockResolvedValue({ data: baseProfile, error: null });
    supabaseMocks.upsert.mockReturnValue(query);
    supabaseMocks.single.mockResolvedValue({ data: baseProfile, error: null });
    supabaseMocks.rpc.mockResolvedValue({ data: publicRow, error: null });
  });
  it('keeps own profile email read available', async () => {
    const result = await fetchMyProfile('user-1');
    expect(supabaseMocks.select.mock.calls[0][0]).toContain('email');
    expect(result?.email).toBe('student@knu.ac.kr');
  });
  it('keeps onboarding profile upsert available', async () => {
    const profile = baseProfile as unknown as Parameters<typeof saveMyProfile>[0];
    const result = await saveMyProfile(profile);
    expect(supabaseMocks.upsert).toHaveBeenCalledWith(profile, { onConflict: 'id' });
    expect(result.email).toBe('student@knu.ac.kr');
  });
  it('uses fixed public profile RPC and returns no email', async () => {
    const result = await fetchPublicProfileById('user-public-1');
    expect(supabaseMocks.rpc).toHaveBeenCalledWith('bridge_m20261119_fetch_public_profile', { p_user_id: 'user-public-1' });
    expect(supabaseMocks.from).not.toHaveBeenCalled();
    expect(result).not.toHaveProperty('email');
    expect(result).toMatchObject({
      id: 'user-public-1',
      name: publicRow.name,
      nickname: publicRow.nickname,
      grade: publicRow.grade,
      track: publicRow.track,
    });
  });
  it('returns null for private profiles and propagates auth failures', async () => {
    supabaseMocks.rpc.mockResolvedValueOnce({ data: null, error: null });
    expect(await fetchPublicProfileById('private-user')).toBeNull();
    supabaseMocks.rpc.mockResolvedValueOnce({ data: null, error: { message: 'UNAUTHENTICATED' } });
    await expect(fetchPublicProfileById('public-user')).rejects.toThrow('UNAUTHENTICATED');
    supabaseMocks.rpc.mockResolvedValueOnce({ data: null, error: { message: 'SCHOOL_EMAIL_REQUIRED' } });
    await expect(fetchPublicProfileById('public-user')).rejects.toThrow('SCHOOL_EMAIL_REQUIRED');
  });
  it('sends search filters and pagination to the RPC', async () => {
    supabaseMocks.rpc.mockResolvedValueOnce({ data: { ...payload, page: 2, pageSize: 10 }, error: null });
    const result = await searchPublicProfiles({ keyword: 'keyword', techStacks: [' React ', 'TypeScript'], techStackMatch: 'all', excludeUserId: 'excluded', page: 2, pageSize: 10 });
    expect(supabaseMocks.rpc).toHaveBeenCalledWith('bridge_m20261119_search_public_profiles', {
      p_keyword: 'keyword', p_grades: [], p_tracks: [], p_tech_stacks: ['React', 'TypeScript'],
      p_tech_stack_match: 'all', p_exclude_user_id: 'excluded', p_page: 2, p_page_size: 10,
    });
    expect(result.profiles[0]).toMatchObject({
      id: 'user-public-1',
      name: publicRow.name,
      nickname: publicRow.nickname,
      grade: publicRow.grade,
      track: publicRow.track,
    });
    expect(result.profiles[0]).not.toHaveProperty('email');
    expect(result.totalCount).toBe(1);
  });
  it('maps single and multiple grade filters to RPC arguments', async () => {
    supabaseMocks.rpc.mockResolvedValue({ data: { ...payload, profiles: [] }, error: null });
    await searchPublicProfiles({ grade: '3학년' });
    expect(supabaseMocks.rpc).toHaveBeenLastCalledWith('bridge_m20261119_search_public_profiles', expect.objectContaining({
      p_grades: ['3학년'],
    }));

    await searchPublicProfiles({ grade: ['2학년', '3학년'] });
    expect(supabaseMocks.rpc).toHaveBeenLastCalledWith('bridge_m20261119_search_public_profiles', expect.objectContaining({
      p_grades: ['2학년', '3학년'],
    }));
  });
  it('maps single and multiple track filters to RPC arguments', async () => {
    supabaseMocks.rpc.mockResolvedValue({ data: { ...payload, profiles: [] }, error: null });
    await searchPublicProfiles({ track: '인공지능컴퓨팅전공' });
    expect(supabaseMocks.rpc).toHaveBeenLastCalledWith('bridge_m20261119_search_public_profiles', expect.objectContaining({
      p_tracks: ['인공지능컴퓨팅전공'],
    }));

    const tracks = [MAJOR_TRACKS[1], MAJOR_TRACKS[2]];
    await searchPublicProfiles({ track: tracks });
    expect(supabaseMocks.rpc).toHaveBeenLastCalledWith('bridge_m20261119_search_public_profiles', expect.objectContaining({
      p_tracks: tracks,
    }));
  });
  it('sends combined keyword, grade, track, tech and exclude filters together', async () => {
    supabaseMocks.rpc.mockResolvedValueOnce({ data: { ...payload, profiles: [] }, error: null });
    await searchPublicProfiles({
      keyword: '컴퓨터',
      grade: ['2학년', '3학년'],
      track: '인공지능컴퓨팅전공',
      techStacks: ['React', 'TypeScript'],
      techStackMatch: 'any',
      excludeUserId: 'self',
    });
    expect(supabaseMocks.rpc).toHaveBeenCalledWith('bridge_m20261119_search_public_profiles', {
      p_keyword: '컴퓨터',
      p_grades: ['2학년', '3학년'],
      p_tracks: ['인공지능컴퓨팅전공'],
      p_tech_stacks: ['React', 'TypeScript'],
      p_tech_stack_match: 'any',
      p_exclude_user_id: 'self',
      p_page: 1,
      p_page_size: 12,
    });
  });
  it('returns an empty page and server pagination metadata when no profiles match', async () => {
    supabaseMocks.rpc.mockResolvedValueOnce({
      data: { profiles: [], totalCount: 0, page: 1, pageSize: 12, totalPages: 0, hasMore: false },
      error: null,
    });
    await expect(searchPublicProfiles()).resolves.toEqual({
      profiles: [], totalCount: 0, page: 1, pageSize: 12, totalPages: 0, hasMore: false,
    });
  });
  it('propagates search RPC errors without querying profiles directly', async () => {
    supabaseMocks.rpc.mockResolvedValueOnce({ data: null, error: { message: 'Query error' } });
    await expect(searchPublicProfiles()).rejects.toThrow('Query error');
    expect(supabaseMocks.from).not.toHaveBeenCalled();
  });
  it('does not call the detail RPC for a blank user id', async () => {
    expect(await fetchPublicProfileById('  ')).toBeNull();
    expect(supabaseMocks.rpc).not.toHaveBeenCalled();
  });
  it('rejects private rows returned by malformed RPC data', async () => {
    supabaseMocks.rpc.mockResolvedValueOnce({
      data: { ...payload, profiles: [{ ...publicRow, visibility: 'private', is_public: false }] }, error: null,
    });
    await expect(searchPublicProfiles()).rejects.toThrow();
  });
  it('does not return email even if the RPC response contains an unexpected property', async () => {
    supabaseMocks.rpc.mockResolvedValueOnce({ data: { ...publicRow, email: 'private@knu.ac.kr' }, error: null });
    const result = await fetchPublicProfileById('user-public-1');
    expect(result).not.toHaveProperty('email');
  });
});
