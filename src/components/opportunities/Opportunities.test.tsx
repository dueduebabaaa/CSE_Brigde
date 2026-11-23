// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { mockOpportunities, mockRecruitments } from '../../data/mockData';
import { demoDashboard, DEMO_NOW } from '../dashboard/dashboardDemo';
import { OpportunityExplorer } from './OpportunityExplorer';
import { OpportunityDetail } from './OpportunityDetail';
import { BookmarkButton } from './OpportunityUI';
import { DEFAULT_FILTERS, filterOpportunities, opportunityStatus, readFilters } from './opportunityModel';
import type { ExploreFilters } from './opportunityModel';

const now = new Date(DEMO_NOW);
const matches = demoDashboard.opportunityMatches;
const filter = (patch: Partial<ExploreFilters>) => filterOpportunities(mockOpportunities, { ...DEFAULT_FILTERS, ...patch }, matches, now);
afterEach(cleanup);

describe('공고 검색·필터·정렬', () => {
  it('제목·주최 기관·태그를 검색하고 공백과 대소문자를 정규화한다', () => {
    expect(filter({ search: 'KNU' }).map((item) => item.id)).toContain('opp-official-01');
    expect(filter({ search: '핀테크혁신연합' }).map((item) => item.id)).toEqual(['opp-user-02']);
    expect(filter({ search: '  react  ' }).map((item) => item.id)).toEqual(['opp-official-01']);
    expect(filter({ search: '없는검색어' })).toEqual([]);
  });
  it('유형·태그·상태·마감 필터를 교집합으로 적용한다', () => {
    expect(filter({ category: '해커톤' })).toHaveLength(2);
    expect(filter({ category: '해커톤', tag: 'React', status: 'open' }).map((item) => item.id)).toEqual(['opp-official-01']);
    expect(filter({ closing: true }).map((item) => item.id).sort()).toEqual(['opp-user-01', 'opp-user-02']);
    expect(filter({ status: 'unknown' })).toHaveLength(2);
    expect(filter({ recommended: true })).toHaveLength(3);
    expect(filter({ category: '교육/특강', tag: 'React' })).toHaveLength(0);
  });
  it('최신순·마감순·제공된 점수순을 지원하고 원본 배열을 보존한다', () => {
    const ids = mockOpportunities.map((item) => item.id);
    expect(filter({ sort: 'newest' })[0].id).toBe('opp-official-04');
    const byDeadline = filter({ sort: 'deadline' });
    expect(byDeadline[0].id).toBe('opp-user-02');
    expect(byDeadline.slice(-2).every((item) => item.deadline === null)).toBe(true);
    expect(filter({ sort: 'recommended' }).slice(0, 3).map((item) => item.id)).toEqual(matches.map((item) => item.targetId));
    expect(mockOpportunities.map((item) => item.id)).toEqual(ids);
  });
  it('접수 시작과 공고 상태를 구분하고 임시저장·미래 게시글은 노출하지 않는다', () => {
    const base = mockOpportunities[0];
    expect(opportunityStatus({ ...base, status: 'closed', deadline: null }, now)).toBe('closed');
    expect(opportunityStatus({ ...base, status: 'needs_confirmation', deadline: null }, now)).toBe('unknown');
    expect(opportunityStatus({ ...base, deadline: '2026-11-15T11:59:00+09:00' }, now)).toBe('closed');
    expect(opportunityStatus({ ...base, applicationStart: '2026-11-16T00:00:00+09:00' }, now)).toBe('scheduled');
    expect(filterOpportunities([{ ...base, status: 'draft' }, { ...base, id: 'future', postedAt: '2026-12-01T00:00:00+09:00' }], DEFAULT_FILTERS, [], now)).toEqual([]);
    expect(readFilters(new URLSearchParams('sort=recommended&recommended=1&category=invalid'), false)).toMatchObject({ sort: 'newest', recommended: false, category: '' });
  });
});

