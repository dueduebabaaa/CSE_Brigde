/**
 * BRIDGE — 알고리즘 입력 데이터 검증 및 변환 단위 테스트
 */

import { describe, it, expect } from 'vitest';
import {
  isValidAvailabilityItem,
  filterValidAvailabilities,
  validateUserProfile,
  validateOpportunity,
} from '../algorithms/validation';

describe('알고리즘 입력 데이터 변환 및 검증 (validation)', () => {
  describe('1. Availability 유효성 검증', () => {
    it('유효한 정수 요일(0~6)과 정수 슬롯(0~47)을 가진 슬롯은 통과해야 한다', () => {
      const validItem = {
        id: 'av-1',
        userId: 'user-01',
        dayOfWeek: 2,
        slot: 38,
        isAvailable: true,
        updatedAt: '',
      };
      expect(isValidAvailabilityItem(validItem)).toBe(true);
    });

    it('소수 요일(1.5), 소수 슬롯(20.3)은 거부되어야 한다 (런타임 오류 방어)', () => {
      expect(
        isValidAvailabilityItem({
          id: 'av-err-1',
          userId: 'u1',
          dayOfWeek: 1.5,
          slot: 20,
          isAvailable: true,
        })
      ).toBe(false);

      expect(
        isValidAvailabilityItem({
          id: 'av-err-2',
          userId: 'u1',
          dayOfWeek: 2,
          slot: 20.3,
          isAvailable: true,
        })
      ).toBe(false);
    });

    it('범위를 벗어난 요일(-1, 7)이나 슬롯(-1, 48), NaN, 문자열은 거부되어야 한다', () => {
      expect(
        isValidAvailabilityItem({
          id: 'av-err-3',
          userId: 'u1',
          dayOfWeek: -1,
          slot: 10,
          isAvailable: true,
        })
      ).toBe(false);

      expect(
        isValidAvailabilityItem({
          id: 'av-err-4',
          userId: 'u1',
          dayOfWeek: 0,
          slot: 48,
          isAvailable: true,
        })
      ).toBe(false);

      expect(
        isValidAvailabilityItem({
          id: 'av-err-5',
          userId: 'u1',
          dayOfWeek: NaN,
          slot: 10,
          isAvailable: true,
        })
      ).toBe(false);
    });

    it('filterValidAvailabilities는 비정상 슬롯을 걸러내고 유효한 슬롯만 반환해야 한다', () => {
      const mixed = [
        { id: '1', userId: 'u1', dayOfWeek: 1, slot: 20, isAvailable: true, updatedAt: '' },
        { id: '2', userId: 'u1', dayOfWeek: 1.5, slot: 20, isAvailable: true, updatedAt: '' }, // 소수
        { id: '3', userId: 'u1', dayOfWeek: 2, slot: 49, isAvailable: true, updatedAt: '' },  // 범위 초과
        { id: '4', userId: 'u1', dayOfWeek: 3, slot: 30, isAvailable: true, updatedAt: '' },
      ];

      const filtered = filterValidAvailabilities(mixed);
      expect(filtered).toHaveLength(2);
      expect(filtered.map((s) => s.id)).toEqual(['1', '4']);
    });
  });

  describe('2. UserProfile 검증 및 정제', () => {
    it('필수 데이터가 갖춰진 DTO는 정제된 UserProfile로 정상 변환되어야 한다', () => {
      const dto = {
        id: 'u-100',
        email: 'test@knu.ac.kr',
        name: '홍길동',
        grade: '3학년',
        track: '글로벌소프트웨어융합전공',
        interests: ['ai', 'web dev'],
        techStacks: ['react.js', 'spring boot'],
        desiredRoles: ['Frontend Developer', 'DBA'],
        visibility: 'public',
      };

      const result = validateUserProfile(dto);
      expect(result.isValid).toBe(true);
      expect(result.data?.id).toBe('u-100');
      // 정규화 확인
      expect(result.data?.interests).toEqual(expect.arrayContaining(['인공지능', '웹 개발']));
      expect(result.data?.techStacks).toEqual(expect.arrayContaining(['React', 'Spring Boot']));
      expect(result.data?.desiredRoles).toEqual(expect.arrayContaining(['Frontend Developer', 'DBA']));
      expect(result.data?.isPublic).toBe(true);
    });

    it('보유 기술이 없는 techStacks: []는 정상 입력으로 승인되어야 한다', () => {
      const dto = {
        id: 'u-no-tech',
        name: '새내기',
        grade: '1학년',
        track: '인공지능컴퓨팅전공',
        techStacks: [],
      };

      const result = validateUserProfile(dto);
      expect(result.isValid).toBe(true);
      expect(result.data?.techStacks).toEqual([]);
    });

    it('필수 필드(id, name 등)가 누락되면 isValid가 false이고 에러 목록을 반환해야 한다', () => {
      const dto = {
        name: '이름만 있음',
      };

      const result = validateUserProfile(dto);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('3. Opportunity 검증 및 정제', () => {
    it('유효한 공모전 DTO는 정상 변환되어야 한다', () => {
      const dto = {
        id: 'opp-1',
        title: '대구 AI 경진대회',
        postedAt: '2026-11-10T09:00:00+09:00',
        status: 'active',
        tags: ['AI', '해커톤'],
        deadline: '2026-12-31T18:00:00+09:00',
      };

      const result = validateOpportunity(dto);
      expect(result.isValid).toBe(true);
      expect(result.data?.title).toBe('대구 AI 경진대회');
      expect(result.data?.deadline).toBe('2026-12-31T18:00:00+09:00');
    });

    it('유효하지 않은 status 값이 들어오면 에러를 반환해야 한다', () => {
      const dto = {
        id: 'opp-2',
        title: '잘못된 공고',
        status: 'invalid_status',
      };

      const result = validateOpportunity(dto);
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.includes('status'))).toBe(true);
    });
  });
});
