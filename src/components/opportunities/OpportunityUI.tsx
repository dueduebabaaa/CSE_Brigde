import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, Bookmark, Sparkles } from 'lucide-react';
import { Badge, Button } from '../ui';
import { Tags } from '../dashboard/DashboardCards';
import { displayTitle, formatDate } from '../dashboard/dashboardModel';
import type { MatchResult, Opportunity, OpportunityCategory } from '../../types';
import { opportunityStatus, STATUS_LABELS } from './opportunityModel';
import type { OpportunitySource } from './opportunityModel';

export function RecommendationStatus({ profileStatus, onProfileRetry }: Pick<OpportunitySource, 'profileStatus' | 'onProfileRetry'>) {
  if (profileStatus === 'loading') return <p role="status" className="text-xs text-[#64748B]">추천에 사용할 프로필을 불러오는 중이에요.</p>;
  if (profileStatus === 'error') return <div role="alert" className="text-xs text-[#64748B]">
    <p>추천에 사용할 프로필을 불러오지 못했어요.</p>
    {onProfileRetry && <Button variant="secondary" onClick={onProfileRetry} className="mt-2 !min-h-11">프로필 다시 불러오기</Button>}
  </div>;
  if (profileStatus === 'missing') return <p className="text-xs text-[#64748B]">프로필을 등록하면 맞춤 공고를 확인할 수 있어요.</p>;
  if (profileStatus === 'signed_out') return <p className="text-xs text-[#64748B]">로그인하면 맞춤 공고를 확인할 수 있어요.</p>;
  return <p className="text-xs text-[#64748B]">아직 제공된 추천 결과가 없어요.</p>;
}

export function DemoNotice({ demo }: { demo?: boolean }) {
  return demo ? <p role="note" className="rounded-xl border border-[#7D39EB]/20 bg-[#F4EFFE] px-3 py-2 text-[11px] leading-relaxed text-[#6025C5]">
    <strong>개발용 가상 데이터</strong> · 2026.11.15 기준 · 추천은 가상 예시입니다. 북마크는 현재 탭의 세션에만 저장되며 DB에는 저장되지 않습니다.
  </p> : null;
}

