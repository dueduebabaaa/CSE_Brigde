/**
 * BRIDGE — 팀 빌더 역량 균형도 분석 알고리즘 (Team Analyzer)
 * 
 * 현재 팀원들의 희망 역할과 기술 스택을 분석하여
 * 1. 6개 기술 분야별 레이더 차트 커버리지 점수(0~100점)
 * 2. 충족된 역할과 부족한 역할 분석 (1인 1역할 최대 매칭)
 * 3. 역할 균형 여부 및 안내 경고 메시지
 * 4. 부족한 역할을 보완할 수 있는 최적의 후보 인재 추천
 * 을 산출합니다.
 * 
 * [주의사항]
 * UserProfile.desiredRoles는 학생이 희망하는 역할이지 확정된 실제 담당 역할이 아닙니다.
 * 팀 내 실제 확정된 담당 역할을 기준으로 분석하려면 TeamMember.role 데이터를 전달받아야 합니다.
 */

import { UserProfile } from '../types';
import { getCanonicalTag } from './tagClassification';

/**
 * 레이더 차트 6개 핵심 분석 분야
 */
export type TechSubject =
  | 'Frontend'
  | 'Backend'
  | 'Database'
  | 'AI/Data'
  | 'DevOps'
  | 'UI/UX';

export const ALL_TECH_SUBJECTS: TechSubject[] = [
  'Frontend',
  'Backend',
  'Database',
  'AI/Data',
  'DevOps',
  'UI/UX',
];

/**
 * 레이더 차트 점수 인터페이스 (API_CONTRACT.md 3-3 준수)
 */
export interface RadarChartScore {
  subject: TechSubject;
  score: number;      // 0 ~ 100점 (기술 보유 범위 지표)
  fullMark: 100;
}

/**
 * 팀 빌더 역량 균형도 분석 결과 인터페이스 (API_CONTRACT.md 3-3 준수)
 */
export interface TeamBalanceAnalysisResult {
  radarData: RadarChartScore[];
  coveredRoles: string[];
  missingRoles: string[];
  isBalanced: boolean;
  warnings: string[];
  recommendedCandidates: {
    candidateProfile: UserProfile;
    fitScore: number;       // 0 ~ 100점 (부족한 역할 보완 적합도)
    complementRole: string; // 보완 가능한 부족 역할
  }[];
}

/**
 * 기술 스택 -> 6개 기술 분야 매핑 테이블
 * (대소문자 정규화된 canonical 기술 기준)
 */
export const TECH_TO_SUBJECT_MAP: Record<string, TechSubject[]> = {
  // Frontend
  'react': ['Frontend'],
  'vue': ['Frontend'],
  'next.js': ['Frontend'],
  'typescript': ['Frontend'],
  'javascript': ['Frontend'],
  'html/css': ['Frontend'],
  'tailwindcss': ['Frontend'],
  'flutter': ['Frontend'],
  'react native': ['Frontend'],
  'three.js': ['Frontend'],
  'framer motion': ['Frontend'],
  'dart': ['Frontend'],

  // Backend
  'java': ['Backend'],
  'spring boot': ['Backend'],
  'node.js': ['Backend'],
  'fastapi': ['Backend'],
  'go': ['Backend'],
  'python': ['Backend', 'AI/Data'], // Python은 백엔드 및 AI/데이터 양쪽에서 주요 활용
  'c++': ['Backend'],
  'c': ['Backend'],
  'rust': ['Backend'],
  'graphql': ['Backend', 'Frontend'],
  'api': ['Backend'],

  // Database
  'postgresql': ['Database'],
  'mysql': ['Database'],
  'redis': ['Database'],
  'sql': ['Database'],
  'supabase': ['Database'],
  'firebase': ['Database'],
  'bigquery': ['Database', 'AI/Data'],

  // AI / Data
  'pytorch': ['AI/Data'],
  'tensorflow': ['AI/Data'],
  'pandas': ['AI/Data'],
  'huggingface': ['AI/Data'],
  'r': ['AI/Data'],
  'tableau': ['AI/Data'],
  'ai sdk': ['AI/Data'],

  // DevOps
  'docker': ['DevOps'],
  'kubernetes': ['DevOps'],
  'aws': ['DevOps'],
  'terraform': ['DevOps'],
  'linux': ['DevOps'],
  'github': ['DevOps'],
  'git': ['DevOps'],
  'github actions': ['DevOps'],
  'grafana': ['DevOps'],
  'kafka': ['DevOps', 'Backend'],
  'burp suite': ['DevOps'],
  'wireshark': ['DevOps'],

  // UI/UX
  'figma': ['UI/UX'],
  'adobe xd': ['UI/UX'],
};

