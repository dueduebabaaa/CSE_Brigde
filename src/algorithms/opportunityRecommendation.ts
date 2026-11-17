import { parseOpportunityTimestamp } from './inputSafety';
/**
 * BRIDGE — 공모전 맞춤 추천 알고리즘 (Opportunity Recommendation)
 * 
 * 학생의 관심 분야, 보유 기술 스택, 학습 희망 기술 스택과
 * 공모전의 태그 및 모집 상태를 분석하여 0~100점의 적합도 점수와 추천 사유를 산출합니다.
 */

import { UserProfile, Opportunity } from '../types';
import {
  classifyTags,
  getCanonicalTag,
  getCanonicalFieldTag,
  formatWithJosa,
} from './tagClassification';

/**
 * 공모전 추천 결과 인터페이스 (API_CONTRACT.md 준수)
 */
export interface OpportunityMatchResult {
  opportunityId: string;
  score: number;           // 0 ~ 100점 (반올림된 정수)
  matchedTags: string[];   // 실제 일치한 태그 목록
  reasons: string[];       // 추천 이유 목록
}

/**
 * 공모전 맞춤 추천 메인 함수
 * 
 * @param userProfile 학생의 프로필 정보 (관심 분야, 보유 기술, 학습 희망 기술)
 * @param opportunities 평가 대상 공모전 배열 (원본 배열을 수정하지 않음)
 * @param currentDate 마감일 판단을 위한 기준 시각 (테스트 시 주입 가능, 기본값: 현재 시각)
 * @returns 적합도 점수가 높은 순으로 정렬된 공모전 추천 결과 목록
 */
