import { useCallback, type ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Github, Globe } from 'lucide-react';
import { Avatar, EmptyState, LoadingState } from '../components/ui';
import { safeExternalUrl } from '../components/dashboard/dashboardModel';
import { MemberSkills } from '../features/members/MemberSkills';
import { isDiscoverable, memberName, useMemberRequest, type PublicProfile, type PublicProfileSource } from '../features/members/memberDiscovery';

function ProfileSection({ title, children }: { title: string; children: ReactNode }) {
  return <section className="min-w-0 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-4 text-xs leading-relaxed text-[#334155]">
    <h2 className="mb-2 font-bold text-[#111111]">{title}</h2>
    {children}
  </section>;
}

function ProfileTags({ values }: { values: string[] }) {
  return <ul className="flex flex-wrap gap-1.5">
    {values.map((value) => <li key={value} className="max-w-full break-words rounded border border-[#E2E8F0] bg-white px-2 py-1">{value}</li>)}
  </ul>;
}

function ProfileDetails({ profile }: { profile: PublicProfile }) {
  const displayName = memberName(profile);
  const realName = profile.name.trim();
  const shortBio = profile.bio?.trim();
  const longBio = profile.long_bio?.trim();
  const github = safeExternalUrl(profile.github_url);
  const portfolio = safeExternalUrl(profile.portfolio_url);
  const preferences = [...new Set([
    ...[profile.activity_mode, profile.activity_duration, profile.availability_status].filter((value) => value !== null),
    ...(profile.activity_types ?? []),
    ...(profile.activity_goals ?? []),
  ])];

  return <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 sm:p-8 space-y-6 shadow-sm">
    <div className="flex items-center gap-4 min-w-0">
      <Avatar size="xl" name={displayName} className="!rounded-2xl !bg-[#7D39EB] !text-white shadow-sm" />
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-black text-[#111111] tracking-tight break-words">{displayName}</h1>
          <span className="px-2 py-0.5 text-xs font-bold rounded bg-[#F4EFFE] text-[#7D39EB] border border-[#7D39EB]/20">{profile.track} · {profile.grade}</span>
        </div>
        {realName && realName !== displayName && <p className="mt-1 text-xs text-[#64748B] break-words">{realName}</p>}
        {!!profile.desired_roles?.length && <p className="mt-1 text-xs text-[#334155] break-words">희망 역할 · {profile.desired_roles.join(' / ')}</p>}
      </div>
    </div>

    <ProfileSection title="자기소개">
      {shortBio && <p className="whitespace-pre-wrap break-words">{shortBio}</p>}
      {longBio && longBio !== shortBio && <p className="mt-1 whitespace-pre-wrap break-words">{longBio}</p>}
      {!shortBio && !longBio && <p>등록된 자기소개가 없어요.</p>}
    </ProfileSection>

    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <ProfileSection title="보유 기술 스택">
        {profile.tech_stacks?.length ? <MemberSkills profile={profile} /> : <p>등록된 기술 스택이 없어요.</p>}
      </ProfileSection>
      <ProfileSection title="관심 분야">
        {profile.interests?.length ? <ProfileTags values={profile.interests} /> : <p>등록된 관심 분야가 없어요.</p>}
      </ProfileSection>
      {!!profile.wanted_tech_stacks?.length && <ProfileSection title="배우고 싶은 기술"><ProfileTags values={profile.wanted_tech_stacks} /></ProfileSection>}
      {!!preferences.length && <ProfileSection title="활동 선호"><ProfileTags values={preferences} /></ProfileSection>}
      {!!profile.experiences?.length && <ProfileSection title="활동 경험">
        <ul className="space-y-1">{profile.experiences.map((experience) => <li className="whitespace-pre-wrap break-words" key={experience}>{experience}</li>)}</ul>
      </ProfileSection>}
    </div>

    {(github || portfolio) && <div className="flex flex-wrap items-center gap-4 text-xs text-[#64748B] pt-2 border-t border-[#E2E8F0]">
      {github && <a href={github} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 hover:text-[#111111]"><Github size={16} aria-hidden="true" />GitHub 프로필</a>}
      {portfolio && <a href={portfolio} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 hover:text-[#111111]"><Globe size={16} aria-hidden="true" />포트폴리오 웹사이트</a>}
    </div>}
  </div>;
}

export function MemberDetailPage({ source = null }: { source?: PublicProfileSource | null }) {
  const { id } = useParams<{ id: string }>();
  const load = useCallback(async () => {
    if (!source || !id) return null;
    const profile = await source.fetchPublicProfileById(id);
    return profile?.id === id && isDiscoverable(profile) ? profile : null;
  }, [source, id]);
  const { state, retry } = useMemberRequest(source ? load : null);

  return <div className="max-w-4xl mx-auto space-y-6">
    <Link to="/members" className="inline-flex items-center gap-1.5 text-xs text-[#64748B] hover:text-[#111111] transition-colors">
      <ArrowLeft size={16} aria-hidden="true" />팀원 목록으로 돌아가기
    </Link>
    {state.status === 'unavailable' && <EmptyState title="공개 프로필 조회 준비 중" description="서비스 연결이 완료되면 프로필을 볼 수 있어요." />}
    {state.status === 'loading' && <div role="status"><LoadingState text="공개 프로필을 불러오는 중이에요." /></div>}
    {state.status === 'error' && <div role="alert"><EmptyState title="공개 프로필을 불러오지 못했어요" action={{ label: '다시 시도', onClick: retry }} /></div>}
    {state.status === 'ready' && (state.data ? <ProfileDetails profile={state.data} /> : <EmptyState title="프로필을 볼 수 없어요" description="비공개 프로필이거나 존재하지 않는 사용자예요." />)}
  </div>;
}
