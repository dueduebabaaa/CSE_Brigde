import { filterValidAvailabilities, isPublicAlgorithmCandidate } from './inputSafety';
/**
 * BRIDGE — 팀원 매칭 적합도 계산 알고리즘 (Member Matching)
 * 
 * 팀의 모집 요구사항(희망 역할, 요구 기술 스택)과 팀장의 활동 가능 시간표를 바탕으로
 * 후보 학생들의 프로필과 시간표를 비교하여 0~100점의 매칭 점수를 산출하고 최적의 팀원을 추천합니다.
 */

import { UserProfile, Availability } from '../types';
import { getCanonicalTag, formatWithJosa } from './tagClassification';

/**
 * 팀원 매칭 결과 인터페이스 (API_CONTRACT.md 3-2 준수)
 */
export interface MemberMatchResult {
  userId: string;
  score: number;                      // 0 ~ 100점 (반올림된 정수)
  roleMatch: boolean;                 // 모집 역할 일치 여부
  matchedTechStacks: string[];        // 실제 일치한 보유 기술 목록
  commonAvailableHoursWeekly: number; // 주간 공통 가능 시간 (시간 단위)
  reasons: string[];                  // 추천 이유 목록
}

/**
 * DATA_CONTRACT.md 3.3절: 공통 합의된 희망 역할 표준 11개 key
 */
export const STANDARD_ROLE_KEYS = [
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
] as const;

export type StandardRoleKey = (typeof STANDARD_ROLE_KEYS)[number];

/**
 * 역할(Role) 동의어 및 표준 명칭 매핑 사전
 * - 'Backend', 'Backend Developer', '백엔드' 등 동일한 역할을 일원화합니다.
 * - Frontend, Backend, ML, Mobile, DevOps, Security 등 도메인별 역할은 엄격히 구분합니다.
 */
