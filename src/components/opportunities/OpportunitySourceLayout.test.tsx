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
    expect(screen.getByRole('link', { name: '전체 공고: 3' })).toBeTruthy();
    expect(screen.getByRole('link', { name: '추천 공고: 1' })).toBeTruthy();
    expect(screen.queryByText(/개발용 예시 데이터|가상 예시/)).toBeNull();

    fireEvent.click(screen.getByRole('link', { name: '전체 공고: 3' }));
    expect(screen.getByRole('button', { name: /전체 공고/ }).textContent).toBe('전체 공고3');
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

  it('PostgreSQL 시각 표기의 일정 확인 중 공고도 추천과 탐색의 전체 공고에 포함된다', async () => {
    const notice = { ...rows[2], posted_at: '2020-01-01 00:00:00+00' };
    mocks.opportunityRows.mockResolvedValue({ data: [notice], error: null });

    render(<TestRoutes />);
    expect(await screen.findByRole('link', { name: '추천 공고: 1' })).toBeTruthy();
    expect(screen.getByRole('link', { name: '전체 공고: 1' })).toBeTruthy();

    fireEvent.click(screen.getByRole('link', { name: '탐색으로 이동' }));
    expect(screen.getByRole('button', { name: /전체 공고/ }).textContent).toBe('전체 공고1');
    expect(screen.getByRole('option', { name: '추천순' })).toHaveProperty('disabled', false);
    const card = screen.getByRole('article');
    const graphic = card.querySelector('svg[viewBox="0 0 150 85"]');
    expect(graphic?.querySelector('path')?.getAttribute('d')).toBe('M10 42H140');
    expect(graphic?.parentElement?.style.backgroundColor).toBe('rgb(125, 57, 235)');
    fireEvent.click(screen.getByRole('button', { name: '목록형 보기' }));
    const listGraphic = screen.getByRole('article').querySelector('svg[viewBox="0 0 150 85"]');
    expect(listGraphic?.innerHTML).toBe(graphic?.innerHTML);
    expect(listGraphic?.parentElement?.style.backgroundColor).toBe('rgb(125, 57, 235)');

    fireEvent.click(within(screen.getByRole('article')).getByRole('link', { name: '상세 보기' }));
    expect(within(screen.getByRole('region', { name: '추천 이유' })).getByText('추천 적합도 100%')).toBeTruthy();
  });

  it('새 응답으로 목록과 집계를 갱신하되 열어 둔 탐색 화면은 자동 재조회하지 않는다', async () => {
    const initialRows = [
      ...rows,
      ...Array.from({ length: 6 }, (_, index) => ({ ...rows[0], id: `closed-${index}`, title: `공개 마감 공고 ${index}` })),
      { ...rows[1], id: 'draft', status: 'draft' },
      { ...rows[1], id: 'future', posted_at: '2999-01-01T00:00:00Z' },
    ];
    const allCount = () => screen.getByRole('button', { name: /전체 공고/ }).textContent;
    const recommendedCount = () => screen.getByRole('button', { name: /추천 공고/ }).textContent;
    mocks.opportunityRows.mockResolvedValue({ data: initialRows, error: null });
    const initial = render(<TestRoutes initialEntry="/opportunities" />);
    await screen.findByText('검색 결과 9개');
    expect(allCount()).toBe('전체 공고9');
    expect(recommendedCount()).toBe('추천 공고1');

    fireEvent.change(screen.getByRole('textbox', { name: '공고 검색' }), { target: { value: '리액트' } });
    expect(screen.getByText('검색 결과 1개')).toBeTruthy();
    expect(allCount()).toBe('전체 공고9');
    fireEvent.click(screen.getByRole('button', { name: /전체 공고/ }));
    expect(screen.getByText('검색 결과 9개')).toBeTruthy();

    const tenRows = [...initialRows, { ...rows[1], id: 'new-unmatched', title: '새 파이썬 공고' }];
    mocks.opportunityRows.mockResolvedValue({ data: tenRows, error: null });
    fireEvent.focus(window);
    await act(async () => {});
    expect(mocks.opportunityRows).toHaveBeenCalledOnce();
    expect(screen.getByText('검색 결과 9개')).toBeTruthy();

    initial.unmount();
    const refreshed = render(<TestRoutes initialEntry="/opportunities" />);
    await screen.findByText('검색 결과 10개');
    expect(allCount()).toBe('전체 공고10');
    expect(recommendedCount()).toBe('추천 공고1');

    mocks.opportunityRows.mockResolvedValue({
      data: [
        ...tenRows,
        { ...rows[2], id: 'new-matched', title: '새 리액트 공고' },
        ...Array.from({ length: 4 }, (_, index) => ({ ...rows[0], id: 'new-closed-' + index })),
      ], error: null,
    });
    refreshed.unmount();
    render(<TestRoutes initialEntry="/opportunities" />);
    await screen.findByText('검색 결과 15개');
    expect(allCount()).toBe('전체 공고15');
    expect(recommendedCount()).toBe('추천 공고2');
    expect(mocks.opportunityRows).toHaveBeenCalledTimes(3);
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
    expect(screen.getByRole('link', { name: '전체 공고: 0' })).toBeTruthy();
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

  it('탐색과 상세가 같은 공고의 0점, 평가 불가, 추천 제외를 구분한다', async () => {
    const unknown = { ...rows[2], id: 'unknown', title: '일정 안내', tags: ['산학협력'] };
    mocks.opportunityRows.mockResolvedValue({ data: [rows[0], rows[1], unknown], error: null });
    render(<TestRoutes initialEntry="/opportunities" />);
    await screen.findByText('검색 결과 3개');
    const findCard = (title: string) => within(screen.getAllByRole('article').find(card => card.textContent?.includes(title))!);
    const opportunities = [rows[0], rows[1], unknown].map((row) => mapOpportunityRow(row)!);
    const evaluations = getRecommendedOpportunitiesForProfile(firstProfile, opportunities);
    const unavailable = evaluations.find((result) => result.targetId === unknown.id)!;
    const zero = evaluations.find((result) => result.targetId === rows[1].id)!;
    expect(unavailable.evaluable).toBe(false);
    expect(zero).toMatchObject({ evaluable: true, score: 0 });
    expect(evaluations.some((result) => result.targetId === rows[0].id)).toBe(false);

    for (const view of ['카드형 보기', '목록형 보기']) {
      fireEvent.click(screen.getByRole('button', { name: view }));
      expect(findCard(unknown.title).queryByText(/추천 적합도/)).toBeNull();
      expect(findCard(unknown.title).getAllByText('평가 불가').length).toBeGreaterThan(0);
      expect(findCard(unknown.title).getAllByText(unavailable.reasons[0]).length).toBeGreaterThan(0);
      expect(findCard(rows[1].title).getAllByText('추천 적합도 0%').length).toBeGreaterThan(0);
      expect(findCard(rows[1].title).getAllByText(zero.reasons[0]).length).toBeGreaterThan(0);
      expect(findCard(rows[0].title).queryByText(/추천 적합도|평가 불가/)).toBeNull();
      expect(findCard(rows[0].title).queryByText(unavailable.reasons[0])).toBeNull();
      expect(findCard(rows[0].title).queryByText(zero.reasons[0])).toBeNull();
    }
    expect(screen.getByRole('option', { name: '추천순' })).toHaveProperty('disabled', false);
    fireEvent.change(screen.getByLabelText('공고 정렬'), { target: { value: 'recommended' } });
    expect(screen.getByLabelText('공고 정렬')).toHaveProperty('value', 'recommended');
    expect(screen.getByText('일치하는 추천 공고가 없어 공고를 최신순으로 표시해요.')).toBeTruthy();
    expect(screen.getByRole('button', { name: /추천 공고/ }).textContent).toContain('0');
    const openDetail = (title: string) => {
      fireEvent.click(findCard(title).getByRole('link', { name: '상세 보기' }));
      return within(screen.getByRole('region', { name: '추천 이유' }));
    };
    const unavailableDetail = openDetail(unknown.title);
    expect(unavailableDetail.queryByText(/추천 적합도/)).toBeNull();
    expect(unavailableDetail.getByText('평가 불가')).toBeTruthy();
    expect(unavailableDetail.getByText(unavailable.reasons[0])).toBeTruthy();

    fireEvent.click(screen.getByRole('link', { name: '탐색으로 이동' }));
    const zeroDetail = openDetail(rows[1].title);
    expect(zeroDetail.getByText('추천 적합도 0%')).toBeTruthy();
    expect(zeroDetail.getByText(zero.reasons[0])).toBeTruthy();

    fireEvent.click(screen.getByRole('link', { name: '탐색으로 이동' }));
    const excludedDetail = openDetail(rows[0].title);
    expect(excludedDetail.queryByText(/추천 적합도|평가 불가/)).toBeNull();
    expect(excludedDetail.getByText('모집이 종료된 공고는 추천 평가에서 제외돼요.')).toBeTruthy();
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
});
