import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import sample from './fixtures/bridge_opportunities_sample.json';
import { mockUsers } from '../data/mockData';
import { extractTagsFromOpportunity } from '../algorithms/opportunityTagExtractor';
import { getCanonicalTag, normalizeTag } from '../algorithms/tagClassification';
import { recommendOpportunities } from '../algorithms/opportunityRecommendation';
import { validateOpportunity, validateUserProfile } from '../algorithms/validation';
import type { Opportunity } from '../types';

// Reproducible evaluation time, not a collected date or a claim about live listings.
const referenceDate = new Date('2026-11-17T12:00:00+09:00');
const controlledPostedAt = '2026-11-16T12:00:00+09:00';
const controlledDeadline = '2026-12-17T12:00:00+09:00';
const fixtureUrl = new URL('./fixtures/bridge_opportunities_sample.json', import.meta.url);
const originalBytes = readFileSync(fixtureUrl);
const originalSnapshot = JSON.stringify(sample);
const originalProfileSnapshot = JSON.stringify(mockUsers[0]);

function toOpportunity(raw: (typeof sample)[number]): Opportunity {
  const result = validateOpportunity({
    ...raw,
    postedAt: raw.posted_at,
    // Technical placeholders only: the sample contains no body or collection times.
    description: '',
    applicationStart: null,
    sourceType: 'knu_cse_official',
    collectedAt: '',
    updatedAt: '',
  });
  if (!result.isValid || !result.data) throw new Error(result.errors.join('; '));
  return result.data;
}

function enrich(opportunity: Opportunity): Opportunity {
  // Title-only analysis, including when a future sample supplies a description.
  const extracted = extractTagsFromOpportunity(opportunity.title);
  const unique = new Map<string, string>();
  for (const tag of [...opportunity.tags, ...extracted.allTags]) {
    const canonical = getCanonicalTag(tag);
    const key = normalizeTag(canonical);
    if (key && !unique.has(key)) unique.set(key, canonical);
  }
  return { ...opportunity, tags: [...unique.values()] };
}

const profileResult = validateUserProfile(mockUsers[0]);
if (!profileResult.isValid || !profileResult.data) throw new Error('Invalid existing mock user');
const profile = profileResult.data;
const opportunities = sample.map(toOpportunity);
const enriched = opportunities.map(enrich);
// Every original row is excluded, so only these in-memory copies bypass the filters.
const controlled = opportunities.map(opportunity => ({
  ...opportunity,
  status: 'active' as const,
  postedAt: controlledPostedAt,
  deadline: controlledDeadline,
}));
const controlledEnriched = controlled.map(enrich);

describe('실제 수집 공고: 원본 조건과 통제된 복사본 구분', () => {
  it('실제 8건의 구조와 원본 상태·날짜를 유지해 camelCase 입력으로 변환한다', () => {
    expect(sample).toHaveLength(8);
    expect(new Set(sample.map(row => row.id)).size).toBe(8);
    expect(sample.every(row => !('description' in row))).toBe(true);
    opportunities.forEach((row, index) => {
      expect(row.postedAt).toBe(sample[index].posted_at);
      expect(row.deadline).toBe(sample[index].deadline);
      expect(row.status).toBe(sample[index].status);
      expect(row.tags).toEqual(sample[index].tags);
    });
  });

  it('실제 상태·마감 조건에서는 태그 적용 전후 모두 추천 결과가 0건이다', () => {
    expect(sample.filter(row => row.status === 'needs_confirmation')).toHaveLength(7);
    expect(sample[7].status).toBe('active');
    expect(new Date(sample[7].deadline!).getTime()).toBeLessThan(referenceDate.getTime());
    expect(recommendOpportunities(profile, opportunities, referenceDate)).toEqual([]);
    expect(recommendOpportunities(profile, enriched, referenceDate)).toEqual([]);
  });

  it('공고별 추천 제외를 확인하고 제외된 항목을 0점 결과로 만들지 않는다', () => {
    for (const row of opportunities) {
      expect(recommendOpportunities(profile, [row], referenceDate)).toEqual([]);
    }
  });

  it('실제 제목의 추출 결과와 과잉 해석 가능성을 기록한다', () => {
    const results = opportunities.map(row => extractTagsFromOpportunity(row.title));
    expect(results.every(result => result.techs.length === 0)).toBe(true);
    // Preserve actual behavior: the separator after 클라우드 is not recognized.
    // 웹 개발 is produced from the AWS service name, a semantic false-positive risk.
    expect(results[2].fields).toEqual(['웹 개발']);
    expect(results[6].fields).toContain('창업');
    expect(results.filter(result => result.allTags.length > 0)).toHaveLength(2);
    expect(results[0].fields).not.toContain('인공지능');
    // A brand name (Upstage) is not evidence for Python/LLM/AI technology.
    expect(results[7].allTags).toEqual([]);
    expect(results[2].techs).not.toContain('AWS');
  });

  it('원본 일반 태그를 유지하고 추출 태그는 정규화 후 중복 제거한다', () => {
    enriched.forEach((row, index) => {
      const keys = row.tags.map(tag => normalizeTag(getCanonicalTag(tag)));
      expect(new Set(keys).size).toBe(keys.length);
      for (const tag of opportunities[index].tags) expect(row.tags).toContain(tag);
      expect(enrich(row)).toEqual(row);
      expect(row.status).toBe(opportunities[index].status);
      expect(row.deadline).toBe(opportunities[index].deadline);
    });
    const duplicateInput = { ...opportunities[2], tags: [...opportunities[2].tags, '웹개발', '웹 개발'] };
    expect(enrich(duplicateInput).tags).toEqual(['부트캠프', '웹 개발']);
  });

  it('가상 조건 변경은 복사본에만 적용하고 동일 mock 사용자로 점수를 비교한다', () => {
    const before = recommendOpportunities(profile, controlled, referenceDate);
    const after = recommendOpportunities(profile, controlledEnriched, referenceDate);
    expect(profile.id).toBe('user-01');
    expect(before).toHaveLength(8);
    expect(after).toHaveLength(8);
    expect(before.every(row => row.score === 0)).toBe(true);
    const afterScores = opportunities.map(row => after.find(match => match.opportunityId === row.id)!.score);
    expect(afterScores).toEqual([0, 0, 100, 0, 0, 0, 0, 0]);
    expect(after.filter(row => row.score > before.find(old => old.opportunityId === row.opportunityId)!.score)).toHaveLength(1);
    controlled.forEach(row => {
      expect(row.status).toBe('active');
      expect(row.postedAt).toBe(controlledPostedAt);
      expect(row.deadline).toBe(controlledDeadline);
    });
  });

  it('JSON 바이트·객체·기존 mock 프로필을 변경하지 않는다', () => {
    recommendOpportunities(profile, controlledEnriched, referenceDate);
    expect(JSON.stringify(sample)).toBe(originalSnapshot);
    expect(readFileSync(fixtureUrl)).toEqual(originalBytes);
    expect(JSON.stringify(mockUsers[0])).toBe(originalProfileSnapshot);
  });
});