export const ROLE_SYNONYM_MAP: Record<string, string> = {
  // 프론트엔드 (표준 key: Frontend)
  'frontend': 'Frontend Developer',
  'frontend developer': 'Frontend Developer',
  'frontend dev': 'Frontend Developer',
  'frontend lead': 'Frontend Developer',
  'frontend junior': 'Frontend Developer',
  '프론트엔드': 'Frontend Developer',
  '프론트엔드 개발자': 'Frontend Developer',
  '프론트엔드 개발': 'Frontend Developer',
  'fe': 'Frontend Developer',
  '웹 프론트': 'Frontend Developer',

  // 백엔드 (표준 key: Backend)
  'backend': 'Backend Developer',
  'backend developer': 'Backend Developer',
  'backend dev': 'Backend Developer',
  '백엔드': 'Backend Developer',
  '백엔드 개발자': 'Backend Developer',
  '백엔드 개발': 'Backend Developer',
  'be': 'Backend Developer',
  '서버 개발자': 'Backend Developer',

  // 풀스택
  'fullstack': 'FullStack Developer',
  'fullstack developer': 'FullStack Developer',
  'full stack': 'FullStack Developer',
  '풀스택': 'FullStack Developer',
  '풀스택 개발자': 'FullStack Developer',
  'tech lead': 'Tech Lead',

  // 모바일 (표준 key: Mobile)
  'mobile': 'Mobile App Developer',
  'mobile app': 'Mobile App Developer',
  'mobile app developer': 'Mobile App Developer',
  'mobile developer': 'Mobile App Developer',
  '모바일': 'Mobile App Developer',
  '모바일 개발자': 'Mobile App Developer',
  '모바일 앱 개발자': 'Mobile App Developer',
  'ios developer': 'Mobile App Developer',
  'android developer': 'Mobile App Developer',
  'ios': 'Mobile App Developer',
  'android': 'Mobile App Developer',

  // 인공지능 / 데이터 (표준 key: AI/ML, Data)
  'ai/ml': 'ML Engineer',
  'ai / ml': 'ML Engineer',
  'ml engineer': 'ML Engineer',
  'machine learning engineer': 'ML Engineer',
  'ml lead': 'ML Engineer',
  '머신러닝 엔지니어': 'ML Engineer',
  'ai engineer': 'ML Engineer',
  'ai 개발자': 'ML Engineer',
  'ai': 'ML Engineer',
  '인공지능': 'ML Engineer',
  'data': 'Data Scientist',
  'data scientist': 'Data Scientist',
  '데이터 사이언티스트': 'Data Scientist',
  'data analyst': 'Data Analyst',
  '데이터 분석가': 'Data Analyst',
  '데이터': 'Data Scientist',
  'dba': 'DBA',

  // 데브옵스 / 시스템 (표준 key: DevOps)
  'devops': 'DevOps Engineer',
  'devops engineer': 'DevOps Engineer',
  'devops / infra': 'DevOps Engineer',
  '데브옵스': 'DevOps Engineer',
  '인프라': 'DevOps Engineer',
  'system programmer': 'System Programmer',
  '시스템 프로그래머': 'System Programmer',

  // 정보보안 (표준 key: Security)
  'security': 'Security Engineer',
  'security engineer': 'Security Engineer',
  'security analyst': 'Security Engineer',
  'security lead': 'Security Engineer',
  '정보보안': 'Security Engineer',
  '보안': 'Security Engineer',
  '화이트햇': 'Security Engineer',

  // 디자인 / 기획 (표준 key: UI/UX, PM/기획)
  'ui/ux': 'UI/UX Designer',
  'ui/ux 디자인': 'UI/UX Designer',
  'ui/ux designer': 'UI/UX Designer',
  'ui/ux lead': 'UI/UX Designer',
  'ui/ux 디자이너': 'UI/UX Designer',
  'ux 엔지니어': 'UI/UX Designer',
  'pm/기획': 'Product Manager',
  'pm / 서비스 기획': 'Product Manager',
  'product manager': 'Product Manager',
  'pm': 'Product Manager',
  '서비스 기획': 'Product Manager',
  '기획자': 'Product Manager',
  '기획': 'Product Manager',
  'qa': 'QA Engineer',
  'research / qa': 'QA Engineer',

  // 마케팅 (표준 key: Marketing)
  'marketing': 'Marketing',
  'marketing / 홍보': 'Marketing',
  '마케팅': 'Marketing',
  '마케팅 / 홍보': 'Marketing',
  '홍보': 'Marketing',
  '마케터': 'Marketing',

  // 기타 (표준 key: 기타)
  '기타': '기타',
  '기타 역할': '기타',
  'other': '기타',
  'etc': '기타',
};

/**
 * 11개 표준 역할 key(A 기준) 매핑 사전
 */
export const TO_STANDARD_ROLE_KEY_MAP: Record<string, StandardRoleKey> = {
  'frontend': 'Frontend',
  'frontend developer': 'Frontend',
  'frontend dev': 'Frontend',
  '프론트엔드': 'Frontend',
  '프론트엔드 개발자': 'Frontend',
  'fe': 'Frontend',

  'backend': 'Backend',
  'backend developer': 'Backend',
  'backend dev': 'Backend',
  '백엔드': 'Backend',
  '백엔드 개발자': 'Backend',
  'be': 'Backend',

  'ai/ml': 'AI/ML',
  'ai': 'AI/ML',
  'ml': 'AI/ML',
  'ml engineer': 'AI/ML',
  'ai engineer': 'AI/ML',
  '머신러닝 엔지니어': 'AI/ML',
  '인공지능': 'AI/ML',

  'data': 'Data',
  'data scientist': 'Data',
  'data analyst': 'Data',
  '데이터 사이언티스트': 'Data',
  '데이터 분석가': 'Data',
  '데이터': 'Data',

  'ui/ux': 'UI/UX',
  'ui/ux designer': 'UI/UX',
  'ui/ux 디자인': 'UI/UX',
  '디자이너': 'UI/UX',

  'pm/기획': 'PM/기획',
  'pm': 'PM/기획',
  'product manager': 'PM/기획',
  '서비스 기획': 'PM/기획',
  '기획자': 'PM/기획',

  'mobile': 'Mobile',
  'mobile app developer': 'Mobile',
  'mobile developer': 'Mobile',
  '모바일': 'Mobile',
  '모바일 앱 개발자': 'Mobile',
  'ios': 'Mobile',
  'android': 'Mobile',

  'devops': 'DevOps',
  'devops engineer': 'DevOps',
  '데브옵스': 'DevOps',
  '인프라': 'DevOps',

  'security': 'Security',
  'security engineer': 'Security',
  '정보보안': 'Security',
  '보안': 'Security',

  'marketing': 'Marketing',
  '마케팅': 'Marketing',
  '마케터': 'Marketing',
  '홍보': 'Marketing',

  '기타': '기타',
  'other': '기타',
  'etc': '기타',
};