describe('탐색 화면 동작', () => {
  it('검색 결과 수·초기화·목록 전환과 상세 링크의 필터 유지를 제공한다', () => {
    render(<MemoryRouter><OpportunityExplorer opportunities={mockOpportunities} matches={matches} demo now={now} /></MemoryRouter>);
    fireEvent.change(screen.getByRole('textbox', { name: '공고 검색' }), { target: { value: 'React' } });
    expect(screen.getByText('검색 결과 1개')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '목록형 보기' }));
    expect(screen.getByRole('button', { name: '목록형 보기' }).getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByRole('link', { name: '상세 보기' }).getAttribute('href')).toContain('search=React');
    fireEvent.change(screen.getByRole('textbox', { name: '공고 검색' }), { target: { value: '없는검색어' } });
    expect(screen.getByText('검색 결과가 없어요')).toBeTruthy();
    fireEvent.click(screen.getAllByRole('button', { name: '전체 필터 초기화' })[0]);
    expect(screen.getByText('검색 결과 10개')).toBeTruthy();
  });
  it('드롭다운 필터와 정렬을 실제 결과에 적용하며 마감일 관련 UI는 노출하지 않는다', () => {
    render(<MemoryRouter initialEntries={['/opportunities?closing=1&sort=deadline']}><OpportunityExplorer opportunities={mockOpportunities} matches={matches} now={now} /></MemoryRouter>);
    expect(screen.getByText('검색 결과 10개')).toBeTruthy();
    expect((screen.getByLabelText('공고 정렬') as HTMLSelectElement).value).toBe('newest');
    fireEvent.click(screen.getByRole('button', { name: '필터' }));
    fireEvent.change(screen.getByLabelText('활동 유형'), { target: { value: '해커톤' } });
    fireEvent.change(screen.getByLabelText('관심 분야·태그'), { target: { value: 'React' } });
    fireEvent.change(screen.getByLabelText('모집 상태'), { target: { value: 'open' } });
    expect(screen.getByText('검색 결과 1개')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '전체 필터 초기화' }));

    // 마감 임박 체크박스 및 마감 임박순 정렬이 숨겨져 있는지 검증
    expect(screen.queryByRole('checkbox', { name: '7일 이내 마감' })).toBeNull();
    const sortSelect = screen.getByLabelText('공고 정렬') as HTMLSelectElement;
    const optionValues = Array.from(sortSelect.options).map((opt) => opt.value);
    expect(optionValues).not.toContain('deadline');
    expect(screen.queryByText(/마감일 확인 중|마감일 미정/)).toBeNull();
  });
  it('추천 미제공·로딩·조회 실패·데이터 없음 상태를 구분한다', () => {
    const { rerender } = render(<MemoryRouter><OpportunityExplorer opportunities={[]} now={now} /></MemoryRouter>);
    expect(screen.getByText('아직 등록된 공고가 없어요')).toBeTruthy();
    expect(screen.getByRole('button', { name: /전체 공고/ }).textContent).toBe('전체 공고0');
    expect(screen.getByRole('button', { name: /추천 공고/ }).textContent).toContain('—');
    expect((screen.getByRole('checkbox', { name: '추천 공고만 보기' }) as HTMLInputElement).disabled).toBe(true);
    expect((screen.getByRole('option', { name: '추천순' }) as HTMLOptionElement).disabled).toBe(true);
    rerender(<MemoryRouter><OpportunityExplorer now={now} /></MemoryRouter>);
    expect(screen.getByText('공고 정보를 기다리고 있어요')).toBeTruthy();
    expect(screen.queryByText('검색 결과 0개')).toBeNull();
    rerender(<MemoryRouter><OpportunityExplorer loading now={now} /></MemoryRouter>);
    expect(screen.getByRole('status', { name: '공고 불러오는 중' })).toBeTruthy();
    expect(screen.getByRole('button', { name: /전체 공고/ }).textContent).toContain('—');
    const retry = vi.fn();
    rerender(<MemoryRouter><OpportunityExplorer error="failed" onRetry={retry} now={now} /></MemoryRouter>);
    expect(screen.getByRole('button', { name: /전체 공고/ }).textContent).toContain('—');
    fireEvent.click(screen.getByRole('button', { name: '다시 시도' }));
    expect(retry).toHaveBeenCalledOnce();
    expect(screen.queryByText('아직 등록된 공고가 없어요')).toBeNull();
  });
});

describe('상세 화면과 저장', () => {
  it('실제 ID의 내용·추천 이유·연결된 모집글만 표시하며 상세 정보 카드와 가상 원본은 노출하지 않는다', () => {
    render(<MemoryRouter><OpportunityDetail opportunity={mockOpportunities[0]} matches={matches} recruitments={mockRecruitments} now={now} demo backTo="/opportunities?search=React" /></MemoryRouter>);
    expect(screen.getByRole('heading', { level: 1 }).textContent).toContain('KNU');
    expect(screen.getByText('자세한 활동 내용 및 지원 방법은 원본 공지를 확인해 주세요.')).toBeTruthy();
    expect(screen.queryByText(/모집 마감 \d{4}/)).toBeNull();
    expect(screen.queryByRole('region', { name: '상세 정보' })).toBeNull();
    expect(screen.queryByText('이번 기회, 자세히 살펴보기.')).toBeNull();
    expect(screen.getByRole('region', { name: '추천 이유' })).toBeTruthy();
    expect(screen.queryByRole('link', { name: '원본 공지 바로가기' })).toBeNull();
    expect(screen.getByRole('link', { name: '팀원 모집글 작성' }).getAttribute('href')).toBe('/recruitments/new?opportunityId=opp-official-01');
    expect(screen.getByRole('link', { name: '목록으로 돌아가기' }).getAttribute('href')).toBe('/opportunities?search=React');
    expect(within(screen.getByRole('region', { name: '관련 팀원 모집글' })).getAllByRole('listitem')).toHaveLength(1);
  });
  it('없는 ID와 미연동을 구분하고 유효한 원본 링크만 연결한다', () => {
    const { rerender } = render(<MemoryRouter><OpportunityDetail opportunity={null} now={now} /></MemoryRouter>);
    expect(screen.getByText('공고를 찾을 수 없어요')).toBeTruthy();
    rerender(<MemoryRouter><OpportunityDetail now={now} /></MemoryRouter>);
    expect(screen.getByText('공고 정보를 아직 불러올 수 없어요')).toBeTruthy();
    rerender(<MemoryRouter><OpportunityDetail opportunity={mockOpportunities[0]} now={now} /></MemoryRouter>);
    expect(screen.getByRole('link', { name: '원본 공지 바로가기' }).getAttribute('href')).toContain('computer.knu.ac.kr');
    rerender(<MemoryRouter><OpportunityDetail opportunity={{ ...mockOpportunities[0], sourceUrl: 'javascript:alert(1)' }} now={now} /></MemoryRouter>);
    expect(screen.queryByRole('link', { name: '원본 공지 바로가기' })).toBeNull();
  });
  it('북마크 저장 실패를 알리고 가짜 성공 상태를 표시하지 않는다', async () => {
    const save = vi.fn().mockRejectedValue(new Error('offline'));
    render(<BookmarkButton id="opp-1" saved={false} onBookmark={save} />);
    fireEvent.click(screen.getByRole('button', { name: '북마크 저장' }));
    await waitFor(() => expect(screen.getByRole('alert')).toBeTruthy());
    expect(screen.getByRole('button').getAttribute('aria-pressed')).toBe('false');
    expect(save).toHaveBeenCalledWith('opp-1', true);
  });
});
