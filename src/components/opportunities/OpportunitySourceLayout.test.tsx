// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { Link, MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getRecommendedOpportunitiesForProfile } from '../../algorithms/profileRecommendations';
import { MyProfileProvider } from '../../contexts/MyProfileProvider';
import { useMyProfile } from '../../contexts/MyProfileContext';
import { profileFixture } from '../../features/profile/profileFixture';
import { HomePage } from '../../pages/HomePage';
import { OpportunitiesPage } from '../../pages/OpportunitiesPage';
import { OpportunityDetailPage } from '../../pages/OpportunityDetailPage';
import { mapOpportunityRow } from '../../services/opportunityService';
import type { Opportunity } from '../../types';
import { OpportunitySourceLayout } from './OpportunitySourceLayout';
import { evaluationMap, recommendationMap } from './opportunityModel';

const mocks = vi.hoisted(() => ({
  auth: { user: { id: 'user-a' }, loading: false },
  fetchMyProfile: vi.fn(),
  updateMyProfile: vi.fn(),
  opportunityRows: vi.fn(),
}));

vi.mock('../../hooks/useAuth', () => ({ useAuth: () => mocks.auth }));
vi.mock('../../services/profileService', () => ({
  fetchMyProfile: mocks.fetchMyProfile,
  updateMyProfile: mocks.updateMyProfile,
}));
vi.mock('../../lib/supabase', () => ({
  supabase: { from: () => ({ select: () => ({ neq: () => ({ order: mocks.opportunityRows }) }) }) },
}));

const firstProfile = profileFixture({ interests: [], wanted_tech_stacks: [], tech_stacks: ['React'] });
const updatedProfile = profileFixture({ interests: [], wanted_tech_stacks: [], tech_stacks: ['Python'] });
const rows = [
  { id: 'closed', title: '종료된 실제 공고', status: 'closed', tags: ['React'], posted_at: '2020-01-03T00:00:00Z' },
  { id: 'python', title: '파이썬 실제 공고', status: 'active', tags: ['Python'], posted_at: '2020-01-02T00:00:00Z' },
  { id: 'react', title: '리액트 실제 공고', status: 'needs_confirmation', tags: [' 리액트 '], posted_at: '2020-01-01T00:00:00Z' },
].map((row) => ({
  description: '', organizer: '컴퓨터학부', category: '공모전', application_start: null, deadline: null,
  source_type: 'knu_cse_official', source_post_id: null, source_url: 'https://computer.knu.ac.kr/notice/1234',
  application_url: null, collected_at: row.posted_at, updated_at: row.posted_at, ...row,
}));

