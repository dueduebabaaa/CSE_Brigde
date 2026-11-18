import { describe, expect, it } from 'vitest';
import { mockUsers, mockOpportunities } from '../data/mockData';
import { validateUserProfile, validateOpportunity, filterValidAvailabilities, isValidAvailabilityItem, validateAndCleanTeamAvailabilities } from '../algorithms/validation';
import { adaptOpportunityMatchToUi, adaptOpportunityMatchesToUi, adaptMemberMatchToUi, adaptTeamCandidatesToUi } from '../algorithms/adapters';
import type { OpportunityMatchResult } from '../algorithms/opportunityRecommendation';
import { recommendOpportunities } from '../algorithms/opportunityRecommendation';
import { calculateMemberMatch, normalizeRole, normalizeRoleToStandardKey, isSameRole } from '../algorithms/memberMatching';
import { analyzeTeamBalanceForRoles } from '../algorithms/teamAnalyzer';
import { calculateOptimalMeetingSlots } from '../algorithms/scheduleOptimizer';
import { getCanonicalFieldTag, normalizeInterest } from '../algorithms/tagClassification';
import { parseOpportunityTimestamp } from '../algorithms/inputSafety';
import type { Availability, Opportunity } from '../types';

const now = new Date('2026-11-17T12:00:00+09:00');
const opportunity: Opportunity = { ...mockOpportunities[0], status: 'active', postedAt: '2026-11-16T12:00:00+09:00', applicationStart: null, deadline: null };
const result: OpportunityMatchResult = { opportunityId: 'opp-1', score: 95.4, matchedTags: ['React'], reasons: ['React 일치'] };
const slot: Availability = { id: 'av', userId: mockUsers[0].id, dayOfWeek: 1, slot: 20, isAvailable: true, updatedAt: '' };

describe('검수 1·4: 공개 범위 및 알고리즘 전용 DTO', () => {
  it('공개 범위가 없거나 legacy false만 있으면 공개를 확대하지 않는다', () => {
    const { isPublic: _removed, ...raw } = mockUsers[0];
    const missing = validateUserProfile(raw);
    expect(missing.data).toMatchObject({ isPublic: false, visibility: null });
    expect(validateUserProfile({ ...raw, isPublic: false }).data).toMatchObject({ isPublic: false, visibility: null });
    expect(calculateMemberMatch({ desiredRoles: [], requiredTechStacks: [] }, [], [{ profile: missing.data!, availability: [] }])).toEqual([]);
  });
  it.each(['public', 'team_only', 'private'] as const)('visibility=%s를 보존한다', visibility => {
    const { isPublic: _removed, ...raw } = mockUsers[0];
    expect(validateUserProfile({ ...raw, visibility }).data).toMatchObject({ visibility, isPublic: visibility === 'public' });
  });
  it.each([['private', true], ['team_only', true], ['public', false]])('충돌 %s/%s는 오류로 처리한다', (visibility, isPublic) => {
    const checked = validateUserProfile({ ...mockUsers[0], visibility, isPublic });
    expect(checked.isValid).toBe(false);
    expect(checked.data).toBeUndefined();
  });
  it('잘못된 공개 범위를 거부하고 legacy true는 호환한다', () => {
    expect(validateUserProfile({ ...mockUsers[0], visibility: 'internet' }).isValid).toBe(false);
    expect(validateUserProfile(mockUsers[0]).data).toMatchObject({ visibility: 'public', isPublic: true });
  });
  it('검증을 우회한 비공개·충돌 후보도 일반 탐색과 팀 후보에서 제외한다', () => {
    const candidates = (['private', 'team_only'] as const).map((visibility, i) => ({ ...mockUsers[0], id: `private-${i}`, visibility, isPublic: true }));
    expect(calculateMemberMatch({ desiredRoles: ['Frontend'], requiredTechStacks: [] }, [], candidates.map(profile => ({ profile, availability: [] })))).toEqual([]);
    expect(analyzeTeamBalanceForRoles([], candidates, ['Frontend']).recommendedCandidates).toEqual([]);
  });
  it('기타 상세는 보존하고 전체 DTO·개인정보 저장용 매퍼로 동작하지 않는다', () => {
    const raw = { ...mockUsers[0], interests: ['기타'], otherInterest: ' 양자컴퓨팅 ', desiredRoles: ['기타'], otherRole: ' DBA ',
      longBio: '상세 소개', techProficiency: { React: null }, meetingWay: '혼합', activityTypes: ['스터디'] };
    const snapshot = JSON.stringify(raw);
    const checked = validateUserProfile(raw);
    expect(checked.isValid).toBe(true);
    expect(checked.data).toMatchObject({ otherInterest: '양자컴퓨팅', otherRole: 'DBA', interests: ['기타'], desiredRoles: ['기타'] });
    expect(checked.data).not.toHaveProperty('longBio');
    expect(checked.data).not.toHaveProperty('techProficiency');
    expect(checked.data).not.toHaveProperty('meetingWay');
    expect(JSON.stringify(raw)).toBe(snapshot);
  });
  it.each(['techStacks', 'interests', 'wantedTechStacks', 'desiredRoles'])('%s의 비문자열 항목을 거부한다', field => {
    expect(validateUserProfile({ ...mockUsers[0], [field]: ['React', 42] }).isValid).toBe(false);
  });
  it('활성 기타 상세 누락은 실패하지만 비활성 입력은 추천에 넣지 않는다', () => {
    expect(validateUserProfile({ ...mockUsers[0], interests: ['기타'] }).isValid).toBe(false);
    const checked = validateUserProfile({ ...mockUsers[0], interests: ['웹 개발'], otherInterest: 'AI' });
    expect(checked.data?.interests).toEqual(['웹 개발']);
  });
});

