import { useMyProfile } from '../contexts/MyProfileContext';
import { useSharedOpportunitySource } from '../components/opportunities/OpportunitySourceLayout';
import { RecommendationStatus } from '../components/opportunities/OpportunityUI';
import { publicOpportunities, recommendationMap, type OpportunitySource } from '../components/opportunities/opportunityModel';
import { Link } from 'react-router-dom';
import { ArrowUpRight, BriefcaseBusiness, Clock3, Compass, Users } from 'lucide-react';
import { Button, EmptyState, LoadingState } from '../components/ui';
import {
  CollaborationLinks, ConnectionGraphic, MemberCard, NoticeRow, OpportunityCard,
  RecruitmentCard, SectionHeading, dashboardLink,
} from '../components/dashboard/DashboardCards';
import { EMPTY_DASHBOARD, formatDate, summarizeDashboard } from '../components/dashboard/dashboardModel';
import type { DashboardData } from '../components/dashboard/dashboardModel';

export interface HomeDashboardProps extends Pick<OpportunitySource, 'profileStatus' | 'onProfileRetry'> {
  data?: DashboardData;
  profileName?: string | null;
  loading?: boolean;
  error?: string | null;
  demo?: boolean;
  now?: Date;
  bookmarkIds?: string[];
  // Resolve after B's persistence succeeds; the provider then updates bookmarkIds.
  onBookmark?: (id: string, next: boolean) => Promise<void>;
  onRetry?: () => void;
}

