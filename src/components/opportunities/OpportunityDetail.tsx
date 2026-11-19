import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowUpRight, ExternalLink, Users } from 'lucide-react';
import { Badge, Button, EmptyState, LoadingState, SkillTag } from '../ui';
import { Tags } from '../dashboard/DashboardCards';
import { displayTitle, safeExternalUrl } from '../dashboard/dashboardModel';
import { BookmarkButton, DemoNotice, OpportunityGraphic, Recommendation } from './OpportunityUI';
import { fullDate, opportunityStatus, publicOpportunities, recommendationMap, STATUS_LABELS } from './opportunityModel';
import type { OpportunitySource } from './opportunityModel';
import type { Opportunity } from '../../types';

export interface OpportunityDetailProps extends Omit<OpportunitySource, 'opportunities'> {
  opportunity?: Opportunity | null;
  backTo?: string;
  // Optional detail-only fields; do not infer these from category/description.
  details?: { activityPeriod?: string | null; eligibility?: string | null };
}

export function OpportunityDetail({ opportunity, matches = [], recruitments, details: _details, backTo = '/opportunities', loading, error,
  onRetry, demo = false, now = new Date(), bookmarkIds = [], onBookmark }: OpportunityDetailProps) {
  const item = opportunity && publicOpportunities([opportunity], now).length ? opportunity : null;
  const match = item ? recommendationMap(matches).get(item.id) : undefined;
  const status = item ? opportunityStatus(item, now) : 'unknown';
  const source = demo ? undefined : safeExternalUrl(item?.sourceUrl);
  const application = demo ? undefined : safeExternalUrl(item?.applicationUrl);
  const related = item ? recruitments?.filter((post) => post.opportunityId === item.id && post.status !== 'cancelled' && Date.parse(post.createdAt) <= now.getTime())
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)) : undefined;
  return <div className="min-w-0 space-y-5 sm:space-y-7">
    <Link to={backTo} className="inline-flex min-h-11 items-center gap-2 rounded-lg text-xs font-semibold text-[#64748B] hover:text-[#7D39EB]"><ArrowLeft size={16} />목록으로 돌아가기</Link>
    <DemoNotice demo={demo} />
    {loading ? <div role="status" aria-label="공고 상세 불러오는 중"><LoadingState variant="skeleton" rows={3} /></div>
      : error ? <div role="alert" className="rounded-2xl border border-[#E2E8F0] bg-white p-6"><p>공고를 불러오지 못했어요.</p>{onRetry && <Button onClick={onRetry} className="mt-3 !min-h-11">다시 시도</Button>}</div>
      : !item ? <EmptyState title={opportunity === undefined ? '공고 정보를 아직 불러올 수 없어요' : '공고를 찾을 수 없어요'} description="목록에서 다른 기회를 확인해 주세요." />
      : <>
        <section aria-label="공고 요약" className="grid min-w-0 gap-4 xl:grid-cols-12">
          <div className="min-w-0 rounded-2xl border border-[#E2E8F0] bg-white p-5 sm:p-7 xl:col-span-8">
            <div className="flex flex-wrap items-center justify-between gap-3"><div className="flex flex-wrap gap-2"><Badge variant="gray">{item.category}</Badge><Badge variant={status === 'open' ? 'violet' : 'gray'}>{STATUS_LABELS[status]}</Badge></div>
              <BookmarkButton id={item.id} saved={bookmarkIds.includes(item.id)} onBookmark={onBookmark} />
            </div>
            <h1 className="mb-4 mt-4 text-2xl font-black leading-snug tracking-tight text-[#0F172A] sm:text-3xl break-words">{displayTitle(item.title, demo)}</h1>
            <p className="mb-5 text-sm text-[#64748B] break-words">{item.organizer || '주최 기관 미제공'}</p>
            <div className="flex min-w-0 flex-wrap gap-1.5">{[...new Set(item.tags)].map((tag) => <SkillTag key={tag} skill={tag} className="max-w-full !whitespace-normal break-all" />)}</div>
            <p className="mt-4 text-xs text-[#64748B]">등록 {fullDate(item.postedAt)}</p>
            {!onBookmark && <p className="mt-3 text-xs text-[#64748B]">북마크는 저장 기능 연결 후 사용할 수 있어요.</p>}
          </div>
          <aside aria-label="지원 정보" className="min-w-0 rounded-2xl border border-[#7D39EB]/20 bg-[#F4EFFE] p-5 sm:p-6 xl:col-span-4">
            <OpportunityGraphic category={item.category} compact />
            <div className="mt-4 rounded-xl border border-[#7D39EB]/15 bg-white/80 p-3.5">
              <p className="text-xs font-semibold leading-relaxed text-[#0F172A]">
                자세한 활동 내용 및 지원 방법은 원본 공지를 확인해 주세요.
              </p>
            </div>
            <div className="mt-4 space-y-2">
              {source ? <a href={source} target="_blank" rel="noopener noreferrer" className="flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#7D39EB] px-3 py-3 text-xs font-bold text-white hover:bg-[#6025C5]">원본 공지 바로가기<ExternalLink size={14} /></a>
                : <p className="rounded-lg border border-[#7D39EB]/15 px-3 py-3 text-xs text-[#64748B]">{demo ? '가상 공고의 원본 링크는 제공하지 않습니다.' : '원본 공지 링크 미제공'}</p>}
              {application && status === 'open' && <a href={application} target="_blank" rel="noopener noreferrer" className="flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#C6FF33] px-3 py-3 text-xs font-bold text-black">공식 접수 페이지<ArrowUpRight size={14} /></a>}
              <Link to={`/recruitments/new?opportunityId=${encodeURIComponent(item.id)}`} className="flex min-h-11 items-center justify-center gap-2 rounded-lg border border-[#7D39EB]/25 bg-white px-3 py-3 text-center text-xs font-bold text-[#7D39EB]"><Users size={15} className="shrink-0" />팀원 모집글 작성</Link>
            </div>
          </aside>
        </section>

        <section aria-label="추천 이유" className="min-w-0 rounded-2xl border border-[#7D39EB]/15 bg-[#F4EFFE]/50 p-5 sm:p-7">
          <h2 className="mb-4 text-base font-bold text-[#0F172A]">나에게 맞는 이유</h2>
          {match ? <Recommendation match={match} demo={demo} /> : <p className="text-sm leading-relaxed text-[#64748B]">아직 제공된 추천 결과가 없어요.</p>}
          {match?.matchedTags.length ? <div className="mt-4"><Tags tags={match.matchedTags} /></div> : null}
        </section>

        <section aria-label="관련 팀원 모집글" className="min-w-0 rounded-2xl border border-[#E2E8F0] bg-white p-5 sm:p-7">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-extrabold text-[#0F172A]">함께 도전할 팀을 만나보세요.</h2><Link to={`/recruitments/new?opportunityId=${encodeURIComponent(item.id)}`} className="inline-flex min-h-11 items-center gap-2 text-xs font-semibold text-[#7D39EB]">모집글 작성<ArrowUpRight size={15} /></Link></div>
          {related?.length ? <ul className="grid min-w-0 gap-4 sm:grid-cols-2">{related.map((post) => {
            const open = post.status === 'recruiting' && (!post.deadline || Date.parse(post.deadline) >= now.getTime()) && post.currentMemberCount < post.targetMemberCount;
            return <li key={post.id} className="min-w-0 rounded-xl border border-[#E2E8F0] p-4">
              <p className="text-xs font-bold text-[#7D39EB]">{open ? `${post.targetMemberCount - post.currentMemberCount}명 모집 중` : '모집 완료'}</p>
              <Link to={`/recruitments/${post.id}`} className="my-2 block min-h-11 py-2 text-sm font-bold leading-relaxed text-[#0F172A] hover:text-[#7D39EB] break-words">{post.title}</Link>
              <p className="mb-3 text-xs text-[#64748B] break-words">{post.roles.join(' · ')}</p><Tags tags={post.requiredTechStacks} />
            </li>;
          })}</ul> : <EmptyState title={recruitments ? '아직 연결된 모집글이 없어요' : '관련 모집글을 아직 불러올 수 없어요'} description="새로운 동료와 함께할 기회를 만들어 보세요." />}
        </section>
      </>}
  </div>;
}
