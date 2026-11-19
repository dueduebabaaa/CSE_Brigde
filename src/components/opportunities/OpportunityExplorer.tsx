import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ArrowUpRight, LayoutGrid, List, Search, SlidersHorizontal } from 'lucide-react';
import { Button, EmptyState, LoadingState } from '../ui';
import { ConnectionGraphic } from '../dashboard/DashboardCards';
import { DemoNotice, OpportunityTile, RecommendationStatus } from './OpportunityUI';
import { CATEGORIES, DEFAULT_FILTERS, evaluationMap, filterOpportunities, opportunityStatus, publicOpportunities, readFilters, recommendationMap, STATUS_LABELS } from './opportunityModel';
import type { ExploreFilters, OpportunitySource } from './opportunityModel';

const selectClass = 'mt-1 w-full min-w-0 min-h-11 rounded-lg border border-[#E2E8F0] bg-white px-3 text-sm text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#7D39EB]';

export function OpportunityExplorer({ opportunities, matches = [], loading, error, demo = false, now = new Date(),
  bookmarkIds = [], onBookmark, onRetry, profileStatus, onProfileRetry }: OpportunitySource) {
  const [params, setParams] = useSearchParams();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const items = publicOpportunities(opportunities || [], now);
  const suppliedMatches = recommendationMap(matches);
  const evaluations = evaluationMap(matches);
  const hasRecommendations = items.some((item) => suppliedMatches.has(item.id));
  const filters = readFilters(params, hasRecommendations, hasRecommendations || profileStatus !== undefined);
  const results = filterOpportunities(items, filters, matches, now);
  const list = params.get('view') === 'list';
  const tags = [...new Set(items.flatMap((item) => item.tags))].sort((a, b) => a.localeCompare(b, 'ko'));
  const ready = opportunities !== undefined && !loading && !error;
  const change = (patch: Partial<ExploreFilters>) => {
    const next = { ...readFilters(params, true), ...patch };
    const query = new URLSearchParams();
    Object.entries(next).forEach(([key, value]) => {
      if (value && value !== DEFAULT_FILTERS[key as keyof ExploreFilters]) query.set(key, value === true ? '1' : String(value));
    });
    if (list) query.set('view', 'list');
    setParams(query, { replace: true });
  };
  const reset = () => setParams(list ? { view: 'list' } : {}, { replace: true });
  const setView = (value: 'card' | 'list') => {
    const query = new URLSearchParams(params);
    if (value === 'list') query.set('view', value); else query.delete('view');
    setParams(query, { replace: true });
  };
  const stats = [
    { label: '모집 중인 공고', count: items.filter((item) => opportunityStatus(item, now) === 'open').length, style: 'bg-white text-[#0F172A] border-[#E2E8F0]', onClick: () => change({ status: 'open' }), disabled: false },
    { label: '추천 공고', count: items.filter((item) => suppliedMatches.has(item.id)).length, style: 'bg-[#7D39EB] text-white border-[#7D39EB]', onClick: () => change({ recommended: true, sort: 'recommended' }), disabled: !hasRecommendations },
  ];
  return <div className="min-w-0 space-y-5 sm:space-y-7">
    <div>
      <h1 className="text-[26px] font-black leading-tight tracking-tight text-[#0F172A] sm:text-[32px] break-keep">새로운 기회를 발견하세요.</h1>
      <p className="mt-2 text-sm text-[#64748B]">관심에서 시작해, 다음 도전으로.</p>
    </div>
    <DemoNotice demo={demo} />
    <section aria-label="발견과 현황" className="grid min-w-0 gap-3 xl:grid-cols-12">
      <div className="relative flex min-w-0 items-center overflow-hidden rounded-2xl bg-black px-5 py-5 text-white sm:px-7 sm:py-7 xl:col-span-6">
        <div className="relative z-10 min-w-0 pr-16 sm:pr-24">
          <p className="mb-2 text-[10px] font-semibold tracking-[0.18em] text-[#94A3B8]">BRIDGE / DISCOVERY</p>
          <h2 className="text-[30px] font-black leading-none tracking-[-0.05em] text-white sm:text-[42px]">DISCOVER<br /><span className="text-[#C6FF33]">MORE.</span></h2>
        </div>
        <div className="pointer-events-none absolute -right-1 top-1/2 w-28 -translate-y-1/2 opacity-90 sm:right-4 sm:w-44"><ConnectionGraphic /></div>
      </div>
      <div className="grid min-w-0 grid-cols-2 gap-2 sm:gap-3 xl:col-span-6">{stats.map((stat) =>
        <button key={stat.label} type="button" disabled={!ready || stat.disabled} onClick={stat.onClick}
          className={`flex min-h-24 min-w-0 flex-col justify-between rounded-xl border p-3 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#7D39EB] disabled:cursor-default sm:p-5 ${stat.style}`}>
          <span className="flex flex-wrap items-center justify-between gap-1 text-[11px] font-semibold leading-relaxed">{stat.label}<ArrowUpRight size={13} aria-hidden="true" /></span>
          <span className="mt-3 text-2xl font-bold tabular-nums sm:text-3xl">{ready && (!stat.disabled || profileStatus === 'ready') ? stat.count : '—'}</span>
        </button>)}</div>
    </section>

    <section aria-label="공고 검색과 필터" className="rounded-2xl border border-[#E2E8F0] bg-white p-4 sm:p-5">
      <div className="relative">
        <Search size={18} aria-hidden="true" className="pointer-events-none absolute left-3.5 top-3.5 text-[#64748B]" />
        <input aria-label="공고 검색" placeholder="제목, 주최 기관, 기술 태그 검색" value={filters.search}
          onChange={(event) => change({ search: event.target.value })} className="min-h-12 w-full min-w-0 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] pl-11 pr-3 text-sm text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#7D39EB]" />
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
        <Button variant="ghost" onClick={reset} className="!min-h-11 !text-xs">전체 필터 초기화</Button>
        <Button variant="secondary" aria-expanded={filtersOpen} aria-controls="opportunity-filters" onClick={() => setFiltersOpen((value) => !value)} className="!min-h-11 sm:!hidden" leftIcon={<SlidersHorizontal size={15} />}>필터</Button>
      </div>
      <div id="opportunity-filters" className={`${filtersOpen ? 'grid' : 'hidden'} mt-3 min-w-0 grid-cols-1 gap-3 border-t border-[#E2E8F0] pt-4 sm:grid sm:grid-cols-3`}>
        <label className="min-w-0 text-xs font-semibold text-[#64748B]">활동 유형<select value={filters.category} onChange={(event) => change({ category: event.target.value })} className={selectClass}>
          <option value="">전체 유형</option>{CATEGORIES.map((category) => <option key={category} value={category}>{category}</option>)}
        </select></label>
        <label className="min-w-0 text-xs font-semibold text-[#64748B]">관심 분야·태그<select value={filters.tag} onChange={(event) => change({ tag: event.target.value })} className={selectClass}>
          <option value="">전체 태그</option>{filters.tag && !tags.includes(filters.tag) && <option value={filters.tag}>{filters.tag}</option>}{tags.map((tag) => <option key={tag} value={tag}>{tag}</option>)}
        </select></label>
        <label className="min-w-0 text-xs font-semibold text-[#64748B]">모집 상태<select value={filters.status} onChange={(event) => change({ status: event.target.value })} className={selectClass}>
          <option value="">전체 상태</option>{Object.entries(STATUS_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
        </select></label>
        <div className="flex flex-wrap items-center justify-between gap-2 sm:col-span-3">
          <label className="inline-flex min-h-11 items-center gap-2 text-xs text-[#64748B]"><input type="checkbox" checked={filters.recommended} disabled={!hasRecommendations && !filters.recommended} onChange={(event) => change({ recommended: event.target.checked })} className="h-4 w-4 accent-[#7D39EB]" />추천 공고만 보기</label>
          <p className="text-[11px] text-[#64748B]">관심 분야는 공고에 등록된 태그 기준입니다.</p>
        </div>
      </div>
      {ready && !hasRecommendations && <div className="mt-2"><RecommendationStatus profileStatus={profileStatus} onProfileRetry={onProfileRetry} /></div>}
    </section>

    <section aria-label="공고 검색 결과" className="min-w-0">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <p role="status" aria-live="polite" className="text-sm font-semibold text-[#0F172A]">{ready ? `검색 결과 ${results.length}개` : '공고 확인 중'}</p>
        <div className="flex flex-wrap items-center gap-2">
          <label className="sr-only" htmlFor="opportunity-sort">공고 정렬</label>
          <select id="opportunity-sort" value={filters.sort} onChange={(event) => change({ sort: event.target.value as ExploreFilters['sort'] })} className="min-h-11 rounded-lg border border-[#E2E8F0] bg-white px-2 text-xs text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#7D39EB]">
            <option value="newest">최신순</option><option value="recommended" disabled={!hasRecommendations}>추천순</option>
          </select>
          <div role="group" aria-label="보기 방식" className="flex rounded-lg border border-[#E2E8F0] bg-white">
            <button type="button" aria-label="카드형 보기" aria-pressed={!list} onClick={() => setView('card')} className={`flex h-11 w-11 items-center justify-center rounded-lg ${!list ? 'bg-[#F4EFFE] text-[#7D39EB]' : 'text-[#64748B]'}`}><LayoutGrid size={17} /></button>
            <button type="button" aria-label="목록형 보기" aria-pressed={list} onClick={() => setView('list')} className={`flex h-11 w-11 items-center justify-center rounded-lg ${list ? 'bg-[#F4EFFE] text-[#7D39EB]' : 'text-[#64748B]'}`}><List size={17} /></button>
          </div>
        </div>
      </div>
      {!onBookmark && <p className="mb-3 text-xs text-[#64748B]">북마크는 저장 기능 연결 후 사용할 수 있어요.</p>}
      {loading ? <div role="status" aria-label="공고 불러오는 중"><LoadingState variant="skeleton" rows={3} /></div>
        : error ? <div role="alert" className="rounded-2xl border border-[#E2E8F0] bg-white p-6"><p className="text-sm">공고를 불러오지 못했어요.</p>{onRetry && <Button onClick={onRetry} className="mt-3 !min-h-11">다시 시도</Button>}</div>
        : opportunities === undefined ? <EmptyState title="공고 정보를 기다리고 있어요" description="공고를 불러올 수 있게 되면 여기에서 새로운 기회를 확인하세요." />
        : !items.length ? <EmptyState title="아직 등록된 공고가 없어요" description="새로운 기회가 준비되면 여기에서 확인하세요." />
        : !results.length ? <EmptyState title={filters.recommended && !hasRecommendations ? '표시할 추천 공고가 없어요' : '검색 결과가 없어요'} description="다른 검색어나 필터로 새로운 기회를 찾아보세요." action={{ label: '전체 필터 초기화', onClick: reset }} />
        : <div className={`grid min-w-0 ${list ? 'grid-cols-1 gap-4' : 'grid-cols-1 gap-3 min-[360px]:grid-cols-2 sm:grid-cols-2 sm:gap-4 xl:grid-cols-3'}`}>
          {results.map((opportunity) => <OpportunityTile key={opportunity.id} opportunity={opportunity} match={evaluations.get(opportunity.id)} now={now} demo={demo} list={list}
            listSearch={params.toString() ? `?${params}` : ''} saved={bookmarkIds.includes(opportunity.id)} onBookmark={onBookmark} />)}
        </div>}
    </section>
  </div>;
}
