import { supabase } from '../lib/supabase';
import type {
  Opportunity,
  OpportunityCategory,
  OpportunitySourceType,
  OpportunityStatus,
} from '../types';

type OpportunityRow = Record<string, unknown>;

const CATEGORIES: readonly OpportunityCategory[] = [
  '해커톤', '공모전', '경진대회', '대외활동', '서포터즈', '교육/특강',
];
const SOURCE_TYPES: readonly OpportunitySourceType[] = [
  'knu_cse_official', 'admin_manual', 'user_manual',
];
const STATUSES: readonly OpportunityStatus[] = [
  'active', 'closed', 'needs_confirmation', 'draft',
];

const isRecord = (value: unknown): value is OpportunityRow =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isOneOf = <T extends string>(options: readonly T[], value: unknown): value is T =>
  typeof value === 'string' && options.includes(value as T);

const requiredString = (row: OpportunityRow, field: string): string | null =>
  typeof row[field] === 'string' ? row[field] as string : null;

const nullableString = (row: OpportunityRow, field: string): string | null | undefined => {
  const value = row[field];
  if (value === null) return null;
  if (typeof value === 'string') return value;
  return undefined;
};

const validDateString = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0 && Number.isFinite(Date.parse(value));

const nullableDate = (value: unknown): string | null | undefined => {
  if (value === null) return null;
  return validDateString(value) ? value : undefined;
};

/** Convert a database row without inventing values; malformed rows are excluded. */
export function mapOpportunityRow(value: unknown): Opportunity | null {
  if (!isRecord(value)) return null;

  const id = requiredString(value, 'id');
  const title = requiredString(value, 'title');
  const description = requiredString(value, 'description');
  const organizer = requiredString(value, 'organizer');
  const postedAt = value.posted_at;

  if (!id || !title || description === null || !organizer || !validDateString(postedAt)) {
    return null;
  }
  if (!isOneOf(CATEGORIES, value.category)
      || !isOneOf(SOURCE_TYPES, value.source_type)
      || !isOneOf(STATUSES, value.status)) {
    return null;
  }

  const applicationStart = nullableDate(value.application_start);
  const deadline = nullableDate(value.deadline);
  const collectedAt = value.collected_at;
  const updatedAt = value.updated_at;
  if (applicationStart === undefined || deadline === undefined
      || !validDateString(collectedAt) || !validDateString(updatedAt)) {
    return null;
  }

  const sourcePostId = nullableString(value, 'source_post_id');
  const sourceUrl = nullableString(value, 'source_url');
  const applicationUrl = nullableString(value, 'application_url');
  if (sourcePostId === undefined || sourceUrl === undefined || applicationUrl === undefined) {
    return null;
  }

  const tags = value.tags;
  if (tags !== null && (!Array.isArray(tags) || !tags.every((tag) => typeof tag === 'string'))) {
    return null;
  }

  return {
    id,
    title,
    description,
    category: value.category,
    tags: tags ?? [],
    organizer,
    postedAt,
    applicationStart,
    deadline,
    sourceType: value.source_type,
    sourcePostId,
    sourceUrl,
    applicationUrl,
    collectedAt,
    updatedAt,
    status: value.status,
  };
}

const OPPORTUNITY_COLUMNS = [
  'id', 'title', 'description', 'category', 'tags', 'organizer', 'posted_at',
  'application_start', 'deadline', 'source_type', 'source_post_id', 'source_url',
  'application_url', 'collected_at', 'updated_at', 'status',
].join(',');

export async function fetchOpportunities(): Promise<Opportunity[]> {
  const { data, error } = await supabase
    .from('opportunities')
    .select(OPPORTUNITY_COLUMNS)
    .neq('status', 'draft')
    .order('posted_at', { ascending: false });

  if (error) throw new Error(`공고 조회 실패: ${error.message}`);
  if (!Array.isArray(data)) throw new Error('공고 응답 형식이 올바르지 않습니다.');

  return data
    .map(mapOpportunityRow)
    .filter((opportunity): opportunity is Opportunity =>
      opportunity !== null && opportunity.status !== 'draft');
}
