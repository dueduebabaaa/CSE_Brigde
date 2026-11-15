/**
 * 경북대학교 컴퓨터학부 세부전공 및 학년 공통 상수
 * 온보딩, 마이페이지, 팀원 탐색 등 서비스 전반에서 공통으로 재사용합니다.
 */

// 세부전공 5개 표준 선택지
// (데이터과학전공은 플랫폼소프트웨어전공으로 통합됨)
export const MAJOR_TRACKS = [
  '글로벌소프트웨어융합전공',
  '플랫폼소프트웨어전공',
  '인공지능컴퓨팅전공',
  '심화컴퓨팅전공',
  '첨단컴퓨팅연구전공',
] as const;

export type MajorTrack = (typeof MAJOR_TRACKS)[number];

// 학년 표준 선택지
export const GRADE_OPTIONS = [
  '1학년',
  '2학년',
  '3학년',
  '4학년',
  '대학원생',
] as const;

export type GradeOption = (typeof GRADE_OPTIONS)[number];
