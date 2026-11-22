import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ArrowUpRight, Bookmark, ExternalLink, Sparkles } from 'lucide-react';
import { Avatar, Badge, Button, SkillTag } from '../ui';
import type { MatchResult, Opportunity, Recruitment } from '../../types';
import { displayTitle, formatDate, safeExternalUrl } from './dashboardModel';
import type { DashboardMember } from './dashboardModel';

export const dashboardLink = 'inline-flex min-h-11 items-center gap-2 text-xs font-semibold text-[#64748B] hover:text-[#7D39EB] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#7D39EB] rounded-lg';

export function SectionHeading({ title, description, to, action = '전체 보기' }: {
  title: string; description?: string; to: string; action?: string;
}) {
  return <div className="mb-5 flex flex-wrap items-end justify-between gap-x-4 gap-y-1">
    <div className="min-w-0">
      <h2 className="text-xl font-extrabold tracking-tight text-[#0F172A]">{title}</h2>
      {description && <p className="mt-1 text-xs leading-relaxed text-[#64748B]">{description}</p>}
    </div>
    <Link to={to} className={dashboardLink}>{action}<ArrowUpRight size={15} aria-hidden="true" /></Link>
  </div>;
}

export function Tags({ tags }: { tags: string[] }) {
  return <div className="flex min-w-0 flex-wrap gap-1.5">{tags.slice(0, 3).map((tag) =>
    <SkillTag key={tag} skill={tag} className="max-w-full !whitespace-normal break-all !text-[11px]" />)}
    {tags.length > 3 && <span className="self-center text-[11px] text-[#64748B]">+{tags.length - 3}</span>}
  </div>;
}

