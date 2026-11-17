import type { MatchResult, Opportunity, OpportunityCategory, Recruitment } from '../../types';
import { daysUntil } from '../dashboard/dashboardModel';

export const CATEGORIES: OpportunityCategory[] = ['해커톤', '공모전', '경진대회', '대외활동', '서포터즈', '교육/특강'];
export type DisplayStatus = 'open' | 'scheduled' | 'closed' | 'unknown';
export const STATUS_LABELS: Record<DisplayStatus, string> = { open: '모집 중', scheduled: '모집 예정', closed: '모집 마감', unknown: '일정 확인 중' };
export type SortOrder = 'newest' | 'deadline' | 'recommended';
export interface ExploreFilters {
  search: string; category: string; tag: string; status: string;
  closing: boolean; recommended: boolean; sort: SortOrder;
}
export const DEFAULT_FILTERS: ExploreFilters = { search: '', category: '', tag: '', status: '', closing: false, recommended: false, sort: 'newest' };
export interface OpportunitySource {
  opportunities?: Opportunity[];
  matches?: MatchResult[];
  recruitments?: Recruitment[];
  loading?: boolean;
  error?: string | null;
  demo?: boolean;
  now?: Date;
  bookmarkIds?: string[];
  onBookmark?: (id: string, next: boolean) => Promise<void>;
  onRetry?: () => void;
}
const normalize = (text: string) => text.normalize('NFKC').trim().toLocaleLowerCase('ko-KR');

export function publicOpportunities(items: Opportunity[], now: Date): Opportunity[] {
  return items.filter((item) => item.status !== 'draft' && Date.parse(item.postedAt) <= now.getTime());
}
export function opportunityStatus(item: Opportunity, now: Date): DisplayStatus {
  if (item.status === 'closed' || (item.deadline && Date.parse(item.deadline) < now.getTime())) return 'closed';
  if (item.status !== 'active') return 'unknown';
  if (item.applicationStart && Date.parse(item.applicationStart) > now.getTime()) return 'scheduled';
  return 'open';
}
export function isClosing(item: Opportunity, now: Date): boolean {
  const days = daysUntil(item.deadline, now);
  return opportunityStatus(item, now) === 'open' && days !== null && days >= 0 && days <= 7;
}
export function recommendationMap(matches: MatchResult[] = []): Map<string, MatchResult> {
  return new Map(matches.filter((match) => Number.isFinite(match.score) && match.score >= 0 && match.score <= 100)
    .map((match) => [match.targetId, match]));
}

export function filterOpportunities(items: Opportunity[], filters: ExploreFilters, matches: MatchResult[], now: Date): Opportunity[] {
  const recommendations = recommendationMap(matches);
  const query = normalize(filters.search);
  return publicOpportunities(items, now).filter((item) => {
    if (query && !normalize([item.title, item.organizer, ...item.tags].join(' ')).includes(query)) return false;
    if (filters.category && item.category !== filters.category) return false;
    if (filters.tag && !item.tags.includes(filters.tag)) return false;
    if (filters.status && opportunityStatus(item, now) !== filters.status) return false;
    if (filters.closing && !isClosing(item, now)) return false;
    if (filters.recommended && !recommendations.has(item.id)) return false;
    return true;
  }).sort((a, b) => {
    if (filters.sort === 'recommended') {
      const difference = (recommendations.get(b.id)?.score ?? -1) - (recommendations.get(a.id)?.score ?? -1);
      if (difference) return difference;
    }
    if (filters.sort === 'deadline') {
      const aDeadline = a.deadline ? Date.parse(a.deadline) : Infinity;
      const bDeadline = b.deadline ? Date.parse(b.deadline) : Infinity;
      const aClosed = opportunityStatus(a, now) === 'closed';
      const bClosed = opportunityStatus(b, now) === 'closed';
      if (aClosed !== bClosed) return aClosed ? 1 : -1;
      if (aDeadline !== bDeadline) return aDeadline - bDeadline;
    }
    return Date.parse(b.postedAt) - Date.parse(a.postedAt) || a.id.localeCompare(b.id);
  });
}

export function readFilters(params: URLSearchParams, hasRecommendations: boolean): ExploreFilters {
  const category = params.get('category') || '';
  const status = params.get('status') || '';
  const sort = params.get('sort');
  return {
    search: params.get('search') || '', category: CATEGORIES.includes(category as OpportunityCategory) ? category : '',
    tag: params.get('tag') || '', status: Object.keys(STATUS_LABELS).includes(status) ? status : '',
    closing: params.get('closing') === '1', recommended: hasRecommendations && params.get('recommended') === '1',
    sort: sort === 'deadline' || (sort === 'recommended' && hasRecommendations) ? sort : 'newest',
  };
}

export function fullDate(value: string | null | undefined): string {
  if (!value || !Number.isFinite(Date.parse(value))) return '미제공';
  return new Intl.DateTimeFormat('ko-KR', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(value));
}
