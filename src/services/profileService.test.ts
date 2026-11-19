import { beforeEach, describe, expect, it, vi } from 'vitest';

const supabaseMocks = vi.hoisted(() => {
  const queryResult = { data: [] as unknown[] | null, error: null as unknown, count: 0 as number | null };
  return {
    getUser: vi.fn(),
    from: vi.fn(),
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
  },
}));

import {
  isProfileComplete,
  isPublicProfileRow,
  mapProfileRow,
  mapPublicProfileRow,
  profileVisibilityFromRow,
  updateMyProfile,
  fetchPublicProfileById,
  searchPublicProfiles,
  PUBLIC_PROFILE_COLUMNS,
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

describe('fetchPublicProfileById (공개 프로필 상세 조회)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    supabaseMocks.queryResult = { data: [], error: null, count: 0 };
    supabaseMocks.from.mockReturnValue(query);
    supabaseMocks.select.mockReturnValue(query);
    supabaseMocks.eq.mockReturnValue(query);
    supabaseMocks.maybeSingle.mockResolvedValue({ data: publicRow, error: null });
  });

  it('공개 프로필을 정상 조회하고 이메일은 반환하지 않는다', async () => {
    const result = await fetchPublicProfileById('user-public-1');

    expect(supabaseMocks.from).toHaveBeenCalledWith('profiles');
    expect(supabaseMocks.select).toHaveBeenCalledWith(PUBLIC_PROFILE_COLUMNS);
    expect(PUBLIC_PROFILE_COLUMNS).not.toContain('email');
    expect(supabaseMocks.eq).toHaveBeenCalledWith('id', 'user-public-1');
    expect(result).not.toBeNull();
    expect(result?.id).toBe('user-public-1');
    expect(result).not.toHaveProperty('email');
  });

  it('비공개 사용자(visibility: private) 조회 시 안전하게 null을 반환한다', async () => {
    supabaseMocks.maybeSingle.mockResolvedValueOnce({
      data: { ...publicRow, visibility: 'private', is_public: false },
      error: null,
    });

    const result = await fetchPublicProfileById('user-private-1');
    expect(result).toBeNull();
  });

  it('팀 공개(visibility: team_only) 사용자 조회 시 안전하게 null을 반환한다', async () => {
    supabaseMocks.maybeSingle.mockResolvedValueOnce({
      data: { ...publicRow, visibility: 'team_only' },
      error: null,
    });

    const result = await fetchPublicProfileById('user-team-1');
    expect(result).toBeNull();
  });

  it('visibility가 public이어도 is_public=false인 프로필은 상세 결과에서 제외한다', async () => {
    supabaseMocks.maybeSingle.mockResolvedValueOnce({
      data: { ...publicRow, is_public: false },
      error: null,
    });

    expect(await fetchPublicProfileById('user-disabled-public')).toBeNull();
  });

  it('존재하지 않는 사용자(data: null) 조회 시 안전하게 null을 반환한다', async () => {
    supabaseMocks.maybeSingle.mockResolvedValueOnce({
      data: null,
      error: null,
    });

    const result = await fetchPublicProfileById('non-existent-user');
    expect(result).toBeNull();
  });

  it('빈 문자열이나 공백 userId가 주어지면 DB를 조회하지 않고 null을 반환한다', async () => {
    const result = await fetchPublicProfileById('   ');
    expect(result).toBeNull();
    expect(supabaseMocks.from).not.toHaveBeenCalled();
  });

  it('DB 조회 에러 발생 시 예외를 던진다', async () => {
    supabaseMocks.maybeSingle.mockResolvedValueOnce({
      data: null,
      error: { message: 'Database connection failed' },
    });

    await expect(fetchPublicProfileById('user-1'))
      .rejects.toThrow('공개 프로필 조회 실패: Database connection failed');
  });
});