/**
 * 역할 명칭을 6개 표준 도메인 분야로 정규화 매핑합니다.
 */
export function normalizeRoleToSubject(roleName: string): TechSubject | null {
  if (!roleName) return null;
  const cleaned = roleName.trim().toLowerCase().replace(/\s+/g, ' ');

  // Frontend
  if (
    cleaned === 'frontend' ||
    cleaned.includes('frontend') ||
    cleaned.includes('프론트엔드') ||
    cleaned.includes('웹 프론트') ||
    cleaned === 'fe'
  ) {
    return 'Frontend';
  }

  // Backend
  if (
    cleaned === 'backend' ||
    cleaned.includes('backend') ||
    cleaned.includes('백엔드') ||
    cleaned.includes('서버 개발') ||
    cleaned === 'be'
  ) {
    return 'Backend';
  }

  // Database
  if (
    cleaned === 'database' ||
    cleaned.includes('database') ||
    cleaned.includes('데이터베이스') ||
    cleaned === 'dba'
  ) {
    return 'Database';
  }

  // AI/Data
  if (
    cleaned === 'ai/data' ||
    cleaned.includes('ai') ||
    cleaned.includes('인공지능') ||
    cleaned.includes('머신러닝') ||
    cleaned.includes('ml') ||
    cleaned.includes('data') ||
    cleaned.includes('데이터')
  ) {
    return 'AI/Data';
  }

  // DevOps
  if (
    cleaned === 'devops' ||
    cleaned.includes('devops') ||
    cleaned.includes('데브옵스') ||
    cleaned.includes('인프라') ||
    cleaned.includes('system') ||
    cleaned.includes('시스템') ||
    cleaned.includes('security') ||
    cleaned.includes('보안')
  ) {
    return 'DevOps';
  }

  // UI/UX
  if (
    cleaned === 'ui/ux' ||
    cleaned.includes('ui/ux') ||
    cleaned.includes('디자인') ||
    cleaned.includes('designer') ||
    cleaned.includes('디자이너') ||
    cleaned.includes('ux')
  ) {
    return 'UI/UX';
  }

  return null;
}

/**
 * 학생의 희망 역할 목록으로부터 담당 가능한 표준 분야 목록을 도출합니다.
 * (FullStack의 경우 Frontend와 Backend 모두 수행 가능 분야로 등록)
 */
export function getCandidateCapableSubjects(roles: string[] | undefined): TechSubject[] {
  const subjects = new Set<TechSubject>();
  if (!roles) return [];

  for (const r of roles) {
    const cleaned = r.trim().toLowerCase();
    if (cleaned.includes('fullstack') || cleaned.includes('풀스택')) {
      subjects.add('Frontend');
      subjects.add('Backend');
      continue;
    }

    const matched = normalizeRoleToSubject(r);
    if (matched) {
      subjects.add(matched);
    }
  }

  return Array.from(subjects);
}

/**
 * 최대 이분 매칭 (Maximum Bipartite Matching)
 * 
 * 한 팀원이 하나의 필수 역할만 담당하도록 1인 1역할을 엄격히 배정하여
 * 충족할 수 있는 최대 필수 역할 개수 및 배정 결과를 산출합니다.
 */
function solveMaximumRoleAssignment(
  memberCapableRoles: TechSubject[][],
  requiredRoles: TechSubject[]
): {
  coveredRoles: TechSubject[];
  missingRoles: TechSubject[];
} {
  const numMembers = memberCapableRoles.length;
  const numRoles = requiredRoles.length;

  if (numMembers === 0 || numRoles === 0) {
    return {
      coveredRoles: [],
      missingRoles: [...requiredRoles],
    };
  }

  // roleIndex -> memberIndex (-1은 아직 미배정)
  const roleMatch = new Array<number>(numRoles).fill(-1);

  function dfs(memberIdx: number, visitedRoles: boolean[]): boolean {
    const capable = memberCapableRoles[memberIdx];
    for (let rIdx = 0; rIdx < numRoles; rIdx++) {
      const reqRole = requiredRoles[rIdx];
      if (capable.includes(reqRole) && !visitedRoles[rIdx]) {
        visitedRoles[rIdx] = true;

        // 해당 역할이 비어있거나, 기존에 배정된 학생이 다른 역할로 옮길 수 있는 경우
        if (roleMatch[rIdx] === -1 || dfs(roleMatch[rIdx], visitedRoles)) {
          roleMatch[rIdx] = memberIdx;
          return true;
        }
      }
    }
    return false;
  }

  for (let mIdx = 0; mIdx < numMembers; mIdx++) {
    const visitedRoles = new Array<boolean>(numRoles).fill(false);
    dfs(mIdx, visitedRoles);
  }

  const coveredRoles: TechSubject[] = [];
  const missingRoles: TechSubject[] = [];

  for (let rIdx = 0; rIdx < numRoles; rIdx++) {
    if (roleMatch[rIdx] !== -1) {
      coveredRoles.push(requiredRoles[rIdx]);
    } else {
      missingRoles.push(requiredRoles[rIdx]);
    }
  }

  return { coveredRoles, missingRoles };
}

