// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useNavigate } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { MemberSearchResult, PublicProfile, PublicProfileSource } from '../features/members/memberDiscovery';
import { MemberDetailPage } from './MemberDetailPage';
import { MembersPage } from './MembersPage';

vi.mock('../contexts/MyProfileContext', () => ({ useMyProfile: () => ({ userId: 'viewer' }) }));
afterEach(cleanup);

const sparseProfile: PublicProfile = {
  id: 'member-2', name: '이학생', nickname: '', grade: '2학년', track: '인공지능컴퓨팅전공',
  department: null, bio: null, long_bio: null, interests: [], tech_stacks: null,
  tech_proficiency: null, wanted_tech_stacks: null, desired_roles: [], activity_types: null,
  activity_goals: null, activity_mode: null, activity_duration: null, availability_status: null,
  experiences: [], github_url: null, portfolio_url: null, is_public: true, visibility: 'public',
  created_at: '2026-11-01', updated_at: '2026-11-01',
};
const fullProfile: PublicProfile = {
  ...sparseProfile, id: 'member-1', name: '김학생', nickname: '브리지', grade: '3학년', track: '플랫폼소프트웨어전공',
  bio: '웹을 개발합니다.', long_bio: '사용하기 쉬운 도구를 만들고 싶어요.', interests: ['접근성'],
  tech_stacks: ['React', 'TypeScript'], tech_proficiency: { React: '숙련', TypeScript: null },
  wanted_tech_stacks: ['Rust'], desired_roles: ['Frontend'], activity_types: ['해커톤'], activity_goals: ['협업 경험'],
  activity_mode: '혼합', activity_duration: '무관', availability_status: '팀 구하는 중',
  experiences: ['학부 해커톤 참가'], github_url: 'https://github.com/example', portfolio_url: 'https://portfolio.example/',
};
const privateProfile: PublicProfile = { ...fullProfile, id: 'private', name: '숨겨진 학생', nickname: '', visibility: 'private' };

function pageOf(profiles: PublicProfile[], page = 1, totalPages = 1): MemberSearchResult {
  return { profiles, page, pageSize: 12, totalCount: profiles.length, totalPages, hasMore: page < totalPages };
}

function buildSource() {
  return {
    searchPublicProfiles: vi.fn<PublicProfileSource['searchPublicProfiles']>().mockResolvedValue(pageOf([])),
    fetchPublicProfileById: vi.fn<PublicProfileSource['fetchPublicProfileById']>().mockResolvedValue(null),
  };
}

function renderRoutes(path: string, source?: PublicProfileSource) {
  function RouteSwitch() {
    const navigate = useNavigate();
    return <button type="button" onClick={() => navigate('/members/member-2')}>검증용 프로필 이동</button>;
  }
  return render(<MemoryRouter initialEntries={[path]}>
    <RouteSwitch />
    <Routes>
      <Route path="/members" element={<MembersPage source={source} />} />
      <Route path="/members/:id" element={<MemberDetailPage source={source} />} />
    </Routes>
  </MemoryRouter>);
}