export function BookmarkButton({ id, saved, onBookmark }: {
  id: string; saved: boolean; onBookmark?: (id: string, next: boolean) => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const toggle = async () => {
    if (!onBookmark || busy) return;
    setBusy(true); setError('');
    try { await onBookmark(id, !saved); }
    catch { setError('북마크를 변경하지 못했어요. 다시 시도해 주세요.'); }
    finally { setBusy(false); }
  };
  return <div>
    <Button variant="ghost" disabled={!onBookmark || busy} onClick={toggle} aria-pressed={saved}
      aria-label={saved ? '북마크 해제' : '북마크 저장'} title={onBookmark ? '북마크' : '북마크 저장 기능 연결 대기'} className="!h-11 !w-11 !p-0">
      <Bookmark size={18} aria-hidden="true" className={saved ? 'fill-[#7D39EB] text-[#7D39EB]' : ''} />
    </Button>
    {error && <p role="alert" className="mt-1 max-w-48 text-xs text-red-600">{error}</p>}
  </div>;
}

export function Recommendation({ match, demo }: { match?: MatchResult; demo?: boolean }) {
  return match ? <div className="text-xs">
    <p className="flex items-center gap-1.5 font-bold text-[#7D39EB]"><Sparkles size={14} aria-hidden="true" />{demo ? '예시 적합도' : '추천 적합도'} {Math.round(match.score)}%</p>
    {match.reasons.length ? <ul className="mt-2 space-y-1 leading-relaxed text-[#64748B]">{match.reasons.map((reason, index) => <li key={index}>{reason}</li>)}</ul>
      : <p className="mt-2 text-[#64748B]">추천 이유 미제공</p>}
  </div> : null;
}

const COLORS: Record<OpportunityCategory, { background: string; ink: string }> = {
  '해커톤': { background: '#000000', ink: '#C6FF33' },
  '공모전': { background: '#7D39EB', ink: '#FFFFFF' },
  '경진대회': { background: '#C6FF33', ink: '#000000' },
  '대외활동': { background: '#F4EFFE', ink: '#7D39EB' },
  '서포터즈': { background: '#F7FEDF', ink: '#000000' },
  '교육/특강': { background: '#0F172A', ink: '#C6FF33' },
};
export function OpportunityGraphic({ category, compact = false, layout }: {
  category: OpportunityCategory; compact?: boolean; layout?: 'card' | 'list';
}) {
  const colors = COLORS[category];
  const size = layout === 'card' ? 'h-12 w-full max-w-[208px] sm:h-16'
    : layout === 'list' ? 'h-12 w-full max-w-[136px] sm:h-14'
    : `overflow-hidden px-4 ${compact ? 'h-16' : 'h-20 sm:h-24'}`;
  return <div style={{ backgroundColor: colors.background, color: colors.ink }} className={`relative flex items-center justify-between rounded-xl ${size} ${layout ? 'gap-1 px-2' : ''}`} aria-hidden="true">
    <span className={layout ? 'min-w-0 break-words text-[10px] font-bold sm:text-xs' : 'text-xs font-bold'}>{category}</span>
    <svg viewBox="0 0 150 85" fill="none" className={layout ? `h-auto w-16 max-w-[54%] shrink-0 ${layout === 'card' ? 'sm:w-20' : ''}` : 'h-full w-32 shrink-0'}>
      {category === '경진대회' || category === '서포터즈' ? <><path d="M12 70V48H43V31H76V13H126M111 13H126V28" stroke="currentColor" strokeWidth="1.8" /><path d="M12 78H136M20 7V78M54 7V78M88 7V78M122 7V78" stroke="currentColor" strokeOpacity="0.15" /></>
        : category === '공모전' || category === '대외활동' ? <><circle cx="56" cy="42" r="29" stroke="currentColor" strokeWidth="1.5" /><circle cx="94" cy="42" r="29" stroke="currentColor" strokeWidth="1.5" /><path d="M10 42H140" stroke="currentColor" strokeDasharray="3 5" /><circle cx="75" cy="42" r="4" fill="currentColor" /></>
          : <><path d="M12 70Q75 -35 138 70M12 70Q75 0 138 70" stroke="currentColor" strokeWidth="1.5" /><path d="M12 70L75 30L138 70" stroke="currentColor" strokeOpacity="0.35" /><circle cx="12" cy="70" r="4" fill="currentColor" /><circle cx="138" cy="70" r="4" fill="currentColor" /></>}
    </svg>
  </div>;
}

const SOURCE_LABELS = { knu_cse_official: '학부 공식 공고', admin_manual: '관리자 등록', user_manual: '회원 등록' };
export function OpportunityTile({ opportunity, match, now, demo = false, list = false, listSearch = '', saved = false, onBookmark }: {
  opportunity: Opportunity; match?: MatchResult; now: Date; demo?: boolean; list?: boolean;
  listSearch?: string; saved?: boolean; onBookmark?: (id: string, next: boolean) => Promise<void>;
}) {
  const status = opportunityStatus(opportunity, now);
  const to = `/opportunities/${encodeURIComponent(opportunity.id)}${listSearch}`;
  return <article className={`min-w-0 rounded-2xl border border-[#E2E8F0] bg-white sm:p-5 ${list ? 'grid gap-4 p-4 sm:grid-cols-[136px_minmax(0,1fr)] sm:items-start' : 'relative flex flex-col gap-2 p-3'}`}>
    <OpportunityGraphic category={opportunity.category} layout={list ? 'list' : 'card'} />
    {!list && <div className="flex min-w-0 flex-1 flex-col sm:hidden">
      <div className="mt-1 flex min-h-11 items-center justify-between gap-0.5">
        <div className="min-w-0 text-[10px] font-semibold leading-tight"><span className="block text-[#7D39EB]">{opportunity.category}</span><span className="text-[#64748B]">{STATUS_LABELS[status]}</span></div>
        <div className="relative z-20 shrink-0"><BookmarkButton id={opportunity.id} saved={saved} onBookmark={onBookmark} /></div>
      </div>
      <h2 className="text-[13px] font-bold leading-[18px] text-[#0F172A]">
        <Link to={to} className="break-words after:absolute after:inset-0 after:z-10 after:rounded-2xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#7D39EB]" title={displayTitle(opportunity.title, demo)}>{displayTitle(opportunity.title, demo)}</Link>
      </h2>
      <p className="mb-2 mt-1 truncate text-[11px] leading-4 text-[#64748B]" title={opportunity.organizer}>{opportunity.organizer || '주최 기관 미제공'}</p>
      <div className="flex min-w-0 flex-wrap items-center gap-1">
        {opportunity.tags.slice(0, 2).map((tag) => <span key={tag} className="min-w-0 max-w-full break-words rounded border border-[#E2E8F0] bg-[#F1F5F9] px-1 py-0.5 text-[10px] text-[#0F172A]" title={tag}>{tag}</span>)}
        {opportunity.tags.length > 2 && <span className="shrink-0 text-[10px] text-[#64748B]">+{opportunity.tags.length - 2}</span>}
      </div>
      <p className="mt-2 min-h-4 text-[10px] font-semibold leading-4 text-[#7D39EB]">{match ? `${demo ? '예시 적합도' : '추천 적합도'} ${Math.round(match.score)}%` : '\u00a0'}</p>
      {match && <p className="mt-1 text-[10px] leading-4 text-[#64748B] break-words">{match.reasons[0] || '추천 이유 미제공'}</p>}
    </div>}
    <div className={`${list ? 'flex' : 'hidden sm:flex'} min-w-0 flex-1 flex-col`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1.5"><Badge variant="gray">{opportunity.category}</Badge><Badge variant={status === 'open' ? 'violet' : status === 'closed' ? 'gray' : 'amber'}>{STATUS_LABELS[status]}</Badge></div>
        <BookmarkButton id={opportunity.id} saved={saved} onBookmark={onBookmark} />
      </div>
      <p className="mt-1 text-[11px] text-[#64748B]">{demo ? '가상 예시' : SOURCE_LABELS[opportunity.sourceType]}</p>
      <h2 className="mb-2 mt-2 text-base font-bold leading-relaxed text-[#0F172A] break-words"><Link to={to} className="hover:text-[#7D39EB] focus-visible:outline focus-visible:outline-[#7D39EB]">{displayTitle(opportunity.title, demo)}</Link></h2>
      <p className="mb-3 text-xs leading-relaxed text-[#64748B] break-words">{opportunity.organizer || '주최 기관 미제공'}</p>
      <Tags tags={opportunity.tags} />
      <div className="mt-4 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-[#64748B]">
        <span>등록 {formatDate(opportunity.postedAt)}</span>
      </div>
      {match && <div className="mt-4 border-t border-[#E2E8F0] pt-4"><Recommendation match={match} demo={demo} /></div>}
      <Link to={to} className="mt-auto flex min-h-11 items-center justify-between gap-2 pt-3 text-xs font-semibold text-[#0F172A] hover:text-[#7D39EB]">상세 보기<ArrowUpRight size={16} aria-hidden="true" /></Link>
    </div>
  </article>;
}
