/**
 * BRIDGE — 공고 제목·본문 태그 자동 추출 단위 테스트
 */

import { describe, it, expect } from 'vitest';
import { extractTagsFromOpportunity } from '../algorithms/opportunityTagExtractor';

describe('공고 제목·본문 기반 태그 자동 추출 (extractTagsFromOpportunity)', () => {
  it('공고 제목과 본문에 등장하는 기술 및 분야 태그를 정확히 추출해야 한다', () => {
    const title = '2026 KNU 인공지능 웹 해커톤 대회';
    const description = 'React와 Spring Boot를 기반으로 웹 서비스 및 생성형 AI Agent를 개발하는 대회입니다.';

    const result = extractTagsFromOpportunity(title, description);

    // 분야 태그 검증
    expect(result.fields).toEqual(expect.arrayContaining(['인공지능', '웹 개발']));
    // 기술 태그 검증 (React, Spring Boot)
    expect(result.techs).toEqual(expect.arrayContaining(['React', 'Spring Boot']));
    // 전체 태그 중복 제거 검증
    expect(result.allTags).toEqual(
      expect.arrayContaining(['인공지능', '웹 개발', 'React', 'Spring Boot'])
    );
  });

  it('단어 경계 검사로 부분 문자열 오탐(False Positive)을 방지해야 한다', () => {
    // 'reaction'에 'react'가 오탐되면 안 됨
    // 'good'에 'go'가 오탐되면 안 됨
    const title = 'Chemical reaction research competition';
    const description = 'This is a good opportunity for chemistry students.';

    const result = extractTagsFromOpportunity(title, description);

    expect(result.techs).not.toContain('React');
    expect(result.techs).not.toContain('Go');
    expect(result.allTags).toHaveLength(0);
  });

  it('Next.js, Vue.js, Node.js 등 특수문자 포함 기술명을 정확히 추출해야 한다', () => {
    const title = '풀스택 웹 개발자 육성 프로그램';
    const description = 'Next.js와 Node.js 및 TypeScript를 학습하고 PostgreSQL 데이터베이스를 연동합니다.';

    const result = extractTagsFromOpportunity(title, description);

    expect(result.techs).toEqual(
      expect.arrayContaining(['Next.js', 'Node.js', 'TypeScript', 'PostgreSQL'])
    );
  });

  it('제목만 있고 본문이 없거나 null인 경우에도 안전하게 제목에서 태그를 추출해야 한다', () => {
    const title = 'Python 데이터 분석 및 머신러닝 특강';
    const result = extractTagsFromOpportunity(title, null);

    expect(result.fields).toEqual(expect.arrayContaining(['인공지능', '데이터 분석']));
    expect(result.techs).toContain('Python');
  });

  it('제목과 본문이 모두 비어있는 경우 빈 배열을 안전하게 반환해야 한다', () => {
    const result = extractTagsFromOpportunity('', '');
    expect(result.fields).toEqual([]);
    expect(result.techs).toEqual([]);
    expect(result.allTags).toEqual([]);

    const nullResult = extractTagsFromOpportunity(null, undefined);
    expect(nullResult.fields).toEqual([]);
    expect(nullResult.techs).toEqual([]);
    expect(nullResult.allTags).toEqual([]);
  });

  it('한글 기술 별칭과 공백·대소문자 차이를 표준 태그로 합친다', () => {
    const result = extractTagsFromOpportunity('클라우드∙파이썬과 리액트', 'ＰＹＴＨＯＮ 및 SPRING   BOOT, 스프링 부트');
    expect(result.fields).toEqual(['클라우드']);
    expect(result.techs.sort()).toEqual(['Python', 'React', 'Spring Boot']);
    expect(extractTagsFromOpportunity('Django, MongoDB 및 HTML5 실습').techs).toEqual(['Django', 'MongoDB', 'HTML/CSS']);
  });

  it('기관명이나 다른 단어에 포함된 짧은 표현을 분야로 추론하지 않는다', () => {
    const result = extractTagsFromOpportunity('AI부트캠프사업단 클라우드웨어', '아마존 웹서비스 교육과 Upstage 행사');
    expect(result.fields).toEqual([]);
    expect(result.techs).toEqual(['AWS']);
  });

  it('동일한 기술이나 분야가 제목과 본문에 중복 등장해도 결과에는 1번만 포함되어야 한다', () => {
    const title = 'React 프론트엔드 공모전 (React)';
    const description = 'React 프레임워크를 필수 사용해야 하며, React를 활용한 창의적 UI 개발.';

    const result = extractTagsFromOpportunity(title, description);

    const reactCount = result.techs.filter((t) => t === 'React').length;
    expect(reactCount).toBe(1);
  });
});
