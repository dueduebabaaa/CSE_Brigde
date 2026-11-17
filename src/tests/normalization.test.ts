/**
 * BRIDGE — 정규화 로직(관심분야 15종, 역할 11종, 기술스택, 동의어) 단위 테스트
 */

import { describe, it, expect } from 'vitest';
import {
  STANDARD_INTEREST_OPTIONS,
  normalizeInterest,
  getCanonicalTag,
} from '../algorithms/tagClassification';
import {
  STANDARD_ROLE_KEYS,
  normalizeRoleToStandardKey,
  isSameRole,
} from '../algorithms/memberMatching';

describe('데이터 정규화 로직 단위 테스트', () => {
  describe('1. 관심 분야 15종 표준화 (normalizeInterest)', () => {
    it('15개 표준 관심 분야가 DATA_CONTRACT.md 3.2절과 정확히 일치해야 한다', () => {
      expect(STANDARD_INTEREST_OPTIONS).toHaveLength(15);
      expect(STANDARD_INTEREST_OPTIONS).toEqual([
        '웹 개발',
        '앱 개발',
        '인공지능',
        '데이터 분석',
        '정보보안',
        '게임 개발',
        '임베디드 및 IoT',
        '클라우드',
        'UI/UX 디자인',
        '서비스 기획',
        '마케팅',
        '창업',
        '알고리즘',
        '오픈소스',
        '기타',
      ]);
    });

    it('영문 및 동의어 표기를 15개 표준 관심 분야로 일원화해야 한다', () => {
      expect(normalizeInterest('ai')).toBe('인공지능');
      expect(normalizeInterest('Artificial Intelligence')).toBe('인공지능');
      expect(normalizeInterest('머신러닝')).toBe('인공지능');
      expect(normalizeInterest('mobile')).toBe('앱 개발');
      expect(normalizeInterest('모바일 앱')).toBe('앱 개발');
      expect(normalizeInterest('ui/ux')).toBe('UI/UX 디자인');
      expect(normalizeInterest('디자인')).toBe('UI/UX 디자인');
      expect(normalizeInterest('embedded')).toBe('임베디드 및 IoT');
      expect(normalizeInterest('iot')).toBe('임베디드 및 IoT');
      expect(normalizeInterest('임베디드')).toBe('임베디드 및 IoT');
      expect(normalizeInterest('pm')).toBe('서비스 기획');
      expect(normalizeInterest('기획')).toBe('서비스 기획');
      expect(normalizeInterest('marketing')).toBe('마케팅');
      expect(normalizeInterest('홍보')).toBe('마케팅');
      expect(normalizeInterest('startup')).toBe('창업');
      expect(normalizeInterest('bigdata')).toBe('데이터 분석'); // 또는 데이터 분석 동의어
      expect(normalizeInterest('web dev')).toBe('웹 개발');
      expect(normalizeInterest('open source')).toBe('오픈소스');
    });

    it('사용자가 직접 입력한 기타 자유 문자열은 임의 변환하지 않고 원본을 보존해야 한다', () => {
      expect(normalizeInterest('블록체인')).toBe('블록체인');
      expect(normalizeInterest('양자컴퓨팅')).toBe('양자컴퓨팅');
      expect(normalizeInterest('  로보틱스  ')).toBe('로보틱스');
    });

    it('빈 문자열이나 공백만 있는 경우 빈 문자열을 반환해야 한다', () => {
      expect(normalizeInterest('')).toBe('');
      expect(normalizeInterest('   ')).toBe('');
    });
  });

  describe('2. 희망 역할 11종 표준화 (normalizeRole / normalizeRoleToStandardKey)', () => {
    it('11개 표준 역할 key가 DATA_CONTRACT.md 3.3절과 정확히 일치해야 한다', () => {
      expect(STANDARD_ROLE_KEYS).toHaveLength(11);
      expect(STANDARD_ROLE_KEYS).toEqual([
        'Frontend',
        'Backend',
        'AI/ML',
        'Data',
        'UI/UX',
        'PM/기획',
        'Mobile',
        'DevOps',
        'Security',
        'Marketing',
        '기타',
      ]);
    });

    it('영문 별칭 및 레거시 역할을 11개 표준 key로 매핑해야 한다', () => {
      expect(normalizeRoleToStandardKey('Frontend Developer')).toBe('Frontend');
      expect(normalizeRoleToStandardKey('프론트엔드 개발자')).toBe('Frontend');
      expect(normalizeRoleToStandardKey('Backend Developer')).toBe('Backend');
      expect(normalizeRoleToStandardKey('ML Engineer')).toBe('AI/ML');
      expect(normalizeRoleToStandardKey('Data Scientist')).toBe('Data');
      expect(normalizeRoleToStandardKey('UI/UX Designer')).toBe('UI/UX');
      expect(normalizeRoleToStandardKey('Product Manager')).toBe('PM/기획');
      expect(normalizeRoleToStandardKey('Mobile App Developer')).toBe('Mobile');
      expect(normalizeRoleToStandardKey('DevOps Engineer')).toBe('DevOps');
      expect(normalizeRoleToStandardKey('Security Engineer')).toBe('Security');
      expect(normalizeRoleToStandardKey('마케터')).toBe('Marketing');
    });

    it('isSameRole을 통해 표준 key와 레거시 별칭이 상호 일치 판정되어야 한다', () => {
      expect(isSameRole('Frontend', 'Frontend Developer')).toBe(true);
      expect(isSameRole('Backend', '백엔드')).toBe(true);
      expect(isSameRole('AI/ML', 'ML Engineer')).toBe(true);
      expect(isSameRole('PM/기획', 'Product Manager')).toBe(true);
      expect(isSameRole('Frontend', 'Backend')).toBe(false);
    });

    it('사용자가 직접 입력한 비표준 역할은 삭제하지 않고 원본을 보존해야 한다', () => {
      expect(normalizeRoleToStandardKey('DBA')).toBe('DBA');
      expect(normalizeRoleToStandardKey('블록체인 코어 개발자')).toBe('블록체인 코어 개발자');
    });
  });

  describe('3. 기술 스택 정규화 (getCanonicalTag)', () => {
    it('대소문자, 공백 및 유니코드 정규화(NFKC)를 적용해야 한다', () => {
      expect(getCanonicalTag('  react.js  ')).toBe('React');
      expect(getCanonicalTag('SPRING BOOT')).toBe('Spring Boot');
      expect(getCanonicalTag('postgres')).toBe('PostgreSQL');
      expect(getCanonicalTag('k8s')).toBe('Kubernetes');
    });

    it('빈 기술 스택이나 공백은 안전하게 빈 문자열을 반환해야 한다', () => {
      expect(getCanonicalTag('')).toBe('');
      expect(getCanonicalTag('   ')).toBe('');
    });
  });
});
