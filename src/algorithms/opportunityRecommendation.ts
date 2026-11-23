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
 * 공모전 추천 실행 옵션
 */
export interface RecommendOpportunitiesOptions {
  /**
   * deadline이 null인 공고 중 제목 또는 본문에 명시된 마감일시가 기준 시각보다 과거인 경우
   * 추천 후보에서 안전하게 제외할지 여부 (기본값: false - 기존 DB deadline 기준 동작 보존)
   */
  filterExplicitTextDeadline?: boolean;
}

/**
 * 텍스트(제목 및 설명)에서 명시적인 접수/신청/모집 마감일시를 엄격하게 추출합니다.
 *
 * [원칙]
 * 1. '마감', '접수 마감', '신청 마감', '모집 마감' 등 명확한 마감 키워드와 결합된 날짜만 인식합니다.
 * 2. '교육 기간', '행사 일시', '활동 기간' 등 행사 자체의 일정은 마감일로 오판하지 않습니다.
 * 3. '선착순 마감', '추후 공지', '상시 모집' 등 구체적 일시가 없는 자연어는 null을 반환합니다.
 * 4. 연도가 생략된 경우 postedAt의 연도를 기준으로 안전하게 보정하며, 기준이 불확실하면 null을 반환합니다.
 * 5. 시간대는 한국 표준시(Asia/Seoul, UTC+9)를 기준으로 계산합니다.
 * 6. 시간 단위가 생략된 경우 해당 일자의 마지막 순간(23:59:59.999 KST)으로 간주하여 조기 마감 오판을 방지합니다.
 *
 * @param title 공고 제목
 * @param description 공고 설명 또는 본문
 * @param postedAt 공고 게시 시각 (연도 추론 보조용)
 * @returns 추출된 마감 Date 객체 (Asia/Seoul 기준 파싱) 또는 null
 */
