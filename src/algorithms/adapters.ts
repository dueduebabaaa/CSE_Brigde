/**
 * BRIDGE — 추천 및 매칭 결과 UI 어댑터 (Adapters)
 * 
 * 알고리즘 내부의 고유 식별자(opportunityId, userId) 및 메타데이터를 유지하면서,
 * 프론트엔드가 요구하는 공통 MatchResult(targetId) 인터페이스로 안전하게 변환합니다.
 * 
 * [원칙 - DATA_CONTRACT.md 10절 준수]
 * 1. 공모전 결과: opportunityId -> targetId
 * 2. 팀원 결과: userId -> targetId (matchedTechStacks -> matchedTags 호환)
 * 3. 팀 빌더 후보: candidateProfile.id -> targetId (fitScore -> score)
 * 4. 점수(score)는 0~100 범위의 유한 정수를 유지
 * 5. 원본 알고리즘 결과 객체의 불변성을 보장 (새로운 객체 생성 반환)
 */

import { MatchResult } from '../types';
import { OpportunityMatchResult } from './opportunityRecommendation';
import { MemberMatchResult } from './memberMatching';
import { TeamBalanceAnalysisResult } from './teamAnalyzer';

/** Invalid boundary data fails explicitly; never turn it into a success score. */
function validateUiResult(targetId: unknown, score: unknown, matchedTags: unknown, reasons: unknown): MatchResult {
  if (typeof targetId !== 'string' || !targetId.trim()) throw new TypeError('targetId must be a nonempty string');
  if (typeof score !== 'number' || !Number.isFinite(score) || score < 0 || score > 100) {
    throw new RangeError('score must be a finite number between 0 and 100');
  }
  const strings = (value: unknown, field: string): string[] => {
    if (!Array.isArray(value) || Array.from(value).some(item => typeof item !== 'string' || !item.trim())) {
      throw new TypeError(field + ' must be an array of nonempty strings');
    }
    return [...value];
  };
  return { targetId, score: Math.round(score), matchedTags: strings(matchedTags, 'matchedTags'), reasons: strings(reasons, 'reasons') };
}

/**
 * 단일 공모전 추천 결과를 프론트엔드용 MatchResult로 변환합니다.
 */
export function adaptOpportunityMatchToUi(result: OpportunityMatchResult): MatchResult {
  return validateUiResult(result?.opportunityId, result?.score, result?.matchedTags, result?.reasons);
}

/**
 * 공모전 추천 결과 배열을 프론트엔드용 MatchResult 배열로 변환합니다.
 */
export function adaptOpportunityMatchesToUi(results: OpportunityMatchResult[]): MatchResult[] {
  if (!results || !Array.isArray(results)) {
    return [];
  }
  return results.map(adaptOpportunityMatchToUi);
}

/**
 * 단일 팀원 매칭 결과를 프론트엔드용 MatchResult로 변환합니다.
 * - userId -> targetId
 * - matchedTechStacks -> matchedTags로 호환 매핑
 */
export function adaptMemberMatchToUi(result: MemberMatchResult): MatchResult {
  return validateUiResult(result?.userId, result?.score, result?.matchedTechStacks, result?.reasons);
}

/**
 * 팀원 매칭 결과 배열을 프론트엔드용 MatchResult 배열로 변환합니다.
 */
export function adaptMemberMatchesToUi(results: MemberMatchResult[]): MatchResult[] {
  if (!results || !Array.isArray(results)) {
    return [];
  }
  return results.map(adaptMemberMatchToUi);
}

/**
 * 팀 빌더 역량 균형 분석의 추천 인재 목록을 프론트엔드용 MatchResult 배열로 변환합니다.
 */
export function adaptTeamCandidatesToUi(
  candidates: TeamBalanceAnalysisResult['recommendedCandidates']
): MatchResult[] {
  if (!candidates || !Array.isArray(candidates)) {
    return [];
  }

  return candidates.map((c) => {
    if (typeof c?.complementRole !== 'string' || !c.complementRole.trim()) throw new TypeError('complementRole must be a nonempty string');
    return validateUiResult(c?.candidateProfile?.id, c?.fitScore, [], [`${c.complementRole} 역할을 보완할 수 있는 적합 인재입니다.`]);
  });
}