function TestRoutes({ initialEntry = '/' }: { initialEntry?: string }) {
  return <MemoryRouter initialEntries={[initialEntry]}>
    <MyProfileProvider>
      <ProfileEdit />
      <Link to="/opportunities">탐색으로 이동</Link>
      <Routes>
        <Route element={<OpportunitySourceLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/opportunities" element={<OpportunitiesPage />} />
          <Route path="/opportunities/:id" element={<OpportunityDetailPage />} />
        </Route>
      </Routes>
    </MyProfileProvider>
  </MemoryRouter>;
}

function ProfileEdit() {
  const { update } = useMyProfile();
  return <button onClick={() => void update({ tech_stacks: ['Python'] })}>기술 변경</button>;
}

beforeEach(() => {
  vi.resetAllMocks();
  mocks.auth.user = { id: 'user-a' };
  mocks.fetchMyProfile.mockResolvedValue(firstProfile);
  mocks.updateMyProfile.mockResolvedValue(updatedProfile);
  mocks.opportunityRows.mockResolvedValue({ data: rows, error: null });
});
afterEach(cleanup);

describe('실제 데이터 형식의 공고 추천 라우트', () => {
  it('마감일이 없는 공고의 추천 점수와 이유를 세 화면에서 공유한다', async () => {
    const opportunities = rows.map(mapOpportunityRow).filter((item): item is Opportunity => item !== null);
    const match = getRecommendedOpportunitiesForProfile(firstProfile, opportunities).find((item) => item.targetId === 'react')!;
    const score = `추천 적합도 ${match.score}%`;
    render(<TestRoutes />);
    const home = await screen.findByRole('region', { name: '나에게 맞는 공모전' });
    const homeCard = await within(home).findByRole('heading', { name: '리액트 실제 공고' });
    expect(within(homeCard.closest('article')!).getByText(score)).toBeTruthy();
    expect(within(homeCard.closest('article')!).getByText(match.reasons[0])).toBeTruthy();
    expect(screen.getByRole('link', { name: '공개 공고: 3' })).toBeTruthy();
    expect(screen.getByRole('link', { name: '추천 공고: 1' })).toBeTruthy();
    expect(screen.queryByText(/개발용 예시 데이터|가상 예시/)).toBeNull();

    fireEvent.click(screen.getByRole('link', { name: '탐색으로 이동' }));
    const cards = screen.getAllByRole('article');
    const reactCard = cards.find((card) => card.textContent?.includes('리액트 실제 공고'))!;
    expect(within(reactCard).getAllByText(score).length).toBeGreaterThan(0);
    expect(within(reactCard).getAllByText('일정 확인 중').length).toBeGreaterThan(0);
    expect(within(reactCard).getAllByText(match.reasons[0]).length).toBeGreaterThan(0);
    fireEvent.click(within(reactCard).getByRole('link', { name: '상세 보기' }));

    const details = screen.getByRole('region', { name: '추천 이유' });
    expect(within(details).getByText(score)).toBeTruthy();
    expect(within(details).getByText(match.reasons[0])).toBeTruthy();
    expect(screen.getByRole('link', { name: '원본 공지 바로가기' }).getAttribute('href')).toBe(rows[0].source_url);
    expect(screen.queryByText(/마감일|활동 기간|지원 자격|주요 활동 내용/)).toBeNull();
    expect(mocks.opportunityRows).toHaveBeenCalledOnce();
  });

  it('추천순에서 실제 점수로 정렬하고 추천 필터와 검색을 조합한다', async () => {
    render(<TestRoutes initialEntry="/opportunities" />);
    await screen.findByText('검색 결과 3개');
    const titles = () => screen.queryAllByRole('article').map((card) => card.querySelector('h2')?.textContent);
    expect(titles()[0]).toBe('종료된 실제 공고');
    fireEvent.change(screen.getByLabelText('공고 정렬'), { target: { value: 'recommended' } });
    expect(titles()).toEqual(['리액트 실제 공고', '종료된 실제 공고', '파이썬 실제 공고']);
    fireEvent.click(screen.getByRole('checkbox', { name: '추천 공고만 보기' }));
    expect(titles()).toEqual(['리액트 실제 공고']);
    fireEvent.change(screen.getByRole('textbox', { name: '공고 검색' }), { target: { value: '파이썬' } });
    expect(titles()).toEqual([]);
  });

  it('프로필 저장 직후 추천을 재계산한다', async () => {
    render(<TestRoutes initialEntry="/opportunities?sort=recommended" />);
    await screen.findByText('검색 결과 3개');
    expect(screen.getAllByRole('article')[0].textContent).toContain('리액트 실제 공고');
    fireEvent.click(screen.getByRole('button', { name: '기술 변경' }));
    await act(async () => {});
    expect(screen.getAllByRole('article')[0].textContent).toContain('파이썬 실제 공고');
    expect(mocks.opportunityRows).toHaveBeenCalledOnce();
  });

  it('공고 조회 오류를 재시도하고 공개 공고가 없으면 빈 상태를 표시한다', async () => {
    mocks.opportunityRows.mockResolvedValueOnce({ error: { message: 'offline' } })
      .mockResolvedValueOnce({ data: [], error: null });
    render(<TestRoutes />);
    expect(screen.getByRole('status', { name: '대시보드 불러오는 중' })).toBeTruthy();
    expect(await screen.findByRole('alert')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '다시 시도' }));
    expect(await screen.findByText('공개된 공고가 없어요')).toBeTruthy();
    expect(screen.getByRole('link', { name: '공개 공고: 0' })).toBeTruthy();
    expect(screen.queryByRole('article')).toBeNull();
  });

  it('프로필 조회 실패와 재시도 중에는 공고를 보여 주고 추천 결과를 숨긴다', async () => {
    mocks.fetchMyProfile.mockRejectedValueOnce(new Error('offline'));
    let resolveProfile!: (value: null) => void;
    mocks.fetchMyProfile.mockReturnValueOnce(new Promise((resolve) => { resolveProfile = resolve; }));
    render(<TestRoutes initialEntry="/opportunities/react" />);
    expect(await screen.findByRole('heading', { name: '리액트 실제 공고' })).toBeTruthy();
    expect(await screen.findByRole('alert')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '프로필 다시 불러오기' }));
    expect(await screen.findByText('추천에 사용할 프로필을 불러오는 중이에요.')).toBeTruthy();
    await act(async () => resolveProfile(null));
    expect(screen.getByText('프로필을 등록하면 맞춤 공고를 확인할 수 있어요.')).toBeTruthy();
    expect(screen.queryByText(/추천 적합도/)).toBeNull();
  });

  it('계정 전환 즉시 이전 추천을 숨기고 늦은 공고 응답을 무시한다', async () => {
    const { rerender } = render(<TestRoutes initialEntry="/opportunities/react" />);
    expect(await screen.findByText('추천 적합도 100%')).toBeTruthy();

    let resolvePrevious!: (value: { data: typeof rows; error: null }) => void;
    mocks.opportunityRows.mockReturnValueOnce(new Promise((resolve) => { resolvePrevious = resolve; }));
    mocks.auth.user = { id: 'user-b' };
    mocks.fetchMyProfile.mockResolvedValue(profileFixture({ id: 'user-b' }));
    rerender(<TestRoutes initialEntry="/opportunities/react" />);
    expect(screen.queryByText('추천 적합도 100%')).toBeNull();
    expect(screen.getByRole('status', { name: '공고 상세 불러오는 중' })).toBeTruthy();

    mocks.auth.user = { id: 'user-c' };
    mocks.fetchMyProfile.mockResolvedValue(null);
    mocks.opportunityRows.mockResolvedValue({ data: [], error: null });
    rerender(<TestRoutes initialEntry="/opportunities/react" />);
    expect(await screen.findByText('공고를 찾을 수 없어요')).toBeTruthy();
    await act(async () => resolvePrevious({ data: rows, error: null }));
    expect(screen.queryByText('리액트 실제 공고')).toBeNull();
    expect(screen.queryByText(/추천 적합도/)).toBeNull();
  });

  it('추천 결과가 없는 공고와 점수 및 이유가 빠진 결과를 구분한다', async () => {
    const unknown = { ...rows[1], id: 'unknown', title: '일정 안내', tags: ['산학협력'] };
    mocks.opportunityRows.mockResolvedValue({ data: [rows[0], rows[1], unknown], error: null });
    render(<TestRoutes initialEntry="/opportunities?recommended=1&sort=recommended" />);
    expect(await screen.findByText('아직 제공된 추천 결과가 없어요.')).toBeTruthy();
    expect(screen.getByText('검색 결과 0개')).toBeTruthy();
    expect(screen.getByRole('button', { name: /추천 공고/ }).textContent).toContain('0');
    const matches = evaluationMap([
      { targetId: 'missing-score', score: NaN, reasons: [], matchedTags: [] },
      { targetId: 'missing-reasons', score: 0, reasons: [' '], matchedTags: [] },
    ]);
    expect(matches.has('missing-score')).toBe(false);
    expect(matches.get('missing-reasons')?.reasons).toEqual([]);
    expect(recommendationMap([...matches.values()]).size).toBe(0);
  });

  it('평가 불가 공고는 점수를 숨기고 실제 0점 공고만 평가 결과를 표시한다', async () => {
    const unknown = { ...rows[1], id: 'unknown', title: '일정 안내', tags: ['산학협력'] };
    mocks.opportunityRows.mockResolvedValue({ data: [rows[1], unknown], error: null });
    render(<TestRoutes initialEntry="/opportunities" />);
    await screen.findByText('검색 결과 2개');
    const cards = screen.getAllByRole('article');
    const unknownCard = cards.find(card => card.textContent?.includes(unknown.title))!;
    const zeroCard = cards.find(card => card.textContent?.includes(rows[1].title))!;
    expect(within(unknownCard).queryByText(/추천 적합도/)).toBeNull();
    expect(within(zeroCard).getAllByText('추천 적합도 0%').length).toBeGreaterThan(0);
    expect(screen.getByRole('option', { name: '추천순' })).toHaveProperty('disabled', true);
    expect(screen.getByRole('button', { name: /추천 공고/ }).textContent).toContain('0');
    fireEvent.click(within(unknownCard).getByRole('link', { name: '상세 보기' }));
    expect(within(screen.getByRole('region', { name: '추천 이유' })).queryByText(/추천 적합도/)).toBeNull();
  });

  it('프로필이 아직 없을 때 추천 필터가 전체 공고를 추천 결과로 표시하지 않는다', async () => {
    let resolveProfile!: (value: null) => void;
    mocks.fetchMyProfile.mockReturnValueOnce(new Promise((resolve) => { resolveProfile = resolve; }));
    render(<TestRoutes initialEntry="/opportunities?recommended=1" />);
    expect(await screen.findByText('추천에 사용할 프로필을 불러오는 중이에요.')).toBeTruthy();
    expect(screen.queryByRole('article')).toBeNull();
    await act(async () => resolveProfile(null));
    expect(screen.getByText('표시할 추천 공고가 없어요')).toBeTruthy();
    fireEvent.click(screen.getByRole('checkbox', { name: '추천 공고만 보기' }));
    expect(screen.getByText('검색 결과 3개')).toBeTruthy();
  });

  it('존재하지 않는 마감일이 있는 공고의 추천을 홈·탐색·상세에서 유지한다', async () => {
    const notice = {
      ...rows[2],
      id: 'opp-invalid-deadline',
      title: '리액트 특강 (접수 마감: 2020-02-30 18:00)',
      posted_at: '2020-02-01T00:00:00Z',
      deadline: null,
      tags: ['React'],
    };
    mocks.opportunityRows.mockResolvedValue({ data: [notice], error: null });

    render(<TestRoutes initialEntry="/" />);
    const home = await screen.findByRole('region', { name: '나에게 맞는 공모전' });
    expect(await within(home).findByText(notice.title)).toBeTruthy();

    fireEvent.click(screen.getByRole('link', { name: '탐색으로 이동' }));
    const [card] = await screen.findAllByRole('article');
    expect(within(card).getAllByText(notice.title).length).toBeGreaterThan(0);
    expect(within(card).getAllByText(/추천 적합도/).length).toBeGreaterThan(0);

    fireEvent.click(within(card).getByRole('link', { name: '상세 보기' }));
    const reasons = await screen.findByRole('region', { name: '추천 이유' });
    expect(within(reasons).getByText(/추천 적합도/)).toBeTruthy();
  });

  it('useOpportunitySource의 filterExplicitTextDeadline이 활성화되어 지난 마감 공고는 추천에서 제외되고 일반 공고로는 유지된다', async () => {
    // 1. 과거 마감일이 명시된 공고: React 태그 매칭이지만 제목에 과거 마감일 있음
    const expiredByText = {
      ...rows[2],
      id: 'opp-past-text',
      title: '리액트 부트캠프 (~2020년 1월 2일 18시 마감)',
      posted_at: '2020-01-01T00:00:00Z',
      deadline: null,
      tags: ['React'],
    };
    // 2. 미래 마감일이 명시된 공고: React 태그 매칭, 미래 마감일 있음
    const futureByText = {
      ...rows[2],
      id: 'opp-future-text',
      title: '리액트 해커톤 (~2099년 12월 31일 18시 마감)',
      posted_at: '2020-01-01T00:00:00Z',
      deadline: null,
      tags: ['React'],
    };
    // 3. 단순 교육 기간이 있는 공고: React 태그 매칭, 교육 기간 표기만 있음
    const periodOnly = {
      ...rows[2],
      id: 'opp-period-text',
      title: '리액트 워크숍 (교육 기간: 2020.01.10 ~ 01.12)',
      posted_at: '2020-01-01T00:00:00Z',
      deadline: null,
      tags: ['React'],
    };
    // 4. 모호한 마감 표현 공고: React 태그 매칭, 선착순 마감
    const ambiguousNotice = {
      ...rows[2],
      id: 'opp-ambiguous-text',
      title: '리액트 스터디 (선착순 마감)',
      posted_at: '2020-01-01T00:00:00Z',
      deadline: null,
      tags: ['React'],
    };

    mocks.opportunityRows.mockResolvedValue({
      data: [expiredByText, futureByText, periodOnly, ambiguousNotice],
      error: null,
    });

    // 1) 홈 화면 검증: 미래 마감, 교육 기간, 모호한 표현 3건만 추천되고, 지난 마감 공고는 추천에서 제외
    render(<TestRoutes initialEntry="/" />);
    const home = await screen.findByRole('region', { name: '나에게 맞는 공모전' });
    // 전체 공고는 4개
    expect(screen.getByRole('link', { name: '공개 공고: 4' })).toBeTruthy();
    // 추천 공고는 지난 마감(1개)을 제외한 3개
    expect(screen.getByRole('link', { name: '추천 공고: 3' })).toBeTruthy();
    // 홈 추천 카드에 지난 마감 공고 제목은 없음
    expect(within(home).queryByText(expiredByText.title)).toBeNull();
    // 미래 마감 공고는 홈 추천 카드에 포함
    expect(within(home).getByText(futureByText.title)).toBeTruthy();

    // 2) 탐색 화면 검증: 전체 목록에는 4건 모두 노출되나, 추천 점수는 지난 공고에만 미제공
    fireEvent.click(screen.getByRole('link', { name: '탐색으로 이동' }));
    await screen.findByText('검색 결과 4개');
    const cards = screen.getAllByRole('article');
    const expiredCard = cards.find(card => card.textContent?.includes(expiredByText.title))!;
    const futureCard = cards.find(card => card.textContent?.includes(futureByText.title))!;
    // 지난 마감 공고는 추천 점수 없음
    expect(within(expiredCard).queryByText(/추천 적합도/)).toBeNull();
    // 미래 마감 공고는 추천 점수 있음
    expect(within(futureCard).getAllByText(/추천 적합도/).length).toBeGreaterThan(0);

    // 추천 필터 적용 시 3건만 노출
    fireEvent.click(screen.getByRole('checkbox', { name: '추천 공고만 보기' }));
    expect(screen.getByText('검색 결과 3개')).toBeTruthy();
    expect(screen.queryByText(expiredByText.title)).toBeNull();

    // 3) 상세 화면 검증: 지난 공고 상세 진입 시 공고 자체는 표시되나 추천 이유는 미제공
    fireEvent.click(screen.getByRole('checkbox', { name: '추천 공고만 보기' })); // 필터 해제
    const cardsAfterReset = screen.getAllByRole('article');
    const expiredCardAfter = cardsAfterReset.find(card => card.textContent?.includes(expiredByText.title))!;
    fireEvent.click(within(expiredCardAfter).getByRole('link', { name: '상세 보기' }));
    expect(await screen.findByText(expiredByText.title)).toBeTruthy();
    expect(within(screen.getByRole('region', { name: '추천 이유' })).queryByText(/추천 적합도/)).toBeNull();
  });
});
