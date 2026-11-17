/**
 * BRIDGE — 주간 시간표 최적 회의 시간 추천 알고리즘 단위 테스트 (Vitest)
 */

import { describe, it, expect } from 'vitest';
import {
  calculateOptimalMeetingSlots,
  slotToTimeString,
} from '../algorithms/scheduleOptimizer';
import { Availability, DayOfWeek } from '../types';
import { mockAvailabilities } from '../data/mockData';

describe('주간 시간표 최적 회의 시간 추천 알고리즘 (scheduleOptimizer)', () => {
  // ---------------------------------------------------------------------------
  // 1. mockData team-01 실제 데이터 검증 (섹션 9 기준)
  // ---------------------------------------------------------------------------
  describe('1. 실제 mockData team-01 4명 회의 시간 추천 검증', () => {
    it('team-01 팀원 4명(user-01, 03, 08, 09)의 최적 회의 시간이 화요일 19:00~21:00(120분)으로 추천되어야 한다', () => {
      // team-01 멤버 4명의 시간표를 mockAvailabilities에서 추출
      const team01MemberIds = ['user-01', 'user-03', 'user-08', 'user-09'];
      const teamAvailabilities: Record<string, Availability[]> = {};

      for (const mId of team01MemberIds) {
        teamAvailabilities[mId] = mockAvailabilities.filter((a) => a.userId === mId);
      }

      const results = calculateOptimalMeetingSlots(teamAvailabilities, 60);

      expect(results.length).toBeGreaterThan(0);
      const topSlot = results[0];

      // 화요일 (dayOfWeek: 2)
      expect(topSlot.dayOfWeek).toBe(2);
      // 슬롯 38 (19:00) ~ 41 (21:00)
      expect(topSlot.startSlot).toBe(38);
      expect(topSlot.endSlot).toBe(41);
      expect(slotToTimeString(topSlot.startSlot)).toBe('19:00');
      expect(slotToTimeString(topSlot.endSlot, true)).toBe('21:00');

      // 지속 시간: 120분 (4슬롯 * 30분)
      expect(topSlot.durationMinutes).toBe(120);

      // 전원 참석 검증
      expect(topSlot.attendanceRatio).toBe(1.0);
      expect(topSlot.isOptimal).toBe(true);
      expect(topSlot.availableMemberIds).toEqual(
        expect.arrayContaining(['user-01', 'user-03', 'user-08', 'user-09'])
      );
      expect(topSlot.availableMemberIds).toHaveLength(4);
      expect(topSlot.missingMemberIds).toEqual([]);
    });
  });

  // ---------------------------------------------------------------------------
  // 2. 20대 핵심 시나리오 상세 검증 (섹션 10 기준)
  // ---------------------------------------------------------------------------
  describe('2. 핵심 시나리오 검증', () => {
    // 헬퍼: 특정 요일 및 슬롯 범위의 Availability 배열 생성
    function makeSlots(
      userId: string,
      day: DayOfWeek,
      startSlot: number,
      endSlot: number,
      isAvailable = true
    ): Availability[] {
      const arr: Availability[] = [];
      for (let s = startSlot; s <= endSlot; s++) {
        arr.push({
          id: `av-${userId}-${day}-${s}`,
          userId,
          dayOfWeek: day,
          slot: s,
          isAvailable,
          updatedAt: '',
        });
      }
      return arr;
    }

    it('1) 전원 공통 시간이 120분인 경우 120분 슬롯이 정확히 반환되어야 한다', () => {
      // A와 B 둘 다 수요일(3) 20~23 (4슬롯 = 120분) 가능
      const input = {
        userA: makeSlots('userA', 3, 20, 23),
        userB: makeSlots('userB', 3, 20, 23),
      };

      const results = calculateOptimalMeetingSlots(input, 60);
      expect(results).toHaveLength(1);
      expect(results[0].durationMinutes).toBe(120);
      expect(results[0].attendanceRatio).toBe(1.0);
      expect(results[0].isOptimal).toBe(true);
    });

    it('2) 전원 공통 시간이 60분인 경우 60분 슬롯이 정확히 반환되어야 한다', () => {
      // 2슬롯 = 60분
      const input = {
        userA: makeSlots('userA', 1, 10, 11),
        userB: makeSlots('userB', 1, 10, 11),
      };

      const results = calculateOptimalMeetingSlots(input, 60);
      expect(results).toHaveLength(1);
      expect(results[0].durationMinutes).toBe(60);
      expect(results[0].attendanceRatio).toBe(1.0);
    });

    it('3) 30분(1슬롯)만 가능한 경우 기본 최소 회의 시간(60분)에 미달하여 제외되어야 한다', () => {
      // 1슬롯 = 30분
      const input = {
        userA: makeSlots('userA', 1, 10, 10),
        userB: makeSlots('userB', 1, 10, 10),
      };

      const results = calculateOptimalMeetingSlots(input, 60);
      expect(results).toHaveLength(0);
    });

    it('4) 전원 공통 시간이 없는 경우 부분 참석 대안 시간이 반환되어야 한다', () => {
      // 3명 중 전원 공통 시간은 없음
      // A와 B: 월 20~21 (1시간)
      // C: 화 20~21
      const input = {
        userA: makeSlots('userA', 1, 20, 21),
        userB: makeSlots('userB', 1, 20, 21),
        userC: makeSlots('userC', 2, 20, 21),
      };

      const results = calculateOptimalMeetingSlots(input, 60);
      expect(results.length).toBeGreaterThan(0);
      // 전원 참석이 아니므로 isOptimal은 false
      expect(results[0].isOptimal).toBe(false);
      expect(results[0].attendanceRatio).toBe(0.67); // 2/3
      expect(results[0].availableMemberIds).toEqual(['userA', 'userB']);
      expect(results[0].missingMemberIds).toEqual(['userC']);
    });

    it('5) 4명 중 3명이 참석 가능한 경우 attendanceRatio가 0.75로 반환되어야 한다', () => {
      const input = {
        userA: makeSlots('userA', 1, 20, 21),
        userB: makeSlots('userB', 1, 20, 21),
        userC: makeSlots('userC', 1, 20, 21),
        userD: makeSlots('userD', 2, 20, 21), // 다른 요일
      };

      const results = calculateOptimalMeetingSlots(input, 60);
      expect(results[0].attendanceRatio).toBe(0.75);
      expect(results[0].availableMemberIds).toEqual(['userA', 'userB', 'userC']);
      expect(results[0].missingMemberIds).toEqual(['userD']);
    });

    it('6) 4명 중 2명이 참석 가능한 경우 attendanceRatio가 0.50으로 반환되어야 한다', () => {
      const input = {
        userA: makeSlots('userA', 1, 20, 21),
        userB: makeSlots('userB', 1, 20, 21),
        userC: [],
        userD: [],
      };

      const results = calculateOptimalMeetingSlots(input, 60);
      expect(results[0].attendanceRatio).toBe(0.5);
      expect(results[0].availableMemberIds).toEqual(['userA', 'userB']);
      expect(results[0].missingMemberIds).toEqual(['userC', 'userD']);
    });

    it('7) 한 명이 시간표를 등록하지 않은 경우(빈 배열) 해당 인원은 missingMemberIds로 처리되어야 한다', () => {
      const input = {
        userA: makeSlots('userA', 1, 20, 21),
        userB: makeSlots('userB', 1, 20, 21),
        userUnregistered: [], // 시간표 미등록
      };

      const results = calculateOptimalMeetingSlots(input, 60);
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].availableMemberIds).toEqual(['userA', 'userB']);
      expect(results[0].missingMemberIds).toEqual(['userUnregistered']);
      expect(results[0].attendanceRatio).toBe(0.67);
    });

    it('8) 같은 요일의 동일 슬롯이 중복 등록된 경우 1회만 계산되어야 한다', () => {
      // userA가 slot 20, 21을 중복해서 등록
      const dupSlots = [
        ...makeSlots('userA', 1, 20, 21),
        ...makeSlots('userA', 1, 20, 21),
      ];

      const input = {
        userA: dupSlots,
        userB: makeSlots('userB', 1, 20, 21),
      };

      const results = calculateOptimalMeetingSlots(input, 60);
      expect(results).toHaveLength(1);
      expect(results[0].durationMinutes).toBe(60); // 2슬롯 = 60분
    });

    it('9) isAvailable: false인 슬롯은 활동 불가로 제외되어야 한다', () => {
      const input = {
        userA: makeSlots('userA', 1, 20, 21, true),
        userB: makeSlots('userB', 1, 20, 21, false), // false
      };

      const results = calculateOptimalMeetingSlots(input, 60);
      // B가 불가능하므로 공통 60분 시간 없음
      expect(results).toHaveLength(0);
    });

    it('10) 여러 요일에 회의가 가능한 경우 이른 요일순으로 정렬되어야 한다', () => {
      // 월요일(1) 60분, 목요일(4) 60분
      const input = {
        userA: [...makeSlots('userA', 4, 20, 21), ...makeSlots('userA', 1, 20, 21)],
        userB: [...makeSlots('userB', 4, 20, 21), ...makeSlots('userB', 1, 20, 21)],
      };

      const results = calculateOptimalMeetingSlots(input, 60);
      expect(results).toHaveLength(2);
      expect(results[0].dayOfWeek).toBe(1); // 월요일 우선
      expect(results[1].dayOfWeek).toBe(4); // 목요일
    });

    it('11) 참석 비율에 따른 우선순위가 높은 구간이 상위에 배치되어야 한다 (0.75 > 0.50)', () => {
      // 대안 구간 중:
      // 월요일: A, B, C 가능 (3/4 = 0.75)
      // 화요일: A, B 가능 (2/4 = 0.50)
      const input = {
        userA: [...makeSlots('userA', 1, 20, 21), ...makeSlots('userA', 2, 20, 21)],
        userB: [...makeSlots('userB', 1, 20, 21), ...makeSlots('userB', 2, 20, 21)],
        userC: makeSlots('userC', 1, 20, 21),
        userD: [],
      };

      const results = calculateOptimalMeetingSlots(input, 60);
      expect(results[0].attendanceRatio).toBe(0.75);
      expect(results[0].dayOfWeek).toBe(1);
    });

    it('12) 참석 비율이 같다면 연속 시간이 긴 구간(120분)이 60분 구간보다 우선 추천되어야 한다', () => {
      // 월요일 60분 (2슬롯), 화요일 120분 (4슬롯)
      const input = {
        userA: [...makeSlots('userA', 1, 20, 21), ...makeSlots('userA', 2, 20, 23)],
        userB: [...makeSlots('userB', 1, 20, 21), ...makeSlots('userB', 2, 20, 23)],
      };

      const results = calculateOptimalMeetingSlots(input, 60);
      expect(results[0].dayOfWeek).toBe(2); // 화요일
      expect(results[0].durationMinutes).toBe(120);
      expect(results[0].isOptimal).toBe(true);
      expect(results[1].dayOfWeek).toBe(1); // 월요일
      expect(results[1].durationMinutes).toBe(60);
    });

    it('13) 최소 회의 시간을 90분(3슬롯)으로 지정한 경우 60분 구간은 제외되고 90분 이상만 반환되어야 한다', () => {
      const input = {
        userA: [...makeSlots('userA', 1, 20, 21), ...makeSlots('userA', 2, 20, 22)], // 월 2슬롯(60분), 화 3슬롯(90분)
        userB: [...makeSlots('userB', 1, 20, 21), ...makeSlots('userB', 2, 20, 22)],
      };

      const results = calculateOptimalMeetingSlots(input, 90);
      expect(results).toHaveLength(1);
      expect(results[0].dayOfWeek).toBe(2);
      expect(results[0].durationMinutes).toBe(90);
    });

    it('14) 최소 회의 시간을 120분(4슬롯)으로 지정한 경우 120분 이상인 구간만 반환되어야 한다', () => {
      const input = {
        userA: makeSlots('userA', 1, 20, 23), // 4슬롯 = 120분
        userB: makeSlots('userB', 1, 20, 23),
      };

      const results = calculateOptimalMeetingSlots(input, 120);
      expect(results).toHaveLength(1);
      expect(results[0].durationMinutes).toBe(120);
    });

    it('15) 시작 슬롯 0번(00:00)부터 시작하는 시간대도 정상적으로 처리되어야 한다', () => {
      const input = {
        userA: makeSlots('userA', 0, 0, 1), // 일요일 00:00 ~ 01:00
        userB: makeSlots('userB', 0, 0, 1),
      };

      const results = calculateOptimalMeetingSlots(input, 60);
      expect(results).toHaveLength(1);
      expect(results[0].startSlot).toBe(0);
      expect(results[0].endSlot).toBe(1);
      expect(slotToTimeString(results[0].startSlot)).toBe('00:00');
      expect(slotToTimeString(results[0].endSlot, true)).toBe('01:00');
    });

    it('16) 마지막 슬롯 47번(24:00 마감)까지 정상 처리되고 다음 날과 임의로 연결되지 않아야 한다', () => {
      // 토요일(6) 46~47 (23:00~24:00) 및 일요일(0) 0~1 (00:00~01:00)
      const input = {
        userA: [...makeSlots('userA', 6, 46, 47), ...makeSlots('userA', 0, 0, 1)],
        userB: [...makeSlots('userB', 6, 46, 47), ...makeSlots('userB', 0, 0, 1)],
      };

      const results = calculateOptimalMeetingSlots(input, 60);
      // 토요일과 일요일이 별도의 독립된 60분 회의로 분리되어야 함
      expect(results).toHaveLength(2);
      const sat = results.find((r) => r.dayOfWeek === 6);
      expect(sat?.startSlot).toBe(46);
      expect(sat?.endSlot).toBe(47);
      expect(sat?.durationMinutes).toBe(60);
    });

    it('17) 팀원 목록이 비어 있는 경우 빈 배열을 안전하게 반환해야 한다', () => {
      const results = calculateOptimalMeetingSlots({});
      expect(results).toEqual([]);
    });

    it('18) 반환값의 availableMemberIds와 missingMemberIds가 정확해야 한다', () => {
      const input = {
        user1: makeSlots('user1', 1, 10, 11),
        user2: makeSlots('user2', 1, 10, 11),
        user3: makeSlots('user3', 2, 10, 11),
      };

      const results = calculateOptimalMeetingSlots(input, 60);
      expect(results[0].availableMemberIds).toEqual(['user1', 'user2']);
      expect(results[0].missingMemberIds).toEqual(['user3']);
    });

    it('19) 입력된 시간표 객체와 내부 배열은 변경되지 않아야 한다 (불변성)', () => {
      const input = {
        userA: makeSlots('userA', 1, 20, 21),
        userB: makeSlots('userB', 1, 20, 21),
      };
      const inputClone = structuredClone(input);

      calculateOptimalMeetingSlots(input, 60);
      expect(input).toEqual(inputClone);
    });

    it('20) 동일한 입력에 대해 항상 일관되고 동일한 결과가 반환되어야 한다 (결정론적 일관성)', () => {
      const input = {
        userA: makeSlots('userA', 1, 20, 21),
        userB: makeSlots('userB', 1, 20, 21),
      };

      const res1 = calculateOptimalMeetingSlots(input, 60);
      const res2 = calculateOptimalMeetingSlots(input, 60);
      expect(res1).toEqual(res2);
    });

    it('21) [오류 수정 검증] dayOfWeek가 1.5 같은 소수이거나 slot이 20.3 같은 소수일 때 런타임 오류 없이 무시되어야 한다', () => {
      const input = {
        userA: [
          ...makeSlots('userA', 1, 20, 21),
          // 소수 요일 및 소수 슬롯 (런타임 TypeError 발생 유발 케이스)
          { id: 'err-1', userId: 'userA', dayOfWeek: 1.5 as any, slot: 20, isAvailable: true, updatedAt: '' },
          { id: 'err-2', userId: 'userA', dayOfWeek: 1, slot: 20.3 as any, isAvailable: true, updatedAt: '' },
        ],
        userB: makeSlots('userB', 1, 20, 21),
      };

      // 런타임 예외 없이 정상적으로 1(월요일) 20~21 슬롯이 계산되어야 함
      expect(() => calculateOptimalMeetingSlots(input as unknown as Record<string, Availability[]>, 60)).not.toThrow();
      const results = calculateOptimalMeetingSlots(input as unknown as Record<string, Availability[]>, 60);
      expect(results).toHaveLength(1);
      expect(results[0].dayOfWeek).toBe(1);
      expect(results[0].startSlot).toBe(20);
      expect(results[0].endSlot).toBe(21);
    });
  });
});