describe('팀원 탐색과 공개 프로필 상세', () => {
  it('연결 전에는 예시 학생 대신 준비 상태를 표시한다', () => {
    renderRoutes('/members');
    expect(screen.getByText('공개 프로필 조회 준비 중')).toBeTruthy();
    expect(screen.queryAllByRole('article')).toHaveLength(0);
    expect((screen.getByRole('searchbox') as HTMLInputElement).matches(':disabled')).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: '검증용 프로필 이동' }));
    expect(screen.getByText('공개 프로필 조회 준비 중')).toBeTruthy();
  });

  it('서버 검색·필터를 적용하고 이전·다음 페이지와 본인 제외를 지원한다', async () => {
    const source = buildSource();
    source.searchPublicProfiles.mockImplementation(async ({ page }) => pageOf(page === 1
      ? [fullProfile, privateProfile, { ...sparseProfile, id: 'viewer', name: '로그인한 본인' }]
      : [sparseProfile], page, 2));
    renderRoutes('/members', source);
    expect(screen.getByRole('status').textContent).toContain('불러오는 중');
    const card = await screen.findByRole('article');
    expect(within(card).getByRole('link', { name: '브리지' }).getAttribute('href')).toBe('/members/member-1');
    for (const field of ['김학생', '3학년', '숙련', '팀 구하는 중', 'Frontend', '접근성', '해커톤']) {
      expect(card.textContent).toContain(field);
    }
    expect(screen.queryByText('숨겨진 학생')).toBeNull();
    expect(screen.queryByText('로그인한 본인')).toBeNull();
    expect(source.searchPublicProfiles).toHaveBeenLastCalledWith(expect.objectContaining({ excludeUserId: 'viewer', page: 1, pageSize: 12 }));

    fireEvent.click(screen.getByRole('button', { name: '다음' }));
    await screen.findByRole('link', { name: '이학생' });
    expect((screen.getByRole('button', { name: '다음' }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: '이전' }));
    await screen.findByRole('link', { name: '브리지' });
    fireEvent.click(screen.getByRole('button', { name: '다음' }));
    await screen.findByRole('link', { name: '이학생' });

    fireEvent.change(screen.getByRole('searchbox'), { target: { value: ' 브리지 ' } });
    fireEvent.change(screen.getByLabelText('학년'), { target: { value: '3학년' } });
    fireEvent.change(screen.getByLabelText('세부전공'), { target: { value: '플랫폼소프트웨어전공' } });
    fireEvent.change(screen.getByPlaceholderText('예: React, Python'), { target: { value: 'React, Python, React' } });
    fireEvent.click(screen.getByRole('button', { name: '검색' }));
    await waitFor(() => expect(source.searchPublicProfiles).toHaveBeenLastCalledWith({
      keyword: '브리지', grade: '3학년', track: '플랫폼소프트웨어전공', techStacks: ['React', 'Python'],
      techStackMatch: 'any', excludeUserId: 'viewer', page: 1, pageSize: 12,
    }));
  });

  it('상세 링크로 이동해 실제 ID와 공개 필드를 사용한다', async () => {
    const source = buildSource();
    source.searchPublicProfiles.mockResolvedValue(pageOf([fullProfile]));
    source.fetchPublicProfileById.mockResolvedValue(fullProfile);
    renderRoutes('/members', source);
    fireEvent.click(await screen.findByRole('link', { name: '브리지' }));
    expect(await screen.findByRole('heading', { name: '브리지' })).toBeTruthy();
    expect(source.fetchPublicProfileById).toHaveBeenCalledWith('member-1');
    for (const field of ['김학생', '웹을 개발합니다.', '사용하기 쉬운 도구를 만들고 싶어요.', '접근성', '학부 해커톤 참가', '협업 경험', '혼합', '숙련']) {
      expect(screen.getByText(field)).toBeTruthy();
    }
    expect(screen.getByLabelText('브리지').textContent).toBe('브');
    expect(screen.getByRole('link', { name: 'GitHub 프로필' }).getAttribute('href')).toBe(fullProfile.github_url);
    expect(screen.getByRole('link', { name: '포트폴리오 웹사이트' }).getAttribute('href')).toBe(fullProfile.portfolio_url);
    expect(screen.queryByRole('button', { name: /초대/ })).toBeNull();
  });

  it('목록 오류를 재시도하고 빈 결과를 표시한다', async () => {
    const source = buildSource();
    source.searchPublicProfiles.mockRejectedValueOnce(new Error('Internal service details'));
    renderRoutes('/members', source);
    expect(await screen.findByRole('alert')).toBeTruthy();
    expect(screen.queryByText('Internal service details')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: '다시 시도' }));
    expect(await screen.findByText('검색 결과가 없어요')).toBeTruthy();
    expect(source.searchPublicProfiles).toHaveBeenCalledTimes(2);
  });

  it('상세에서 null·빈 필드와 허용되지 않는 링크를 처리하고 오류를 재시도한다', async () => {
    const source = buildSource();
    source.fetchPublicProfileById.mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce({ ...sparseProfile, github_url: 'javascript:void(0)' });
    renderRoutes('/members/member-2', source);
    expect(await screen.findByRole('alert')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '다시 시도' }));
    expect(await screen.findByRole('heading', { name: '이학생' })).toBeTruthy();
    expect(screen.getByText('등록된 자기소개가 없어요.')).toBeTruthy();
    expect(screen.getByText('등록된 기술 스택이 없어요.')).toBeTruthy();
    expect(screen.queryByRole('link', { name: 'GitHub 프로필' })).toBeNull();
  });

  it.each([
    ['비공개', privateProfile],
    ['미존재', null],
    ['다른 ID', fullProfile],
    ['공개 취소', { ...privateProfile, visibility: 'public', is_public: false } as const],
  ])('%s 프로필은 동일한 조회 불가 상태로 표시한다', async (_case, profile) => {
    const source = buildSource();
    source.fetchPublicProfileById.mockResolvedValue(profile);
    renderRoutes('/members/private', source);
    expect(await screen.findByText('프로필을 볼 수 없어요')).toBeTruthy();
    expect(screen.queryByText('숨겨진 학생')).toBeNull();
    expect(screen.queryByText('브리지')).toBeNull();
  });

  it('이전 상세 요청이 늦게 완료돼도 새 프로필을 유지한다', async () => {
    const source = buildSource();
    let resolvePrevious!: (profile: PublicProfile) => void;
    source.fetchPublicProfileById.mockImplementationOnce(() => new Promise((resolve) => { resolvePrevious = resolve; }))
      .mockResolvedValueOnce(sparseProfile);
    renderRoutes('/members/member-1', source);
    await waitFor(() => expect(source.fetchPublicProfileById).toHaveBeenCalledWith('member-1'));
    fireEvent.click(screen.getByRole('button', { name: '검증용 프로필 이동' }));
    await screen.findByRole('heading', { name: '이학생' });
    await act(async () => resolvePrevious(fullProfile));
    expect(screen.queryByRole('heading', { name: '브리지' })).toBeNull();
    expect(screen.getByRole('heading', { name: '이학생' })).toBeTruthy();
  });
});
