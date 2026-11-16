/**
 * BRIDGE — 공모전 맞춤 추천 알고리즘 단위 테스트 (Vitest)
 */

import { describe, it, expect } from 'vitest';
import { recommendOpportunities } from '../algorithms/opportunityRecommendation';
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

    it('closed, draft, needs_confirmation 상태의 공모전은 추천에서 제외되어야 한다', () => {
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
        },
        {
          ...mockOpportunities[0],
          id: 'opp-active',
          status: 'active',
          deadline: '2026-11-30T18:00:00+09:00',
        },
      ];

      const results = recommendOpportunities(student, contests, referenceDate);
      expect(results).toHaveLength(1);
      expect(results[0].opportunityId).toBe('opp-active');
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

      // 전체 10개 중 active이며 deadline이 유효한 공고만 반환되어야 함
      // opp-official-04, opp-admin-03는 needs_confirmation이므로 제외
      expect(results.length).toBeGreaterThan(0);
      for (const res of results) {
        expect(res.opportunityId).not.toBe('opp-official-04');
        expect(res.opportunityId).not.toBe('opp-admin-03');
      }

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
});