/**
 * 팀원들의 기술 스택을 바탕으로 6대 분야 레이더 차트 점수를 계산합니다.
 * 
 * [점수 산정 기준]
 * 숙련도를 임의 추정하지 않고, 팀 전체가 보유한 고유 기술 개수(기술 커버리지 범위)를 기준으로 환산합니다.
 * - 0개: 0점 (해당 분야 기술 전무)
 * - 1개: 35점 (기초 기술 확보)
 * - 2개: 65점 (실무 개발에 필요한 복수 기술 스택 구성 가능)
 * - 3개: 85점 (충분한 기술 다양성 확보)
 * - 4개 이상: 100점 (광범위한 기술 커버리지 완성)
 */
function calculateRadarScores(teamMembers: UserProfile[]): RadarChartScore[] {
  // 팀 전체의 고유 기술 스택 집합 (대소문자/동의어 정규화 및 중복 제거)
  const uniqueTeamTechs = new Set<string>();
  for (const member of teamMembers) {
    for (const tech of member.techStacks ?? []) {
      const canonical = getCanonicalTag(tech);
      if (canonical) {
        uniqueTeamTechs.add(canonical.toLowerCase());
      }
    }
  }

  // 분야별 보유 고유 기술 카운트
  const subjectTechCount: Record<TechSubject, number> = {
    'Frontend': 0,
    'Backend': 0,
    'Database': 0,
    'AI/Data': 0,
    'DevOps': 0,
    'UI/UX': 0,
  };

  for (const tech of uniqueTeamTechs) {
    const subjects = TECH_TO_SUBJECT_MAP[tech];
    if (subjects) {
      for (const subj of subjects) {
        subjectTechCount[subj]++;
      }
    }
  }

  function getScoreByCount(count: number): number {
    if (count <= 0) return 0;
    if (count === 1) return 35;
    if (count === 2) return 65;
    if (count === 3) return 85;
    return 100;
  }

  return ALL_TECH_SUBJECTS.map((subject) => ({
    subject,
    score: getScoreByCount(subjectTechCount[subject]),
    fullMark: 100,
  }));
}

/**
 * 부족한 역할(missingRoles)을 보완할 수 있는 최적의 후보 학생들을 추천합니다.
 * 
 * [후보 선정 및 fitScore 산출 기준 (0~100점)]
 * 1. profile.isPublic === true인 공개 프로필만 대상
 * 2. 현재 팀원(teamMembers)에 이미 속한 학생은 제외
 * 3. 동일 후보 중복 추천 방지
 * 4. 점수 배점 (역할 충족 기여도를 기술 보유보다 우선):
 *    - 부족한 역할과 희망 역할이 직접 일치하는 경우: 60점 (역할 기여도)
 *    - 해당 보완 분야의 기술 보유 개수(1개: 15점, 2개: 30점, 3개 이상: 40점): 최대 40점
 *    - 최대 100점 만점으로 정수 반환
 */
