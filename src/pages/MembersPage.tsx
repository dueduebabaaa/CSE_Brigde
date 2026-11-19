import { useCallback, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Search, Users } from 'lucide-react';
import { Button, EmptyState, LoadingState, Select } from '../components/ui';
import { GRADE_OPTIONS, MAJOR_TRACKS } from '../constants/majors';
import { useMyProfile } from '../contexts/MyProfileContext';
import { MemberSkills } from '../features/members/MemberSkills';
import { isDiscoverable, memberName, useMemberRequest, type PublicProfile, type PublicProfileSource } from '../features/members/memberDiscovery';

const pageSize = 12;
const gradeOptions = [{ value: '', label: '전체 학년' }, ...GRADE_OPTIONS.map((value) => ({ value, label: value }))];
const trackOptions = [{ value: '', label: '전체 전공' }, ...MAJOR_TRACKS.map((value) => ({ value, label: value }))];

function MemberCard({ profile }: { profile: PublicProfile }) {
  const destination = '/members/' + encodeURIComponent(profile.id);
  const displayName = memberName(profile);
  const realName = profile.name.trim();
  const preferences = [profile.activity_mode, profile.activity_duration, ...(profile.activity_types ?? []), ...(profile.activity_goals ?? [])].filter(Boolean);
  return <article className="relative min-w-0 bg-white border border-[#E2E8F0] hover:border-[#7D39EB] hover:shadow-md rounded-xl p-5 flex flex-col justify-between transition-all group">
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 text-[10px] font-bold">
        <span className="px-2 py-0.5 rounded bg-[#F4EFFE] text-[#7D39EB] border border-[#7D39EB]/20">{profile.track} · {profile.grade}</span>
        {profile.availability_status && <span className="px-2 py-0.5 rounded bg-[#F7FEDF] text-[#5a7a00]">{profile.availability_status}</span>}
      </div>
      <div>
        <h2 className="text-lg font-bold text-[#111111] break-words">
          <Link to={destination} className="hover:text-[#7D39EB] after:absolute after:inset-0 after:rounded-xl focus-visible:after:ring-2 focus-visible:after:ring-[#7D39EB]">{displayName}</Link>
        </h2>
        {realName && realName !== displayName && <p className="text-xs text-[#64748B] break-words">{realName}</p>}
      </div>
      {!!profile.desired_roles?.length && <p className="text-xs text-[#334155] break-words">희망 역할 · {profile.desired_roles.join(', ')}</p>}
      {!!profile.interests?.length && <p className="text-xs text-[#64748B] break-words">관심 분야 · {profile.interests.join(', ')}</p>}
      {!!preferences.length && <p className="text-xs text-[#64748B] break-words">활동 선호 · {preferences.join(' · ')}</p>}
      <MemberSkills profile={profile} />
    </div>
    <div className="mt-5 pt-3 border-t border-[#F1F5F9] flex justify-end text-xs">
      <span aria-hidden="true" className="text-[#7D39EB] font-semibold flex items-center gap-1">
        자세히 보기<ArrowRight className="w-3 h-3" />
      </span>
    </div>
  </article>;
}