export function HomeDashboard({ data, profileName, loading = false, error, demo = false,
  now = new Date(), bookmarkIds = [], onBookmark, onRetry, profileStatus, onProfileRetry }: HomeDashboardProps) {
  const records = data || EMPTY_DASHBOARD;
  const summary = summarizeDashboard(records, now);
  const available = Boolean(data) && !loading && !error;
  const opportunities = new Map(publicOpportunities(records.opportunities, now).map((item) => [item.id, item]));
  const recommendations = [...recommendationMap(records.opportunityMatches).values()].flatMap((match) => {
    const opportunity = opportunities.get(match.targetId);
    return opportunity ? [{ opportunity, match }] : [];
  });
  const members = records.memberMatches.flatMap((match) => {
    const member = records.members.find((item) => item.id === match.targetId && item.isPublic);
    return member ? [{ member, match }] : [];
  }).slice(0, 3);
  const stats = [
    { label: profileStatus === undefined ? '모집 중인 공모전' : '공개 공고', value: profileStatus === undefined ? summary.open.length : opportunities.size, to: '/opportunities', icon: Compass, tone: 'bg-[#7D39EB] text-white border-[#7D39EB]', caption: '새로운 도전의 시작' },
    { label: '학부 공식 공고', value: summary.official.length, to: '/opportunities', icon: Clock3, tone: 'bg-[#C6FF33] text-black border-[#C6FF33]', caption: '경북대 컴퓨터학부' },
    { label: profileStatus === undefined ? '팀원 모집 현황' : '추천 공고',
      value: profileStatus === undefined ? summary.recruiting.length : profileStatus === 'ready' ? recommendations.length : null,
      to: profileStatus === undefined ? '/recruitments' : '/opportunities?recommended=1&sort=recommended',
      icon: Users, tone: 'bg-white text-[#0F172A] border-[#E2E8F0]', caption: profileStatus === undefined ? '함께할 동료를 찾는 팀' : '내 프로필 기반' },
    { label: '내 프로젝트 현황', value: profileStatus === undefined ? summary.activeTeams.length : null, to: '/projects', icon: BriefcaseBusiness, tone: 'bg-white text-[#0F172A] border-[#E2E8F0]', caption: '현재 진행 중인 프로젝트' },
  ];
  return <div className="min-w-0 space-y-5 pb-4 sm:space-y-11 [&_a]:break-words">
    <div className="flex flex-wrap items-end justify-between gap-x-3 gap-y-1.5 sm:gap-3">
      <div className="min-w-0">
        {profileName?.trim() && <p className="mb-1 text-sm font-semibold text-[#7D39EB] break-words sm:mb-2">{profileName}님, 반가워요.</p>}
        <h1 className="text-[26px] font-black leading-tight tracking-tight text-[#0F172A] sm:text-[32px] break-keep">오늘도 새로운 가능성을.</h1>
        <p className="mt-1 text-sm leading-relaxed text-[#64748B] sm:mt-2">함께할 사람과 새로운 기회를 발견하세요.</p>
      </div>
      <span className="text-xs tabular-nums text-[#64748B] sm:hidden">{new Intl.DateTimeFormat('ko-KR', { timeZone: 'Asia/Seoul', month: 'long', day: 'numeric', weekday: 'long' }).format(now)}</span>
      <span className="hidden text-xs tabular-nums text-[#64748B] sm:inline">{new Intl.DateTimeFormat('ko-KR', { timeZone: 'Asia/Seoul', year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' }).format(now)}</span>
    </div>

    {demo && <div role="note" className="flex flex-wrap items-center justify-between gap-x-2 gap-y-0.5 rounded-xl border border-[#7D39EB]/20 bg-[#F4EFFE] px-3 py-2 text-[11px] leading-relaxed text-[#6025C5] sm:gap-2 sm:px-4 sm:py-3 sm:text-xs sm:leading-relaxed">
      <span className="sm:hidden"><strong>개발용 가상 데이터</strong> · 11.15 기준 · 추천·인물은 예시</span>
      <span className="hidden sm:inline"><strong>개발용 예시 데이터</strong> · 2026.11.15 기준 · 추천 점수와 인물은 가상 예시입니다.</span>
      <span><span className="sm:hidden">북마크는 이 화면에서만 유지</span><span className="hidden sm:inline">북마크는 이 화면에서만 유지됩니다.</span></span>
    </div>}

    <section aria-label="새로운 연결과 주요 현황" className="grid min-w-0 grid-cols-1 gap-3 sm:gap-4 xl:grid-cols-12">
      <div style={{ containerType: 'inline-size' }} className="relative min-w-0 overflow-hidden rounded-2xl bg-black p-5 text-white sm:p-8 xl:col-span-8">
        <div className="grid h-full min-w-0 items-center sm:gap-5 sm:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
          <div className="relative z-10 min-w-0 sm:py-5">
            <p className="mb-3 text-[10px] font-semibold tracking-[0.2em] text-[#94A3B8] sm:mb-5">BRIDGE / KNU CSE</p>
            <h2 style={{ fontSize: 'clamp(1.75rem, 5.5cqi, 3.5rem)' }} className="font-black leading-[0.98] tracking-[-0.055em] text-white max-sm:pr-20 max-sm:!text-[clamp(1.375rem,6vw,1.75rem)]">
              BEYOND<br /><span className="text-[#C6FF33]">CONNECTION.</span>
            </h2>
            <p className="mb-4 mt-3 text-sm font-medium text-white sm:mb-7 sm:mt-5 sm:text-base">우리 사이, 가능성을 잇다.</p>
            <div className="flex flex-wrap gap-2">
              <Link to="/opportunities" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#C6FF33] px-3 py-2 text-xs font-bold text-black hover:bg-[#B8F224] focus-visible:outline focus-visible:outline-2 focus-visible:outline-white sm:px-4 sm:py-3">공모전 둘러보기<ArrowUpRight size={15} aria-hidden="true" /></Link>
              <Link to="/members" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-[#383A4E] px-3 py-2 text-xs font-semibold text-white hover:bg-[#181924] focus-visible:outline focus-visible:outline-2 focus-visible:outline-white sm:px-4 sm:py-3">팀원 찾아보기<ArrowUpRight size={15} aria-hidden="true" /></Link>
            </div>
          </div>
          <div className="pointer-events-none absolute right-3 top-9 w-20 min-w-0 sm:static sm:w-auto [&_svg]:max-h-20 sm:[&_svg]:max-h-none"><ConnectionGraphic /></div>
        </div>
      </div>
      <div className="grid min-w-0 grid-cols-2 gap-3 sm:gap-4 xl:col-span-4">
        {stats.map((stat) => <Link key={stat.label} to={stat.to} aria-label={stat.label + ': ' + ((available ? stat.value : null) ?? '확인 대기')} className={'group flex min-w-0 flex-col justify-between rounded-2xl border p-3 transition-shadow hover:shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#7D39EB] sm:p-5 ' + stat.tone}>
          <div className="flex items-center justify-between gap-2"><stat.icon size={18} aria-hidden="true" /><ArrowUpRight size={14} aria-hidden="true" className="opacity-60" /></div>
          <div className="mt-2 sm:mt-5"><span className="text-3xl font-bold leading-none tracking-tight tabular-nums sm:text-4xl sm:leading-none">{(available ? stat.value : null) ?? '—'}</span>
            <p className="mt-1 text-xs font-bold leading-relaxed break-keep sm:mt-2">{stat.label}</p>
            <p className="mt-1 hidden text-[10px] leading-relaxed opacity-75 sm:block">{stat.caption}</p></div>
        </Link>)}
      </div>
    </section>

    {loading ? <div role="status" aria-label="대시보드 불러오는 중"><LoadingState variant="skeleton" rows={3} /><p className="mt-3 text-sm text-[#64748B]">새로운 기회를 불러오고 있어요.</p></div>
      : error ? <div role="alert" className="rounded-2xl border border-[#E2E8F0] bg-white p-6"><p className="text-sm text-[#0F172A]">대시보드를 불러오지 못했어요.</p>{onRetry && <Button onClick={onRetry} className="mt-4 !min-h-11">다시 시도</Button>}</div>
      : <>
        <section aria-label="나에게 맞는 공모전">
          <SectionHeading title="나에게 맞는 공모전" description="관심에서 시작해, 다음 도전으로." to="/opportunities" action="전체 공모전 보기" />
          {!onBookmark && <p className="mb-3 text-xs text-[#64748B]">북마크는 저장 기능 연결 후 사용할 수 있어요.</p>}
          {recommendations.length ? <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 [&>article:nth-child(n+3)]:hidden sm:[&>article:nth-child(n+3)]:flex">
            {recommendations.slice(0, 3).map(({ opportunity, match }, index) => <OpportunityCard key={opportunity.id} opportunity={opportunity} match={match} now={now} demo={demo} featured={index === 0} bookmarked={bookmarkIds.includes(opportunity.id)} onBookmark={onBookmark} />)}
          </div> : <div className="rounded-2xl border border-dashed border-[#CBD5E1] bg-white">
            {data && !opportunities.size
              ? <EmptyState title="공개된 공고가 없어요" icon={<Compass size={22} />} />
              : profileStatus ? <div className="p-5"><RecommendationStatus profileStatus={profileStatus} onProfileRetry={onProfileRetry} /></div>
              : <EmptyState title="다음 도전을 기다리고 있어요" description={data ? '추천 공모전이 준비되면 여기에 모아드릴게요.' : '아직 공고 데이터를 불러올 수 없어요. 새로운 기회가 준비되면 확인해 보세요.'} icon={<Compass size={22} />} />}
          </div>}
        </section>

        <div className="grid min-w-0 grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-12">
          <section aria-label="최신 학부 공고" className="min-w-0 rounded-2xl border border-[#E2E8F0] bg-white p-5 sm:p-6 xl:col-span-7">
            <SectionHeading title="최신 학부 공고" to="/opportunities" />
            {records.collectedAt && !demo && <p className="mb-2 text-[11px] text-[#64748B]">최근 수집 {formatDate(records.collectedAt)}</p>}
            {summary.official.length ? <ul className="[&>li:nth-child(n+3)]:hidden sm:[&>li:nth-child(n+3)]:list-item">{summary.official.slice(0, 3).map((opportunity) => <NoticeRow key={opportunity.id} opportunity={opportunity} now={now} demo={demo} />)}</ul>
              : <EmptyState title="등록된 학부 공고가 없어요" description="새로운 공고가 도착하면 여기에서 확인하세요." />}
          </section>
          <section aria-label="새로운 기회" className="min-w-0 rounded-2xl border border-[#C6FF33]/60 bg-[#F7FEDF] p-5 sm:p-6 xl:col-span-5">
            <SectionHeading title="새로운 기회를 한눈에." description="관심 있는 공모전을 지금 확인해 보세요." to="/opportunities" />
            {summary.open.length ? <ul>{summary.open.slice(0, 3).map((opportunity) => <NoticeRow key={opportunity.id} opportunity={opportunity} now={now} demo={demo} />)}</ul>
              : <EmptyState title="확인할 공고가 없어요" description="새로운 공고가 등록되면 모아드릴게요." />}
          </section>
        </div>

        <div className="grid min-w-0 grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-12">
          <section aria-label="함께할 팀을 찾고 있나요?" className="min-w-0 rounded-2xl border border-[#E2E8F0] bg-white p-5 sm:p-6 xl:col-span-7">
            <SectionHeading title="함께할 팀을 찾고 있나요?" description="혼자 떠올린 아이디어를, 함께 만드는 시작." to="/recruitments" action="모집글 전체 보기" />
            {summary.recruiting.length ? <div className="[&>article:nth-child(n+3)]:hidden sm:[&>article:nth-child(n+3)]:block">{summary.recruiting.slice(0, 3).map((recruitment) => <RecruitmentCard key={recruitment.id} recruitment={recruitment} />)}</div>
              : <EmptyState title="새로운 팀을 기다리고 있어요" description="팀원 모집글이 등록되면 여기에 표시됩니다." />}
          </section>
          <section aria-label="연결되고 싶은 동료" className="min-w-0 rounded-2xl border border-[#7D39EB]/15 bg-[#F4EFFE]/50 p-5 sm:p-6 xl:col-span-5">
            <SectionHeading title="연결되고 싶은 동료" description="서로 다른 가능성이 만나 더 큰 가능성으로." to="/members" />
            {members.length ? <div className="[&>article:nth-child(n+3)]:hidden sm:[&>article:nth-child(n+3)]:block">{members.map(({ member, match }) => <MemberCard key={member.id} member={member} match={match} demo={demo} />)}</div>
              : <EmptyState title="새로운 연결을 기다리고 있어요" description="추천할 동료가 준비되면 소개해 드릴게요." icon={<Users size={22} />} />}
          </section>
        </div>
      </>}

    <section aria-label="협업 기능 바로가기">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-2"><h2 className="text-xl font-extrabold tracking-tight text-[#0F172A]">연결, 그다음은 함께.</h2><Link to="/projects" className={dashboardLink}>나의 작업 공간<ArrowUpRight size={15} aria-hidden="true" /></Link></div>
      <CollaborationLinks />
    </section>
  </div>;
}

export function HomePage() {
  const { profile } = useMyProfile();
  const profileName = profile?.nickname?.trim() || profile?.name?.trim() || null;
  const source = useSharedOpportunitySource();
  const data = source.opportunities && {
    ...EMPTY_DASHBOARD,
    opportunities: source.opportunities,
    opportunityMatches: source.matches ?? [],
  };
  return <HomeDashboard {...source} profileName={profileName} data={data} />;
}
