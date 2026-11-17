import { beforeEach, describe, expect, it, vi } from 'vitest';

const supabaseMocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  from: vi.fn(),
  update: vi.fn(),
  eq: vi.fn(),
  select: vi.fn(),
  maybeSingle: vi.fn(),
}));

vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: { getUser: supabaseMocks.getUser },
    from: supabaseMocks.from,
  },
}));

import { mapProfileRow, profileVisibilityFromRow, updateMyProfile } from './profileService';

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

const query = {
  update: supabaseMocks.update,
  eq: supabaseMocks.eq,
  select: supabaseMocks.select,
  maybeSingle: supabaseMocks.maybeSingle,
};

supabaseMocks.from.mockReturnValue(query);
supabaseMocks.update.mockReturnValue(query);
supabaseMocks.eq.mockReturnValue(query);
supabaseMocks.select.mockReturnValue(query);

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
