import { beforeEach, describe, expect, it, vi } from 'vitest';

const supabaseMocks = vi.hoisted(() => ({
  from: vi.fn(),
  select: vi.fn(),
  neq: vi.fn(),
  order: vi.fn(),
}));

vi.mock('../lib/supabase', () => ({
  supabase: { from: supabaseMocks.from },
}));

import { fetchOpportunities, mapOpportunityRow } from './opportunityService';

const validRow = {
  id: 'opp-1',
  title: '공고 제목',
  description: '공고 설명',
  category: '해커톤',
  tags: ['AI', '웹'],
  organizer: '경북대학교 컴퓨터학부',
  posted_at: '2026-11-17T09:00:00+09:00',
  application_start: '2026-11-18T09:00:00+09:00',
  deadline: null,
  source_type: 'knu_cse_official',
  source_post_id: 'notice-1',
  source_url: 'https://computer.knu.ac.kr/notice/1',
  application_url: null,
  collected_at: '2026-11-17T10:00:00+09:00',
  updated_at: '2026-11-17T10:00:00+09:00',
  status: 'active',
};

const query = {
  select: supabaseMocks.select,
  neq: supabaseMocks.neq,
  order: supabaseMocks.order,
};

beforeEach(() => {
  vi.clearAllMocks();
  supabaseMocks.from.mockReturnValue(query);
  supabaseMocks.select.mockReturnValue(query);
  supabaseMocks.neq.mockReturnValue(query);
  supabaseMocks.order.mockResolvedValue({ data: [validRow], error: null });
});

describe('공고 서비스', () => {
  it('DB snake_case 필드를 Opportunity camelCase로 변환한다', async () => {
    const [opportunity] = await fetchOpportunities();

    expect(opportunity).toMatchObject({
      id: 'opp-1',
      postedAt: validRow.posted_at,
      applicationStart: validRow.application_start,
      sourceType: validRow.source_type,
      sourcePostId: validRow.source_post_id,
      sourceUrl: validRow.source_url,
      applicationUrl: null,
      collectedAt: validRow.collected_at,
      updatedAt: validRow.updated_at,
      status: 'active',
    });
    expect(supabaseMocks.from).toHaveBeenCalledWith('opportunities');
    expect(supabaseMocks.neq).toHaveBeenCalledWith('status', 'draft');
  });

  it('tags가 null이면 빈 배열로 변환한다', () => {
    expect(mapOpportunityRow({ ...validRow, tags: null })?.tags).toEqual([]);
  });

  it.each([
    ['category', '기타'],
    ['status', 'published'],
    ['source_type', 'crawler'],
  ])('%s 값이 TypeScript 계약에 없으면 행을 제외한다', (field, invalidValue) => {
    expect(mapOpportunityRow({ ...validRow, [field]: invalidValue })).toBeNull();
  });

  it.each([null, '', 'not-a-date'])('유효한 posted_at이 %s이면 행을 제외한다', (postedAt) => {
    expect(mapOpportunityRow({ ...validRow, posted_at: postedAt })).toBeNull();
  });

  it('draft 행은 조회 결과에 포함하지 않는다', async () => {
    supabaseMocks.order.mockResolvedValueOnce({
      data: [{ ...validRow, status: 'draft' }, validRow],
      error: null,
    });

    const result = await fetchOpportunities();

    expect(result.map(({ id }) => id)).toEqual(['opp-1']);
  });

  it('Supabase 조회 오류를 공고 조회 실패로 전달한다', async () => {
    supabaseMocks.order.mockResolvedValueOnce({
      data: null,
      error: { message: 'permission denied' },
    });

    await expect(fetchOpportunities()).rejects.toThrow('공고 조회 실패: permission denied');
  });
});
