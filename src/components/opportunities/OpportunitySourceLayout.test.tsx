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

  it('PostgreSQL 시각 표기의 일정 확인 중 공고도 추천되며 모집 중 집계에서는 빠진다', async () => {
    const notice = { ...rows[2], posted_at: '2020-01-01 00:00:00+00' };
    mocks.opportunityRows.mockResolvedValue({ data: [notice], error: null });

    render(<TestRoutes />);
    expect(await screen.findByRole('link', { name: '추천 공고: 1' })).toBeTruthy();
    expect(screen.getByRole('link', { name: '공개 공고: 1' })).toBeTruthy();
    expect(screen.getByText('모집 중 0개 · 일정 확인 중 제외')).toBeTruthy();

    fireEvent.click(screen.getByRole('link', { name: '탐색으로 이동' }));
    expect(screen.getByRole('button', { name: /모집 중인 공고/ }).textContent).toContain('0');
    expect(screen.getByRole('option', { name: '추천순' })).toHaveProperty('disabled', false);
    const card = screen.getByRole('article');
    expect(card.querySelector('svg[viewBox="0 0 150 85"]')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: '목록형 보기' }));
    expect(screen.getByRole('article').querySelector('svg[viewBox="0 0 150 85"]')).toBeNull();

    fireEvent.click(within(screen.getByRole('article')).getByRole('link', { name: '상세 보기' }));
    expect(within(screen.getByRole('region', { name: '추천 이유' })).getByText('추천 적합도 100%')).toBeTruthy();
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
    expect(screen.getByRole('option', { name: '추천순' })).toHaveProperty('disabled', false);
    fireEvent.change(screen.getByLabelText('공고 정렬'), { target: { value: 'recommended' } });
    expect(screen.getByLabelText('공고 정렬')).toHaveProperty('value', 'recommended');
    expect(screen.getByText('일치하는 추천 공고가 없어 공고를 최신순으로 표시해요.')).toBeTruthy();
    expect(screen.getByRole('button', { name: /추천 공고/ }).textContent).toContain('0');
    fireEvent.click(within(unknownCard).getByRole('link', { name: '상세 보기' }));
    const reasons = within(screen.getByRole('region', { name: '추천 이유' }));
    expect(reasons.queryByText(/추천 적합도/)).toBeNull();
    const opportunity = mapOpportunityRow(unknown)!;
    const evaluation = getRecommendedOpportunitiesForProfile(firstProfile, [opportunity])[0];
    expect(evaluation.evaluable).toBe(false);
    expect(reasons.getByText(evaluation.reasons[0])).toBeTruthy();
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