function findRecommendedCandidates(
  missingRoles: TechSubject[],
  teamMembers: UserProfile[],
  candidatesPool: UserProfile[]
): TeamBalanceAnalysisResult['recommendedCandidates'] {
  if (missingRoles.length === 0 || !candidatesPool || candidatesPool.length === 0) {
    return [];
  }

  const teamMemberIds = new Set(teamMembers.map((m) => m.id));

  // 고유 후보 필터링 (공개 프로필 & 팀 미소속)
  const seenIds = new Set<string>();
  const validCandidates = candidatesPool.filter((c) => {
    if (!c || !c.id) return false;
    if (c.isPublic === false) return false;
    if (teamMemberIds.has(c.id)) return false;
    if (seenIds.has(c.id)) return false;
    seenIds.add(c.id);
    return true;
  });

  const recommendations: TeamBalanceAnalysisResult['recommendedCandidates'] = [];

  for (const candidate of validCandidates) {
    const capableSubjects = getCandidateCapableSubjects(candidate.desiredRoles);
    // 후보 학생의 기술 스택 분야 매핑
    const candidateTechSubjects = new Set<TechSubject>();
    for (const tech of candidate.techStacks ?? []) {
      const canonical = getCanonicalTag(tech).toLowerCase();
      const mapped = TECH_TO_SUBJECT_MAP[canonical];
      if (mapped) {
        for (const s of mapped) {
          candidateTechSubjects.add(s);
        }
      }
    }

    // 후보가 채워줄 수 있는 부족한 역할 찾기
    for (const missing of missingRoles) {
      const hasRoleMatch = capableSubjects.includes(missing);
      const hasTechMatch = candidateTechSubjects.has(missing);

      // 부족한 역할을 희망하거나 해당 분야 기술을 가진 경우 추천 대상
      if (hasRoleMatch || hasTechMatch) {
        // 역할 기여도 (60점 vs 20점)
        const roleScore = hasRoleMatch ? 60 : 20;

        // 기술 기여도 (최대 40점)
        let relevantTechCount = 0;
        for (const tech of candidate.techStacks ?? []) {
          const canonical = getCanonicalTag(tech).toLowerCase();
          if (TECH_TO_SUBJECT_MAP[canonical]?.includes(missing)) {
            relevantTechCount++;
          }
        }
        let techScore = 0;
        if (relevantTechCount === 1) techScore = 15;
        else if (relevantTechCount === 2) techScore = 30;
        else if (relevantTechCount >= 3) techScore = 40;

        const fitScore = Math.min(100, roleScore + techScore);

        recommendations.push({
          candidateProfile: candidate,
          fitScore,
          complementRole: missing,
        });

        // 한 학생은 가장 적합한 부족 역할 하나에 매핑
        break;
      }
    }
  }

  // fitScore 내림차순 및 candidateProfile.id 오름차순 안정 정렬
  recommendations.sort((a, b) => {
    if (b.fitScore !== a.fitScore) {
      return b.fitScore - a.fitScore;
    }
    return a.candidateProfile.id.localeCompare(b.candidateProfile.id);
  });

  return recommendations;
}

/**
 * 한국어 경고 및 균형 상태 안내 메시지를 생성합니다.
 */
function generateWarnings(
  hasExplicitRoles: boolean,
  missingRoles: TechSubject[],
  teamMembers: UserProfile[]
): string[] {
  const warnings: string[] = [];

  if (teamMembers.length === 0) {
    warnings.push('현재 등록된 팀원이 없습니다. 팀원을 구성해 주세요.');
    return warnings;
  }

  // 1. 필수 역할 목록이 주어지지 않은 경우
  if (!hasExplicitRoles) {
    warnings.push(
      '프로젝트 필수 역할 정보가 없어 부족한 역할을 확정할 수 없습니다. (역할 균형 미판정)'
    );
    return warnings;
  }

  // 2. 필수 역할 목록이 주어진 경우
  if (missingRoles.length === 0) {
    warnings.push('프로젝트 필수 역할이 모두 충족되었습니다.');
  } else {
    // 부족한 역할별 한국어 명칭 안내
    const koreanRoleNames: Record<TechSubject, string> = {
      'Frontend': '프론트엔드',
      'Backend': '백엔드',
      'Database': '데이터베이스',
      'AI/Data': 'AI/데이터',
      'DevOps': '데브옵스/인프라',
      'UI/UX': 'UI/UX',
    };

    for (const missing of missingRoles) {
      const roleName = koreanRoleNames[missing] ?? missing;
      warnings.push(`현재 팀에 ${roleName} 담당자가 부족합니다.`);
    }
  }

  // 3. 특정 역할 인원 편중 경고 검사
  const roleDistribution: Record<TechSubject, number> = {
    'Frontend': 0,
    'Backend': 0,
    'Database': 0,
    'AI/Data': 0,
    'DevOps': 0,
    'UI/UX': 0,
  };

  for (const member of teamMembers) {
    const subjects = getCandidateCapableSubjects(member.desiredRoles);
    for (const s of subjects) {
      roleDistribution[s]++;
    }
  }

  for (const subject of ALL_TECH_SUBJECTS) {
    // 3명 이상 팀에서 특정 분야 희망자가 과반수 이상인 경우 집중 경고
    if (teamMembers.length >= 3 && roleDistribution[subject] >= Math.ceil(teamMembers.length * 0.6)) {
      const koreanName =
        subject === 'Frontend'
          ? '프론트엔드'
          : subject === 'Backend'
          ? '백엔드'
          : subject;
      warnings.push(`현재 팀은 ${koreanName} 역할에 인원이 집중되어 있습니다.`);
    }
  }

  return warnings;
}

