import { it, expect } from 'vitest';
import {
  extractExplicitDeadline,
  recommendOpportunities,
} from '../algorithms/opportunityRecommendation';
import { mockUsers, mockOpportunities } from '../data/mockData';

const now = new Date('2026-11-23T12:00:00+09:00');
const postedAt = '2026-11-01T00:00:00+09:00';

it.each([
  ['clear past', '신청 마감: 2026-11-20 18:00', '', false],
  ['event only', '행사 일시: 2026년 11월 20일 18시', '', true],
  ['education only', '교육 기간: 11월 10일 ~ 11월 12일', '', true],
  ['two recognized dates', '1차 마감: 11월 20일, 최종 마감: 11월 28일', '', true],
  ['unknown final deadline', '1차 접수 마감: 11월 20일 18시, 최종 마감: 추후 공지', '', true],
  ['later round with natural-language suffix', '1차 접수 마감: 11월 20일 18시, 최종 접수는 11월 28일까지', '', true],
  ['unrelated survey deadline', 'React 워크숍 참가자 모집', '사전 설문 응답 마감: 11월 20일 18시. 참가 접수 마감: 추후 공지', true],
  ['education period range', '교육 기간: 11월 10일 ~ 11월 12일 마감', '', true],
  ['event period range', '행사 기간: 11월 10일 ~ 11월 12일 마감', '', true],
  ['explicit timezone', '접수 마감: 2026-11-23 08:00 UTC', '', true],
  ['AM/PM between date and time', '접수 마감: 11월 23일 오후 6시', '', true],
  ['AM/PM after time', '접수 마감: 11월 23일 6:00 PM', '', true],
  ['cross-field fragments', 'React 워크숍 11월 20일', '마감 참가자 명단은 개별 공지', true],
] as const)(
  '%s',
  (label, title, description, expected) => {
    const opportunity = {
      ...mockOpportunities[0],
      title,
      description,
      postedAt,
      deadline: null,
      status: 'active' as const,
    };

    const matches = recommendOpportunities(
      mockUsers[0],
      [opportunity],
      now,
      { filterExplicitTextDeadline: true }
    );

    const extracted =
      extractExplicitDeadline(
        title,
        description,
        postedAt
      )?.toISOString() ?? null;

    expect(
      matches.length > 0,
      label + ' extracted=' + extracted
    ).toBe(expected);
  }
);