/**
 * 임의의 역할 명칭을 A의 11개 표준 역할 key(Frontend, Backend 등)로 변환합니다.
 * '기타'에 직접 입력된 자유 문자열(예: 'DBA', '블록체인')은 원본 문자열을 보존합니다.
 */
export function normalizeRoleToStandardKey(role: string): string {
  if (!role) return '';
  const cleaned = role.normalize('NFKC').trim().replace(/\s+/g, ' ').toLowerCase();
  return TO_STANDARD_ROLE_KEY_MAP[cleaned] ?? role.trim();
}

/**
 * 역할 명칭을 정규화하여 표준 역할명을 반환합니다.
 * 사용자가 직접 입력한 역할 명칭은 삭제하거나 임의 변환하지 않고 원본을 보존합니다.
 */
export function normalizeRole(role: string): string {
  if (!role) return '';
  const cleaned = role.normalize('NFKC').trim().replace(/\s+/g, ' ').toLowerCase();
  return ROLE_SYNONYM_MAP[cleaned] ?? role.trim();
}

/**
 * 두 역할 명칭이 동일한 역할 군(동의어 또는 11개 표준 key 기준)에 속하는지 판별합니다.
 */
export function isSameRole(roleA: string, roleB: string): boolean {
  if (!roleA || !roleB) return false;
  const normA = normalizeRole(roleA).toLowerCase();
  const normB = normalizeRole(roleB).toLowerCase();
  if (normA === normB) return true;

  const stdA = normalizeRoleToStandardKey(roleA).toLowerCase();
  const stdB = normalizeRoleToStandardKey(roleB).toLowerCase();
  return stdA === stdB;
}

/**
 * 시간표 목록에서 유효한 슬롯 집합(Set)을 추출합니다.
 * - dayOfWeek: 0(일) ~ 6(토)의 정수 (소수, NaN, 음수 필터링)
 * - slot: 0 ~ 47의 정수 (30분 단위)
 * - isAvailable: true
 * - 중복 슬롯 자동 제거
 */
function extractAvailableSlotKeys(availabilities: Availability[] | undefined): Set<string> {
  const slotSet = new Set<string>();
  if (!availabilities || availabilities.length === 0) {
    return slotSet;
  }

  for (const item of filterValidAvailabilities(availabilities)) {
    if (
      item &&
      item.isAvailable &&
      typeof item.dayOfWeek === 'number' &&
      Number.isInteger(item.dayOfWeek) &&
      item.dayOfWeek >= 0 &&
      item.dayOfWeek <= 6 &&
      typeof item.slot === 'number' &&
      Number.isInteger(item.slot) &&
      item.slot >= 0 &&
      item.slot <= 47
    ) {
      slotSet.add(`${item.dayOfWeek}_${item.slot}`);
    }
  }

  return slotSet;
}

/**
 * 팀원 매칭 적합도 계산 메인 함수
 * 
 * @param targetRequirements 팀이 모집하는 희망 역할 및 요구 기술 스택
 * @param myAvailability 팀장(기준 학생)의 활동 가능 시간표
 * @param candidates 추천 대상 후보 학생들(프로필 및 시간표)
 * @returns 역할 일치 여부 및 점수순으로 정렬된 매칭 결과 목록
 */
