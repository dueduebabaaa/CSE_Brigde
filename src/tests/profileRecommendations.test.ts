/**
 * BRIDGE — 프로필-공고 맞춤 추천 연결기(profileRecommendations) 단위 테스트
 */

import { describe, it, expect } from 'vitest';
import {
  getRecommendedOpportunitiesForProfile,
  recommendOpportunitiesForProfile,
  resolveAlgorithmProfile,
} from '../algorithms/profileRecommendations';
import type { UserProfile as ServiceUserProfile, ProfileUpsert } from '../services/profileService';
import type { Opportunity, UserProfile as AlgorithmUserProfile } from '../types';

describe('프로필-공고 추천 연결기 (getRecommendedOpportunitiesForProfile)', () => {
  const referenceDate = new Date('2026-11-15T12:00:00+09:00');

  // 테스트용 표준 ServiceUserProfile 생성 헬퍼
  const createServiceProfile = (overrides: Partial<ServiceUserProfile> = {}): ServiceUserProfile => ({
    id: 'user-001',
    email: 'student@knu.ac.kr',
    name: '김경북',
    nickname: '경북러너',
    grade: '3학년',
    track: '플랫폼소프트웨어전공',
    department: '경북대학교 컴퓨터학부',
    bio: '성실한 개발자입니다.',
    long_bio: 'React와 TypeScript 기반의 웹 개발에 관심이 많습니다.',
    interests: ['웹 개발', '인공지능'],
    tech_stacks: ['React', 'TypeScript'],
    tech_proficiency: { React: '활용 가능', TypeScript: '입문' },
    wanted_tech_stacks: ['Python', 'FastAPI'],
    desired_roles: ['Frontend', 'Backend'],
    activity_types: ['공모전', '해커톤'],
    activity_goals: ['수상', '역량 향상'],
    activity_mode: '혼합',
    activity_duration: '장기 (3개월 이상)',
    availability_status: '팀 구하는 중',
    experiences: ['2025 교내 해커톤 참여'],
    github_url: 'https://github.com/knu-student',
    portfolio_url: 'https://portfolio.knu.ac.kr',
    is_public: true,
    visibility: 'public',
    created_at: '2026-11-01T09:00:00+09:00',
    updated_at: '2026-11-01T09:00:00+09:00',
    ...overrides,
  });

  // 테스트용 공고 생성 헬퍼
  const createOpportunity = (overrides: Partial<Opportunity> = {}): Opportunity => ({
    id: 'opp-001',
    title: '2026 경북대 웹 & AI 소프트웨어 경진대회',
    description: 'React와 Python, FastAPI를 활용한 최신 웹 서비스 개발 대회입니다.',
    category: '경진대회',
    tags: ['웹 개발', '인공지능', 'React', 'Python', 'FastAPI'],
    organizer: '경북대학교 컴퓨터학부',
    postedAt: '2026-11-10T09:00:00+09:00',
    applicationStart: '2026-11-10T09:00:00+09:00',
    deadline: '2026-11-30T18:00:00+09:00',
    sourceType: 'knu_cse_official',
    sourcePostId: 'notice-1234',
    sourceUrl: 'https://computer.knu.ac.kr/notice/1234',
    applicationUrl: 'https://computer.knu.ac.kr/apply/1234',
    status: 'active',
    collectedAt: '2026-11-10T09:00:00+09:00',
    updatedAt: '2026-11-10T09:00:00+09:00',
    ...overrides,
  });

  describe('1. 정상 프로필 및 결과 변환 검증', () => {
    it('ServiceUserProfile과 Opportunity 목록을 입력받아 정상적인 MatchResult[]를 산출한다', () => {
      const profile = createServiceProfile();
      const opp = createOpportunity();

      const results = getRecommendedOpportunitiesForProfile(profile, [opp], {
        currentDate: referenceDate,
      });

      expect(results).toHaveLength(1);
      const match = results[0];

      // targetId는 opp.id와 일치해야 함 (opportunityId가 아님)
      expect(match.targetId).toBe('opp-001');
      expect(typeof match.score).toBe('number');
      expect(match.score).toBeGreaterThan(0);
      expect(match.score).toBeLessThanOrEqual(100);

      // 일치 태그 및 추천 사유 확인
      expect(match.matchedTags.length).toBeGreaterThan(0);
      expect(match.reasons.length).toBeGreaterThan(0);
      expect(match.reasons.some((r) => r.includes('관심 분야'))).toBe(true);
      expect(match.reasons.some((r) => r.includes('보유 기술'))).toBe(true);
      expect(match.reasons.some((r) => r.includes('배우고 싶은'))).toBe(true);
    });

    it('별칭 함수 recommendOpportunitiesForProfile도 동일하게 동작한다', () => {
      const profile = createServiceProfile();
      const opp = createOpportunity();

      const res1 = getRecommendedOpportunitiesForProfile(profile, [opp], { currentDate: referenceDate });
      const res2 = recommendOpportunitiesForProfile(profile, [opp], { currentDate: referenceDate });

      expect(res1).toEqual(res2);
    });
  });

  describe('2. 프로필 결측 및 비정상 입력 방어', () => {
    it('프로필이 null 또는 undefined이면 빈 배열 []을 반환한다', () => {
      const opp = createOpportunity();
      expect(getRecommendedOpportunitiesForProfile(null, [opp])).toEqual([]);
      expect(getRecommendedOpportunitiesForProfile(undefined, [opp])).toEqual([]);
    });

    it('프로필이 객체가 아니거나 유효하지 않은 데이터인 경우 빈 배열 []을 반환한다', () => {
      const opp = createOpportunity();
      expect(getRecommendedOpportunitiesForProfile('invalid' as unknown as ServiceUserProfile, [opp])).toEqual([]);
      expect(getRecommendedOpportunitiesForProfile({} as unknown as ServiceUserProfile, [opp])).toEqual([]);
      expect(getRecommendedOpportunitiesForProfile({ id: 'u1' } as unknown as ServiceUserProfile, [opp])).toEqual([]);
    });

    it('학년이나 전공 트랙 값이 올바르지 않은 프로필은 예외 없이 빈 배열 []을 반환한다', () => {
      const opp = createOpportunity();
      const invalidProfile = {
        ...createServiceProfile(),
        grade: '10학년' as unknown as ServiceUserProfile['grade'],
      };
      expect(getRecommendedOpportunitiesForProfile(invalidProfile, [opp])).toEqual([]);
    });
  });

  describe('3. 공고 배열 결측 및 비정상 입력 방어', () => {
    it('공고 목록이 빈 배열 []이면 빈 배열 []을 반환한다', () => {
      const profile = createServiceProfile();
      expect(getRecommendedOpportunitiesForProfile(profile, [])).toEqual([]);
    });

    it('공고 목록이 null 또는 배열이 아니면 빈 배열 []을 반환한다', () => {
      const profile = createServiceProfile();
      expect(getRecommendedOpportunitiesForProfile(profile, null as unknown as Opportunity[])).toEqual([]);
      expect(getRecommendedOpportunitiesForProfile(profile, undefined as unknown as Opportunity[])).toEqual([]);
    });
  });

  describe('4. 중복 태그, 대소문자, 공백 및 별칭 처리', () => {
    it('대소문자나 앞뒤 공백이 다른 중복 기술 스택을 단일 정규 태그로 취급하여 정상 점수를 계산한다', () => {
      const opp = createOpportunity({
        tags: ['웹 개발', 'React'],
      });

      const profileDuplicate = createServiceProfile({
        tech_stacks: ['  React  ', 'react', 'REACT', 'React'],
        interests: ['웹 개발', '웹 개발'],
      });

      const profileSingle = createServiceProfile({
        tech_stacks: ['React'],
        interests: ['웹 개발'],
      });

      const resDuplicate = getRecommendedOpportunitiesForProfile(profileDuplicate, [opp], { currentDate: referenceDate });
      const resSingle = getRecommendedOpportunitiesForProfile(profileSingle, [opp], { currentDate: referenceDate });

      expect(resDuplicate).toHaveLength(1);
      expect(resSingle).toHaveLength(1);
      expect(resDuplicate[0].score).toBe(resSingle[0].score);
      expect(resDuplicate[0].matchedTags).toEqual(resSingle[0].matchedTags);
    });

    it('기술 별칭(react.js, spring boot, nextjs 등)을 canonical 명칭으로 일원화하여 매칭한다', () => {
      const opp = createOpportunity({
        tags: ['React', 'Spring Boot', 'Next.js'],
      });

      const profile = createServiceProfile({
        tech_stacks: ['react.js', 'Spring', 'nextjs'],
        interests: ['웹 개발'],
      });

      const results = getRecommendedOpportunitiesForProfile(profile, [opp], {
        currentDate: referenceDate,
      });

      expect(results).toHaveLength(1);
      expect(results[0].matchedTags).toContain('React');
      expect(results[0].matchedTags).toContain('Spring Boot');
      expect(results[0].matchedTags).toContain('Next.js');
    });
  });

  describe('5. 기술 숙련도(tech_proficiency) 처리 검증', () => {
    it('숙련도(입문/활용 가능/숙련/null) 차이가 추천 점수를 왜곡하거나 가중치로 작용하지 않는다', () => {
      const opp = createOpportunity({
        tags: ['React', 'TypeScript'],
      });

      const profileExpert = createServiceProfile({
        tech_stacks: ['React', 'TypeScript'],
        tech_proficiency: { React: '숙련', TypeScript: '숙련' },
      });

      const profileBeginner = createServiceProfile({
        tech_stacks: ['React', 'TypeScript'],
        tech_proficiency: { React: '입문', TypeScript: '입문' },
      });

      const profileNull = createServiceProfile({
        tech_stacks: ['React', 'TypeScript'],
        tech_proficiency: null,
      });

      const resExpert = getRecommendedOpportunitiesForProfile(profileExpert, [opp], { currentDate: referenceDate });
      const resBeginner = getRecommendedOpportunitiesForProfile(profileBeginner, [opp], { currentDate: referenceDate });
      const resNull = getRecommendedOpportunitiesForProfile(profileNull, [opp], { currentDate: referenceDate });

      expect(resExpert[0].score).toBe(resBeginner[0].score);
      expect(resExpert[0].score).toBe(resNull[0].score);
      expect(resExpert[0].reasons).toEqual(resBeginner[0].reasons);
    });
  });

  describe('6. 마감일 미정(deadline: null) 및 상태별 필터링 검증', () => {
    it('마감일이 null인 active 공고는 추천에서 제외되지 않으며 감점 없이 추천된다', () => {
      const oppWithDeadline = createOpportunity({
        id: 'opp-with-deadline',
        deadline: '2026-11-30T18:00:00+09:00',
      });
      const oppNullDeadline = createOpportunity({
        id: 'opp-null-deadline',
        deadline: null,
      });

      const profile = createServiceProfile();

      const results = getRecommendedOpportunitiesForProfile(profile, [oppWithDeadline, oppNullDeadline], {
        currentDate: referenceDate,
      });

      expect(results).toHaveLength(2);
      const resWith = results.find((r) => r.targetId === 'opp-with-deadline');
      const resNull = results.find((r) => r.targetId === 'opp-null-deadline');

      expect(resWith).toBeDefined();
      expect(resNull).toBeDefined();
      // 동일한 태그 조건에서 마감일 유무만으로 점수가 차이 나서는 안 됨
      expect(resNull!.score).toBe(resWith!.score);
    });

    it('게시된 needs_confirmation 공고를 마감일이 없어도 후보에 포함한다', () => {
      const oppNeedsConfirm = createOpportunity({
        id: 'opp-needs-confirm',
        status: 'needs_confirmation',
        deadline: null,
      });

      const profile = createServiceProfile();
      const results = getRecommendedOpportunitiesForProfile(profile, [oppNeedsConfirm], {
        currentDate: referenceDate,
      });

      expect(results).toHaveLength(1);
      expect(results[0].targetId).toBe(oppNeedsConfirm.id);
      expect(oppNeedsConfirm.status).toBe('needs_confirmation');
    });

    it('closed, draft 공고는 추천 대상에서 제외된다', () => {
      const oppClosed = createOpportunity({ id: 'opp-closed', status: 'closed' });
      const oppDraft = createOpportunity({ id: 'opp-draft', status: 'draft' });

      const profile = createServiceProfile();
      const results = getRecommendedOpportunitiesForProfile(profile, [oppClosed, oppDraft], {
        currentDate: referenceDate,
      });

      expect(results).toHaveLength(0);
    });

    it('게시일(postedAt)이 미래인 공고 및 마감일(deadline)이 지난 공고는 제외된다', () => {
      const oppFuturePosted = createOpportunity({
        id: 'opp-future',
        postedAt: '2026-11-20T00:00:00+09:00', // 기준 시각(11-15)보다 미래
      });
      const oppExpired = createOpportunity({
        id: 'opp-expired',
        deadline: '2026-11-10T18:00:00+09:00', // 기준 시각(11-15)보다 과거
      });

      const profile = createServiceProfile();
      const results = getRecommendedOpportunitiesForProfile(profile, [oppFuturePosted, oppExpired], {
        currentDate: referenceDate,
      });

      expect(results).toHaveLength(0);
    });

    it('게시 완료 상태이고 접수 시작일(applicationStart)이 미래인 공고는 모집 예정으로 추천 허용된다', () => {
      const oppUpcoming = createOpportunity({
        id: 'opp-upcoming',
        postedAt: '2026-11-10T09:00:00+09:00',
        applicationStart: '2026-11-20T09:00:00+09:00', // 미래 접수 시작
        deadline: '2026-11-30T18:00:00+09:00',
        status: 'active',
      });

      const profile = createServiceProfile();
      const results = getRecommendedOpportunitiesForProfile(profile, [oppUpcoming], {
        currentDate: referenceDate,
      });

      expect(results).toHaveLength(1);
      expect(results[0].targetId).toBe('opp-upcoming');
    });
  });

  describe('7. 정렬 및 다수 공고 추천 순서 검증', () => {
    it('추천 결과는 적합도 점수 내림차순으로 정렬되며 동점 시 targetId 오름차순으로 정렬된다', () => {
      const profile = createServiceProfile({
        interests: ['웹 개발'],
        tech_stacks: ['React'],
        wanted_tech_stacks: [],
      });

      // 공고 1: 관심 분야 + 기술 모두 일치 (높은 점수)
      const oppHigh = createOpportunity({
        id: 'opp-high',
        tags: ['웹 개발', 'React'],
      });

      // 공고 2: 관심 분야만 일치 (중간 점수)
      const oppMed = createOpportunity({
        id: 'opp-med',
        tags: ['웹 개발', 'Java'],
      });

      // 공고 3: 일치 항목 없음 (0점)
      const oppLow = createOpportunity({
        id: 'opp-low',
        tags: ['임베디드 및 IoT', 'C'],
      });

      // 공고 4: oppHigh와 동일 점수이나 targetId가 알파벳순으로 앞섬
      const oppHighAlpha = createOpportunity({
        id: 'opp-ahead',
        tags: ['웹 개발', 'React'],
      });

      const results = getRecommendedOpportunitiesForProfile(
        profile,
        [oppLow, oppMed, oppHigh, oppHighAlpha],
        { currentDate: referenceDate }
      );

      expect(results).toHaveLength(4);
      expect(results[0].targetId).toBe('opp-ahead');
      expect(results[1].targetId).toBe('opp-high');
      expect(results[2].targetId).toBe('opp-med');
      expect(results[3].targetId).toBe('opp-low');

      expect(results[0].score).toBe(results[1].score);
      expect(results[1].score).toBeGreaterThan(results[2].score);
      expect(results[2].score).toBeGreaterThan(results[3].score);
    });
  });

  describe('8. 본문 태그 자동 추출(augmentTagsFromContent) 옵션 검증', () => {
    it('augmentTagsFromContent가 true일 때 본문 및 제목에 등장하는 기술 키워드를 추출하여 추천에 반영한다', () => {
      const profile = createServiceProfile({
        interests: ['웹 개발'],
        tech_stacks: ['Next.js', 'PostgreSQL'],
        wanted_tech_stacks: [],
      });

      // tags에는 불일치하는 일반 태그만 있고, 본문에 사용자의 보유 기술 키워드가 있는 공고
      const opp = createOpportunity({
        id: 'opp-content-tags',
        title: '신규 서비스 개발 경진대회',
        description: '본 대회는 Next.js와 PostgreSQL을 활용하여 풀스택 애플리케이션을 제작하는 대회입니다.',
        tags: ['게임 개발', '마케팅'],
      });

      const resWithAugment = getRecommendedOpportunitiesForProfile(profile, [opp], {
        currentDate: referenceDate,
        augmentTagsFromContent: true,
      });

      const resWithoutAugment = getRecommendedOpportunitiesForProfile(profile, [opp], {
        currentDate: referenceDate,
        augmentTagsFromContent: false,
      });

      expect(resWithAugment).toHaveLength(1);
      expect(resWithoutAugment).toHaveLength(1);

      // 본문에서 Next.js, PostgreSQL을 추출한 쪽의 점수가 더 높아야 함
      expect(resWithAugment[0].score).toBeGreaterThan(resWithoutAugment[0].score);
      expect(resWithoutAugment[0].score).toBe(0);
      expect(resWithAugment[0].matchedTags).toContain('Next.js');
      expect(resWithoutAugment[0].matchedTags).not.toContain('Next.js');
    });
  });

  describe('9. 불변성 및 개인정보 보호 검증', () => {
    it('입력받은 프로필 객체, 공고 배열 및 개별 공고 항목을 절대 변경(mutate)하지 않는다', () => {
      const profile = createServiceProfile();
      const opp = createOpportunity();

      const profileSnapshot = JSON.parse(JSON.stringify(profile));
      const oppSnapshot = JSON.parse(JSON.stringify(opp));
      const oppList = [opp];

      getRecommendedOpportunitiesForProfile(profile, oppList, { currentDate: referenceDate });

      // 원본 객체 깊은 동등성 확인
      expect(profile).toEqual(profileSnapshot);
      expect(opp).toEqual(oppSnapshot);
      expect(oppList).toHaveLength(1);
      expect(oppList[0]).toBe(opp);
    });

    it('추천 결과(MatchResult)에 학생의 이메일 등 개인정보가 포함되지 않는다', () => {
      const profile = createServiceProfile({ email: 'super-confidential@knu.ac.kr' });
      const opp = createOpportunity();

      const results = getRecommendedOpportunitiesForProfile(profile, [opp], { currentDate: referenceDate });

      const serialized = JSON.stringify(results);
      expect(serialized).not.toContain('super-confidential@knu.ac.kr');
      expect(serialized).not.toContain('@knu.ac.kr');
      expect(serialized).not.toContain('user-001');
    });
  });

  describe('10. 다양한 프로필 타입(ProfileUpsert, AlgorithmUserProfile) 호환성 검증', () => {
    it('ProfileUpsert 형태(created_at 누락 가능성)도 오류 없이 AlgorithmUserProfile로 변환하여 추천한다', () => {
      const profileUpsert: ProfileUpsert = {
        id: 'upsert-user',
        email: 'upsert@knu.ac.kr',
        name: '업서트학생',
        nickname: '업서터',
        grade: '2학년',
        track: '인공지능컴퓨팅전공',
        department: '경북대학교 컴퓨터학부',
        bio: 'AI 연구자',
        long_bio: '머신러닝과 딥러닝',
        interests: ['인공지능'],
        tech_stacks: ['Python', 'PyTorch'],
        tech_proficiency: { Python: '숙련', PyTorch: '활용 가능' },
        wanted_tech_stacks: [],
        desired_roles: ['AI/ML'],
        activity_types: ['공모전'],
        activity_goals: ['수상'],
        activity_mode: '대면',
        activity_duration: '장기 (3개월 이상)',
        availability_status: '제안 환영',
        github_url: 'https://github.com/ai-student',
        portfolio_url: null,
        visibility: 'public',
        is_public: true,
        updated_at: '2026-11-12T00:00:00+09:00',
      };

      const opp = createOpportunity({
        title: '2026 인공지능 딥러닝 챌린지',
        description: 'Python과 PyTorch를 활용한 딥러닝 모델 개발 대회입니다.',
        tags: ['인공지능', 'Python', 'PyTorch'],
      });

      const results = getRecommendedOpportunitiesForProfile(profileUpsert, [opp], {
        currentDate: referenceDate,
      });

      expect(results).toHaveLength(1);
      expect(results[0].targetId).toBe('opp-001');
      expect(results[0].score).toBe(100);
    });

    it('이미 camelCase 형태인 AlgorithmUserProfile 객체도 직접 전달받아 추천할 수 있다', () => {
      const algorithmProfile: AlgorithmUserProfile = {
        id: 'algo-user',
        email: 'algo@knu.ac.kr',
        name: '알고리즘학생',
        nickname: '알고',
        grade: '4학년',
        track: '글로벌소프트웨어융합전공',
        bio: '글로벌 개발자',
        interests: ['클라우드'],
        techStacks: ['Docker', 'Kubernetes'],
        wantedTechStacks: [],
        desiredRoles: ['DevOps'],
        experiences: [],
        isPublic: true,
        createdAt: '2026-11-01T00:00:00+09:00',
        updatedAt: '2026-11-01T00:00:00+09:00',
      };

      const opp = createOpportunity({
        title: '클라우드 인프라 오케스트레이션 대회',
        description: 'Docker와 Kubernetes 기반의 인프라 구축 경진대회입니다.',
        tags: ['클라우드', 'Docker', 'Kubernetes'],
      });

      const results = getRecommendedOpportunitiesForProfile(algorithmProfile, [opp], {
        currentDate: referenceDate,
      });

      expect(results).toHaveLength(1);
      expect(results[0].score).toBe(100);
      expect(results[0].matchedTags).toContain('Docker');
    });

    it('resolveAlgorithmProfile 헬퍼 함수가 정상 및 비정상 입력을 올바르게 처리한다', () => {
      expect(resolveAlgorithmProfile(null)).toBeNull();
      expect(resolveAlgorithmProfile(undefined)).toBeNull();
      expect(resolveAlgorithmProfile({} as unknown as ServiceUserProfile)).toBeNull();

      const profile = createServiceProfile();
      const resolved = resolveAlgorithmProfile(profile);
      expect(resolved).not.toBeNull();
      expect(resolved?.id).toBe('user-001');
      expect(resolved?.techStacks).toEqual(['React', 'TypeScript']);
    });
  });
});
