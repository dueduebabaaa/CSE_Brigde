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

const KST_OFFSET_MINUTES = 9 * 60;

function parseDeadlineTime(text: string): { hour: number; minute: number; offsetMinutes: number } | null {
  const zone = /(?:UTC(?:[+-](?:\d{2}:?\d{2}|\d{1,2}))?|KST|Z|[+-]\d{2}:?\d{2})/gi;
  const zones = [...text.matchAll(zone)];
  if (zones.length > 1) return null;

  let offsetMinutes = KST_OFFSET_MINUTES;
  let clock = text;
  if (zones.length === 1) {
    const token = zones[0][0].toUpperCase();
    const index = zones[0].index ?? 0;
    if (index !== 0 && index + token.length !== text.length) return null;
    clock = (index === 0 ? text.slice(token.length) : text.slice(0, index)).trim();
    if (token !== 'KST') {
      const offset = token.replace(/^UTC/, '');
      offsetMinutes = 0;
      if (offset && offset !== 'Z') {
        const digits = offset.slice(1).replace(':', '');
        const hours = Number(digits.slice(0, 2));
        const minutes = Number(digits.slice(2));
        // -00:00은 현지 오프셋이 확인되지 않았음을 나타낸다.
        if (offset === '-00:00' || offset === '-0000' || hours > 23 || minutes > 59) return null;
        offsetMinutes = (hours * 60 + minutes) * (offset.startsWith('-') ? -1 : 1);
      }
    }
  }

  const match = /^(?:(오전|오후)\s*)?(\d{1,2})(?::(\d{2})|시(?:\s*(\d{1,2})분)?|\s*(?=[AP]M$))\s*(AM|PM)?$/i.exec(clock);
  if (!match || (match[1] && match[5])) return null;
  const [, koreanPeriod, rawHour, colonMinute, koreanMinute, englishPeriod] = match;
  const period = koreanPeriod ?? englishPeriod?.toUpperCase();
  let hour = Number(rawHour);
  const minute = Number(colonMinute ?? koreanMinute ?? 0);
  if (hour > 23 || minute > 59) return null;
  if (period) {
    if (hour < 1 || hour > 12) return null;
    hour = hour % 12 + (period === '오후' || period === 'PM' ? 12 : 0);
  }
  return { hour, minute, offsetMinutes };
}

