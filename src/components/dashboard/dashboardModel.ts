import type { MatchResult, Opportunity, Recruitment, Team, UserProfile } from '../../types';

// Dashboard view models only. B supplies records; C supplies MatchResult arrays.
// Member cards deliberately have no email field.
export type DashboardMember = Pick<UserProfile, 'id' | 'name' | 'nickname' | 'bio' | 'interests' | 'techStacks' | 'desiredRoles' | 'isPublic'>;
export interface DashboardData {
  opportunities: Opportunity[];
  recruitments: Recruitment[];
  myTeams: Team[]; // Already scoped to the authenticated user by the data provider.
  members: DashboardMember[];
  opportunityMatches: MatchResult[];
  memberMatches: MatchResult[];
  collectedAt?: string | null;
}

export const EMPTY_DASHBOARD: DashboardData = {
  opportunities: [], recruitments: [], myTeams: [], members: [], opportunityMatches: [], memberMatches: [],
};

const DAY = 86_400_000;
const seoulDay = (date: Date) => Math.floor((date.getTime() + 9 * 3_600_000) / DAY);

export function daysUntil(deadline: string | null, now: Date): number | null {
  if (!deadline) return null;
  const date = new Date(deadline);
  return Number.isFinite(date.getTime()) ? seoulDay(date) - seoulDay(now) : null;
}

export function deadlineLabel(deadline: string | null, now: Date): string {
  const days = daysUntil(deadline, now);
  if (days === null) return '마감일 확인 중';
  if (new Date(deadline!).getTime() < now.getTime()) return '마감';
  return days === 0 ? 'D-Day' : `D-${days}`;
}

export function formatDate(value: string | null | undefined): string {
  if (!value || !Number.isFinite(new Date(value).getTime())) return '일정 미정';
  return new Intl.DateTimeFormat('ko-KR', { timeZone: 'Asia/Seoul', month: '2-digit', day: '2-digit' })
    .format(new Date(value)).replace(/\.$/, '');
}

export function isOpen(opportunity: Opportunity, now: Date): boolean {
  return opportunity.status === 'active'
    && new Date(opportunity.postedAt).getTime() <= now.getTime()
    && (!opportunity.applicationStart || new Date(opportunity.applicationStart).getTime() <= now.getTime())
    && (!opportunity.deadline || new Date(opportunity.deadline).getTime() >= now.getTime());
}

export function summarizeDashboard(data: DashboardData, now: Date) {
  const open = data.opportunities.filter((item) => isOpen(item, now));
  const closing = open.filter((item) => {
    const days = daysUntil(item.deadline, now);
    return days !== null && days >= 0 && days <= 7;
  }).sort((a, b) => Date.parse(a.deadline!) - Date.parse(b.deadline!));
  const recruiting = data.recruitments.filter((item) => item.status === 'recruiting'
    && Date.parse(item.createdAt) <= now.getTime()
    && item.currentMemberCount < item.targetMemberCount
    && (!item.deadline || Date.parse(item.deadline) >= now.getTime()))
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  const official = data.opportunities.filter((item) => item.sourceType === 'knu_cse_official'
    && item.status !== 'draft' && Date.parse(item.postedAt) <= now.getTime())
    .sort((a, b) => Date.parse(b.postedAt) - Date.parse(a.postedAt));
  return { open, closing, recruiting, official, activeTeams: data.myTeams.filter((team) => team.status === 'active') };
}

export function safeExternalUrl(value: string | null | undefined): string | undefined {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    return ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password ? url.href : undefined;
  } catch { return undefined; }
}

// Only hides the redundant fixture prefix when the whole dashboard is visibly marked as demo.
export function displayTitle(title: string, demo: boolean): string {
  return demo ? title.replace(/^\[가상 예시 \/ 프로토타입\]\s*/, '') : title;
}