export function MembersPage({ source = null }: { source?: PublicProfileSource | null }) {
  const { userId } = useMyProfile();
  const [draft, setDraft] = useState({ keyword: '', grade: '', track: '', technologies: '' });
  const [filters, setFilters] = useState(draft);
  const [page, setPage] = useState(1);
  const load = useCallback(() => {
    if (!source || !userId) throw new Error('Public profile source unavailable');
    const techStacks = [...new Set(filters.technologies.split(',').map((tech) => tech.trim()).filter(Boolean))];
    return source.searchPublicProfiles({
      keyword: filters.keyword.trim() || undefined,
      grade: GRADE_OPTIONS.find((grade) => grade === filters.grade),
      track: MAJOR_TRACKS.find((track) => track === filters.track),
      techStacks: techStacks.length ? techStacks : undefined,
      techStackMatch: techStacks.length ? 'any' : undefined,
      excludeUserId: userId,
      page,
      pageSize,
    });
  }, [source, userId, filters, page]);
  const available = Boolean(source && userId);
  const { state, retry } = useMemberRequest(available ? load : null);
  const results = state.status === 'ready' ? state.data : null;
  const profiles = results?.profiles.filter((profile) => profile.id !== userId && isDiscoverable(profile)) ?? [];

  return <div className="space-y-6">
    <div>
      <h1 className="text-2xl font-black text-[#111111] tracking-tight">팀원 탐색 &amp; 검색</h1>
      <p className="mt-1 text-xs text-[#64748B]">학우들이 공개한 관심 분야, 희망 역할과 보유 기술을 살펴보세요.</p>
    </div>

    <form className="bg-white border border-[#E2E8F0] rounded-xl p-4" onSubmit={(event) => {
      event.preventDefault();
      setFilters({ ...draft });
      setPage(1);
    }}>
      <fieldset disabled={!available} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1.4fr_1.5fr_auto] lg:items-start">
        <label className="flex min-w-0 flex-col gap-1.5 text-sm font-semibold">
          이름·닉네임·한 줄 소개 검색
          <input type="search" placeholder="예: 홍길동" value={draft.keyword} onChange={(event) => setDraft({ ...draft, keyword: event.target.value })} className="h-9 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-3 text-sm font-normal focus-visible:ring-2 focus-visible:ring-[#7D39EB]" />
        </label>
        <Select label="학년" options={gradeOptions} value={draft.grade} onChange={(event) => setDraft({ ...draft, grade: event.target.value })} />
        <Select label="세부전공" options={trackOptions} value={draft.track} onChange={(event) => setDraft({ ...draft, track: event.target.value })} />
        <label className="flex min-w-0 flex-col gap-1.5 text-sm font-semibold">
          기술 스택
          <input value={draft.technologies} onChange={(event) => setDraft({ ...draft, technologies: event.target.value })} placeholder="예: React, Python" aria-describedby="member-tech-filter-help" className="h-9 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-3 text-sm font-normal focus-visible:ring-2 focus-visible:ring-[#7D39EB]" />
          <span id="member-tech-filter-help" className="text-[11px] font-normal text-[#64748B]">쉼표로 구분한 기술 중 하나 이상 일치</span>
        </label>
        <Button type="submit" leftIcon={<Search size={15} aria-hidden="true" />} className="lg:mt-6">검색</Button>
      </fieldset>
    </form>

    {state.status === 'unavailable' && <EmptyState icon={<Users size={20} />} title="공개 프로필 조회 준비 중" description="서비스 연결이 완료되면 팀원을 찾을 수 있어요." />}
    {state.status === 'loading' && <div role="status"><LoadingState text="공개 프로필을 불러오는 중이에요." /></div>}
    {state.status === 'error' && <div role="alert"><EmptyState title="공개 프로필을 불러오지 못했어요" action={{ label: '다시 시도', onClick: retry }} /></div>}
    {results && <>
      {profiles.length ? <div className="grid grid-cols-1 md:grid-cols-3 gap-4">{profiles.map((profile) => <MemberCard key={profile.id} profile={profile} />)}</div>
        : <EmptyState title="검색 결과가 없어요" description="검색어와 필터를 바꿔 다시 찾아보세요." />}
      {(results.page > 1 || results.hasMore) && <nav aria-label="팀원 검색 페이지" className="flex items-center justify-center gap-3 text-xs text-[#64748B]">
        <Button variant="secondary" size="sm" type="button" disabled={results.page <= 1} onClick={() => setPage(results.page - 1)}>이전</Button>
        <span>{results.page} / {Math.max(results.totalPages, results.page)}</span>
        <Button variant="secondary" size="sm" type="button" disabled={!results.hasMore} onClick={() => setPage(results.page + 1)}>다음</Button>
      </nav>}
    </>}
  </div>;
}