/**
 * [보조 함수] 프로젝트 필수 역할 목록을 명시적으로 받아 분석하는 함수
 * 
 * @param teamMembers 현재 팀원 프로필 목록
 * @param allCandidatesPool 추천 대상 전체 학생 풀
 * @param requiredRoles 프로젝트에 반드시 필요한 역할 목록 (예: ['Frontend', 'Backend', 'UI/UX'])
 * @returns 1인 1역할 기반 정확한 충족/부족 역할 및 보완 후보 추천 결과
 */
export function analyzeTeamBalanceForRoles(
  teamMembers: UserProfile[],
  allCandidatesPool: UserProfile[],
  requiredRoles: string[]
): TeamBalanceAnalysisResult {
  const members = teamMembers ?? [];
  const candidates = allCandidatesPool ?? [];

  // 1. 레이더 차트 점수 계산 (항상 6개 분야 산출)
  const radarData = calculateRadarScores(members);

  // 2. 필수 역할 정규화
  const hasExplicitRoles = Array.isArray(requiredRoles) && requiredRoles.length > 0;
  const normalizedRequiredRoles: TechSubject[] = [];

  if (hasExplicitRoles) {
    for (const r of requiredRoles) {
      const subj = normalizeRoleToSubject(r);
      if (subj) {
        normalizedRequiredRoles.push(subj);
      }
    }
  }

  // 3. 역할 충족 및 부족 분석 (1인 1역할 배정)
  let coveredRoles: string[] = [];
  let missingRoles: string[] = [];
  let isBalanced = false;

  if (hasExplicitRoles && normalizedRequiredRoles.length > 0) {
    // 각 팀원이 수행 가능한 역할 목록
    const memberCapableRoles = members.map((m) => getCandidateCapableSubjects(m.desiredRoles));
    const matchResult = solveMaximumRoleAssignment(memberCapableRoles, normalizedRequiredRoles);

    coveredRoles = matchResult.coveredRoles;
    missingRoles = matchResult.missingRoles;
    isBalanced = missingRoles.length === 0 && members.length > 0;
  } else {
    // 필수 역할이 주어지지 않은 경우:
    // missingRoles는 빈 배열, isBalanced는 미판정(false), coveredRoles는 팀원들의 희망 역할 목록
    const coveredSet = new Set<string>();
    for (const m of members) {
      for (const subj of getCandidateCapableSubjects(m.desiredRoles)) {
        coveredSet.add(subj);
      }
    }
    coveredRoles = Array.from(coveredSet);
    missingRoles = [];
    isBalanced = false;
  }

  // 4. 경고 메시지 생성
  const warnings = generateWarnings(
    hasExplicitRoles,
    missingRoles as TechSubject[],
    members
  );

  // 5. 부족한 역할 보완 인재 추천
  const recommendedCandidates = findRecommendedCandidates(
    missingRoles as TechSubject[],
    members,
    candidates
  );

  return {
    radarData,
    coveredRoles,
    missingRoles,
    isBalanced,
    warnings,
    recommendedCandidates,
  };
}

/**
 * [기존 API 규약 준수 함수] 팀 빌더 역량 균형도 분석 (API_CONTRACT.md 3-3)
 * 
 * 필수 역할 정보가 인자로 주어지지 않는 기존 함수 규격을 100% 유지하며,
 * 필수 역할을 임의로 단정하지 않고 '미판정' 안내와 레이더 차트 기술 커버리지를 반환합니다.
 */
export function analyzeTeamBalance(
  teamMembers: UserProfile[],
  allCandidatesPool: UserProfile[]
): TeamBalanceAnalysisResult {
  return analyzeTeamBalanceForRoles(teamMembers, allCandidatesPool, []);
}