export function calculateMemberMatch(
  targetRequirements: {
    desiredRoles: string[];
    requiredTechStacks: string[];
  },
  myAvailability: Availability[],
  candidates: {
    profile: UserProfile;
    availability: Availability[];
  }[]
): MemberMatchResult[] {
  if (!candidates || candidates.length === 0) {
    return [];
  }

  // 1. 후보 학생 중복 방지 및 비공개 프로필 필터링
  // - profile.isPublic === false인 학생은 추천에서 제외
  // - 동일한 userId가 중복 입력된 경우 첫 번째 항목만 유지
  const seenUserIds = new Set<string>();
  const validCandidates = candidates.filter((c) => {
    if (!c.profile || !c.profile.id) return false;
    if (!isPublicAlgorithmCandidate(c.profile)) return false;
    if (seenUserIds.has(c.profile.id)) return false;
    seenUserIds.add(c.profile.id);
    return true;
  });

  if (validCandidates.length === 0) {
    return [];
  }

  // 2. 팀의 요구사항 정규화 (불변성 유지)
  const reqRoles = Array.from(
    new Set(
      (targetRequirements?.desiredRoles ?? [])
        .map((r) => normalizeRole(r))
        .filter((r) => r.length > 0)
    )
  );

  const reqTechs = Array.from(
    new Set(
      (targetRequirements?.requiredTechStacks ?? [])
        .map((t) => getCanonicalTag(t))
        .filter((t) => t.length > 0)
    )
  );

  const reqTechMap = new Map(reqTechs.map((t) => [t.toLowerCase(), t]));

  // 3. 팀장(기준 유저)의 유효 가능 슬롯 집합 추출
  const mySlots = extractAvailableSlotKeys(myAvailability);
  // 팀장의 시간표 등록 여부 (유효한 가능 슬롯이 1개 이상 있는지)
  const isMyScheduleRegistered = mySlots.size > 0;

  // 4. 각 후보 학생에 대해 적합도 점수 계산
  const results: MemberMatchResult[] = validCandidates.map((candidate) => {
    const { profile, availability } = candidate;

    // (1) 희망 역할 일치도 검증
    const candidateRoles = (profile.desiredRoles ?? [])
      .map((r) => normalizeRole(r))
      .filter((r) => r.length > 0);

    const matchedRoleNames: string[] = [];
    for (const candRole of candidateRoles) {
      for (const reqRole of reqRoles) {
        if (isSameRole(candRole, reqRole)) {
          matchedRoleNames.push(reqRole);
          break;
        }
      }
    }
    const roleMatch = matchedRoleNames.length > 0;

    // (2) 보유 기술 일치도 검증
    // candidate.profile.techStacks (wantedTechStacks는 미포함)
    const candidateTechs = Array.from(
      new Set(
        (profile.techStacks ?? [])
          .map((t) => getCanonicalTag(t))
          .filter((t) => t.length > 0)
      )
    );

    const matchedTechs: string[] = [];
    for (const tech of candidateTechs) {
      const lower = tech.toLowerCase();
      if (reqTechMap.has(lower)) {
        matchedTechs.push(reqTechMap.get(lower) ?? tech);
      }
    }

    // (3) 공통 활동 가능 시간 계산
    const candidateSlots = extractAvailableSlotKeys(availability);
    const isCandidateScheduleRegistered = candidateSlots.size > 0;

    let commonSlotCount = 0;
    for (const slotKey of mySlots) {
      if (candidateSlots.has(slotKey)) {
        commonSlotCount++;
      }
    }
    // 슬롯 1개당 30분(0.5시간)
    const commonAvailableHoursWeekly = commonSlotCount * 0.5;

    // (4) 점수 계산 및 가중치 동적 재조정
    // 기본 가중치: 역할(45점), 기술(30점), 시간(25점) = 총 100점
    const isRoleEvaluable = reqRoles.length > 0;
    const isTechEvaluable = reqTechs.length > 0;
    // 시간 평가는 팀장과 후보 학생 모두 시간표를 등록했을 때만 가능
    const isTimeEvaluable = isMyScheduleRegistered && isCandidateScheduleRegistered;

    let availableWeight = 0;
    if (isRoleEvaluable) availableWeight += 45;
    if (isTechEvaluable) availableWeight += 30;
    if (isTimeEvaluable) availableWeight += 25;

    let finalScore = 0;
    const reasons: string[] = [];

    if (availableWeight === 0) {
      // 모든 평가 항목이 누락된 경우
      finalScore = 0;
      reasons.push('평가에 필요한 모집 조건 및 활동 정보가 부족하여 매칭 점수를 계산할 수 없습니다.');
    } else {
      const scale = 100 / availableWeight;
      const weightRole = isRoleEvaluable ? 45 * scale : 0;
      const weightTech = isTechEvaluable ? 30 * scale : 0;
      const weightTime = isTimeEvaluable ? 25 * scale : 0;

      // ① 희망 역할 점수 (일치 시 만점, 불일치 시 0점)
      const roleScore = isRoleEvaluable ? (roleMatch ? weightRole : 0) : 0;

      // ② 보유 기술 점수 (일치 기술 수 / 요구 기술 수)
      const techScore = isTechEvaluable
        ? weightTech * (matchedTechs.length / reqTechs.length)
        : 0;

      // ③ 공통 활동 시간 점수 (25점 * min(공통 시간 / 4, 1))
      const timeScore = isTimeEvaluable
        ? weightTime * Math.min(commonAvailableHoursWeekly / 4, 1)
        : 0;

      const rawTotal = roleScore + techScore + timeScore;
      finalScore = Math.round(Math.min(100, Math.max(0, rawTotal)));

      // (5) 추천 이유 생성
      // 역할 추천 이유
      if (roleMatch) {
        const displayRole = matchedRoleNames[0];
        reasons.push(`모집 중인 ${formatWithJosa(displayRole, '과/와')} 일치합니다.`);
      }

      // 기술 추천 이유
      if (isTechEvaluable && matchedTechs.length > 0) {
        const techStr = matchedTechs.join(', ');
        reasons.push(
          `요구 기술 ${reqTechs.length}개 중 ${formatWithJosa(techStr, '을/를')} 보유하고 있습니다.`
        );
      }

      // 시간 추천 이유
      if (!isTimeEvaluable) {
        // 시간표 미등록 상태
        reasons.push('활동 가능 시간 확인이 필요합니다.');
      } else if (commonAvailableHoursWeekly > 0) {
        reasons.push(`매주 ${commonAvailableHoursWeekly}시간의 공통 활동 가능 시간이 있습니다.`);
      } else {
        reasons.push('공통 활동 가능 시간이 없습니다.');
      }

      // 일치 사항이 전혀 없는 경우의 기본 안내
      if (reasons.length === 0) {
        reasons.push('현재 모집 조건과 직접 일치하는 항목은 없으나, 잠재적 역량을 가진 후보입니다.');
      }
    }

    return {
      userId: profile.id,
      score: finalScore,
      roleMatch,
      matchedTechStacks: matchedTechs,
      commonAvailableHoursWeekly,
      reasons,
    };
  });

  // 5. 추천 후보 정렬
  // 1순위: 모집 역할과 일치하는 학생 (roleMatch === true 우선)
  // 2순위: 동일 역할 일치 그룹 내에서 점수 내림차순 (score 높은 순)
  // 3순위: 동점 시 userId 오름차순 (결정론적 일관성 보장)
  results.sort((a, b) => {
    // 역할 일치 학생 우선 정렬
    if (a.roleMatch !== b.roleMatch) {
      return a.roleMatch ? -1 : 1;
    }
    // 점수 내림차순
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    // 동점자 안정 정렬 (userId 기준)
    return a.userId.localeCompare(b.userId);
  });

  return results;
}
