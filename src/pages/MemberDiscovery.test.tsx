// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useNavigate } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { publicProfileSource, type MemberSearchResult, type PublicProfile, type PublicProfileSource } from '../features/members/memberDiscovery';
import { MemberDetailPage } from './MemberDetailPage';
import { MembersPage } from './MembersPage';

const rpc = vi.hoisted(() => vi.fn());
vi.mock('../lib/supabase', () => ({ supabase: { rpc } }));
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
  it('실제 서비스 어댑터를 통해 공개 검색과 상세 RPC를 호출하고 응답의 연락처 필드를 표시하지 않는다', async () => {
    const row = { ...fullProfile, email: 'private@example.test', kakao_id: 'private-kakao', phone: 'private-phone' };
    rpc.mockReset();
    rpc.mockResolvedValueOnce({ data: pageOf([row]), error: null });
    rpc.mockResolvedValueOnce({ data: row, error: null });
    renderRoutes('/members', publicProfileSource);
    const link = await screen.findByRole('link', { name: '브리지' });
    expect(rpc).toHaveBeenCalledWith('bridge_m20261119_search_public_profiles', expect.objectContaining({
      p_exclude_user_id: 'viewer', p_page: 1, p_page_size: 12,
    }));
    expect(document.body.textContent).not.toMatch(/private@example\.test|private-kakao|private-phone/);
    fireEvent.click(link);
    await screen.findByRole('heading', { name: '브리지' });
    expect(rpc).toHaveBeenCalledWith('bridge_m20261119_fetch_public_profile', { p_user_id: 'member-1' });
    expect(document.body.textContent).not.toMatch(/private@example\.test|private-kakao|private-phone/);
  });

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
      ? [fullProfile, privateProfile,
        { ...sparseProfile, id: 'legacy', name: '레거시 프로필', nickname: '', visibility: null },
        { ...sparseProfile, id: 'unknown', name: '동의 미확인', nickname: '', is_public: null },
        { ...sparseProfile, id: 'viewer', name: '로그인한 본인' }]
      : [sparseProfile], page, 2));
    renderRoutes('/members', source);
    expect(screen.getByRole('status').textContent).toContain('불러오는 중');
    const card = await screen.findByRole('article');
    expect(within(card).getByRole('link', { name: '브리지' }).getAttribute('href')).toBe('/members/member-1');
    for (const field of ['김학생', '3학년', '숙련', '팀 구하는 중', 'Frontend', '접근성', '해커톤']) {
      expect(card.textContent).toContain(field);
    }
    expect(screen.queryByText('숨겨진 학생')).toBeNull();
    expect(screen.queryByText('레거시 프로필')).toBeNull();
    expect(screen.queryByText('동의 미확인')).toBeNull();
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

  it('공개 후보를 실제 매칭 순서로 표시하고 0점, 부분 평가, 평가 불가를 구분한다', async () => {
    const source = buildSource();
    const mismatch = { ...fullProfile, id: 'mismatch', name: '불일치 후보', nickname: '', desired_roles: ['Backend'], tech_stacks: ['Python'] };
    const partial = { ...sparseProfile, id: 'partial', name: '부분 평가 후보', tech_stacks: ['React'] };
    const extraFields = { ...fullProfile, email: 'private@example.invalid' };
    source.searchPublicProfiles.mockResolvedValue(pageOf([
      sparseProfile, mismatch, partial, extraFields, fullProfile, privateProfile,
      { ...sparseProfile, id: 'viewer', name: '로그인한 본인' },
      { ...sparseProfile, id: 'team', name: '팀 전용 후보', visibility: 'team_only' },
    ]));
    renderRoutes('/members', source);
    await screen.findByRole('link', { name: '브리지' });
    expect(screen.queryByLabelText('팀원 매칭 결과')).toBeNull();

    fireEvent.change(screen.getByLabelText('찾는 역할'), { target: { value: '프론트엔드' } });
    fireEvent.change(screen.getByLabelText('필요 기술'), { target: { value: 'React' } });
    fireEvent.click(screen.getByRole('button', { name: '추천 조건 적용' }));

    expect(screen.getByText('현재 검색 결과 내 추천순')).toBeTruthy();
    expect(screen.getByText('현재 페이지의 공개 프로필 최대 12명을 비교합니다.')).toBeTruthy();
    const cards = screen.getAllByRole('article');
    expect(cards.map((card) => within(card).getByRole('link').textContent)).toEqual(['브리지', '부분 평가 후보', '불일치 후보', '이학생']);
    const [match, partialMatch, zeroMatch, noMatch] = cards.map((card) => within(within(card).getByRole('region', { name: '팀원 매칭 결과' })));
    expect(match.getByText('매칭 점수 100점')).toBeTruthy();
    expect(match.getByText('일치 기술 · React')).toBeTruthy();
    expect(match.getByText(/모집 중인 .*일치합니다/)).toBeTruthy();
    expect(match.getByText(/요구 기술 1개 중 React/)).toBeTruthy();
    expect(partialMatch.getByText('매칭 점수 40점')).toBeTruthy();
    expect(partialMatch.getByText(/부분 평가/)).toBeTruthy();
    expect(zeroMatch.getByText('매칭 점수 0점')).toBeTruthy();
    expect(zeroMatch.getByText(/일치하는 항목이 없어요/)).toBeTruthy();
    expect(noMatch.getByText(/평가 불가/)).toBeTruthy();
    expect(noMatch.queryByText(/매칭 점수/)).toBeNull();
    expect(screen.getByText(/주간 시간표가 제공되지 않아/)).toBeTruthy();
    expect(screen.queryByText(/활동 가능 시간 확인이 필요합니다|private@example\.invalid/)).toBeNull();
    expect(source.searchPublicProfiles).toHaveBeenCalledTimes(1);
  });

  it('추천 조건을 다음 페이지에 적용하고 지우면 해당 페이지의 기본 목록으로 돌아간다', async () => {
    const source = buildSource();
    const secondPageCandidate = { ...sparseProfile, id: 'page-two', name: '두 번째 페이지 후보', tech_stacks: ['React'] };
    source.searchPublicProfiles.mockImplementation(async ({ page }) => pageOf(page === 1 ? [fullProfile] : [secondPageCandidate], page, 2));
    renderRoutes('/members', source);
    await screen.findByRole('link', { name: '브리지' });
    fireEvent.change(screen.getByLabelText('필요 기술'), { target: { value: 'React' } });
    fireEvent.click(screen.getByRole('button', { name: '추천 조건 적용' }));
    expect(screen.getByText('매칭 점수 100점')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: '다음' }));
    await screen.findByRole('link', { name: '두 번째 페이지 후보' });
    expect(screen.queryByRole('link', { name: '브리지' })).toBeNull();
    expect(screen.getByText('매칭 점수 100점')).toBeTruthy();
    expect(source.searchPublicProfiles).toHaveBeenLastCalledWith(expect.objectContaining({ page: 2, pageSize: 12 }));

    fireEvent.change(screen.getByLabelText('필요 기술'), { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: '추천 조건 적용' }));
    expect(screen.queryByText('매칭 점수 100점')).toBeNull();
    expect(screen.getByRole('link', { name: '두 번째 페이지 후보' })).toBeTruthy();
    expect(source.searchPublicProfiles).toHaveBeenCalledTimes(2);
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
    ['레거시 공개', { ...privateProfile, visibility: null, is_public: true } as const],
    ['공개 동의 없음', { ...privateProfile, visibility: 'public', is_public: null } as const],
    ['공개 취소', { ...privateProfile, visibility: 'public', is_public: false } as const],
  ])('%s 프로필은 동일한 조회 불가 상태로 표시한다', async (_case, profile) => {
    const source = buildSource();
    source.fetchPublicProfileById.mockResolvedValue(profile);
    renderRoutes('/members/private', source);
    expect(await screen.findByText('프로필을 볼 수 없어요')).toBeTruthy();
    expect(screen.queryByText('숨겨진 학생')).toBeNull();
    expect(screen.queryByText('레거시 프로필')).toBeNull();
    expect(screen.queryByText('동의 미확인')).toBeNull();
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