function parseDeadlineDate(text: string, postedAt?: string | null): Date | null {
  const match = /^~?\s*(?:(\d{4})[년./-]\s*)?(\d{1,2})[월./-]\s*(\d{1,2})(?:일|\.(?=\s*\([월화수목금토일]\)))?(?:\s*\([월화수목금토일]\))?(.*)$/.exec(text);
  if (!match) return null;
  const [, rawYear, rawMonth, rawDay, timeText] = match;
  const month = Number(rawMonth);
  const day = Number(rawDay);
  if (month < 1 || month > 12 || day < 1) return null;

  let year = Number(rawYear);
  let postedTime: number | undefined;
  if (!rawYear) {
    const timestamp = postedAt && parseOpportunityTimestamp(postedAt);
    if (!timestamp) return null;
    postedTime = Date.parse(timestamp);
    const postedInSeoul = new Date(postedTime + KST_OFFSET_MINUTES * 60_000);
    const postedMonth = postedInSeoul.getUTCMonth() + 1;
    year = postedInSeoul.getUTCFullYear();
    if (postedMonth >= 11 && month <= 2) {
      year += 1;
    } else if (Math.abs(month - postedMonth) > 6) {
      return null;
    }
  }
  if (year < 2000 || year > 2100) return null;

  const leapYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const daysInMonth = [31, leapYear ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (day > daysInMonth[month - 1]) return null;

  // 날짜와 시각 사이의 구분자가 없으면 날짜 일부를 시각으로 해석하지 않는다.
  if (timeText && !/^[\sT]/.test(timeText)) return null;
  const clockText = timeText.replace(/^T/, '').trim()
    .replace(/\s*\((UTC(?:[+-]\d{1,2}(?::?\d{2})?)?|KST)\)$/i, ' $1');
  const time = clockText ? parseDeadlineTime(clockText) : {
    hour: 23, minute: 59, offsetMinutes: KST_OFFSET_MINUTES,
  };
  if (!time) return null;

  const utc = Date.UTC(year, month - 1, day, time.hour, time.minute, clockText ? 0 : 59, clockText ? 0 : 999);
  const deadline = utc - time.offsetMinutes * 60_000;
  if (postedTime !== undefined && deadline < postedTime) return null;
  return new Date(deadline);
}

/** 최종 접수 마감이 확실한 경우에만 제목 또는 본문에서 마감 시각을 반환한다. */
export function extractExplicitDeadline(
  title: string,
  description?: string,
  postedAt?: string | null
): Date | null {
  const applicationLabel = /(?:^|\()\s*(?:(\d+\s*차|최종)\s*)?(?:접수|신청|모집|지원)\s*마감(?:일(?:시)?)?(?:\s*[:：]\s*|\s+)(.+)$/;
  const finalLabel = /(?:^|\()\s*최종\s*마감(?:일(?:시)?)?(?:\s*[:：]\s*|\s+)(.+)$/;
  // 수집 공고의 제목에서 사용하는 독립된 괄호 표기만 일반 '마감'으로 인정한다.
  const titleDeadline = /\(\s*(~[^()]+(?:\([월화수목금토일]\)[^()]*)?)\s+마감\s*\)\s*$/;
  const unrelatedSchedule = /설문|만족도\s*조사|결과\s*발표|(?:교육|행사|활동|운영|수업|연수|대회|진행|축제|캠프)\s*(?:기간|일시|일정|종료|마감|일(?=\s*[:：]))/;
  const uncertainSchedule = /추후\s*(?:공지|안내)|별도(?:로)?\s*(?:공지|안내)|미정|연장|재개|추가\s*(?:접수|신청|지원|모집)|변경\s*(?:예정|가능)|선착순|상시\s*모집|충원\s*시|마감\s*시까지/;
  const deadlineContext = /마감|접수|신청|모집|지원/;

  const deadlines = new Set<number>();
  const finalDeadlines = new Set<number>();
  const roundDeadlines = new Set<number>();

  for (const [field, isTitle] of [[title, true], [description, false]] as const) {
    let hasApplicationLabel = false;
    let hasUnqualifiedFinal = false;
    for (const part of (field ?? '').split(/[\r\n,;]+/)) {
      const clause = part.trim();
      const application = applicationLabel.exec(clause);
      const final = finalLabel.exec(clause);
      if (uncertainSchedule.test(clause) && (deadlineContext.test(clause) || /연장|재개/.test(clause))) {
        return null;
      }
      if (unrelatedSchedule.test(clause)) continue;
      if (/^(?:UTC|KST|[A-Z]{2,5}\s*기준)\b/i.test(clause)) return null;

      const shorthand = isTitle ? titleDeadline.exec(clause) : null;
      const dateText = application?.[2] ?? final?.[1] ?? shorthand?.[1];
      if (!dateText) {
        // 지원 마감 안내가 있어도 형식이나 날짜를 해석할 수 없으면 다른 날짜에 의존하지 않는다.
        if (/(?:최종|\d+\s*차|접수|신청|모집|지원)\s*마감/.test(clause)) return null;
        continue;
      }

      const dateValue = dateText.replace(/\s*까지(?:\s*제출 바랍니다[.]?)?$/, '');
      const date = parseDeadlineDate(dateValue, postedAt)
        ?? (application || final
          ? parseDeadlineDate(dateValue.replace(/\s*\)$/, ''), postedAt)
          : null);
      if (!date) return null;
      if (application) hasApplicationLabel = true;
      if (final) hasUnqualifiedFinal = true;

      const stage = application?.[1];
      if (final || stage === '최종') {
        finalDeadlines.add(date.getTime());
      } else if (stage) {
        roundDeadlines.add(date.getTime());
      } else {
        deadlines.add(date.getTime());
      }
    }
    if (hasUnqualifiedFinal && !hasApplicationLabel) return null;
  }

  if (finalDeadlines.size > 0) {
    if (finalDeadlines.size !== 1) return null;
    const [final] = finalDeadlines;
    if ([...deadlines].some((deadline) => deadline !== final)) return null;
    if ([...roundDeadlines].some((deadline) => deadline > final)) return null;
    return new Date(final);
  }
  if (roundDeadlines.size > 0 || deadlines.size !== 1) return null;
  const [deadline] = deadlines;
  return new Date(deadline);
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
