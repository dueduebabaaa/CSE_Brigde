/**
 * BRIDGE — 팀원 매칭 적합도 계산 알고리즘 단위 테스트 (Vitest)
 */

import { describe, it, expect } from 'vitest';
import { calculateMemberMatch } from '../algorithms/memberMatching';
import { UserProfile, Availability } from '../types';
import { mockUsers, mockAvailabilities } from '../data/mockData';

describe('팀원 매칭 적합도 계산 알고리즘 (calculateMemberMatch)', () => {
  // ---------------------------------------------------------------------------
  // 1. 확정된 테스트 사례 A 검증
  // ---------------------------------------------------------------------------
  describe('1. 테스트 사례 A 검증 (기준: user-01, 후보: user-03)', () => {
    it('Backend Developer 모집 시 user-03(박데이터)의 매칭 점수가 정확히 88점으로 계산되어야 한다', () => {
      // 모집 조건
      const targetRequirements = {
        desiredRoles: ['Backend Developer'],
        requiredTechStacks: ['Java', 'Spring Boot', 'PostgreSQL'],
      };

      // user-01 (김컴학)의 시간표: 화요일(2) slot 36~41
      const myAvailability = mockAvailabilities.filter((a) => a.userId === 'user-01');

      // user-03 (박데이터) 후보 정보:
      // desiredRoles: ['Backend Developer', 'DBA']
      // techStacks: ['Java', 'Spring Boot', 'PostgreSQL', 'Redis', 'Docker']
      // availability: 화요일(2) slot 38~41 (4슬롯 = 2시간 공통)
      const user03Profile = mockUsers.find((u) => u.id === 'user-03')!;
      const user03Availability = mockAvailabilities.filter((a) => a.userId === 'user-03');

      const candidates = [
        {
          profile: user03Profile,
          availability: user03Availability,
        },
      ];

      const results = calculateMemberMatch(targetRequirements, myAvailability, candidates);

      expect(results).toHaveLength(1);
      const match = results[0];

      expect(match.userId).toBe('user-03');
      expect(match.roleMatch).toBe(true);

      // 점수 계산 상세 검증:
      // - 역할 일치: 45점
      // - 기술 일치: 30 * (3 / 3) = 30점
      // - 공통 시간: 화요일 19:00~21:00 (slot 38, 39, 40, 41 = 4슬롯 = 2시간)
      // - 시간 점수: 25 * (2 / 4) = 12.5점
      // - 총점: 45 + 30 + 12.5 = 87.5점 -> 반올림 88점
      expect(match.score).toBe(88);
      expect(match.commonAvailableHoursWeekly).toBe(2);

      // 일치 기술 목록
      expect(match.matchedTechStacks).toEqual(
        expect.arrayContaining(['Java', 'Spring Boot', 'PostgreSQL'])
      );
      expect(match.matchedTechStacks).toHaveLength(3);

      // 추천 이유 검증
      expect(match.reasons).toEqual(
        expect.arrayContaining([
          expect.stringContaining('Backend Developer'),
          expect.stringContaining('Java, Spring Boot, PostgreSQL'),
          expect.stringContaining('2시간'),
        ])
      );
    });
  });

  // ---------------------------------------------------------------------------
  // 2. 점수 산출 및 가중치 세부 검증 (13개 추가 테스트)
  // ---------------------------------------------------------------------------
  describe('2. 세부 평가 항목별 검증', () => {
    const dummyAvailability: Availability[] = [
      { id: 'av-1', userId: 'user-lead', dayOfWeek: 1, slot: 20, isAvailable: true, updatedAt: '' },
      { id: 'av-2', userId: 'user-lead', dayOfWeek: 1, slot: 21, isAvailable: true, updatedAt: '' },
    ];

    it('1) 역할이 일치하지 않는 경우 역할 점수는 0점이고 roleMatch는 false여야 한다', () => {
      const target = {
        desiredRoles: ['Frontend Developer'],
        requiredTechStacks: ['Java'],
      };

      const candidateProfile: UserProfile = {
        ...mockUsers[0],
        id: 'candidate-backend-only',
        desiredRoles: ['Backend Developer'], // 불일치
        techStacks: ['Java'],
        isPublic: true,
      };

      const results = calculateMemberMatch(target, dummyAvailability, [
        { profile: candidateProfile, availability: dummyAvailability },
      ]);

      expect(results[0].roleMatch).toBe(false);
      // 역할 0점 + 기술 30점 + 시간 1시간(6.25점) = 36.25 -> 36점
      expect(results[0].score).toBe(36);
    });

    it('2) 기술이 3개 중 2개만 일치하는 경우 20점으로 계산되어야 한다', () => {
      const target = {
        desiredRoles: ['Frontend Developer'],
        requiredTechStacks: ['React', 'TypeScript', 'TailwindCSS'],
      };

      const candidateProfile: UserProfile = {
        ...mockUsers[0],
        id: 'candidate-partial-tech',
        desiredRoles: ['Frontend Developer'],
        techStacks: ['React', 'TypeScript'], // 2개 일치 (TailwindCSS 누락)
        isPublic: true,
      };

      const results = calculateMemberMatch(target, dummyAvailability, [
        { profile: candidateProfile, availability: dummyAvailability },
      ]);

      // 역할: 45점
      // 기술: 30 * (2 / 3) = 20점
      // 시간: 2슬롯(1시간) = 25 * (1 / 4) = 6.25점
      // 총점: 45 + 20 + 6.25 = 71.25 -> 71점
      expect(results[0].score).toBe(71);
      expect(results[0].matchedTechStacks).toEqual(['React', 'TypeScript']);
    });

    it('3) 기술이 전혀 일치하지 않는 경우 기술 점수는 0점이어야 한다', () => {
      const target = {
        desiredRoles: ['Frontend Developer'],
        requiredTechStacks: ['React', 'TypeScript'],
      };

      const candidateProfile: UserProfile = {
        ...mockUsers[0],
        id: 'candidate-no-tech',
        desiredRoles: ['Frontend Developer'],
        techStacks: ['Python', 'Django'], // 전혀 불일치
        isPublic: true,
      };

      const results = calculateMemberMatch(target, dummyAvailability, [
        { profile: candidateProfile, availability: dummyAvailability },
      ]);

      // 역할: 45점 + 기술 0점 + 시간(1시간): 6.25점 = 51.25 -> 51점
      expect(results[0].score).toBe(51);
      expect(results[0].matchedTechStacks).toEqual([]);
    });

    it('4) 시간표는 등록되었으나 공통 시간이 0시간인 경우 시간 점수는 0점이고 안내가 표시되어야 한다', () => {
      const target = {
        desiredRoles: ['Frontend Developer'],
        requiredTechStacks: ['React'],
      };

      const mySchedule: Availability[] = [
        { id: 'av-my', userId: 'lead', dayOfWeek: 1, slot: 20, isAvailable: true, updatedAt: '' },
      ];

      const candidateSchedule: Availability[] = [
        { id: 'av-cand', userId: 'cand', dayOfWeek: 2, slot: 20, isAvailable: true, updatedAt: '' }, // 다른 요일
      ];

      const candidateProfile: UserProfile = {
        ...mockUsers[0],
        id: 'cand-no-common-time',
        desiredRoles: ['Frontend Developer'],
        techStacks: ['React'],
        isPublic: true,
      };

      const results = calculateMemberMatch(target, mySchedule, [
        { profile: candidateProfile, availability: candidateSchedule },
      ]);

      expect(results[0].commonAvailableHoursWeekly).toBe(0);
      // 역할 45 + 기술 30 + 시간 0 = 75점
      expect(results[0].score).toBe(75);
      expect(results[0].reasons).toContain('공통 활동 가능 시간이 없습니다.');
    });

    it('5) 공통 시간이 주 4시간 이상(예: 5시간)인 경우 시간 점수는 25점 만점으로 제한되어야 한다', () => {
      const target = {
        desiredRoles: ['Frontend Developer'],
        requiredTechStacks: ['React'],
      };

      // 10슬롯 = 5시간 공통
      const tenSlots: Availability[] = Array.from({ length: 10 }, (_, i) => ({
        id: `av-${i}`,
        userId: 'any',
        dayOfWeek: 1 as const,
        slot: 20 + i,
        isAvailable: true,
        updatedAt: '',
      }));

      const candidateProfile: UserProfile = {
        ...mockUsers[0],
        id: 'cand-many-hours',
        desiredRoles: ['Frontend Developer'],
        techStacks: ['React'],
        isPublic: true,
      };

      const results = calculateMemberMatch(target, tenSlots, [
        { profile: candidateProfile, availability: tenSlots },
      ]);

      expect(results[0].commonAvailableHoursWeekly).toBe(5);
      // 역할 45 + 기술 30 + 시간(4시간 상한 25점) = 100점 만점
      expect(results[0].score).toBe(100);
      expect(results[0].reasons).toContain('매주 5시간의 공통 활동 가능 시간이 있습니다.');
    });

    it('6) profile.isPublic === false인 비공개 학생은 결과에서 완전히 제외되어야 한다', () => {
      const target = {
        desiredRoles: ['Backend Developer'],
        requiredTechStacks: ['Java'],
      };

      const publicUser = {
        profile: { ...mockUsers[0], id: 'user-pub', isPublic: true },
        availability: dummyAvailability,
      };
      const privateUser = {
        profile: { ...mockUsers[0], id: 'user-priv', isPublic: false },
        availability: dummyAvailability,
      };

      const results = calculateMemberMatch(target, dummyAvailability, [publicUser, privateUser]);

      expect(results).toHaveLength(1);
      expect(results[0].userId).toBe('user-pub');
    });

    it('7) 요구 기술이 비어 있는 경우 기술 평가가 제외되고 역할과 시간(45:25)이 100점으로 재조정되어야 한다', () => {
      const targetNoTech = {
        desiredRoles: ['Frontend Developer'],
        requiredTechStacks: [], // 기술 요구사항 없음
      };

      // 8슬롯 = 4시간 공통 (시간 만점)
      const fourHourSlots: Availability[] = Array.from({ length: 8 }, (_, i) => ({
        id: `av-${i}`,
        userId: 'lead',
        dayOfWeek: 1 as const,
        slot: 20 + i,
        isAvailable: true,
        updatedAt: '',
      }));

      const candidateProfile: UserProfile = {
        ...mockUsers[0],
        id: 'cand-role-only',
        desiredRoles: ['Frontend Developer'],
        techStacks: [],
        isPublic: true,
      };

      const results = calculateMemberMatch(targetNoTech, fourHourSlots, [
        { profile: candidateProfile, availability: fourHourSlots },
      ]);

      // 가중치 재조정: 역할(45) + 시간(25) = 70점 만점 -> 100점 스케일링
      // 역할: 45 * 100 / 70 = 64.29
      // 시간: 25 * 100 / 70 = 35.71
      // 총점 = 100점
      expect(results[0].score).toBe(100);
      expect(results[0].matchedTechStacks).toEqual([]);
    });

    it('8) 시간표가 미등록된 경우 시간 점수 평가가 제외되고 "확인 필요" 안내가 표시되어야 한다', () => {
      const target = {
        desiredRoles: ['Frontend Developer'],
        requiredTechStacks: ['React'],
      };

      const candidateProfile: UserProfile = {
        ...mockUsers[0],
        id: 'cand-no-schedule',
        desiredRoles: ['Frontend Developer'],
        techStacks: ['React'],
        isPublic: true,
      };

      // 팀장은 시간표가 있으나 후보 학생의 시간표가 빈 배열
      const results = calculateMemberMatch(target, dummyAvailability, [
        { profile: candidateProfile, availability: [] },
      ]);

      // 시간 평가 제외: 역할(45) + 기술(30) = 75점 -> 스케일 100 / 75
      // 역할 만점: 45 * 100 / 75 = 60점
      // 기술 만점: 30 * 100 / 75 = 40점
      // 총점 = 100점
      expect(results[0].score).toBe(100);
      expect(results[0].commonAvailableHoursWeekly).toBe(0);
      expect(results[0].reasons).toContain('활동 가능 시간 확인이 필요합니다.');
    });

    it('9) 동일한 시간 슬롯이 중복 등록되어 있어도 1회만 계산되어야 한다', () => {
      const target = {
        desiredRoles: ['Backend Developer'],
        requiredTechStacks: ['Java'],
      };

      // slot 20이 3번 중복 등록된 경우
      const duplicateSlots: Availability[] = [
        { id: 'dup-1', userId: 'lead', dayOfWeek: 1, slot: 20, isAvailable: true, updatedAt: '' },
        { id: 'dup-2', userId: 'lead', dayOfWeek: 1, slot: 20, isAvailable: true, updatedAt: '' },
        { id: 'dup-3', userId: 'lead', dayOfWeek: 1, slot: 20, isAvailable: true, updatedAt: '' },
      ];

      const candidateProfile: UserProfile = {
        ...mockUsers[0],
        id: 'cand-dup-time',
        desiredRoles: ['Backend Developer'],
        techStacks: ['Java'],
        isPublic: true,
      };

      const results = calculateMemberMatch(target, duplicateSlots, [
        { profile: candidateProfile, availability: duplicateSlots },
      ]);

      // 1개 슬롯만 인정 = 0.5시간
      expect(results[0].commonAvailableHoursWeekly).toBe(0.5);
    });

    it('10) 역할명(백엔드 <-> Backend Developer) 및 기술명(springboot <-> Spring Boot) 표기 차이가 정규화되어 일치해야 한다', () => {
      const target = {
        desiredRoles: ['백엔드 개발자'],
        requiredTechStacks: ['springboot'],
      };

      const candidateProfile: UserProfile = {
        ...mockUsers[0],
        id: 'cand-synonym',
        desiredRoles: ['Backend Developer'], // 동의어 정규화
        techStacks: ['Spring Boot'],         // 동의어 정규화
        isPublic: true,
      };

      const results = calculateMemberMatch(target, dummyAvailability, [
        { profile: candidateProfile, availability: dummyAvailability },
      ]);

      expect(results[0].roleMatch).toBe(true);
      expect(results[0].matchedTechStacks).toContain('Spring Boot');
    });

    it('11) 입력된 후보 배열과 프로필, 시간표 원본은 변경되지 않아야 한다 (불변성)', () => {
      const target = {
        desiredRoles: ['Frontend Developer'],
        requiredTechStacks: ['React'],
      };

      const originalTarget = structuredClone(target);
      const originalAvail = structuredClone(dummyAvailability);
      const originalCandidates = [
        {
          profile: structuredClone(mockUsers[0]),
          availability: structuredClone(dummyAvailability),
        },
      ];

      calculateMemberMatch(target, dummyAvailability, originalCandidates);

      expect(target).toEqual(originalTarget);
      expect(dummyAvailability).toEqual(originalAvail);
      expect(originalCandidates[0].profile).toEqual(mockUsers[0]);
    });

    it('12) 총점이 낮아도 역할 일치 후보(roleMatch: true)가 역할 불일치 후보보다 우선 정렬되어야 한다', () => {
      const target = {
        desiredRoles: ['Frontend Developer'],
        requiredTechStacks: ['React', 'TypeScript', 'Next.js'],
      };

      // 4시간 공통 슬롯
      const fourHourSlots: Availability[] = Array.from({ length: 8 }, (_, i) => ({
        id: `av-${i}`,
        userId: 'any',
        dayOfWeek: 1 as const,
        slot: 20 + i,
        isAvailable: true,
        updatedAt: '',
      }));

      // 후보 A: 역할 일치(45), 기술 없음(0), 시간 없음(0) = 총점 45점, roleMatch: true
      const candidateA = {
        profile: {
          ...mockUsers[0],
          id: 'user-role-matched-low-score',
          desiredRoles: ['Frontend Developer'],
          techStacks: [],
          isPublic: true,
        },
        availability: [],
      };

      // 후보 B: 역할 불일치(0), 기술 만점(30), 시간 만점(25) = 총점 55점, roleMatch: false
      const candidateB = {
        profile: {
          ...mockUsers[0],
          id: 'user-role-unmatched-high-score',
          desiredRoles: ['Backend Developer'],
          techStacks: ['React', 'TypeScript', 'Next.js'],
          isPublic: true,
        },
        availability: fourHourSlots,
      };

      const results = calculateMemberMatch(target, fourHourSlots, [candidateB, candidateA]);

      // 역할 일치 학생인 candidateA가 점수(45점)가 낮더라도 candidateB(55점)보다 앞에 배치되어야 함
      expect(results[0].userId).toBe('user-role-matched-low-score');
      expect(results[0].roleMatch).toBe(true);

      expect(results[1].userId).toBe('user-role-unmatched-high-score');
      expect(results[1].roleMatch).toBe(false);
    });

    it('13) 후보 목록이 비어 있거나 유효한 공개 후보가 없으면 빈 배열을 안전하게 반환해야 한다', () => {
      const target = {
        desiredRoles: ['Frontend Developer'],
        requiredTechStacks: ['React'],
      };

      const emptyResults = calculateMemberMatch(target, dummyAvailability, []);
      expect(emptyResults).toEqual([]);
    });
  });
});