export function recommendOpportunities(
  userProfile: UserProfile,
  opportunities: Opportunity[],
  currentDate: Date = new Date()
): OpportunityMatchResult[] {
  if (!opportunities || opportunities.length === 0) {
    return [];
  }

  // 1. 모집 상태, 게시일 및 마감일 필터링 (DATA_CONTRACT.md 8.3절 준수)
  // - active: 모집 진행 중인 공고만 추천 대상
  // - closed, draft, needs_confirmation: 제외
  // - postedAt이 기준 시각보다 미래인 게시 전 공고: 제외
  // - deadline이 실제로 지난 공고: active여도 제외
  // - deadline이 null인 경우: 날짜를 임의로 생성하지 않고 active 상태 유지
  // - applicationStart가 미래인 공고: 게시 완료(postedAt <= currentDate) 상태이면 모집 예정으로 추천 허용
  const activeOpportunities = opportunities.filter((opp) => {
    if (opp.status !== 'active' || !Number.isFinite(currentDate.getTime())) return false;
    const postedAt = parseOpportunityTimestamp(opp.postedAt);
    if (!postedAt || Date.parse(postedAt) > currentDate.getTime()) return false;
    if (opp.applicationStart !== null && !parseOpportunityTimestamp(opp.applicationStart)) return false;
    if (opp.deadline !== null) {
      const deadline = parseOpportunityTimestamp(opp.deadline);
      if (!deadline || Date.parse(deadline) < currentDate.getTime()) return false;
    }
    return true;
  });

  if (activeOpportunities.length === 0) {
    return [];
  }

  // 2. 학생 프로필 태그 정규화 및 표준화 (불변성 유지 및 중복 제거)
  const userInterests = Array.from(
    new Set(
      (userProfile.interests ?? [])
        .map((tag) => getCanonicalFieldTag(tag))
        .filter((tag) => tag.length > 0)
    )
  );

  const userTechs = Array.from(
    new Set(
      (userProfile.techStacks ?? [])
        .map((tag) => getCanonicalTag(tag))
        .filter((tag) => tag.length > 0)
    )
  );

  const userWantedTechs = Array.from(
    new Set(
      (userProfile.wantedTechStacks ?? [])
        .map((tag) => getCanonicalTag(tag))
        .filter((tag) => tag.length > 0)
    )
  );

  const userInterestSet = new Set(userInterests.map((t) => t.toLowerCase()));
  const userTechSet = new Set(userTechs.map((t) => t.toLowerCase()));

  // 3. 각 공모전에 대해 적합도 점수 및 추천 이유 산출
  const results: OpportunityMatchResult[] = activeOpportunities.map((opp) => {
    // 공모전 태그 분류 (분야, 기술, 일반 태그 분리 및 중복 제거)
    const classified = classifyTags(opp.tags ?? []);
    const oppFields = classified.fields;
    const oppTechs = classified.techs;

    const oppFieldMap = new Map(oppFields.map((f) => [f.toLowerCase(), f]));
    const oppTechMap = new Map(oppTechs.map((t) => [t.toLowerCase(), t]));

    // 일치 항목 도출
    // ① 관심 분야 일치 목록: 공모전 분야 태그 중 학생의 관심 분야와 일치하는 것
    const matchedFields: string[] = [];
    for (const canonical of oppFieldMap.values()) {
      if (userInterestSet.has(getCanonicalFieldTag(canonical).toLowerCase())) {
        matchedFields.push(canonical);
      }
    }

    // ② 보유 기술 일치 목록: 공모전 기술 태그 중 학생의 보유 기술과 일치하는 것
    const matchedTechs: string[] = [];
    for (const [lowerTech, canonical] of oppTechMap.entries()) {
      if (userTechSet.has(lowerTech)) {
        matchedTechs.push(canonical);
      }
    }

    // ③ 학습 희망 기술 일치 목록: 공모전에서 활용하는 기술 중 학생이 배우고 싶은 기술
    const matchedWantedTechs: string[] = [];
    for (const wanted of userWantedTechs) {
      const lower = wanted.toLowerCase();
      if (oppTechMap.has(lower)) {
        // 공모전의 정규 태그명 표기를 우선 채택
        matchedWantedTechs.push(oppTechMap.get(lower) ?? wanted);
      }
    }

    // 4. 점수 계산 및 가중치 동적 재조정
    // 기본 가중치: 관심 분야 50점, 보유 기술 35점, 학습 희망 기술 15점 (총 100점)
    // 분모가 0이 되는 데이터 누락 항목은 평가 대상에서 제외하고,
    // 계산 가능한 항목들만 합계 100점으로 비례 재조정합니다.
    const isInterestEvaluable = oppFields.length > 0 && userInterests.length > 0;
    const isTechEvaluable = oppTechs.length > 0 && userTechs.length > 0;
    const isWantedEvaluable = oppTechs.length > 0 && userWantedTechs.length > 0;

    let availableWeight = 0;
    if (isInterestEvaluable) availableWeight += 50;
    if (isTechEvaluable) availableWeight += 35;
    if (isWantedEvaluable) availableWeight += 15;

    let finalScore = 0;
    const reasons: string[] = [];

    if (availableWeight === 0) {
      // 어떤 항목도 계산할 수 없는 경우: 점수 0점 및 안내 메시지
      finalScore = 0;
      reasons.push('평가에 필요한 데이터(관심 분야, 기술 스택)가 부족하여 추천 점수를 계산할 수 없습니다.');
    } else {
      // 가중치 스케일링 계수
      const scale = 100 / availableWeight;
      const weightInterest = isInterestEvaluable ? 50 * scale : 0;
      const weightTech = isTechEvaluable ? 35 * scale : 0;
      const weightWanted = isWantedEvaluable ? 15 * scale : 0;

      // ① 관심 분야 점수 = 가중치 × (일치한 관심 분야 수 / 공모전 관련 분야 수)
      const interestScore = isInterestEvaluable
        ? weightInterest * (matchedFields.length / oppFields.length)
        : 0;

      // ② 보유 기술 점수 = 가중치 × (일치한 보유 기술 수 / 공모전 관련 기술 수)
      const techScore = isTechEvaluable
        ? weightTech * (matchedTechs.length / oppTechs.length)
        : 0;

      // ③ 학습 희망 기술 점수 = 가중치 × (공모전과 일치하는 학습 희망 기술 수 / 학생의 학습 희망 기술 수)
      const wantedScore = isWantedEvaluable
        ? weightWanted * (matchedWantedTechs.length / userWantedTechs.length)
        : 0;

      const rawTotal = interestScore + techScore + wantedScore;
      // 0 ~ 100 범위 보정 및 반올림한 정수 변환
      finalScore = Math.round(Math.min(100, Math.max(0, rawTotal)));

      // 5. 추천 이유 목록 생성 (실제 일치한 항목만 근거로 작성)
      for (const field of matchedFields) {
        reasons.push(`관심 분야인 ${formatWithJosa(field, '과/와')} 일치합니다.`);
      }

      for (const tech of matchedTechs) {
        reasons.push(`보유 기술 ${formatWithJosa(tech, '을/를')} 활용할 수 있습니다.`);
      }

      for (const wantedTech of matchedWantedTechs) {
        reasons.push(`배우고 싶은 ${formatWithJosa(wantedTech, '과/와')} 관련된 활동입니다.`);
      }

      // 일치 항목이 전혀 없는 경우 안내
      if (reasons.length === 0) {
        reasons.push('현재 프로필과 직접 일치하는 태그는 없으나, 새로운 도전을 위한 기회입니다.');
      }
    }

    // 실제 일치한 모든 태그 목록 (중복 제거)
    const matchedTags = Array.from(
      new Set([...matchedFields, ...matchedTechs, ...matchedWantedTechs])
    );

    return {
      opportunityId: opp.id,
      score: finalScore,
      matchedTags,
      reasons,
    };
  });

  // 6. 추천 결과 정렬
  // - 점수 높은 순(내림차순) 정렬
  // - 동점일 경우 opportunityId 기준 오름차순(결정론적 일관성 보장)
  results.sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    return a.opportunityId.localeCompare(b.opportunityId);
  });

  return results;
}
