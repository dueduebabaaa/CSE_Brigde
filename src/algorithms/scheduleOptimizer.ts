/**
 * BRIDGE — 주간 시간표 최적 회의 시간 추천 알고리즘 (Schedule Optimizer)
 *
 * 여러 팀원의 30분 단위 주간 활동 가능 시간표를 비교하여
 * 1. 팀원 전원이 참석 가능한 연속된 최적 회의 시간대(1순위)
 * 2. 전원 참석이 불가능할 경우 최대 인원이 참석 가능한 대안 시간대(2순위)
 * 를 도출합니다.
 */

import { DayOfWeek, Availability } from '../types';

/**
 * 추천 회의 시간 구간 인터페이스 (API_CONTRACT.md 3-4 준수)
 */
export interface RecommendedSlot {
  dayOfWeek: DayOfWeek;             // 요일 (0: 일요일 ~ 6: 토요일)
  startSlot: number;                 // 시작 슬롯 번호 (0 ~ 47)
  endSlot: number;                   // 종료 슬롯 번호 (0 ~ 47, 양 끝 포함)
  durationMinutes: number;           // 연속 회의 시간 (분 단위, 예: 60, 120)
  attendanceRatio: number;           // 참석률 (0.0 ~ 1.0, 예: 1.0 = 전원 참석)
  availableMemberIds: string[];      // 해당 구간 전체에 참석 가능한 팀원 ID 목록
  missingMemberIds: string[];        // 해당 구간에 참석 불가능한 팀원 ID 목록
  isOptimal: boolean;                // 전원 참석 최적 슬롯 여부
}

/**
 * 슬롯 번호(0~47)를 "HH:mm" 형태의 시간 문자열로 변환하는 유틸리티
 * 예: slot 0 -> "00:00", slot 18 -> "09:00", slot 38 -> "19:00", slot 41 -> "21:00" (종료 시)
 */