describe('검수 2: 게시 시각·날짜·시간대', () => {
  it.each([undefined, null, ''])('게시 시각 미확인 %s는 생성하지 않고 실패한다', postedAt => {
    const checked = validateOpportunity({ ...opportunity, postedAt });
    expect(checked.isValid).toBe(false);
    expect(checked.errors).toContain('postedAt: unknown publication time');
  });
  it.each(['bad', '2026-02-30T12:00:00+09:00', '2026-11-17', '2026-11-17T24:00:00Z', '2026-11-17T12:00:00+99:00'])('잘못된 날짜 %s를 거부한다', postedAt => {
    expect(validateOpportunity({ ...opportunity, postedAt }).isValid).toBe(false);
    expect(recommendOpportunities(mockUsers[0], [{ ...opportunity, postedAt }], now)).toEqual([]);
  });
  it('국내 무시간대 시각은 서울로 해석하고 다른 시간대의 순간은 보존한다', () => {
    const seoul = parseOpportunityTimestamp('2026-11-17T12:00:00');
    expect(seoul).toBe('2026-11-17T12:00:00+09:00');
    expect(Date.parse(seoul!)).toBe(Date.parse('2026-11-17T03:00:00Z'));
    expect(parseOpportunityTimestamp('2024-02-29T12:00:00-05:00')).toBe('2024-02-29T12:00:00-05:00');
    expect(parseOpportunityTimestamp('2026-11-17T03:00:00.123456Z')).toBe('2026-11-17T03:00:00.123456Z');
  });
  it.each(['deadline', 'applicationStart'] as const)('%s 미정 null과 잘못된 값을 구분한다', field => {
    expect(validateOpportunity({ ...opportunity, [field]: null }).isValid).toBe(true);
    for (const value of ['', 42, 'bad', '2026-02-30T12:00:00Z', '2026-11-20']) {
      expect(validateOpportunity({ ...opportunity, [field]: value }).isValid).toBe(false);
    }
  });
  it('미래 게시·마감은 제외하고 게시 완료 접수 예정과 마감 경계는 유지한다', () => {
    expect(recommendOpportunities(mockUsers[0], [{ ...opportunity, postedAt: '2026-11-18T12:00:00+09:00' }], now)).toEqual([]);
    expect(recommendOpportunities(mockUsers[0], [{ ...opportunity, deadline: '2026-11-17T11:59:59+09:00' }], now)).toEqual([]);
    expect(recommendOpportunities(mockUsers[0], [{ ...opportunity, applicationStart: '2026-11-18T12:00:00+09:00' }], now)).toHaveLength(1);
    expect(recommendOpportunities(mockUsers[0], [{ ...opportunity, deadline: now.toISOString() }], now)).toHaveLength(1);
    expect(recommendOpportunities(mockUsers[0], [opportunity], new Date('bad'))).toEqual([]);
  });
  it('원문 URL 및 기존 추가 메타데이터를 유실하지 않고 원본을 변경하지 않는다', () => {
    const raw = { ...opportunity, sourcePostId: '123', sourceUrl: 'https://example.org/source', applicationUrl: 'https://example.org/apply', sourceUpdatedAt: 'original' };
    const before = JSON.stringify(raw);
    expect(validateOpportunity(raw).data).toMatchObject(raw);
    expect(JSON.stringify(raw)).toBe(before);
  });
});