export function extractExplicitDeadline(
  title: string,
  description?: string,
  postedAt?: string | null
): Date | null {
  const text = `${title || ''} ${description || ''}`;
  if (!text.trim()) return null;

  // 비마감 일정 접두어 패턴: 행사/교육/활동 등의 자체 일정은 접수 마감일로 오판하지 않음
  const periodPrefix = /(?:교육|행사|활동|운영|수업|연수|대회|진행|축제|캠프)\s*(?:기간|일시|일정)\s*[:：]?\s*$/i;

  // 명시적 마감일 정규식 패턴 (한국어 공고에서 쓰이는 표준 형식)
  // 패턴 1: (~|까지)? 날짜 (시각)? 마감
  // 예: "~11월 9일 13시 마감", "~11.9.(월) 18:00 마감", "~2026.11.09 18시 마감", "~11/9 18:00 마감"
  const patternBefore = /(?:~|(?<=[^가-힣a-zA-Z0-9]|^))(?:(\d{4})[년./-]\s*)?(\d{1,2})[월./-]\s*(\d{1,2})일?(?:\s*\([월화수목금토일]\))?\s*(?:(\d{1,2})시(?:\s*(\d{1,2})분)?|(\d{1,2}):(\d{2}))?\s*(?:까지)?\s*(?:(?:접수|신청|모집|지원|제출|최종)\s*마감|마감(?=[^가-힣a-zA-Z0-9]|$))/gi;

  // 패턴 2: (접수|신청|모집|지원|제출|최종)? 마감:? (~|\b)? 날짜 (시각)?
  // 예: "접수 마감: 11월 9일 18시", "신청 마감: 2026-11-09 23:59", "최종 마감: 11월 20일 18:00"
  const patternAfter = /(?:접수|신청|모집|지원|제출|최종)?\s*마감\s*(?:일(?:시)?)?\s*[:：]\s*(?:~|\b)?\s*(?:(\d{4})[년./-]\s*)?(\d{1,2})[월./-]\s*(\d{1,2})일?(?:\s*\([월화수목금토일]\))?\s*(?:(\d{1,2})시(?:\s*(\d{1,2})분)?|(\d{1,2}):(\d{2}))?/gi;

  // 보조 함수: 매칭 결과로부터 KST Date 객체 파싱
  const parseMatchToDate = (matched: RegExpMatchArray): Date | null => {
    const rawYear = matched[1];
    const rawMonth = matched[2];
    const rawDay = matched[3];
    const rawHour = matched[4] ?? matched[6];
    const rawMinute = matched[5] ?? matched[7];

    const month = parseInt(rawMonth, 10);
    const day = parseInt(rawDay, 10);
    if (isNaN(month) || isNaN(day) || month < 1 || month > 12 || day < 1 || day > 31) {
      return null;
    }

    let year: number;
    if (rawYear) {
      year = parseInt(rawYear, 10);
      if (year < 2000 || year > 2100) return null;
    } else if (postedAt) {
      const parsedPosted = parseOpportunityTimestamp(postedAt);
      if (parsedPosted) {
        const postedDate = new Date(parsedPosted);
        if (Number.isFinite(postedDate.getTime())) {
          // Asia/Seoul 기준 연도 및 월 추출
          const postedKst = new Date(postedDate.getTime() + 9 * 60 * 60 * 1000);
          const postedYear = postedKst.getUTCFullYear();
          const postedMonth = postedKst.getUTCMonth() + 1;
          // 게시 시점이 연말(11~12월)이고 마감 월이 연초(1~2월)인 경우 다음 해로 처리
          if (postedMonth >= 11 && month <= 2) {
            year = postedYear + 1;
          } else if (postedMonth <= 2 && month >= 11) {
            // 게시 시점이 연초인데 마감 월이 연말이면 연도 추정이 모호하므로 null
            return null;
          } else if (Math.abs(month - postedMonth) > 6) {
            // 게시월과 마감월 차이가 6개월 이상 벌어지면 연도 추정이 불확실하므로 null
            return null;
          } else {
            year = postedYear;
          }
        } else {
          return null;
        }
      } else {
        return null;
      }
    } else {
      return null;
    }

    const leapYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
    const daysInMonth = [31, leapYear ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    if (day > daysInMonth[month - 1]) return null;

    const hasHour = rawHour !== undefined && rawHour !== null;
    const hour = hasHour ? parseInt(rawHour, 10) : 23;
    const minute = rawMinute !== undefined && rawMinute !== null ? parseInt(rawMinute, 10) : (hasHour ? 0 : 59);
    const second = hasHour ? 0 : 59;
    const millisecond = hasHour ? 0 : 999;

    if (isNaN(hour) || isNaN(minute) || hour < 0 || hour > 23 || minute < 0 || minute > 59) {
      return null;
    }

    // KST (UTC+9) Date 생성
    const kstOffsetMs = 9 * 60 * 60 * 1000;
    const localUtcMs = Date.UTC(year, month - 1, day, hour, minute, second, millisecond);
    const deadlineMs = localUtcMs - kstOffsetMs;
    const deadlineDate = new Date(deadlineMs);
    return Number.isFinite(deadlineDate.getTime()) ? deadlineDate : null;
  };

  const parsedDates: Date[] = [];

  for (const pattern of [patternBefore, patternAfter]) {
    for (const match of text.matchAll(pattern)) {
      const index = match.index ?? 0;
      const preceding = text.slice(Math.max(0, index - 25), index);
      if (periodPrefix.test(preceding)) continue;

      // 해석할 수 없는 마감일이 있으면 다른 날짜만으로 마감 여부를 확정하지 않는다.
      const parsed = parseMatchToDate(match);
      if (!parsed) return null;
      parsedDates.push(parsed);
    }
  }

  if (parsedDates.length === 0) return null;

  // 복수의 마감일이 존재할 경우 가장 늦은 마감일을 채택하여 조기 마감 오판 방지
  return parsedDates.reduce((latest, current) => (current.getTime() > latest.getTime() ? current : latest), parsedDates[0]);
}

/**
 * 공고의 deadline이 null인 경우에도, 제목 또는 설명에 명시된 접수 마감일이
 * 기준 시각(currentDate)보다 확실하게 과거인지 판정합니다.
 *
 * @param opp 검사할 공고 객체
 * @param currentDate 기준 시각
 * @returns 명시된 마감일이 존재하고 기준 시각보다 과거인 경우 true, 그 외(마감일 없거나 미래이거나 모호한 경우) false
 */
export function isExplicitlyExpiredInText(opp: Opportunity, currentDate: Date): boolean {
  if (!opp || opp.deadline !== null) {
    return false;
  }
  if (!Number.isFinite(currentDate.getTime())) {
    return false;
  }
  const explicitDeadline = extractExplicitDeadline(opp.title, opp.description, opp.postedAt);
  if (!explicitDeadline) {
    return false;
  }
  return explicitDeadline.getTime() < currentDate.getTime();
}

/**
 * 공고 목록에서 제목/본문에 명시된 마감일이 이미 지난 공고만 순수하게 필터링하여 제외합니다.
 * 모호한 표현, 행사 기간, 마감일 미정 공고는 그대로 보존합니다.
 *
 * @param opportunities 공고 목록
 * @param currentDate 기준 시각 (기본값: 현재 시각)
 * @returns 마감 경과 공고가 안전하게 제외된 새 공고 배열
 */
export function filterOpportunitiesByExplicitDeadline(
  opportunities: Opportunity[],
  currentDate: Date = new Date()
): Opportunity[] {
  if (!Array.isArray(opportunities)) return [];
  return opportunities.filter((opp) => !isExplicitlyExpiredInText(opp, currentDate));
}

/**
 * 공모전 맞춤 추천 메인 함수
 *
 * @param userProfile 학생의 프로필 정보 (관심 분야, 보유 기술, 학습 희망 기술)
 * @param opportunities 평가 대상 공모전 배열 (원본 배열을 수정하지 않음)
 * @param currentDate 마감일 판단을 위한 기준 시각 (테스트 시 주입 가능, 기본값: 현재 시각)
 * @param options 추가 옵션 (명시적 텍스트 마감일 필터링 등)
 * @returns 적합도 점수가 높은 순으로 정렬된 공모전 추천 결과 목록
 */
export function recommendOpportunities(
  userProfile: UserProfile,
  opportunities: Opportunity[],
  currentDate: Date = new Date(),
  options?: RecommendOpportunitiesOptions
): (OpportunityMatchResult & { evaluable: boolean })[] {
  if (!opportunities || opportunities.length === 0) {
    return [];
  }

  // 1. 모집 상태, 게시일 및 마감일 필터링
  // - active, needs_confirmation: 게시된 공고를 후보에 포함
  // - closed, draft: 제외
  // - postedAt이 기준 시각보다 미래인 게시 전 공고: 제외
  // - deadline이 실제로 지난 공고: 상태와 관계없이 제외
  // - deadline이 null인 경우: 마감 조건을 적용하지 않음 (단, filterExplicitTextDeadline=true 시 명시적 과거 마감일 제외)
  // - applicationStart가 미래인 공고: 게시 완료(postedAt <= currentDate) 상태이면 모집 예정으로 추천 허용
  const candidates = opportunities.filter((opp) => {
    if (opp.status !== 'active' && opp.status !== 'needs_confirmation') return false;
    if (!Number.isFinite(currentDate.getTime())) return false;
    const postedAt = parseOpportunityTimestamp(opp.postedAt);
    if (!postedAt || Date.parse(postedAt) > currentDate.getTime()) return false;
    if (opp.applicationStart !== null && !parseOpportunityTimestamp(opp.applicationStart)) return false;
    if (opp.deadline !== null) {
      const deadline = parseOpportunityTimestamp(opp.deadline);
      if (!deadline || Date.parse(deadline) < currentDate.getTime()) return false;
    } else if (options?.filterExplicitTextDeadline) {
      if (isExplicitlyExpiredInText(opp, currentDate)) return false;
    }
    return true;
  });

  if (candidates.length === 0) {
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
  const results = candidates.map((opp) => {
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
      evaluable: availableWeight > 0,
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
