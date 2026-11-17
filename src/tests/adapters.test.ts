/**
 * BRIDGE — 추천 결과 targetId 어댑터 단위 테스트
 */

import { describe, it, expect } from 'vitest';
import {
  adaptOpportunityMatchToUi,
  adaptOpportunityMatchesToUi,
  adaptMemberMatchToUi,
  adaptMemberMatchesToUi,
  adaptTeamCandidatesToUi,
} from '../algorithms/adapters';
import { OpportunityMatchResult } from '../algorithms/opportunityRecommendation';
import { MemberMatchResult } from '../algorithms/memberMatching';

describe('추천 및 매칭 결과 UI 어댑터 (adapters)', () => {
  describe('1. 공모전 결과 어댑터 (opportunityId -> targetId)', () => {
    it('OpportunityMatchResult가 프론트엔드용 MatchResult(targetId)로 정확히 변환되어야 한다', () => {
      const oppResult: OpportunityMatchResult = {
        opportunityId: 'opp-101',
        score: 95.4,
        matchedTags: ['React', '웹 개발'],
        reasons: ['보유 기술 React와 일치합니다.'],
      };

      const uiMatch = adaptOpportunityMatchToUi(oppResult);

      expect(uiMatch.targetId).toBe('opp-101');
      expect(uiMatch.score).toBe(95);
      expect(uiMatch.matchedTags).toEqual(['React', '웹 개발']);
      expect(uiMatch.reasons).toEqual(['보유 기술 React와 일치합니다.']);

      // 원본 불변성 검증: 원본 객체는 opportunityId를 유지해야 함
      expect(oppResult.opportunityId).toBe('opp-101');
      expect((oppResult as unknown as Record<string, unknown>).targetId).toBeUndefined();
    });

    it('배열 변환 함수는 빈 배열이나 null 입력 시에도 안전하게 빈 배열을 반환해야 한다', () => {
      expect(adaptOpportunityMatchesToUi([])).toEqual([]);
      expect(adaptOpportunityMatchesToUi(null as unknown as OpportunityMatchResult[])).toEqual([]);
    });
  });

  describe('2. 팀원 결과 어댑터 (userId -> targetId)', () => {
    it('MemberMatchResult가 프론트엔드용 MatchResult(targetId)로 정확히 변환되어야 한다', () => {
      const memberResult: MemberMatchResult = {
        userId: 'user-박데이터',
        score: 88,
        roleMatch: true,
        matchedTechStacks: ['Java', 'Spring Boot', 'PostgreSQL'],
        commonAvailableHoursWeekly: 2,
        reasons: ['모집 중인 Backend Developer와 일치합니다.'],
      };

      const uiMatch = adaptMemberMatchToUi(memberResult);

      expect(uiMatch.targetId).toBe('user-박데이터');
      expect(uiMatch.score).toBe(88);
      // matchedTechStacks가 matchedTags로 호환 전달되어야 함
      expect(uiMatch.matchedTags).toEqual(['Java', 'Spring Boot', 'PostgreSQL']);
      expect(uiMatch.reasons).toEqual(['모집 중인 Backend Developer와 일치합니다.']);

      // 원본 불변성 검증
      expect(memberResult.userId).toBe('user-박데이터');
      expect((memberResult as unknown as Record<string, unknown>).targetId).toBeUndefined();
    });

    it('배열 변환 함수는 다수의 팀원 매칭 결과를 순서를 유지하여 변환해야 한다', () => {
      const list: MemberMatchResult[] = [
        {
          userId: 'u1',
          score: 90,
          roleMatch: true,
          matchedTechStacks: ['React'],
          commonAvailableHoursWeekly: 4,
          reasons: [],
        },
        {
          userId: 'u2',
          score: 75,
          roleMatch: false,
          matchedTechStacks: ['Python'],
          commonAvailableHoursWeekly: 0,
          reasons: [],
        },
      ];

      const adapted = adaptMemberMatchesToUi(list);
      expect(adapted).toHaveLength(2);
      expect(adapted[0].targetId).toBe('u1');
      expect(adapted[1].targetId).toBe('u2');
    });
  });

  describe('3. 팀 빌더 후보 어댑터', () => {
    it('팀 빌더 추천 후보 목록이 MatchResult 형태로 변환되어야 한다', () => {
      const candidates = [
        {
          candidateProfile: {
            id: 'candidate-01',
            email: 'cand@knu.ac.kr',
            name: '김후보',
            nickname: '김후보',
            grade: '2학년' as const,
            track: '플랫폼소프트웨어' as const,
            bio: '',
            interests: [],
            techStacks: ['Vue'],
            wantedTechStacks: [],
            desiredRoles: ['Frontend'],
            experiences: [],
            isPublic: true,
            createdAt: '',
            updatedAt: '',
          },
          fitScore: 85,
          complementRole: 'Frontend',
        },
      ];

      const adapted = adaptTeamCandidatesToUi(candidates);
      expect(adapted).toHaveLength(1);
      expect(adapted[0].targetId).toBe('candidate-01');
      expect(adapted[0].score).toBe(85);
      expect(adapted[0].reasons[0]).toContain('Frontend');
    });
  });
});
