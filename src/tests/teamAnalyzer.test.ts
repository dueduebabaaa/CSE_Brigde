/**
 * BRIDGE — 팀 빌더 역량 균형도 분석 알고리즘 단위 테스트 (Vitest)
 */

import { describe, it, expect } from 'vitest';
import {
  analyzeTeamBalance,
  analyzeTeamBalanceForRoles,
  ALL_TECH_SUBJECTS,
} from '../algorithms/teamAnalyzer';
import { UserProfile } from '../types';
import { mockUsers } from '../data/mockData';

describe('팀 빌더 역량 균형도 분석 알고리즘 (teamAnalyzer)', () => {
  const user01 = mockUsers.find((u) => u.id === 'user-01')!; // 김컴학 (Frontend Lead, React/TS)
  const user03 = mockUsers.find((u) => u.id === 'user-03')!; // 박데이터 (Backend Developer, Java/Spring/DB)
  const user08 = mockUsers.find((u) => u.id === 'user-08')!; // 한디자인 (UI/UX Designer, Figma)
  const user09 = mockUsers.find((u) => u.id === 'user-09')!; // 신풀스택 (FullStack Developer)
  const user10 = mockUsers.find((u) => u.id === 'user-10')!; // 조은둔 (isPublic: false)

  // ---------------------------------------------------------------------------
  // 1. 핵심 설계 검증 (섹션 10 가상 학생 예시)
  // ---------------------------------------------------------------------------
  describe('1. 핵심 설계 검증 (user-01 단독 팀 분석)', () => {
    it('Frontend, Backend, UI/UX 필요 시 user-01 단독 팀은 Backend와 UI/UX가 부족해야 하고, user-03과 user-08이 보완 인재로 추천되어야 한다', () => {
      const requiredRoles = ['Frontend', 'Backend', 'UI/UX'];
      const team = [user01];

      const result = analyzeTeamBalanceForRoles(team, mockUsers, requiredRoles);

      // 1인 1역할 원칙: user-01은 Frontend를 전담하여 충족하고, Backend와 UI/UX는 부족함
      expect(result.coveredRoles).toEqual(['Frontend']);
      expect(result.missingRoles).toEqual(expect.arrayContaining(['Backend', 'UI/UX']));
      expect(result.missingRoles).toHaveLength(2);
      expect(result.isBalanced).toBe(false);

      // 보완 인재 추천 검증
      const recommendedUserIds = result.recommendedCandidates.map((c) => c.candidateProfile.id);

      // user-03 (Backend 보완 인재) 추천 확인
      expect(recommendedUserIds).toContain('user-03');
      const user03Rec = result.recommendedCandidates.find((c) => c.candidateProfile.id === 'user-03');
      expect(user03Rec?.complementRole).toBe('Backend');
      expect(user03Rec?.fitScore).toBeGreaterThanOrEqual(60);

      // user-08 (UI/UX 보완 인재) 추천 확인
      expect(recommendedUserIds).toContain('user-08');
      const user08Rec = result.recommendedCandidates.find((c) => c.candidateProfile.id === 'user-08');
      expect(user08Rec?.complementRole).toBe('UI/UX');
      expect(user08Rec?.fitScore).toBeGreaterThanOrEqual(60);

      // 현재 팀원인 user-01은 추천 후보에서 제외되어야 함
      expect(recommendedUserIds).not.toContain('user-01');

      // 경고 메시지 확인
      expect(result.warnings.some((w) => w.includes('백엔드'))).toBe(true);
      expect(result.warnings.some((w) => w.includes('UI/UX'))).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // 2. 15대 필수 검증 시나리오
  // ---------------------------------------------------------------------------
  describe('2. 세부 검증 시나리오', () => {
    it('1) 모든 필수 역할이 충족된 경우 isBalanced가 true이고 충족 안내가 표시되어야 한다', () => {
      const requiredRoles = ['Frontend', 'Backend', 'UI/UX'];
      // user01(FE), user03(BE), user08(UI/UX)
      const team = [user01, user03, user08];

      const result = analyzeTeamBalanceForRoles(team, mockUsers, requiredRoles);

      expect(result.coveredRoles).toHaveLength(3);
      expect(result.missingRoles).toHaveLength(0);
      expect(result.isBalanced).toBe(true);
      expect(result.warnings).toContain('프로젝트 필수 역할이 모두 충족되었습니다.');
      expect(result.recommendedCandidates).toHaveLength(0);
    });

    it('2) 일부 역할이 부족한 경우 missingRoles와 해당 경고가 올바르게 도출되어야 한다', () => {
      const requiredRoles = ['Frontend', 'AI/Data'];
      const team = [user01]; // Frontend만 보유

      const result = analyzeTeamBalanceForRoles(team, mockUsers, requiredRoles);

      expect(result.coveredRoles).toEqual(['Frontend']);
      expect(result.missingRoles).toEqual(['AI/Data']);
      expect(result.isBalanced).toBe(false);
      expect(result.warnings.some((w) => w.includes('AI/데이터'))).toBe(true);
    });

    it('3) 팀원이 아무도 없는 경우 레이더 차트는 0점이고 등록 안내 메시지가 표시되어야 한다', () => {
      const requiredRoles = ['Frontend', 'Backend'];
      const result = analyzeTeamBalanceForRoles([], mockUsers, requiredRoles);

      expect(result.coveredRoles).toHaveLength(0);
      expect(result.missingRoles).toEqual(['Frontend', 'Backend']);
      expect(result.isBalanced).toBe(false);
      expect(result.warnings).toContain('현재 등록된 팀원이 없습니다. 팀원을 구성해 주세요.');

      // 모든 레이더 차트 점수가 0점인지 확인
      for (const radar of result.radarData) {
        expect(radar.score).toBe(0);
      }
    });

    it('4) 후보 학생 목록이 비어 있는 경우 recommendedCandidates는 빈 배열이어야 한다', () => {
      const requiredRoles = ['Backend'];
      const result = analyzeTeamBalanceForRoles([user01], [], requiredRoles);

      expect(result.missingRoles).toEqual(['Backend']);
      expect(result.recommendedCandidates).toEqual([]);
    });

    it('5) profile.isPublic === false인 비공개 학생(user-10)은 추천 후보에서 제외되어야 한다', () => {
      const requiredRoles = ['AI/Data'];
      // user-10은 데이터 분석(AI/Data) 관련 학생이나 isPublic: false
      expect(user10.isPublic).toBe(false);

      const result = analyzeTeamBalanceForRoles([user01], mockUsers, requiredRoles);
      const recommendedIds = result.recommendedCandidates.map((c) => c.candidateProfile.id);

      expect(recommendedIds).not.toContain('user-10');
    });

    it('6) 기존 팀원(teamMembers)에 속한 학생은 추천 후보에 중복 등장하지 않아야 한다', () => {
      const requiredRoles = ['Backend', 'UI/UX'];
      const team = [user01, user03]; // user03이 이미 팀에 속함

      const result = analyzeTeamBalanceForRoles(team, mockUsers, requiredRoles);
      const recommendedIds = result.recommendedCandidates.map((c) => c.candidateProfile.id);

      expect(recommendedIds).not.toContain('user-01');
      expect(recommendedIds).not.toContain('user-03');
    });

    it('7) 한 학생(FullStack)이 여러 역할을 희망해도 1인 1역할 원칙에 따라 복수 역할을 동시 충족시키지 못해야 한다', () => {
      const requiredRoles = ['Frontend', 'Backend'];
      // user09는 FullStack(Frontend + Backend 가능)
      const team = [user09];

      const result = analyzeTeamBalanceForRoles(team, mockUsers, requiredRoles);

      // 2개 필수 역할 중 1개만 충족되고 1개는 부족해야 함
      expect(result.coveredRoles).toHaveLength(1);
      expect(result.missingRoles).toHaveLength(1);
      expect(result.isBalanced).toBe(false);
    });

    it('8) 여러 팀원이 동일한 기술 스택(React)을 중복 보유해도 고유 기술 1개로 계산되어야 한다', () => {
      // user01, user08, user09는 모두 React를 보유
      const teamWithDuplicateTech = [
        { ...user01, techStacks: ['React'] },
        { ...user08, techStacks: ['React'] },
      ];

      const result = analyzeTeamBalanceForRoles(teamWithDuplicateTech, mockUsers, ['Frontend']);
      const frontendScore = result.radarData.find((r) => r.subject === 'Frontend')?.score;

      // 1개 고유 기술 보유 점수: 35점 (중복 카운트되어 65점이 되지 않아야 함)
      expect(frontendScore).toBe(35);
    });

    it('9) 기술 정보가 빈 배열인 학생이 포함되어도 오류 없이 안전하게 계산되어야 한다', () => {
      const noTechStudent: UserProfile = {
        ...user01,
        id: 'no-tech-user',
        techStacks: [],
      };

      expect(() => {
        analyzeTeamBalanceForRoles([noTechStudent], mockUsers, ['Frontend']);
      }).not.toThrow();
    });

    it('10) 역할명이 다양하게 표현된 경우(백엔드 개발자 등) 표준 6대 분야로 정상 매핑되어야 한다', () => {
      const customRoleStudent: UserProfile = {
        ...user01,
        id: 'custom-role-user',
        desiredRoles: ['백엔드 개발자'],
      };

      const result = analyzeTeamBalanceForRoles([customRoleStudent], mockUsers, ['Backend']);
      expect(result.coveredRoles).toEqual(['Backend']);
      expect(result.isBalanced).toBe(true);
    });

    it('11) 후보 추천 점수(fitScore)는 0 ~ 100점 범위로 제한되어야 한다', () => {
      const requiredRoles = ['Backend', 'AI/Data', 'DevOps'];
      const result = analyzeTeamBalanceForRoles([user01], mockUsers, requiredRoles);

      for (const rec of result.recommendedCandidates) {
        expect(rec.fitScore).toBeGreaterThanOrEqual(0);
        expect(rec.fitScore).toBeLessThanOrEqual(100);
      }
    });

    it('12) radarData는 항상 6대 분야가 모두 포함되고 fullMark는 100이어야 한다', () => {
      const result = analyzeTeamBalanceForRoles([user01], mockUsers, ['Frontend']);

      expect(result.radarData).toHaveLength(6);
      const subjects = result.radarData.map((r) => r.subject);
      expect(subjects).toEqual(expect.arrayContaining(ALL_TECH_SUBJECTS));

      for (const radar of result.radarData) {
        expect(radar.fullMark).toBe(100);
        expect(radar.score).toBeGreaterThanOrEqual(0);
        expect(radar.score).toBeLessThanOrEqual(100);
      }
    });

    it('13) 역할 충족률이 정확하게 계산되어야 한다 (3개 중 1개 충족 시 33%)', () => {
      const requiredRoles = ['Frontend', 'Backend', 'AI/Data'];
      const team = [user01]; // Frontend 1개만 충족

      const result = analyzeTeamBalanceForRoles(team, mockUsers, requiredRoles);
      const fulfillmentRate = Math.round(
        (result.coveredRoles.length / requiredRoles.length) * 100
      );

      expect(fulfillmentRate).toBe(33);
    });

    it('14) 프로젝트 필수 역할이 지정되지 않은 기존 API(analyzeTeamBalance)는 missingRoles 빈 배열 및 미판정 안내를 반환해야 한다', () => {
      const team = [user01];
      const result = analyzeTeamBalance(team, mockUsers);

      // 필수 역할 미지정 시 missingRoles는 빈 배열, isBalanced는 false(미판정)
      expect(result.missingRoles).toEqual([]);
      expect(result.isBalanced).toBe(false);
      expect(result.warnings[0]).toContain('프로젝트 필수 역할 정보가 없어 부족한 역할을 확정할 수 없습니다.');
      // 레이더 차트는 정상 계산되어야 함
      expect(result.radarData).toHaveLength(6);
    });

    it('15) 입력된 teamMembers 및 allCandidatesPool 원본 배열과 객체는 변경되지 않아야 한다 (불변성)', () => {
      const teamOriginal = [structuredClone(user01)];
      const candidatesOriginal = structuredClone(mockUsers);
      const rolesOriginal = ['Frontend', 'Backend'];

      analyzeTeamBalanceForRoles(teamOriginal, candidatesOriginal, rolesOriginal);

      expect(teamOriginal[0]).toEqual(user01);
      expect(candidatesOriginal).toEqual(mockUsers);
      expect(rolesOriginal).toEqual(['Frontend', 'Backend']);
    });

    it('16) [오류 수정 검증] PM/기획, 마케팅 등 레이더 6축 밖의 필수 역할이 지정되었을 때, 거짓 충족 안내가 발생하지 않고 부족 경고가 안내되어야 한다', () => {
      // 프론트엔드 개발자 1명만 있는 팀
      const team = [user01]; // desiredRoles: ['Frontend Developer', 'UI/UX Lead']
      // 필수 역할로 Frontend와 PM/기획을 요구
      const requiredRoles = ['Frontend', 'PM/기획'];

      const result = analyzeTeamBalanceForRoles(team, mockUsers, requiredRoles);

      // Frontend는 충족, PM/기획은 부족
      expect(result.coveredRoles).toContain('Frontend');
      expect(result.missingRoles).toContain('PM/기획');
      expect(result.isBalanced).toBe(false);

      // "모두 충족되었습니다" 거짓 경고가 절대 없어야 함
      expect(result.warnings.some((w) => w.includes('모두 충족되었습니다'))).toBe(false);
      // "PM/기획 담당자가 부족합니다" 경고가 정상 출력되어야 함
      expect(result.warnings.some((w) => w.includes('PM/서비스 기획') || w.includes('PM/기획'))).toBe(true);
    });
  });
});