export function slotToTimeString(slot: number, isEndTime = false): string {
  const effectiveSlot = isEndTime ? slot + 1 : slot;
  const totalMinutes = effectiveSlot * 30;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(hours)}:${pad(minutes)}`;
}

/**
 * 한 팀원의 시간표에서 요일별(0~6) 유효 슬롯(0~47) 불리언 테이블을 구축합니다.
 * - isAvailable: true인 슬롯만 인정
 * - 0~6 요일 및 0~47 슬롯 범위를 벗어난 데이터는 필터링
 * - 중복 슬롯 자동 정규화
 */
function buildMemberSlotGrid(availabilities: Availability[] | undefined): boolean[][] {
  // 7개 요일 x 48개 슬롯 2차원 배열 (기본값 false)
  const grid: boolean[][] = Array.from({ length: 7 }, () => new Array<boolean>(48).fill(false));

  if (!availabilities || !Array.isArray(availabilities)) {
    return grid;
  }

  for (const item of availabilities) {
    if (
      item &&
      item.isAvailable === true &&
      typeof item.dayOfWeek === 'number' &&
      item.dayOfWeek >= 0 &&
      item.dayOfWeek <= 6 &&
      typeof item.slot === 'number' &&
      item.slot >= 0 &&
      item.slot <= 47
    ) {
      grid[item.dayOfWeek][item.slot] = true;
    }
  }

  return grid;
}

/**
 * 주간 시간표 최적 회의 시간 추천 메인 함수
 *
 * @param teamMemberAvailabilities 팀원 ID를 키로 하고 각 팀원의 Availability 배열을 값으로 하는 객체
 * @param minimumDurationMinutes 최소 요구 연속 회의 시간 (분 단위, 기본값: 60분)
 * @returns 우선순위 및 참석률 기준으로 정렬된 추천 회의 슬롯 목록
 */
export function calculateOptimalMeetingSlots(
  teamMemberAvailabilities: Record<string, Availability[]>,
  minimumDurationMinutes: number = 60
): RecommendedSlot[] {
  if (!teamMemberAvailabilities || typeof teamMemberAvailabilities !== 'object') {
    return [];
  }

  const allMemberIds = Object.keys(teamMemberAvailabilities).sort();
  const totalMembers = allMemberIds.length;

  if (totalMembers === 0) {
    return [];
  }

  // 최소 요구 슬롯 수 계산 (30분 단위 올림)
  // 0 이하이거나 유효하지 않은 숫자가 입력된 경우 최소 1슬롯(30분)으로 안전 보정
  const safeDuration =
    typeof minimumDurationMinutes === 'number' && !Number.isNaN(minimumDurationMinutes) && minimumDurationMinutes > 0
      ? minimumDurationMinutes
      : 60;
  const requiredSlotCount = Math.max(1, Math.ceil(safeDuration / 30));

  // 팀원별 요일/슬롯 그리드 생성
  const memberGrids: Record<string, boolean[][]> = {};
  for (const memberId of allMemberIds) {
    memberGrids[memberId] = buildMemberSlotGrid(teamMemberAvailabilities[memberId]);
  }

  // ===========================================================================
  // 1단계: 팀원 전원 참석(attendanceRatio === 1.0) 가능한 구간 탐색
  // ===========================================================================
  const allAvailableSlots: RecommendedSlot[] = [];

  for (let day = 0; day < 7; day++) {
    const dayOfWeek = day as DayOfWeek;

    // 요일 내에서 전원 가능한 슬롯 판별 (0 ~ 47)
    let currentStart: number | null = null;

    for (let slot = 0; slot < 48; slot++) {
      const isAvailableForAll = allMemberIds.every((mId) => memberGrids[mId][day][slot]);

      if (isAvailableForAll) {
        if (currentStart === null) {
          currentStart = slot;
        }
      } else {
        if (currentStart !== null) {
          const endSlot = slot - 1;
          const slotCount = endSlot - currentStart + 1;
          if (slotCount >= requiredSlotCount) {
            allAvailableSlots.push({
              dayOfWeek,
              startSlot: currentStart,
              endSlot,
              durationMinutes: slotCount * 30,
              attendanceRatio: 1.0,
              availableMemberIds: [...allMemberIds],
              missingMemberIds: [],
              isOptimal: false, // 아래 정렬 후 1순위에 부여
            });
          }
          currentStart = null;
        }
      }
    }

    // 슬롯 47번까지 연속된 경우 마감 처리 (자정을 넘는 슬롯과 연결하지 않음)
    if (currentStart !== null) {
      const endSlot = 47;
      const slotCount = endSlot - currentStart + 1;
      if (slotCount >= requiredSlotCount) {
        allAvailableSlots.push({
          dayOfWeek,
          startSlot: currentStart,
          endSlot,
          durationMinutes: slotCount * 30,
          attendanceRatio: 1.0,
          availableMemberIds: [...allMemberIds],
          missingMemberIds: [],
          isOptimal: false,
        });
      }
    }
  }

  // 1-1. 전원 참석 가능한 구간이 존재하는 경우
  if (allAvailableSlots.length > 0) {
    // 정렬 우선순위:
    // 1. durationMinutes 내림차순 (긴 회의 시간 우선)
    // 2. dayOfWeek 오름차순 (이른 요일 우선)
    // 3. startSlot 오름차순 (이른 시간 우선)
    allAvailableSlots.sort((a, b) => {
      if (b.durationMinutes !== a.durationMinutes) {
        return b.durationMinutes - a.durationMinutes;
      }
      if (a.dayOfWeek !== b.dayOfWeek) {
        return a.dayOfWeek - b.dayOfWeek;
      }
      return a.startSlot - b.startSlot;
    });

    // 가장 긴 지속 시간을 가진 최상위 구간(들)에 isOptimal: true 부여
    const maxDuration = allAvailableSlots[0].durationMinutes;
    for (const slot of allAvailableSlots) {
      if (slot.durationMinutes === maxDuration) {
        slot.isOptimal = true;
      }
    }

    return allAvailableSlots;
  }

  // ===========================================================================
  // 2단계: 전원 참석 불가능 시, 부분 참석 가능한 대안 구간 탐색
  // ===========================================================================
  // 최소 참석 인원 기준:
  // - 팀원이 2명 이상인 경우 최소 2명 이상 참석해야 유효
  // - 팀원이 1명인 경우 1명 참석
  const minRequiredAttendees = totalMembers >= 2 ? 2 : 1;
  const partialCandidates: RecommendedSlot[] = [];

  for (let day = 0; day < 7; day++) {
    const dayOfWeek = day as DayOfWeek;

    // 각 슬롯(0~47)별로 참석 가능한 멤버 집합 계산
    const slotAttendees: string[][] = [];
    for (let slot = 0; slot < 48; slot++) {
      const attendees = allMemberIds.filter((mId) => memberGrids[mId][day][slot]);
      slotAttendees.push(attendees);
    }

    // 연속된 구간 탐색: start부터 end까지 구간 전체에 참석 가능한 동일 팀원 교집합 계산
    for (let start = 0; start <= 48 - requiredSlotCount; start++) {
      let commonAttendees = [...slotAttendees[start]];
      if (commonAttendees.length < minRequiredAttendees) continue;

      for (let end = start; end < 48; end++) {
        if (end > start) {
          const attendeesAtEnd = new Set(slotAttendees[end]);
          commonAttendees = commonAttendees.filter((m) => attendeesAtEnd.has(m));
        }

        if (commonAttendees.length < minRequiredAttendees) {
          // 인원이 기준 미달이면 더 연장해도 인원이 늘어나지 않으므로 중단
          break;
        }

        const slotCount = end - start + 1;
        if (slotCount >= requiredSlotCount) {
          const attendeesSorted = [...commonAttendees].sort();
          const missing = allMemberIds.filter((m) => !commonAttendees.includes(m)).sort();

          partialCandidates.push({
            dayOfWeek,
            startSlot: start,
            endSlot: end,
            durationMinutes: slotCount * 30,
            attendanceRatio: Number((attendeesSorted.length / totalMembers).toFixed(2)),
            availableMemberIds: attendeesSorted,
            missingMemberIds: missing,
            isOptimal: false, // 부분 참석은 isOptimal이 항상 false
          });
        }
      }
    }
  }

  if (partialCandidates.length === 0) {
    return [];
  }

  // 2-1. 중복 및 포함 관계 필터링 (동일 참석자 구성을 가지는 하위 구간 제거)
  // 동일 요일, 동일 참석자 목록일 때 더 긴 상위 구간에 완전히 포함되는 구간은 제거합니다.
  const filteredPartial: RecommendedSlot[] = [];

  for (const cand of partialCandidates) {
    const isRedundant = partialCandidates.some((other) => {
      if (cand === other) return false;
      if (cand.dayOfWeek !== other.dayOfWeek) return false;

      // 참석자가 완전히 동일한지 확인
      const sameMembers =
        cand.availableMemberIds.length === other.availableMemberIds.length &&
        cand.availableMemberIds.every((m, idx) => m === other.availableMemberIds[idx]);

      if (!sameMembers) return false;

      // other가 cand를 완전히 포함하면서 더 긴 경우 cand는 중복
      const isSubsetRange = other.startSlot <= cand.startSlot && other.endSlot >= cand.endSlot;
      const isStrictlyLonger = other.durationMinutes > cand.durationMinutes;

      return isSubsetRange && isStrictlyLonger;
    });

    if (!isRedundant) {
      filteredPartial.push(cand);
    }
  }

  // 2-2. 대안 추천 정렬 우선순위:
  // 1. attendanceRatio 내림차순 (참석 인원 많은 순)
  // 2. durationMinutes 내림차순 (회의 시간이 긴 순)
  // 3. dayOfWeek 오름차순 (이른 요일 순)
  // 4. startSlot 오름차순 (이른 시간 순)
  filteredPartial.sort((a, b) => {
    if (b.attendanceRatio !== a.attendanceRatio) {
      return b.attendanceRatio - a.attendanceRatio;
    }
    if (b.durationMinutes !== a.durationMinutes) {
      return b.durationMinutes - a.durationMinutes;
    }
    if (a.dayOfWeek !== b.dayOfWeek) {
      return a.dayOfWeek - b.dayOfWeek;
    }
    return a.startSlot - b.startSlot;
  });

  // 동일한 (dayOfWeek, startSlot, endSlot, availableMemberIds)를 가지는 중복 제거
  const uniqueKeySet = new Set<string>();
  const finalResults: RecommendedSlot[] = [];

  for (const slot of filteredPartial) {
    const key = `${slot.dayOfWeek}_${slot.startSlot}_${slot.endSlot}_${slot.availableMemberIds.join(',')}`;
    if (!uniqueKeySet.has(key)) {
      uniqueKeySet.add(key);
      finalResults.push(slot);
    }
  }

  return finalResults;
}