describe('searchPublicProfiles (공개 사용자 목록 검색)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    supabaseMocks.queryResult = {
      data: [publicRow],
      error: null,
      count: 1,
    };
    supabaseMocks.from.mockReturnValue(query);
    supabaseMocks.select.mockReturnValue(query);
    supabaseMocks.or.mockReturnValue(query);
    supabaseMocks.neq.mockReturnValue(query);
    supabaseMocks.in.mockReturnValue(query);
    supabaseMocks.contains.mockReturnValue(query);
    supabaseMocks.overlaps.mockReturnValue(query);
    supabaseMocks.order.mockReturnValue(query);
    supabaseMocks.range.mockReturnValue(query);
  });

  it('공개 프로필만 반환하며 이메일 등 민감 정보를 포함하지 않는다', async () => {
    const result = await searchPublicProfiles();

    expect(supabaseMocks.from).toHaveBeenCalledWith('profiles');
    expect(supabaseMocks.select).toHaveBeenCalledWith(PUBLIC_PROFILE_COLUMNS, { count: 'exact' });
    expect(PUBLIC_PROFILE_COLUMNS).not.toContain('email');
    expect(result.profiles).toHaveLength(1);
    expect(result.profiles[0]).not.toHaveProperty('email');
    expect(result.totalCount).toBe(1);
    expect(result.page).toBe(1);
  });

  it('DB 응답에 비공개 프로필이 섞여 있어도 애플리케이션 레벨에서 필터링하여 제외한다', async () => {
    supabaseMocks.queryResult = {
      data: [
        publicRow,
        { ...publicRow, id: 'private-user', visibility: 'private', is_public: false },
        { ...publicRow, id: 'team-user', visibility: 'team_only', is_public: true },
        { ...publicRow, id: 'disabled-public-user', visibility: 'public', is_public: false },
      ],
      error: null,
      // The server-side exact count is calculated after the same scope filter.
      count: 1,
    };

    const result = await searchPublicProfiles();

    expect(result.profiles).toHaveLength(1);
    expect(result.profiles[0].id).toBe('user-public-1');
    expect(result.totalCount).toBe(1);
    expect(supabaseMocks.or).toHaveBeenCalledTimes(1);
    const serverFilter = supabaseMocks.or.mock.calls[0][0] as string;
    expect(serverFilter).toContain('visibility.eq.public');
    expect(serverFilter).toContain('is_public.eq.true');
    expect(serverFilter).toContain('is_public.is.null');
    expect(serverFilter).toContain('visibility.is.null');
  });

  it('검색어(keyword) 필터 전달 시 name, nickname, bio에 ilike 검색을 적용한다', async () => {
    await searchPublicProfiles({ keyword: '김컴공' });

    expect(supabaseMocks.or).toHaveBeenCalledTimes(1);
    const serverFilter = supabaseMocks.or.mock.calls[0][0] as string;
    expect(serverFilter).toContain('name.ilike.%김컴공%');
    expect(serverFilter).toContain('nickname.ilike.%김컴공%');
    expect(serverFilter).toContain('bio.ilike.%김컴공%');
    expect(serverFilter).toContain('visibility.eq.public');
  });

  it('단일 학년 및 복수 학년 필터를 정상 적용한다', async () => {
    await searchPublicProfiles({ grade: '3학년' });
    expect(supabaseMocks.eq).toHaveBeenCalledWith('grade', '3학년');

    await searchPublicProfiles({ grade: ['2학년', '3학년'] });
    expect(supabaseMocks.in).toHaveBeenCalledWith('grade', ['2학년', '3학년']);
  });

  it('단일 전공 및 복수 전공 필터를 정상 적용한다', async () => {
    await searchPublicProfiles({ track: '인공지능컴퓨팅전공' });
    expect(supabaseMocks.eq).toHaveBeenCalledWith('track', '인공지능컴퓨팅전공');

    await searchPublicProfiles({ track: ['플랫폼소프트웨어전공', '데이터사이언스전공'] as any });
    expect(supabaseMocks.in).toHaveBeenCalledWith('track', ['플랫폼소프트웨어전공']);
  });

  it('기술 스택 필터 시 overlaps 또는 contains를 지원한다', async () => {
    await searchPublicProfiles({ techStacks: ['React', 'TypeScript'] });
    expect(supabaseMocks.overlaps).toHaveBeenCalledWith('tech_stacks', ['React', 'TypeScript']);

    await searchPublicProfiles({ techStacks: ['React', 'TypeScript'], techStackMatch: 'all' });
    expect(supabaseMocks.contains).toHaveBeenCalledWith('tech_stacks', ['React', 'TypeScript']);
  });

  it('본인 계정 제외(excludeUserId)를 적용한다', async () => {
    await searchPublicProfiles({ excludeUserId: 'my-own-id' });
    expect(supabaseMocks.neq).toHaveBeenCalledWith('id', 'my-own-id');
  });

  it('페이지네이션 range를 올바르게 계산한다', async () => {
    await searchPublicProfiles({ page: 2, pageSize: 10 });
    // page 2 with pageSize 10 -> from 10 to 19
    expect(supabaseMocks.range).toHaveBeenCalledWith(10, 19);
  });

  it('조회 결과가 없을 때 안전하게 빈 결과를 반환한다', async () => {
    supabaseMocks.queryResult = {
      data: [],
      error: null,
      count: 0,
    };

    const result = await searchPublicProfiles();
    expect(result.profiles).toEqual([]);
    expect(result.totalCount).toBe(0);
    expect(result.totalPages).toBe(0);
    expect(result.hasMore).toBe(false);
  });

  it('DB 조회 에러 시 예외를 던진다', async () => {
    supabaseMocks.queryResult = {
      data: null,
      error: { message: 'Query error' },
      count: null,
    };

    await expect(searchPublicProfiles()).rejects.toThrow('공개 프로필 목록 검색 실패: Query error');
  });
});
