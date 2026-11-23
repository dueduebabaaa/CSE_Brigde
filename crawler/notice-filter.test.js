import { describe, expect, it } from 'vitest';
import { getCategory, getMatchedNoticeTypes, isTargetNotice } from './notice-filter.js';

describe('crawler notice filtering', () => {
  it.each([
    ['2026 전국 대학생 앱 개발 공모전 참가자 모집', '참가 신청은 공지 링크를 확인하세요.'],
    ['KNU 학생 해커톤 개최 안내', '재학생 팀을 모집합니다.'],
    ['대학생 서포터즈 모집', '활동 기간과 신청 방법을 안내합니다.'],
    ['하계 현장실습 참여 학생 모집', '지원 자격을 확인하고 신청해 주세요.'],
    ['학부생 연구생 모집 공고', '컴퓨터 비전 연구에 참여할 학생을 선발합니다.'],
    ['AI 프로젝트 참여 기회 안내', '학부생 프로젝트 팀원을 모집합니다.'],
    ['컴퓨터학부 부트캠프 교육생 모집', '교육 신청을 접수합니다.'],
    ['인공지능 세미나 참가 안내', '참가 신청을 받습니다.'],
  ])('학생 참여 기회로 명시된 공고를 포함한다: %s', (title, content) => {
    expect(isTargetNotice({ title, content })).toBe(true);
  });

  it.each([
    ['2026학년도 수강신청 안내', '해커톤 참가 신청 링크도 함께 안내합니다.'],
    ['강의실 변경 안내', '세미나 참가자를 모집합니다.'],
    ['중간고사 일정 및 시험장 안내', '학생 프로젝트 참여 신청과 무관합니다.'],
    ['등록금 납부 및 장학 행정 안내', '공모전 관련 단어가 포함된 일반 안내입니다.'],
    ['학사제도 및 졸업요건 변경 안내', '학생 대상 프로젝트 모집은 없습니다.'],
    ['휴학·복학 및 전과 신청 안내', '대외활동과 관계없는 학사 행정입니다.'],
    ['학부 연구 운영 기준 변경 안내', '기존 제도와 기준만 변경합니다.'],
  ])('관련 없는 행정 공지를 제외한다: %s', (title, content) => {
    expect(isTargetNotice({ title, content })).toBe(false);
  });

  it.each([
    ['AI 프로젝트 추진 현황 공유', '학부생 연구 프로젝트 사례를 소개합니다.'],
    ['교육 프로그램 안내', '교육 제도의 운영 현황을 설명합니다.'],
    ['지난 해커톤 수상 결과 발표', '참여 팀의 수상 결과를 안내합니다.'],
    ['인턴십 제도 변경 안내', '인턴십 운영 기준을 개정합니다.'],
  ])('참여 의사가 분명하지 않은 공지는 보수적으로 제외한다: %s', (title, content) => {
    expect(isTargetNotice({ title, content })).toBe(false);
  });

  it('마감일이 없어도 대상 여부를 판단하고 원본 공지 객체를 바꾸지 않는다', () => {
    const notice = {
      source_id: 'post-1',
      title: '대학생 해커톤 참가자 모집',
      source_url: 'https://example.test/notice/1',
      content: '컴퓨터학부 재학생의 참가 신청을 받습니다.',
    };
    const before = structuredClone(notice);

    expect(isTargetNotice(notice)).toBe(true);
    expect(notice).toEqual(before);
  });

  it('기존 Opportunity 카테고리 범위 안에서 제목과 본문을 분류한다', () => {
    expect(getCategory('학생 연구 기회', '컴퓨터학부 해커톤 참가 신청')).toBe('해커톤');
    expect(getCategory('학부생 연구생 모집', '')).toBe('대외활동');
    expect(getCategory('컴퓨터학부 세미나 참가', '')).toBe('교육/특강');
    expect(getMatchedNoticeTypes({ title: '현장실습 모집', content: '학부생 프로젝트' })).toEqual([
      '현장실습·인턴십',
      '연구·프로젝트',
    ]);
  });
});
