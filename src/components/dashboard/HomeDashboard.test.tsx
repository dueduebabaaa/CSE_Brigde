// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { HomeDashboard } from '../../pages/HomePage';
import { OpportunityCard } from './DashboardCards';
import { demoDashboard, DEMO_NOW } from './dashboardDemo';
import { deadlineLabel, EMPTY_DASHBOARD, safeExternalUrl, summarizeDashboard } from './dashboardModel';

vi.mock('../../services/opportunityService', () => ({ fetchOpportunities: vi.fn() }));

const now = new Date(DEMO_NOW);
afterEach(cleanup);

describe('대시보드 집계와 표시', () => {
  it('상태·접수 시작·실제 마감 시각으로 집계하며 입력 배열을 변경하지 않는다', () => {
    const base = demoDashboard.opportunities[0];
    const data = { ...EMPTY_DASHBOARD, opportunities: [
      { ...base, id: 'closed', status: 'closed' as const },
      { ...base, id: 'expired', deadline: '2026-11-15T11:59:00+09:00' },
      { ...base, id: 'today', deadline: '2026-11-15T18:00:00+09:00' },
      { ...base, id: 'future', applicationStart: '2026-11-16T00:00:00+09:00' },
      { ...base, id: 'unknown', deadline: null },
      { ...base, id: 'day7', deadline: '2026-11-22T23:59:00+09:00' },
      { ...base, id: 'day8', deadline: '2026-11-23T00:00:00+09:00' },
    ] };
    const original = data.opportunities.map((item) => item.id);
    const summary = summarizeDashboard(data, now);
    expect(summary.open.map((item) => item.id)).toEqual(['today', 'unknown', 'day7', 'day8']);
    expect(summary.closing.map((item) => item.id)).toEqual(['today', 'day7']);
    expect(data.opportunities.map((item) => item.id)).toEqual(original);
    expect(deadlineLabel(null, now)).toBe('마감일 확인 중');
    expect(deadlineLabel('2026-11-15T18:00:00+09:00', now)).toBe('D-Day');
    expect(deadlineLabel('2026-11-15T11:59:00+09:00', now)).toBe('마감');
    expect(deadlineLabel('2026-11-15T15:01:00Z', new Date('2026-11-15T14:59:00Z'))).toBe('D-1');
  });

  it('연동 전에는 통계 0을 주장하지 않고 빈 상태·로딩·오류를 구분한다', () => {
    const { rerender } = render(<MemoryRouter><HomeDashboard now={now} /></MemoryRouter>);
    expect(screen.getByRole('link', { name: '전체 공고: 확인 대기' })).toBeTruthy();
    expect(screen.getByText('다음 도전을 기다리고 있어요')).toBeTruthy();
    expect(screen.queryByText('개발용 예시 데이터')).toBeNull();
    rerender(<MemoryRouter><HomeDashboard now={now} loading /></MemoryRouter>);
    expect(screen.getByRole('status', { name: '대시보드 불러오는 중' })).toBeTruthy();
    expect(screen.queryByText('다음 도전을 기다리고 있어요')).toBeNull();
    const retry = vi.fn();
    rerender(<MemoryRouter><HomeDashboard now={now} error="failed" onRetry={retry} /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: '다시 시도' }));
    expect(retry).toHaveBeenCalledOnce();
  });

  it('전달받은 추천·프로필·통계를 표시하고 가상 원본 링크는 열지 않는다', () => {
    render(<MemoryRouter><HomeDashboard data={demoDashboard} demo now={now} profileName="테스트" /></MemoryRouter>);
    const summary = summarizeDashboard(demoDashboard, now);
    expect(screen.getByRole('link', { name: `전체 공고: ${demoDashboard.opportunities.length}` })).toBeTruthy();
    expect(screen.getByRole('link', { name: `내 프로젝트 현황: ${summary.activeTeams.length}` })).toBeTruthy();
    const recommended = screen.getByRole('region', { name: '나에게 맞는 공모전' });
    expect(within(recommended).getAllByRole('article')).toHaveLength(3);
    expect(within(recommended).getByText('예시 적합도 96%')).toBeTruthy();
    expect(screen.getByText('테스트님, 반가워요.')).toBeTruthy();
    expect(screen.queryByRole('link', { name: '원본 공지' })).toBeNull();
    expect(screen.queryByText(/@knu.ac.kr/)).toBeNull();
    expect(screen.getByRole('link', { name: '팀원 찾아보기' }).getAttribute('href')).toBe('/members');
  });

  it('출처와 모집 상태에 관계없이 공개 공고를 집계하고 새 데이터에 맞춰 갱신한다', () => {
    const base = demoDashboard.opportunities[0];
    const publicItems = Array.from({ length: 9 }, (_, index) => ({
      ...base, id: String(index), postedAt: now.toISOString(),
      status: (['active', 'needs_confirmation', 'closed'] as const)[index % 3],
      sourceType: (['knu_cse_official', 'admin_manual', 'user_manual'] as const)[index % 3],
    }));
    const opportunities = [
      ...publicItems,
      { ...base, id: 'draft', status: 'draft' as const, postedAt: now.toISOString() },
      { ...base, id: 'future', postedAt: new Date(now.getTime() + 1).toISOString() },
    ];
    const dashboard = (items = opportunities) => <MemoryRouter><HomeDashboard
      data={{ ...EMPTY_DASHBOARD, opportunities: items }} now={now} profileStatus="ready" /></MemoryRouter>;
    const { rerender } = render(dashboard());

    const total = screen.getByRole('link', { name: '전체 공고: 9' });
    expect(total.getAttribute('href')).toBe('/opportunities');
    expect(total.classList.contains('col-span-2')).toBe(true);
    expect(total.classList.contains('bg-[#C6FF33]')).toBe(true);
    expect(screen.queryByRole('link', { name: /^(공개 공고|학부 공식 공고):/ })).toBeNull();
    expect(total.nextElementSibling).toBe(screen.getByRole('link', { name: '추천 공고: 0' }));
    expect(total.parentElement?.lastElementChild).toBe(screen.getByRole('link', { name: '내 프로젝트 현황: 확인 대기' }));

    rerender(dashboard([...opportunities, { ...publicItems[0], id: 'added' }]));
    expect(screen.getByRole('link', { name: '전체 공고: 10' })).toBeTruthy();
    expect(screen.getByRole('link', { name: '추천 공고: 0' })).toBeTruthy();
  });

  it('저장 실패 시 북마크 성공 상태를 만들지 않으며 안전한 원본 URL만 허용한다', async () => {
    const onBookmark = vi.fn().mockRejectedValue(new Error('offline'));
    render(<MemoryRouter><OpportunityCard opportunity={demoDashboard.opportunities[0]}
      match={demoDashboard.opportunityMatches[0]} now={now} demo={false} bookmarked={false} onBookmark={onBookmark} /></MemoryRouter>);
    const bookmark = screen.getByRole('button', { name: /북마크/ });
    fireEvent.click(bookmark);
    await waitFor(() => expect(screen.getByRole('alert')).toBeTruthy());
    expect(bookmark.getAttribute('aria-pressed')).toBe('false');
    expect(onBookmark).toHaveBeenCalledWith(demoDashboard.opportunities[0].id, true);
    expect(safeExternalUrl('javascript:alert(1)')).toBeUndefined();
    expect(safeExternalUrl('https://computer.knu.ac.kr/')).toBe('https://computer.knu.ac.kr/');
  });
});
