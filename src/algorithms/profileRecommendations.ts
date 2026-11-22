/**
 * BRIDGE — 실제 사용자 프로필과 공고 데이터 기반 맞춤 추천 연결기 (Profile Recommendations Connector)
 *
 * A의 공유 프로필 Context/Hook(useMyProfile) 및 B의 프로필 DTO(UserProfile/ProfileUpsert)와
 * 공고 서비스의 Opportunity[] 데이터를 연결하여, 프론트엔드가 즉시 렌더링할 수 있는
 * MatchResult[]를 산출하는 순수 함수입니다.
 *
 * [원칙 - DATA_CONTRACT.md 및 PROFILE_SPEC.md 준수]
 * 1. 순수 함수로 구현: Supabase 직접 호출, 네트워크 통신, 사이드 이펙트 금지
 * 2. 원본 불변성 보장: 입력받은 프로필 객체, 공고 배열 및 내부 항목을 수정하지 않음
 * 3. 기존 코드 재사용: toAlgorithmProfile(), validateUserProfile(), extractTagsFromOpportunity(),
 *    recommendOpportunities(), adaptOpportunityMatchesToUi() 재사용
 * 4. 마감일 미정(deadline: null) 공고 지원: 마감일로 인한 감점 없이 게시 상태에 따라 추천 허용
 * 5. 기술 숙련도(tech_proficiency)는 점수 가중치에 임의 반영하지 않고 원본 DTO에 보존
 * 6. UI 경계 보안: 사용자 이메일 등 개인정보를 추천 결과(MatchResult)에 포함하지 않음
 */

import type { UserProfile as ServiceUserProfile, ProfileUpsert } from '../services/profileService';
import type { UserProfile as AlgorithmUserProfile, Opportunity, MatchResult } from '../types';
import { toAlgorithmProfile } from '../adapters/profileAlgorithmAdapter';
import { validateUserProfile } from './validation';
import { recommendOpportunities } from './opportunityRecommendation';
import { adaptOpportunityMatchToUi } from './adapters';
import { extractTagsFromOpportunity } from './opportunityTagExtractor';

export interface ProfileRecommendationOptions {
  /**
   * 마감일 및 게시일 판단을 위한 기준 시각 (기본값: 현재 시각)
   */
  currentDate?: Date;
  /**
   * 공고 제목 및 본문에서 키워드 태그 자동 추출·보완 여부 (기본값: true)
   */
  augmentTagsFromContent?: boolean;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/**
 * 다양한 형태의 프로필(ServiceUserProfile, ProfileUpsert, AlgorithmUserProfile)을
 * 검증된 알고리즘용 AlgorithmUserProfile로 안전하게 변환합니다.
 * null/undefined이거나 데이터가 유효하지 않으면 null을 반환합니다.
 */
export function resolveAlgorithmProfile(
  profile: ServiceUserProfile | ProfileUpsert | AlgorithmUserProfile | null | undefined
): AlgorithmUserProfile | null {
  if (!profile || !isRecord(profile)) {
    return null;
  }

  // 1. 이미 camelCase 형식의 AlgorithmUserProfile인 경우
  if ('techStacks' in profile && Array.isArray((profile as AlgorithmUserProfile).techStacks)) {
    const validated = validateUserProfile(profile);
    return validated.isValid && validated.data ? validated.data : null;
  }

  // 2. snake_case 형식의 ServiceUserProfile / ProfileUpsert인 경우
  try {
    const record = profile as Record<string, unknown>;
    const normalizedSource: ServiceUserProfile = {
      ...record,
      created_at:
        typeof record.created_at === 'string'
          ? record.created_at
          : typeof record.updated_at === 'string'
            ? record.updated_at
            : new Date().toISOString(),
      updated_at:
        typeof record.updated_at === 'string'
          ? record.updated_at
          : new Date().toISOString(),
    } as ServiceUserProfile;

    const adapted = toAlgorithmProfile(normalizedSource);
    const validated = validateUserProfile(adapted);
    return validated.isValid && validated.data ? validated.data : null;
  } catch {
    return null;
  }
}

/**
 * 공고 객체의 불변성을 유지하면서, 필요한 경우 본문 키워드 태그를 보완한 새 공고 객체를 생성합니다.
 */
function prepareOpportunity(opp: Opportunity, augmentTagsFromContent: boolean): Opportunity {
  if (!opp || !isRecord(opp)) {
    return opp;
  }

  const existingTags = Array.isArray(opp.tags) ? opp.tags : [];
  if (!augmentTagsFromContent) {
    return {
      ...opp,
      tags: [...existingTags],
    };
  }

  const title = typeof opp.title === 'string' ? opp.title : '';
  const description = typeof opp.description === 'string' ? opp.description : '';
  const extracted = extractTagsFromOpportunity(title, description);

  // 대소문자 무시 중복 제거하되 기존 태그 우선 보존
  const seen = new Set(existingTags.map((t) => (typeof t === 'string' ? t.trim().toLowerCase() : '')));
  const combinedTags = [...existingTags];

  for (const tag of extracted.allTags) {
    const trimmed = typeof tag === 'string' ? tag.trim() : '';
    if (trimmed && !seen.has(trimmed.toLowerCase())) {
      seen.add(trimmed.toLowerCase());
      combinedTags.push(trimmed);
    }
  }

  return {
    ...opp,
    tags: combinedTags,
  };
}

/**
 * 프로필 서비스 DTO와 실제 공고 서비스가 반환하는 Opportunity 배열을 입력받아
 * 적합도 점수가 높은 순으로 정렬된 UI용 MatchResult[]를 산출합니다.
 *
 * @param profile 사용자 프로필 (ServiceUserProfile, ProfileUpsert, AlgorithmUserProfile 또는 null/undefined)
 * @param opportunities 공고 목록 배열 (불변성 보장)
 * @param options 기준 시각(currentDate) 및 태그 자동 보완(augmentTagsFromContent) 옵션
 * @returns 공통 MatchResult에 평가 가능 여부(evaluable)를 추가한 결과
 */
export function getRecommendedOpportunitiesForProfile(
  profile: ServiceUserProfile | ProfileUpsert | AlgorithmUserProfile | null | undefined,
  opportunities: Opportunity[],
  options?: ProfileRecommendationOptions
): (MatchResult & { evaluable: boolean })[] {
  // 1. 공고 배열 검증 (빈 배열이거나 비정상 입력 시 빈 결과 반환)
  if (!Array.isArray(opportunities) || opportunities.length === 0) {
    return [];
  }

  // 2. 프로필 변환 및 검증 (null이거나 유효하지 않은 프로필 시 빈 결과 반환)
  const algorithmProfile = resolveAlgorithmProfile(profile);
  if (!algorithmProfile) {
    return [];
  }

  const augment = options?.augmentTagsFromContent ?? true;
  const currentDate = options?.currentDate ?? new Date();

  // 3. 공고 불변성을 보존하며 필요 시 태그 보완
  const preparedOpportunities = opportunities.map((opp) => prepareOpportunity(opp, augment));

  // 4. 기존 공모전 맞춤 추천 알고리즘 실행
  const rawMatches = recommendOpportunities(algorithmProfile, preparedOpportunities, currentDate);

  // 공통 UI 결과에 공고 평가 가능 여부를 덧붙인다.
  return rawMatches.map((match) => ({ ...adaptOpportunityMatchToUi(match), evaluable: match.evaluable }));
}

/**
 * getRecommendedOpportunitiesForProfile의 별칭 함수입니다.
 */
export const recommendOpportunitiesForProfile = getRecommendedOpportunitiesForProfile;
