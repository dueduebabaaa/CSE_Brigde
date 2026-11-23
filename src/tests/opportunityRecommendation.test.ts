/**
 * BRIDGE — 공모전 맞춤 추천 알고리즘 단위 테스트 (Vitest)
 */

import { describe, it, expect } from 'vitest';
import {
  recommendOpportunities,
  extractExplicitDeadline,
  isExplicitlyExpiredInText,
  filterOpportunitiesByExplicitDeadline,
} from '../algorithms/opportunityRecommendation';
import { UserProfile, Opportunity } from '../types';
import { mockUsers, mockOpportunities } from '../data/mockData';

describe('공모전 맞춤 추천 알고리즘 (recommendOpportunities)', () => {
  // 기준 시점: 2026-11-15T00:00:00+09:00
  const referenceDate = new Date('2026-11-15T00:00:00+09:00');

  // ---------------------------------------------------------------------------
  // 1. 설계 확정안 핵심 검증 (섹션 8 예시)
  // ---------------------------------------------------------------------------
  describe('1. 설계 확정안 계산 검증 (섹션 8 기준)', () => {
    it('학생과 공모전의 태그가 일치할 때 가중치 합산 82.5점이 83점으로 정확히 반올림되어야 한다', () => {
      const student: UserProfile = {
        id: 'user-spec',
        email: 'spec@knu.ac.kr',
        name: '확정학생',
        nickname: '스펙러너',
        grade: '3학년',
        track: '플랫폼소프트웨어',
        bio: '테스트용 학생',
        interests: ['웹 개발', 'AI'],
        techStacks: ['React', 'Python'],
        wantedTechStacks: ['TypeScript', 'FastAPI'],
        desiredRoles: ['Frontend Developer'],
        experiences: [],
        isPublic: true,
        createdAt: '2026-11-01T00:00:00+09:00',
        updatedAt: '2026-11-01T00:00:00+09:00',
      };

      const contest: Opportunity = {
        id: 'opp-spec-01',
        title: '2026 웹 & AI 융합 해커톤',
        description: '웹과 AI 기술을 접목한 신규 솔루션 개발 공모전입니다.',
        category: '해커톤',
        tags: ['웹 개발', 'AI', 'React', 'Python', 'TypeScript', 'FastAPI'],
        organizer: '경북대학교 컴퓨터학부',
        postedAt: '2026-11-10T09:00:00+09:00',
        applicationStart: '2026-11-10T09:00:00+09:00',
        deadline: '2026-11-30T18:00:00+09:00', // 기준 시각(11-15) 이후
        sourceType: 'knu_cse_official',
        status: 'active',
        collectedAt: '2026-11-10T09:00:00+09:00',
        updatedAt: '2026-11-10T09:00:00+09:00',
      };

      const results = recommendOpportunities(student, [contest], referenceDate);

      expect(results).toHaveLength(1);
      const result = results[0];

      expect(result.opportunityId).toBe('opp-spec-01');
      // 계산 검증:
      // - 관심 분야: 50 * (2 / 2) = 50점
      // - 보유 기술: 35 * (2 / 4) = 17.5점
      // - 학습 희망: 15 * (2 / 2) = 15점
      // - 총합: 82.5점 -> 83점 반올림
      expect(result.score).toBe(83);

      // 일치 태그 검증
      expect(result.matchedTags).toEqual(
        expect.arrayContaining(['웹 개발', 'AI', 'React', 'Python', 'TypeScript', 'FastAPI'])
      );
      expect(result.matchedTags).toHaveLength(6);

      // 추천 이유 검증 (실제 일치 항목만 반영)
      expect(result.reasons).toContain('관심 분야인 웹 개발과 일치합니다.');
      expect(result.reasons).toContain('관심 분야인 AI와 일치합니다.');
      expect(result.reasons).toContain('보유 기술 React를 활용할 수 있습니다.');
      expect(result.reasons).toContain('보유 기술 Python을 활용할 수 있습니다.');
      expect(result.reasons).toContain('배우고 싶은 TypeScript와 관련된 활동입니다.');
      expect(result.reasons).toContain('배우고 싶은 FastAPI와 관련된 활동입니다.');
    });
  });

  // ---------------------------------------------------------------------------
  // 2. 태그 정규화 및 동의어 매핑
  // ---------------------------------------------------------------------------
  describe('2. 태그 정규화 및 동의어 매핑', () => {
    it('공백, 대소문자 차이 및 동의어(웹 플랫폼 -> 웹 개발 등)가 일치로 인식되어야 한다', () => {
      const student: UserProfile = {
        id: 'user-synonym',
        email: 'syn@knu.ac.kr',
        name: '동의어학생',
        nickname: '정규화',
        grade: '2학년',
        track: '데이터사이언스',
        bio: '',
        interests: [' 웹 플랫폼 ', '인공지능'], // 동의어 매핑: 웹 개발, AI
        techStacks: ['  react.js  ', 'PY'],    // 동의어 매핑: React, Python
        wantedTechStacks: ['TS'],               // 동의어 매핑: TypeScript
        desiredRoles: [],
        experiences: [],
        isPublic: true,
        createdAt: '2026-11-01T00:00:00+09:00',
        updatedAt: '2026-11-01T00:00:00+09:00',
      };

      const contest: Opportunity = {
        id: 'opp-synonym',
        title: '웹/인공지능 프로젝트',
        description: '',
        category: '공모전',
        tags: ['웹개발', 'AI', 'React', 'Python', 'TypeScript'],
        organizer: '소프트웨어교육원',
        postedAt: '2026-11-01T00:00:00+09:00',
        applicationStart: null,
        deadline: '2026-11-25T18:00:00+09:00',
        sourceType: 'user_manual',
        status: 'active',
        collectedAt: '2026-11-01T00:00:00+09:00',
        updatedAt: '2026-11-01T00:00:00+09:00',
      };

      const [result] = recommendOpportunities(student, [contest], referenceDate);

      expect(result).toBeDefined();
      expect(result.matchedTags).toContain('웹 개발');
      expect(result.matchedTags).toContain('AI');
      expect(result.matchedTags).toContain('React');
      expect(result.matchedTags).toContain('Python');
      expect(result.matchedTags).toContain('TypeScript');
      // 점수 계산:
      // - 관심 분야: 50 * (2 / 2) = 50점
      // - 보유 기술: 35 * (2 / 3) = 23.33점 (공모전 React, Python, TypeScript 중 보유 React, Python 2개)
      // - 학습 희망: 15 * (1 / 1) = 15점 (학생 희망 TypeScript가 공모전에 포함)
      // - 총합: 50 + 23.33 + 15 = 88.33 -> 88점
      expect(result.score).toBe(88);
    });

    it('일반 태그(KNU, 해커톤 등)는 점수 계산 및 분모에서 제외되어야 한다', () => {
      const student: UserProfile = {
        id: 'user-general',
        email: 'gen@knu.ac.kr',
        name: '일반태그테스트',
        nickname: '일반',
        grade: '1학년',
        track: '글로벌소프트웨어융합',
        bio: '',
        interests: ['웹 개발'],
        techStacks: ['React'],
        wantedTechStacks: [],
        desiredRoles: [],
        experiences: [],
        isPublic: true,
        createdAt: '2026-11-01T00:00:00+09:00',
        updatedAt: '2026-11-01T00:00:00+09:00',
      };

      const contest: Opportunity = {
        id: 'opp-with-general-tags',
        title: '교내 해커톤',
        description: '',
        category: '해커톤',
        tags: ['KNU', '해커톤', '팀빌딩', '웹 개발', 'React'], // KNU, 해커톤, 팀빌딩은 일반 태그
        organizer: '경북대',
        postedAt: '2026-11-01T00:00:00+09:00',
        applicationStart: null,
        deadline: '2026-11-30T18:00:00+09:00',
        sourceType: 'knu_cse_official',
        status: 'active',
        collectedAt: '2026-11-01T00:00:00+09:00',
        updatedAt: '2026-11-01T00:00:00+09:00',
      };

      const [result] = recommendOpportunities(student, [contest], referenceDate);

      // 학생이 wantedTechStacks가 없으므로 계산 가능 항목은 관심 분야(50), 보유 기술(35)
      // 스케일 = 100 / 85
      // 분야: (50 * 100 / 85) * (1 / 1) = 58.82
      // 기술: (35 * 100 / 85) * (1 / 1) = 41.18
      // 총합: 100점!
      expect(result.score).toBe(100);
      expect(result.matchedTags).not.toContain('KNU');
      expect(result.matchedTags).not.toContain('해커톤');
      expect(result.matchedTags).not.toContain('팀빌딩');
      expect(result.matchedTags).toEqual(expect.arrayContaining(['웹 개발', 'React']));
    });
  });

  // ---------------------------------------------------------------------------
  // 3. 모집 상태 및 마감일 필터링
  // ---------------------------------------------------------------------------
  describe('3. 모집 상태 및 마감일 필터링', () => {
    const student = mockUsers[0]; // 김컴학 (React, TypeScript)

    it('게시된 needs_confirmation은 포함하고 closed와 draft는 제외한다', () => {
      const contests: Opportunity[] = [
        {
          ...mockOpportunities[0],
          id: 'opp-closed',
          status: 'closed',
        },
        {
          ...mockOpportunities[0],
          id: 'opp-draft',
          status: 'draft',
        },
        {
          ...mockOpportunities[0],
          id: 'opp-needs-confirm',
          status: 'needs_confirmation',
          deadline: null,
        },
        {
          ...mockOpportunities[0],
          id: 'opp-needs-confirm-expired',
          status: 'needs_confirmation',
          deadline: '2026-11-10T18:00:00+09:00',
        },
        {
          ...mockOpportunities[0],
          id: 'opp-needs-confirm-future',
          status: 'needs_confirmation',
          postedAt: '2026-11-20T18:00:00+09:00',
        },
        {
          ...mockOpportunities[0],
          id: 'opp-active',
          status: 'active',
          deadline: '2026-11-30T18:00:00+09:00',
        },
      ];

      const results = recommendOpportunities(student, contests, referenceDate);
      expect(results.map((result) => result.opportunityId).sort()).toEqual(['opp-active', 'opp-needs-confirm']);
    });

    it('active 상태라도 마감일(deadline)이 현재 시점 이전인 공모전은 추천에서 제외되어야 한다', () => {
      const contests: Opportunity[] = [
        {
          ...mockOpportunities[0],
          id: 'opp-expired',
          status: 'active',
          deadline: '2026-11-10T18:00:00+09:00', // 11-15 이전 (이미 마감)
        },
        {
          ...mockOpportunities[0],
          id: 'opp-valid',
          status: 'active',
          deadline: '2026-11-20T18:00:00+09:00', // 11-15 이후
        },
      ];

      const results = recommendOpportunities(student, contests, referenceDate);
      expect(results).toHaveLength(1);
      expect(results[0].opportunityId).toBe('opp-valid');
    });

    it('마감일이 null인 공고는 임의 날짜를 만들지 않고 active 상태일 때 추천 대상에 유지되어야 한다', () => {
      const contestWithNullDeadline: Opportunity = {
        ...mockOpportunities[0],
        id: 'opp-null-deadline',
        status: 'active',
        deadline: null,
      };

      const results = recommendOpportunities(student, [contestWithNullDeadline], referenceDate);
      expect(results).toHaveLength(1);
      expect(results[0].opportunityId).toBe('opp-null-deadline');
    });

    it('[오류 수정 검증] postedAt이 현재 기준 시각보다 미래인 게시 전 공고는 추천에서 제외되어야 한다', () => {
      const futurePostedContest: Opportunity = {
        ...mockOpportunities[0],
        id: 'opp-future-posted',
        status: 'active',
        postedAt: '2026-11-20T00:00:00+09:00', // referenceDate (11-15)보다 미래
        deadline: '2026-11-30T18:00:00+09:00',
      };

      const results = recommendOpportunities(student, [futurePostedContest], referenceDate);
      expect(results).toHaveLength(0);
    });

    it('게시일이 지났고 접수 시작(applicationStart)이 미래인 모집 예정 공고는 추천 대상에 포함되어야 한다 (DATA_CONTRACT 8.3절)', () => {
      const upcomingContest: Opportunity = {
        ...mockOpportunities[0],
        id: 'opp-upcoming-apply',
        status: 'active',
        postedAt: '2026-11-10T00:00:00+09:00', // 이미 게시됨
        applicationStart: '2026-11-20T09:00:00+09:00', // 접수 시작은 미래
        deadline: '2026-11-30T18:00:00+09:00',
      };

      const results = recommendOpportunities(student, [upcomingContest], referenceDate);
      expect(results).toHaveLength(1);
      expect(results[0].opportunityId).toBe('opp-upcoming-apply');
    });
  });

  // ---------------------------------------------------------------------------
  // 4. 데이터 누락 및 가중치 동적 재조정 (Weight Rescaling)
  // ---------------------------------------------------------------------------
  describe('4. 데이터 누락 및 가중치 동적 재조정', () => {
    it('기술 태그 없이 분야 태그만 존재하는 공모전의 경우 관심 분야가 100점으로 재조정되어야 한다', () => {
      const student: UserProfile = {
        ...mockUsers[0],
        interests: ['오픈소스'],
        techStacks: ['React'],
        wantedTechStacks: ['Docker'],
      };

      const contestNoTech: Opportunity = {
        id: 'opp-only-fields',
        title: '오픈소스 아이디어톤',
        description: '',
        category: '공모전',
        tags: ['오픈소스'], // 기술 태그 없음
        organizer: '학부',
        postedAt: '2026-11-01T00:00:00+09:00',
        applicationStart: null,
        deadline: '2026-11-30T18:00:00+09:00',
        sourceType: 'knu_cse_official',
        status: 'active',
        collectedAt: '2026-11-01T00:00:00+09:00',
        updatedAt: '2026-11-01T00:00:00+09:00',
      };

      const [result] = recommendOpportunities(student, [contestNoTech], referenceDate);

      // 공모전에 기술 태그가 없으므로 기술, 희망기술 평가 불가
      // 관심 분야만 100점으로 스케일링되어 100 * (1/1) = 100점
      expect(result.score).toBe(100);
      expect(result.matchedTags).toEqual(['오픈소스']);
      expect(result.reasons).toEqual(['관심 분야인 오픈소스와 일치합니다.']);
    });

    it('학생에게 관심 분야가 없는 경우 보유 기술과 학습 희망 기술의 가중치(35:15)가 100점으로 재조정되어야 한다', () => {
      const studentNoInterests: UserProfile = {
        ...mockUsers[0],
        interests: [],
        techStacks: ['React'],
        wantedTechStacks: ['Docker'],
      };

      const contest: Opportunity = {
        id: 'opp-tech-only',
        title: '웹 개발 챌린지',
        description: '',
        category: '공모전',
        tags: ['웹 개발', 'React', 'Docker'],
        organizer: '학부',
        postedAt: '2026-11-01T00:00:00+09:00',
        applicationStart: null,
        deadline: '2026-11-30T18:00:00+09:00',
        sourceType: 'knu_cse_official',
        status: 'active',
        collectedAt: '2026-11-01T00:00:00+09:00',
        updatedAt: '2026-11-01T00:00:00+09:00',
      };

      const [result] = recommendOpportunities(studentNoInterests, [contest], referenceDate);

      // 보유 기술(35) + 학습 희망(15) = 50점 -> 스케일 2배
      // 보유 기술: 70 * (1 / 2) = 35점 (공모전 기술 React, Docker 중 학생 보유 React 1개)
      // 학습 희망: 30 * (1 / 1) = 30점 (학생 희망 Docker 1개 중 공모전에 포함 1개)
      // 총점 = 35 + 30 = 65점
      expect(result.score).toBe(65);
      expect(result.matchedTags).toEqual(expect.arrayContaining(['React', 'Docker']));
    });

    it('어떤 항목도 계산할 수 없는 경우(태그 누락 등) 점수 0점과 데이터 부족 안내를 반환해야 한다', () => {
      const studentEmpty: UserProfile = {
        ...mockUsers[0],
        interests: [],
        techStacks: [],
        wantedTechStacks: [],
      };

      const contestEmpty: Opportunity = {
        id: 'opp-empty-tags',
        title: '빈 태그 공모전',
        description: '',
        category: '공모전',
        tags: [],
        organizer: '학부',
        postedAt: '2026-11-01T00:00:00+09:00',
        applicationStart: null,
        deadline: '2026-11-30T18:00:00+09:00',
        sourceType: 'knu_cse_official',
        status: 'active',
        collectedAt: '2026-11-01T00:00:00+09:00',
        updatedAt: '2026-11-01T00:00:00+09:00',
      };

      const [result] = recommendOpportunities(studentEmpty, [contestEmpty], referenceDate);

      expect(result.score).toBe(0);
      expect(result.matchedTags).toEqual([]);
      expect(result.evaluable).toBe(false);
      expect(result.reasons[0]).toContain('부족하여');
    });

    it('일치하는 정보가 전혀 없는 경우 점수 0점과 도전 안내를 반환해야 한다', () => {
      const studentSecurity: UserProfile = {
        ...mockUsers[6], // 윤보안 (정보보안, Linux 등)
        interests: ['정보보안'],
        techStacks: ['Linux'],
        wantedTechStacks: ['Go'],
      };

      const contestWeb: Opportunity = {
        id: 'opp-pure-web',
        title: '순수 웹 프론트엔드 경진대회',
        description: '',
        category: '경진대회',
        tags: ['웹 개발', 'React', 'Vue'],
        organizer: '외부',
        postedAt: '2026-11-01T00:00:00+09:00',
        applicationStart: null,
        deadline: '2026-11-30T18:00:00+09:00',
        sourceType: 'admin_manual',
        status: 'active',
        collectedAt: '2026-11-01T00:00:00+09:00',
        updatedAt: '2026-11-01T00:00:00+09:00',
      };

      const [result] = recommendOpportunities(studentSecurity, [contestWeb], referenceDate);

      expect(result.score).toBe(0);
      expect(result.matchedTags).toEqual([]);
      expect(result.reasons[0]).toContain('일치하는 태그는 없으나');
    });
  });

  // ---------------------------------------------------------------------------
  // 5. 추천 결과 정렬 및 동점자 처리
  // ---------------------------------------------------------------------------
  describe('5. 추천 결과 정렬 및 동점자 안정 정렬 (Deterministic Sort)', () => {
    it('점수 내림차순 및 동점 시 opportunityId 오름차순으로 항상 일관된 순서를 유지해야 한다', () => {
      const student: UserProfile = {
        ...mockUsers[0],
        interests: ['웹 개발'],
        techStacks: ['React'],
        wantedTechStacks: ['Node.js'],
      };

      // opp-high: 관심분야 100%, 보유기술 100%, 희망기술 100% -> 100점
      // opp-tie-a, opp-tie-b: 관심분야만 100% 일치하고 기술은 부분 일치 -> 동일 점수
      const contests: Opportunity[] = [
        {
          id: 'opp-tie-b',
          title: '동점 B',
          description: '',
          category: '해커톤',
          tags: ['웹 개발', 'Python'], // 관심분야 100%(50), 기술 0점 -> 50점
          organizer: '학부',
          postedAt: '2026-11-01T00:00:00+09:00',
          applicationStart: null,
          deadline: '2026-11-30T18:00:00+09:00',
          sourceType: 'knu_cse_official',
          status: 'active',
          collectedAt: '2026-11-01T00:00:00+09:00',
          updatedAt: '2026-11-01T00:00:00+09:00',
        },
        {
          id: 'opp-high',
          title: '높은 점수 (100점 만점)',
          description: '',
          category: '해커톤',
          tags: ['웹 개발', 'React', 'Node.js'], // 분야 50, 기술 35, 희망 15 -> 100점
          organizer: '학부',
          postedAt: '2026-11-01T00:00:00+09:00',
          applicationStart: null,
          deadline: '2026-11-30T18:00:00+09:00',
          sourceType: 'knu_cse_official',
          status: 'active',
          collectedAt: '2026-11-01T00:00:00+09:00',
          updatedAt: '2026-11-01T00:00:00+09:00',
        },
        {
          id: 'opp-tie-a',
          title: '동점 A',
          description: '',
          category: '해커톤',
          tags: ['웹 개발', 'Python'], // 관심분야 100%(50), 기술 0점 -> 50점
          organizer: '학부',
          postedAt: '2026-11-01T00:00:00+09:00',
          applicationStart: null,
          deadline: '2026-11-30T18:00:00+09:00',
          sourceType: 'knu_cse_official',
          status: 'active',
          collectedAt: '2026-11-01T00:00:00+09:00',
          updatedAt: '2026-11-01T00:00:00+09:00',
        },
      ];

      const results = recommendOpportunities(student, contests, referenceDate);

      expect(results[0].opportunityId).toBe('opp-high');
      expect(results[0].score).toBe(83);

      // opp-tie-a와 opp-tie-b는 점수가 50점으로 같으므로 id 오름차순
      expect(results[1].opportunityId).toBe('opp-tie-a');
      expect(results[2].opportunityId).toBe('opp-tie-b');
      expect(results[1].score).toBe(results[2].score);
    });
  });

  // ---------------------------------------------------------------------------
  // 6. mockData.ts 실제 데이터 연동 테스트
  // ---------------------------------------------------------------------------
  describe('6. mockData.ts 실제 데이터 연동 테스트', () => {
    it('김컴학(user-01)에게 mockOpportunities를 추천하면 올바른 결과가 도출되어야 한다', () => {
      const kim = mockUsers[0];
      const results = recommendOpportunities(kim, mockOpportunities, referenceDate);

      expect(results.map((result) => result.opportunityId)).toEqual(
        expect.arrayContaining(['opp-official-04', 'opp-admin-03']),
      );

      // 상위 추천 공고 확인:
      // 오픈소스 공모전(opp-official-02, 50점)과 React/Node.js 해커톤(opp-official-01, 45점)이 최상위에 배치
      const topOppIds = results.slice(0, 2).map((r) => r.opportunityId);
      expect(topOppIds).toContain('opp-official-01');
      expect(topOppIds).toContain('opp-official-02');

      const opp1Result = results.find((r) => r.opportunityId === 'opp-official-01');
      expect(opp1Result?.matchedTags).toContain('React');
      expect(opp1Result?.matchedTags).toContain('Node.js');
    });

    it('이알고(user-02, AI/ML)에게 AI 맞춤 공고가 주어지면 높은 적합도로 추천되어야 한다', () => {
      const lee = mockUsers[1];

      // 이알고 맞춤 공고 (active 상태)
      const aiContest: Opportunity = {
        id: 'opp-ai-active',
        title: '2026 대학생 머신러닝 챌린지',
        description: '자연어 처리 및 추천 시스템 모델링 대회',
        category: '경진대회',
        tags: ['머신러닝', '자연어 처리', 'Python', 'PyTorch', 'MLOps'],
        organizer: '학부',
        postedAt: '2026-11-01T00:00:00+09:00',
        applicationStart: null,
        deadline: '2026-11-30T18:00:00+09:00',
        sourceType: 'admin_manual',
        status: 'active',
        collectedAt: '2026-11-01T00:00:00+09:00',
        updatedAt: '2026-11-01T00:00:00+09:00',
      };

      const results = recommendOpportunities(lee, [aiContest], referenceDate);

      expect(results).toHaveLength(1);
      expect(results[0].opportunityId).toBe('opp-ai-active');
      // 머신러닝, 자연어 처리, Python, PyTorch, MLOps 모두 매칭
      // 관심분야 50*(2/2) + 기술 35*(2/3) + 희망 15*(1/3) = 50 + 23.33 + 5 = 78.33 -> 78점
      expect(results[0].score).toBe(78);
      expect(results[0].matchedTags).toEqual(
        expect.arrayContaining(['머신러닝', '자연어 처리', 'Python', 'PyTorch', 'MLOps'])
      );
    });

    it('일치 정보가 없는 경우에도 예외 없이 점수 0점과 안전한 안내를 반환해야 한다', () => {
      const lee = mockUsers[1];
      // mockOpportunities 중 active 공모전 중 이알고와 매칭되는 태그가 없는 경우 확인
      const results = recommendOpportunities(lee, mockOpportunities, referenceDate);
      expect(results.length).toBeGreaterThan(0);
      // 모든 결과가 유효한 구조를 갖추고 있는지 검증
      for (const res of results) {
        expect(res.score).toBeGreaterThanOrEqual(0);
        expect(res.score).toBeLessThanOrEqual(100);
        expect(Array.isArray(res.matchedTags)).toBe(true);
        expect(Array.isArray(res.reasons)).toBe(true);
      }
    });
  });

  // ---------------------------------------------------------------------------
  // 7. 불변성(Immutability) 및 예외 상황 테스트
  // ---------------------------------------------------------------------------
  describe('7. 불변성 및 예외 케이스', () => {
    it('입력된 userProfile과 opportunities 배열은 직접 변경되지 않아야 한다', () => {
      const studentOriginal = structuredClone(mockUsers[0]);
      const oppsOriginal = structuredClone(mockOpportunities);

      recommendOpportunities(studentOriginal, oppsOriginal, referenceDate);

      expect(studentOriginal).toEqual(mockUsers[0]);
      expect(oppsOriginal).toEqual(mockOpportunities);
    });

    it('공모전 목록이 빈 배열일 경우 빈 배열을 안전하게 반환해야 한다', () => {
      const results = recommendOpportunities(mockUsers[0], [], referenceDate);
      expect(results).toEqual([]);
    });
  });

  // ---------------------------------------------------------------------------
  // 8. 최신 합의 정책 및 명시적 마감일 안전 처리 검증 (DATA_CONTRACT 8.3절)
  // ---------------------------------------------------------------------------
  describe('8. 최신 합의 정책 및 명시적 마감일 안전 처리 검증', () => {
    const student: UserProfile = {
      ...mockUsers[0],
      interests: ['웹 개발'],
      techStacks: ['React'],
      wantedTechStacks: ['TypeScript'],
    };

    it('needs_confirmation 공고도 정상적으로 게시된 경우 추천 후보에 포함되어야 한다', () => {
      const oppNeedsConfirm: Opportunity = {
        ...mockOpportunities[0],
        id: 'opp-needs-confirm-test',
        status: 'needs_confirmation',
        deadline: null,
        tags: ['웹 개발', 'React'],
      };

      const results = recommendOpportunities(student, [oppNeedsConfirm], referenceDate);
      expect(results).toHaveLength(1);
      expect(results[0].opportunityId).toBe('opp-needs-confirm-test');
      expect(results[0].score).toBeGreaterThan(0);
      expect(results[0].evaluable).toBe(true);
    });

    it('deadline이 null인 공고는 마감일이 명시된 동일 공고와 비교하여 감점이 없어야 한다', () => {
      const oppWithDeadline: Opportunity = {
        ...mockOpportunities[0],
        id: 'opp-with-deadline',
        status: 'active',
        deadline: '2026-11-30T18:00:00+09:00',
        tags: ['웹 개발', 'React'],
      };
      const oppNullDeadline: Opportunity = {
        ...mockOpportunities[0],
        id: 'opp-null-deadline-compare',
        status: 'active',
        deadline: null,
        tags: ['웹 개발', 'React'],
      };

      const resWith = recommendOpportunities(student, [oppWithDeadline], referenceDate);
      const resNull = recommendOpportunities(student, [oppNullDeadline], referenceDate);

      expect(resWith).toHaveLength(1);
      expect(resNull).toHaveLength(1);
      expect(resNull[0].score).toBe(resWith[0].score);
    });

    it('평가 불가(evaluable: false)와 실제 0점(evaluable: true, score: 0)을 명확하게 구분해야 한다', () => {
      // 1) 평가 불가: 학생 관심/기술 데이터가 전혀 없는 경우
      const emptyStudent: UserProfile = {
        ...mockUsers[0],
        interests: [],
        techStacks: [],
        wantedTechStacks: [],
      };
      const activeOpp: Opportunity = {
        ...mockOpportunities[0],
        id: 'opp-active-eval',
        status: 'active',
        tags: ['웹 개발', 'React'],
      };
      const notEvaluable = recommendOpportunities(emptyStudent, [activeOpp], referenceDate);
      expect(notEvaluable).toHaveLength(1);
      expect(notEvaluable[0].evaluable).toBe(false);
      expect(notEvaluable[0].score).toBe(0);
      expect(notEvaluable[0].reasons[0]).toContain('평가에 필요한 데이터');

      // 2) 실제 0점: 학생과 공고 모두 태그가 있으나 일치하는 항목이 전혀 없는 경우
      const studentSecurity: UserProfile = {
        ...mockUsers[0],
        interests: ['보안'],
        techStacks: ['C++'],
        wantedTechStacks: ['Rust'],
      };
      const zeroScore = recommendOpportunities(studentSecurity, [activeOpp], referenceDate);
      expect(zeroScore).toHaveLength(1);
      expect(zeroScore[0].evaluable).toBe(true);
      expect(zeroScore[0].score).toBe(0);
      expect(zeroScore[0].matchedTags).toEqual([]);
    });

    describe('명시적 텍스트 마감일 추출 및 안전 필터링', () => {
      it('제목/본문에서 한국어 마감일 표기를 정확하게 파싱하여 KST 기준 Date를 반환해야 한다', () => {
        // 1) B의 실제 수집 공고 제목 표본 (~11월 9일 13시 마감)
        const date1 = extractExplicitDeadline(
          '[AI부트캠프사업단] 2026 네이버 클라우드∙아마존 웹서비스 동계 몰입형 교육 안내(~11월 9일 13시 마감)',
          '',
          '2026-11-05T15:00:00+00:00' // KST 2026-11-06
        );
        expect(date1).not.toBeNull();
        expect(date1!.toISOString()).toBe('2026-11-09T04:00:00.000Z'); // KST 13:00 = UTC 04:00

        // 2) 연도 명시 및 시/분 콜론 표기 (신청 마감: 2026-11-20 18:00)
        const date2 = extractExplicitDeadline(
          '공모전 참가 접수',
          '접수 마감: 2026-11-20 18:00까지 제출 바랍니다.'
        );
        expect(date2).not.toBeNull();
        expect(date2!.toISOString()).toBe('2026-11-20T09:00:00.000Z'); // KST 18:00 = UTC 09:00

        // 3) 시간 생략 시 당일 23:59:59.999 KST로 설정되어 조기 마감 오판 방지
        const date3 = extractExplicitDeadline(
          '2026 아이디어톤 (~11월 15일 마감)',
          '',
          '2026-11-01T00:00:00+09:00'
        );
        expect(date3).not.toBeNull();
        expect(date3!.toISOString()).toBe('2026-11-15T14:59:59.999Z');
      });

      it('행사일시, 교육 기간 등 비마감 일정은 마감일로 오판하지 않아야 한다', () => {
        // 교육 기간 안내
        expect(extractExplicitDeadline('2026 동계 특강 (교육 기간: 11월 10일 ~ 11월 12일)')).toBeNull();
        // 교육 기간 마감 표기 (비마감 행사 기간)
        expect(extractExplicitDeadline('2026 동계 특강 (교육 기간: ~11월 12일 마감)')).toBeNull();
        // 행사 일시 안내
        expect(extractExplicitDeadline('2026 SW인의 밤 (행사일: 2026년 11월 20일)')).toBeNull();
        // 기준일 안내
        expect(extractExplicitDeadline('[안내] 현장실습 대체 기준 변경 안내(26.11.10. 기준)')).toBeNull();
      });

      it.each([
        '2026-02-30 18:00',
        '2026-02-29',
        '2026-04-31',
        '2026-13-01',
        '2026-00-10',
        '2026-11-10 25:00',
        '2026-11-10 18:60',
      ])('유효하지 않은 마감일 %s을 거부한다', (deadline) => {
        expect(extractExplicitDeadline(`접수 마감: ${deadline}`)).toBeNull();
      });

      it('윤년 마감일을 KST 기준으로 해석하고 마감 시각이 지난 후에만 제외한다', () => {
        const title = '접수 마감: 2024-02-29 18:00';
        const deadline = new Date('2024-02-29T09:00:00.000Z');
        const opportunity = { ...mockOpportunities[0], title, deadline: null };
        expect(extractExplicitDeadline(title)).toEqual(deadline);
        expect(isExplicitlyExpiredInText(opportunity, deadline)).toBe(false);
        expect(isExplicitlyExpiredInText(opportunity, new Date(deadline.getTime() + 1))).toBe(true);
      });

      it.each([
        '접수 마감: 2026-02-30 18:00',
        '1차 접수 마감: 2026-02-20 18:00, 최종 마감: 2026-02-30 18:00',
      ])('잘못된 마감일이 있는 공고를 추천 후보에 유지한다 (%s)', (title) => {
        const opportunity: Opportunity = {
          ...mockOpportunities[0],
          title,
          status: 'needs_confirmation',
          postedAt: '2026-02-01T00:00:00+09:00',
          deadline: null,
        };
        const now = new Date('2026-03-03T00:00:00+09:00');
        const options = { filterExplicitTextDeadline: true };
        expect(extractExplicitDeadline(title)).toBeNull();
        expect(recommendOpportunities(student, [opportunity], now, options)).toHaveLength(1);
        const dbDeadline = { ...opportunity, deadline: '2026-02-20T18:00:00+09:00' };
        expect(recommendOpportunities(student, [dbDeadline], now, options)).toEqual([]);
      });

      it('복수의 마감일(예: 1차 마감, 최종 마감)이 기재된 경우 최종 마감일을 채택하여 조기 제외를 방지해야 한다', () => {
        const testNow = new Date('2026-11-17T12:00:00+09:00');
        // 1차 마감은 11월 5일(과거), 최종 마감은 11월 25일(미래)
        const date = extractExplicitDeadline(
          '2026 대학생 SW 창업경진대회 (1차 접수 마감: 11월 5일 18시, 최종 마감: 11월 25일 18:00)',
          '',
          '2026-11-01T00:00:00+09:00'
        );
        expect(date).not.toBeNull();
        expect(date!.toISOString()).toBe('2026-11-25T09:00:00.000Z');

        // 과거 1차 마감으로 인해 조기 제외되지 않고 후보로 유지되는지 검증
        const opp: Opportunity = {
          ...mockOpportunities[0],
          id: 'opp-multi-deadlines',
          title: '2026 대학생 SW 창업경진대회 (1차 접수 마감: 11월 5일 18시, 최종 마감: 11월 25일 18:00)',
          postedAt: '2026-11-01T00:00:00+09:00',
          deadline: null,
        };
        expect(isExplicitlyExpiredInText(opp, testNow)).toBe(false);
      });

      it('연도 추정이 불확실하거나 6개월 이상 벌어지는 경우 임의로 추정하지 않고 null을 반환해야 한다', () => {
        // 1) 연도 없고 postedAt도 없는 경우
        expect(extractExplicitDeadline('해커톤 접수 마감: 11월 9일 18시', '', null)).toBeNull();

        // 2) 게시일(1월)과 마감월(11월) 차이가 6개월 이상인 경우
        expect(extractExplicitDeadline('해커톤 접수 마감: 11월 9일 18시', '', '2026-01-10T00:00:00+09:00')).toBeNull();

        // 3) 비정상적인 연도 표기 (2000년 미만 또는 2100년 초과)
        expect(extractExplicitDeadline('해커톤 (~1995년 11월 9일 마감)')).toBeNull();
      });

      it('모호하거나 불확실한 자연어 표현은 마감으로 오판하지 않고 null을 반환해야 한다', () => {
        expect(extractExplicitDeadline('해커톤 참가팀 모집 (선착순 마감)')).toBeNull();
        expect(extractExplicitDeadline('스타트업 인턴십 상시 모집')).toBeNull();
        expect(extractExplicitDeadline('동아리 신입 부원 모집 (마감일: 추후 공지)')).toBeNull();
        expect(extractExplicitDeadline('인원 충원 시 마감됩니다.')).toBeNull();
      });

      it('isExplicitlyExpiredInText는 지난 마감일에만 true를 반환하고 미래/모호/미정에는 false를 반환해야 한다', () => {
        const testNow = new Date('2026-11-17T12:00:00+09:00');

        // 1) 지난 마감일 (~11월 9일 13시 마감) -> true
        const expiredOpp: Opportunity = {
          ...mockOpportunities[0],
          id: 'opp-past-deadline',
          title: '네이버 클라우드 몰입형 교육 (~11월 9일 13시 마감)',
          postedAt: '2026-11-05T15:00:00+00:00',
          deadline: null,
        };
        expect(isExplicitlyExpiredInText(expiredOpp, testNow)).toBe(true);

        // 2) 미래 마감일 (~11월 25일 18시 마감) -> false
        const futureOpp: Opportunity = {
          ...mockOpportunities[0],
          id: 'opp-future-deadline',
          title: '동계 해커톤 (~11월 25일 18시 마감)',
          postedAt: '2026-11-05T15:00:00+00:00',
          deadline: null,
        };
        expect(isExplicitlyExpiredInText(futureOpp, testNow)).toBe(false);

        // 3) 모호한 표현 (선착순 마감) -> false
        const ambiguousOpp: Opportunity = {
          ...mockOpportunities[0],
          id: 'opp-ambiguous',
          title: '선착순 마감 프로젝트',
          postedAt: '2026-11-05T15:00:00+00:00',
          deadline: null,
        };
        expect(isExplicitlyExpiredInText(ambiguousOpp, testNow)).toBe(false);

        // 4) 이미 DB deadline이 존재하는 공고 -> false (DB deadline 로직에 위임)
        const dbDeadlineOpp: Opportunity = {
          ...mockOpportunities[0],
          deadline: '2026-11-20T18:00:00+09:00',
        };
        expect(isExplicitlyExpiredInText(dbDeadlineOpp, testNow)).toBe(false);
      });

      it('filterOpportunitiesByExplicitDeadline은 명백히 지난 공고만 순수 함수로 필터링해야 한다', () => {
        const testNow = new Date('2026-11-17T12:00:00+09:00');
        const list: Opportunity[] = [
          {
            ...mockOpportunities[0],
            id: 'opp-1',
            title: '지난 공고 (~11월 9일 13시 마감)',
            postedAt: '2026-11-05T15:00:00+00:00',
            deadline: null,
          },
          {
            ...mockOpportunities[0],
            id: 'opp-2',
            title: '진행중 공고 (~11월 25일 18시 마감)',
            postedAt: '2026-11-05T15:00:00+00:00',
            deadline: null,
          },
          {
            ...mockOpportunities[0],
            id: 'opp-3',
            title: '교육 안내 (교육 기간: 11월 10일 ~ 12일)',
            postedAt: '2026-11-05T15:00:00+00:00',
            deadline: null,
          },
        ];

        const filtered = filterOpportunitiesByExplicitDeadline(list, testNow);
        expect(filtered).toHaveLength(2);
        expect(filtered.map((o) => o.id)).toEqual(['opp-2', 'opp-3']);
      });

      it('recommendOpportunities에서 filterExplicitTextDeadline=true 옵션을 활성화하면 텍스트 마감 경과 공고가 제외되어야 한다', () => {
        const testNow = new Date('2026-11-17T12:00:00+09:00');
        const expiredOpp: Opportunity = {
          ...mockOpportunities[0],
          id: 'opp-expired-in-title',
          title: '네이버 클라우드 교육 (~11월 9일 13시 마감)',
          status: 'needs_confirmation',
          postedAt: '2026-11-05T15:00:00+00:00',
          deadline: null,
          tags: ['웹 개발', 'React'],
        };
        const futureOpp: Opportunity = {
          ...mockOpportunities[0],
          id: 'opp-future-in-title',
          title: '웹 개발 해커톤 (~11월 25일 18시 마감)',
          status: 'needs_confirmation',
          postedAt: '2026-11-05T15:00:00+00:00',
          deadline: null,
          tags: ['웹 개발', 'React'],
        };

        // 기본값: filterExplicitTextDeadline이 false이므로 둘 다 후보 포함
        const resDefault = recommendOpportunities(student, [expiredOpp, futureOpp], testNow);
        expect(resDefault).toHaveLength(2);

        // 옵션 활성화: 지난 마감일 공고만 안전하게 제외
        const resFiltered = recommendOpportunities(
          student,
          [expiredOpp, futureOpp],
          testNow,
          { filterExplicitTextDeadline: true }
        );
        expect(resFiltered).toHaveLength(1);
        expect(resFiltered[0].opportunityId).toBe('opp-future-in-title');
      });
    });
  });
});