export function OpportunityCard({ opportunity, match, now: _now, demo, featured, bookmarked, onBookmark }: {
  opportunity: Opportunity; match: MatchResult; now?: Date; demo: boolean; featured?: boolean;
  bookmarked: boolean; onBookmark?: (id: string, next: boolean) => Promise<void>;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const title = displayTitle(opportunity.title, demo);
  const toggle = async () => {
    if (!onBookmark || saving) return;
    setSaving(true); setError('');
    try { await onBookmark(opportunity.id, !bookmarked); }
    catch { setError('북마크를 변경하지 못했어요. 다시 시도해 주세요.'); }
    finally { setSaving(false); }
  };
  const score = Number.isFinite(match.score) ? Math.min(100, Math.max(0, Math.round(match.score))) : null;
  return <article className={`relative flex min-w-0 flex-col rounded-2xl border p-5 sm:p-6 ${featured ? 'border-[#7D39EB]/20 bg-[#F4EFFE]' : 'border-[#E2E8F0] bg-white'}`}>
    <div className="mb-6 flex items-center justify-between gap-2">
      <Badge variant={featured ? 'violet' : 'gray'}>{opportunity.category}</Badge>
      <Button variant="ghost" className="!h-11 !w-11 !p-0" disabled={!onBookmark || saving}
        aria-label={`${title} 북마크${demo ? ' (이 화면에서만 유지)' : ''}`} aria-pressed={bookmarked}
        title={onBookmark ? (demo ? '개발용 북마크 · 화면을 나가면 초기화됩니다' : '북마크') : '북마크 기능 연결 대기'} onClick={toggle}>
        <Bookmark size={18} aria-hidden="true" className={bookmarked ? 'fill-[#7D39EB] text-[#7D39EB]' : ''} />
      </Button>
    </div>
    <p className="mb-2 text-[11px] font-medium text-[#64748B] break-words">{opportunity.organizer}</p>
    <h3 className="mb-4 text-lg font-bold leading-snug tracking-tight text-[#0F172A] break-words">
      <Link to={`/opportunities/${opportunity.id}`} className="hover:text-[#7D39EB] focus-visible:outline focus-visible:outline-[#7D39EB]">{title}</Link>
    </h3>
    <Tags tags={opportunity.tags} />
    <div className="mt-6 flex-1 border-t border-[#0F172A]/10 pt-4">
      <div className="flex flex-wrap items-center gap-1.5 text-xs font-bold text-[#7D39EB]">
        <Sparkles size={14} aria-hidden="true" />{demo ? '예시 적합도' : '추천 적합도'} {score === null ? '확인 중' : `${score}%`}
      </div>
      <p className="mt-2 text-xs leading-relaxed text-[#64748B] break-words">{match.reasons[0] || '추천 이유 미제공'}</p>
    </div>
    {error && <p role="alert" className="mt-3 text-xs text-red-600">{error}</p>}
    <Link to={`/opportunities/${opportunity.id}`} className={`${dashboardLink} mt-4 justify-between !text-[#0F172A]`}>자세히 보기<ArrowUpRight size={16} aria-hidden="true" /></Link>
  </article>;
}

export function NoticeRow({ opportunity, now: _now, demo }: {
  opportunity: Opportunity; now?: Date; demo: boolean; closing?: boolean;
}) {
  // Fixture URLs are invented examples, so external links are intentionally disabled in demo.
  const source = demo ? undefined : safeExternalUrl(opportunity.sourceUrl);
  return <li className="min-w-0 border-b border-[#E2E8F0] py-4 last:border-0">
    <div className="flex flex-wrap items-center gap-2 text-[11px] text-[#64748B]">
      <span>{opportunity.category}</span>
    </div>
    <Link to={`/opportunities/${opportunity.id}`} className="group flex min-h-11 items-center justify-between gap-3 py-2 text-sm font-bold leading-relaxed text-[#0F172A] hover:text-[#7D39EB]">
      <span className="break-words min-w-0">{displayTitle(opportunity.title, demo)}</span>
      <ArrowUpRight size={16} className="shrink-0 text-[#64748B] group-hover:text-[#7D39EB]" aria-hidden="true" />
    </Link>
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-[#64748B]">
      <span>등록 {formatDate(opportunity.postedAt)}</span>
      {source ? <a href={source} target="_blank" rel="noopener noreferrer" className={`${dashboardLink} !text-[11px]`}>원본 공지<ExternalLink size={12} aria-hidden="true" /></a>
        : !demo && <span className="py-2">원본 링크 미등록</span>}
    </div>
  </li>;
}

export function RecruitmentCard({ recruitment }: { recruitment: Recruitment }) {
  const remaining = Math.max(0, recruitment.targetMemberCount - recruitment.currentMemberCount);
  return <article className="min-w-0 border-b border-[#E2E8F0] py-5 last:border-0">
    <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
      <span className="font-bold text-[#7D39EB]">{remaining}명 모집</span>
      <span className="text-[#64748B]">현재 {recruitment.currentMemberCount} / 정원 {recruitment.targetMemberCount}명</span>
    </div>
    <Link to={`/recruitments/${recruitment.id}`} className="block min-h-11 py-1 text-sm font-bold leading-relaxed text-[#0F172A] hover:text-[#7D39EB] break-words">{recruitment.title}</Link>
    <p className="mb-3 mt-2 text-xs text-[#64748B] break-words">{recruitment.roles.join(' · ')}</p>
    <Tags tags={recruitment.requiredTechStacks} />
  </article>;
}

export function MemberCard({ member, match, demo }: { member: DashboardMember; match: MatchResult; demo: boolean }) {
  return <article className="min-w-0 border-b border-[#E2E8F0] py-5 last:border-0">
    <div className="flex items-start gap-3">
      <Avatar name={member.name} size="md" />
      <div className="min-w-0 flex-1">
        <Link to={`/members/${member.id}`} className="inline-flex min-h-11 items-center gap-2 text-sm font-bold text-[#0F172A] hover:text-[#7D39EB] break-words">{member.nickname || member.name}<ArrowUpRight size={14} className="shrink-0" aria-hidden="true" /></Link>
        <p className="text-xs text-[#64748B] break-words">{member.desiredRoles.slice(0, 2).join(' · ')}</p>
      </div>
    </div>
    <p className="mb-3 mt-3 text-xs leading-relaxed text-[#64748B] break-words">{member.interests.slice(0, 3).join(' · ')}</p>
    <Tags tags={member.techStacks} />
    {match.reasons[0] && <p className="mt-3 text-xs leading-relaxed text-[#64748B]">{demo && '예시 추천 · '}{match.reasons[0]}</p>}
  </article>;
}

export function ConnectionGraphic() {
  return <svg viewBox="0 0 440 280" fill="none" aria-hidden="true" className="mx-auto w-full max-w-sm">
    <path d="M20 240H420M20 180H420M20 120H420M20 60H420M80 20V260M160 20V260M240 20V260M320 20V260M400 20V260" stroke="#242634" strokeWidth="0.7" />
    <path d="M40 220Q220 -80 400 220" stroke="#7D39EB" strokeWidth="2" />
    <path d="M40 220Q220 0 400 220" stroke="#C6FF33" strokeDasharray="5 7" strokeWidth="1.4" />
    <path d="M40 220L220 100L400 220M220 100V250" stroke="#64748B" strokeWidth="0.8" />
    <circle cx="40" cy="220" r="7" fill="#7D39EB" /><circle cx="400" cy="220" r="7" fill="#C6FF33" />
    <circle cx="220" cy="70" r="8" fill="white" /><circle cx="220" cy="70" r="18" stroke="white" strokeOpacity="0.3" />
    <circle cx="130" cy="135" r="5" fill="#7D39EB" /><circle cx="310" cy="135" r="5" fill="#C6FF33" />
    <path d="M30 20H45M30 20V35M410 20H395M410 20V35M30 260H45M30 260V245M410 260H395M410 260V245" stroke="#64748B" />
  </svg>;
}

export function CollaborationLinks() {
  const links = [
    { to: '/team-builder', title: '팀 빌더', copy: '서로의 역량을 더하다.', kind: 'team' },
    { to: '/schedule', title: '시간표 조율', copy: '우리의 시간을 연결하다.', kind: 'time' },
    { to: '/projects', title: '내 프로젝트', copy: '우리의 도전을 이어가다.', kind: 'project' },
  ];
  return <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">{links.map((item, index) =>
    <Link key={item.to} to={item.to} className={`group relative min-w-0 overflow-hidden rounded-2xl border p-6 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#7D39EB] ${index === 0 ? 'border-black bg-black text-white' : index === 1 ? 'border-[#C6FF33] bg-[#C6FF33] text-black' : 'border-[#E2E8F0] bg-white text-[#0F172A]'} ${index === 2 ? 'sm:col-span-2 xl:col-span-1' : ''}`}>
      <div className="mb-8 flex items-center justify-between gap-3">
        <svg viewBox="0 0 72 42" className="h-10 w-[72px]" fill="none" aria-hidden="true">
          {item.kind === 'team' ? <><circle cx="22" cy="21" r="16" stroke="#7D39EB" strokeWidth="2" /><circle cx="47" cy="21" r="16" stroke="#C6FF33" strokeWidth="2" /></>
            : item.kind === 'time' ? <><path d="M8 10H64M8 21H64M8 32H64M20 3V39M36 3V39M52 3V39" stroke="currentColor" strokeOpacity="0.3" /><rect x="21" y="11" width="30" height="9" fill="currentColor" /></>
              : <><path d="M8 36V23H23V15H40V6H63" stroke="#7D39EB" strokeWidth="2" /><path d="M52 6H63V17" stroke="#7D39EB" strokeWidth="2" /></>}
        </svg>
        <ArrowRight size={20} className="transition-transform motion-safe:group-hover:translate-x-1" aria-hidden="true" />
      </div>
      <p className={`text-xs font-semibold ${index === 0 ? 'text-[#94A3B8]' : 'opacity-70'}`}>{item.title}</p>
      <h3 className={`mt-2 text-lg font-bold tracking-tight break-keep ${index === 0 ? 'text-white' : 'text-[#0F172A]'}`}>{item.copy}</h3>
    </Link> )}</div>;
}