describe('검수 3: UI 결과 경계', () => {
  it.each([Infinity, -Infinity, NaN, -1, 101])('잘못된 점수 %s를 세 어댑터에서 오류 처리한다', score => {
    expect(() => adaptOpportunityMatchToUi({ ...result, score })).toThrow(RangeError);
    expect(() => adaptMemberMatchToUi({ userId: 'u', score, roleMatch: true, matchedTechStacks: [], commonAvailableHoursWeekly: 0, reasons: [] })).toThrow(RangeError);
    expect(() => adaptTeamCandidatesToUi([{ candidateProfile: mockUsers[0], fitScore: score, complementRole: 'Frontend' }])).toThrow(RangeError);
  });
  it.each(['', ' ', null, 123])('잘못된 대상 ID %s를 거부한다', opportunityId => {
    expect(() => adaptOpportunityMatchToUi({ ...result, opportunityId } as OpportunityMatchResult)).toThrow(TypeError);
    expect(() => adaptTeamCandidatesToUi([{ candidateProfile: { ...mockUsers[0], id: opportunityId as string }, fitScore: 50, complementRole: 'Frontend' }])).toThrow(TypeError);
  });
  it.each(['matchedTags', 'reasons'])('%s 배열과 요소를 검사한다', field => {
    for (const invalid of ['text', [null], [1], [' '], undefined]) {
      expect(() => adaptOpportunityMatchToUi({ ...result, [field]: invalid } as OpportunityMatchResult)).toThrow(TypeError);
    }
  });
  it('유효한 반올림·빈 배열·순서를 유지하며 잘못된 결과를 조용히 숨기지 않는다', () => {
    expect(adaptOpportunityMatchToUi(result).score).toBe(95);
    expect(adaptOpportunityMatchToUi({ ...result, score: 0, matchedTags: [], reasons: [] }).score).toBe(0);
    expect(() => adaptOpportunityMatchesToUi([result, { ...result, score: 101 }])).toThrow();
  });
});

describe('검수 5: 신구 태그와 역할 호환', () => {
  it.each([['AI', '인공지능'], ['모바일 앱', '앱 개발'], ['UI/UX', 'UI/UX 디자인'], ['웹 플랫폼', '웹 개발']])('%s와 %s가 양방향으로 같은 점수를 낸다', (legacy, standard) => {
    expect(getCanonicalFieldTag(legacy)).toBe(getCanonicalFieldTag(normalizeInterest(standard)));
    for (const [interest, tag] of [[legacy, standard], [standard, legacy]]) {
      const checked = validateUserProfile({ ...mockUsers[0], interests: [interest], techStacks: [], wantedTechStacks: [] });
      expect(recommendOpportunities(checked.data!, [{ ...opportunity, tags: [tag] }], now)[0].score).toBe(100);
    }
  });
  it('구 역할명과 표준 key의 용도를 구분하고 자유 입력을 보존한다', () => {
    expect(normalizeRole('프론트엔드')).toBe('Frontend Developer');
    expect(normalizeRoleToStandardKey('프론트엔드')).toBe('Frontend');
    expect(isSameRole('Frontend', 'Frontend Developer')).toBe(true);
    expect(normalizeRoleToStandardKey('양자컴퓨팅')).toBe('양자컴퓨팅');
    expect(normalizeInterest('양자컴퓨팅')).toBe('양자컴퓨팅');
  });
});

describe('검수 6: 시간표 중복·상충', () => {
  it('타입 가드가 Availability의 필수 필드 전체 자료형을 검사한다', () => {
    expect(isValidAvailabilityItem(slot)).toBe(true);
    const { updatedAt: _removed, ...partial } = slot;
    expect(isValidAvailabilityItem(partial)).toBe(false);
    expect(isValidAvailabilityItem({ ...slot, userId: ' ' })).toBe(false);
    expect(isValidAvailabilityItem({ ...slot, updatedAt: 1 })).toBe(false);
  });
  it('중복은 한 슬롯이며 true/false 상충은 입력 순서와 무관하게 false이다', () => {
    const denied = { ...slot, id: 'denied', isAvailable: false };
    expect(filterValidAvailabilities([slot, { ...slot, id: 'dup' }])).toHaveLength(1);
    for (const rows of [[slot, denied], [denied, slot]]) {
      expect(filterValidAvailabilities(rows)).toHaveLength(1);
      expect(filterValidAvailabilities(rows)[0].isAvailable).toBe(false);
      expect(calculateOptimalMeetingSlots({ [slot.userId]: rows }, 30)).toEqual([]);
      const match = calculateMemberMatch({ desiredRoles: [], requiredTechStacks: [] }, rows, [{ profile: mockUsers[0], availability: [slot] }]);
      expect(match[0].commonAvailableHoursWeekly).toBe(0);
    }
  });
  it('팀 key와 사용자 ID가 다른 슬롯과 미등록 시간을 가능한 시간으로 확대하지 않는다', () => {
    expect(validateAndCleanTeamAvailabilities({ wrong: [slot] }).wrong).toEqual([]);
    expect(calculateOptimalMeetingSlots({ wrong: [slot] }, 30)).toEqual([]);
    expect(calculateOptimalMeetingSlots({ [slot.userId]: [] }, 30)).toEqual([]);
  });
});
