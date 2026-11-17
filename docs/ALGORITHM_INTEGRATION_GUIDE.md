# BRIDGE — 알고리즘 연동 및 데이터 흐름 가이드 (Algorithm Integration Guide)

작성일: 2026-11-17 (Asia/Seoul)  
담당: C (알고리즘 담당)  
대상: A (프론트엔드 담당), B (백엔드 담당)

검수 후 고정 진입점은 [ALGORITHM_INTEGRATION.md](./ALGORITHM_INTEGRATION.md)다. 최신 오류 정책은 이 문서의 7~10절과 해당 진입점에 반영했다. 실제 서비스·DB 권한 검증이나 화면 연결 완료를 뜻하지 않는다.

---

## 1. 개요 및 데이터 파이프라인

BRIDGE 플랫폼의 알고리즘 모듈은 **단방향 파이프라인(Unidirectional Data Pipeline)**을 따릅니다.  
B(백엔드)가 제공하는 raw camelCase DTO를 C(알고리즘)가 검증·정제하고, 알고리즘을 수행한 뒤, 프론트엔드 공통 인터페이스(`targetId` 기반 `MatchResult`)로 변환하여 A(프론트엔드) 화면에 전달합니다.

```
┌────────────────────────────────┐
│  B: 백엔드 API (Supabase)      │  (camelCase DTO 반환)
└───────────────┬────────────────┘
                │
                ▼
┌────────────────────────────────┐
│  C: 입력 검증 및 정제          │  (src/algorithms/validation.ts)
│     - validateUserProfile      │  - 필수값, 빈 배열, 정규화
│     - validateOpportunity      │  - 요일 0~6, 슬롯 0~47 정수 검증
│     - filterValidAvailabilities│  - 소수/음수/범위초과 방어
└───────────────┬────────────────┘
                │
                ▼
┌────────────────────────────────┐
│  C: 핵심 알고리즘 실행         │
│     - recommendOpportunities   │  (공모전 맞춤 추천)
│     - calculateMemberMatch     │  (팀원 매칭 적합도)
│     - analyzeTeamBalance       │  (팀 빌더 역량 균형 분석)
│     - calculateOptimalMeetingSlots (최적 회의 시간 추천)
└───────────────┬────────────────┘
                │ (내부 고유 ID: opportunityId, userId 유지)
                ▼
┌────────────────────────────────┐
│  C: UI 결과 변환 어댑터        │  (src/algorithms/adapters.ts)
│     - adaptOpportunityMatchesToUi (opportunityId -> targetId)
│     - adaptMemberMatchesToUi      (userId -> targetId)
│     - adaptTeamCandidatesToUi     (candidateProfile.id -> targetId)
└───────────────┬────────────────┘
                │
                ▼
┌────────────────────────────────┐
│  A: 프론트엔드 UI 화면 렌더링  │  (MatchResult: targetId, score,
│     - HomePage / Opportunities │   matchedTags, reasons)
│     - MembersPage / TeamBuilder│
└────────────────────────────────┘
```

---

## 2. 모듈별 파일 경로 및 Export 함수 규약

### 2.1 공모전 맞춤 추천 (`src/algorithms/opportunityRecommendation.ts`)

- **파일 경로**: `src/algorithms/opportunityRecommendation.ts`
- **Export 함수**:
  ```typescript
  export function recommendOpportunities(
    userProfile: UserProfile,
    opportunities: Opportunity[],
    currentDate?: Date // 마감/게시 판단 기준 시각 (기본값: new Date())
  ): OpportunityMatchResult[];
  ```
- **반환 인터페이스**:
  ```typescript
  export interface OpportunityMatchResult {
    opportunityId: string; // 공모전 ID
    score: number;         // 0 ~ 100점 (정수 반올림)
    matchedTags: string[]; // 일치한 태그 목록
    reasons: string[];     // 추천 사유 안내 문구 목록
  }
  ```
- **필터링 정책 (DATA_CONTRACT.md 8.3절 준수)**:
  - `status !== 'active'` (closed, draft, needs_confirmation): **제외**
  - `postedAt > currentDate` (미래 게시 예정 공고): **제외**
  - `deadline < currentDate` (이미 마감된 공고): **제외**
  - `postedAt <= currentDate`이고 `applicationStart > currentDate` (접수 시작 전 공고): **추천 허용 (UI에 모집 예정 표시)**
  - `deadline === null`인 경우: active이면 **추천 허용**

---

### 2.2 팀원 매칭 적합도 계산 (`src/algorithms/memberMatching.ts`)

- **파일 경로**: `src/algorithms/memberMatching.ts`
- **Export 함수**:
  ```typescript
  export function calculateMemberMatch(
    targetRequirements: {
      desiredRoles: string[];       // 모집 희망 역할 (예: ['Frontend', 'Backend'])
      requiredTechStacks: string[];  // 필수 요구 기술 (예: ['React', 'TypeScript'])
    },
    myAvailability: Availability[], // 팀장(기준 학생)의 활동 가능 시간표
    candidates: {
      profile: UserProfile;         // 후보 학생 프로필
      availability: Availability[]; // 후보 학생 시간표
    }[]
  ): MemberMatchResult[];
  ```
- **반환 인터페이스**:
  ```typescript
  export interface MemberMatchResult {
    userId: string;                     // 후보 학생 ID
    score: number;                      // 0 ~ 100점 (정수 반올림)
    roleMatch: boolean;                 // 모집 역할 일치 여부
    matchedTechStacks: string[];        // 일치한 보유 기술 스택
    commonAvailableHoursWeekly: number; // 주간 공통 가능 시간 (시간 단위, 0.5시간 단위)
    reasons: string[];                  // 추천 이유 안내 목록
  }
  ```
- **보조 유틸 함수**:
  - `normalizeRole(role: string): string`: 역할을 표준어로 정규화 (직접 입력값 보존)
  - `normalizeRoleToStandardKey(role: string): string`: A의 11개 표준 key(`Frontend`, `Backend` 등)로 매핑
  - `isSameRole(roleA: string, roleB: string): boolean`: 두 역할이 동일한 역할 군인지 비교
  - `STANDARD_ROLE_KEYS`: 11개 표준 역할 key 상수 배열

---

### 2.3 팀 빌더 역량 균형 분석 (`src/algorithms/teamAnalyzer.ts`)

- **파일 경로**: `src/algorithms/teamAnalyzer.ts`
- **Export 함수**:
  ```typescript
  // 1. 필수 역할 목록을 명시적으로 분석 (권장)
  export function analyzeTeamBalanceForRoles(
    teamMembers: UserProfile[],
    allCandidatesPool: UserProfile[],
    requiredRoles: string[] // 프로젝트 필수 역할 (예: ['Frontend', 'Backend', 'PM/기획'])
  ): TeamBalanceAnalysisResult;

  // 2. 기존 API 규약 준수 함수 (필수 역할 미지정 시 미판정 안내 반환)
  export function analyzeTeamBalance(
    teamMembers: UserProfile[],
    allCandidatesPool: UserProfile[]
  ): TeamBalanceAnalysisResult;
  ```
- **반환 인터페이스**:
  ```typescript
  export type TechSubject = 'Frontend' | 'Backend' | 'Database' | 'AI/Data' | 'DevOps' | 'UI/UX';

  export interface RadarChartScore {
    subject: TechSubject; // 6대 핵심 기술 축
    score: number;        // 0 ~ 100점 (기술 커버리지 점수)
    fullMark: 100;
  }

  export interface TeamBalanceAnalysisResult {
    radarData: RadarChartScore[];      // 6개 기술 분야별 레이더 차트 점수
    coveredRoles: string[];            // 충족된 역할 목록 (1인 1역할 배정)
    missingRoles: string[];            // 부족한 역할 목록
    isBalanced: boolean;               // 역할 균형 여부
    warnings: string[];                // 역할 편중 및 부족 경고 안내
    recommendedCandidates: {
      candidateProfile: UserProfile;   // 추천 후보 인재
      fitScore: number;                // 부족 역할 보완 적합도 (0~100)
      complementRole: string;          // 보완 가능한 역할
    }[];
  }
  ```
- **안내 오류 방지 규칙**:
  - `PM/기획`, `Mobile`, `Security`, `Marketing` 등 레이더 6축 밖의 역할도 `requiredRoles`에서 절대 누락되지 않고 필수 역할로 매칭 및 경고 안내에 포함됩니다.

---

### 2.4 주간 시간표 최적 회의 시간 추천 (`src/algorithms/scheduleOptimizer.ts`)

- **파일 경로**: `src/algorithms/scheduleOptimizer.ts`
- **Export 함수**:
  ```typescript
  export function calculateOptimalMeetingSlots(
    teamMemberAvailabilities: Record<string, Availability[]>, // 팀원 ID -> Availability[]
    minimumDurationMinutes?: number                          // 최소 요구 연속 시간 (분, 기본값: 60)
  ): RecommendedSlot[];

  export function slotToTimeString(slot: number, isEndTime?: boolean): string;
  ```
- **반환 인터페이스**:
  ```typescript
  export interface RecommendedSlot {
    dayOfWeek: DayOfWeek;        // 요일 (0: 일 ~ 6: 토)
    startSlot: number;           // 시작 슬롯 (0 ~ 47)
    endSlot: number;             // 종료 슬롯 (0 ~ 47, 양 끝 포함)
    durationMinutes: number;     // 연속 시간 (분 단위, (endSlot - startSlot + 1) * 30)
    attendanceRatio: number;     // 참석률 (0.0 ~ 1.0)
    availableMemberIds: string[];// 참석 가능 팀원 ID 목록
    missingMemberIds: string[];  // 불참 팀원 ID 목록
    isOptimal: boolean;          // 전원 참석 최적 슬롯 여부
  }
  ```

---

### 2.5 공고 태그 자동 추출 (`src/algorithms/opportunityTagExtractor.ts`)

- **파일 경로**: `src/algorithms/opportunityTagExtractor.ts`
- **Export 함수**:
  ```typescript
  export function extractTagsFromOpportunity(
    title?: string | null,
    description?: string | null
  ): ExtractedOpportunityTags;
  ```
- **반환 인터페이스**:
  ```typescript
  export interface ExtractedOpportunityTags {
    fields: string[];  // 추출된 관심 분야 태그 (15개 표준 명칭)
    techs: string[];   // 추출된 기술 스택 태그 (Canonical 명칭)
    allTags: string[]; // 중복 제거된 전체 태그 목록
  }
  ```

---

### 2.6 입력 데이터 검증 및 변환 (`src/algorithms/validation.ts`)

- **파일 경로**: `src/algorithms/validation.ts`
- **Export 함수**:
  ```typescript
  export function validateUserProfile(dto: unknown): ValidationResult<AlgorithmUserProfile>;
  export function validateOpportunity(dto: unknown): ValidationResult<Opportunity>;
  export function filterValidAvailabilities(availabilities: unknown): Availability[];
  export function isValidAvailabilityItem(item: unknown): item is Availability;
  export function validateAndCleanTeamAvailabilities(input: unknown): Record<string, Availability[]>;
  ```
- **반환 형식**:
  ```typescript
  export interface ValidationResult<T> {
    isValid: boolean;
    errors: string[];
    data?: T;
  }
  ```

---

### 2.7 UI 결과 변환 어댑터 (`src/algorithms/adapters.ts`)

- **파일 경로**: `src/algorithms/adapters.ts`
- **Export 함수**:
  ```typescript
  // 공모전 추천 결과 -> MatchResult 변환 (opportunityId -> targetId)
  export function adaptOpportunityMatchToUi(result: OpportunityMatchResult): MatchResult;
  export function adaptOpportunityMatchesToUi(results: OpportunityMatchResult[]): MatchResult[];

  // 팀원 매칭 결과 -> MatchResult 변환 (userId -> targetId, matchedTechStacks -> matchedTags)
  export function adaptMemberMatchToUi(result: MemberMatchResult): MatchResult;
  export function adaptMemberMatchesToUi(results: MemberMatchResult[]): MatchResult[];

  // 팀 빌더 추천 후보 -> MatchResult[] 변환 (candidateProfile.id -> targetId)
  export function adaptTeamCandidatesToUi(
    candidates: TeamBalanceAnalysisResult['recommendedCandidates']
  ): MatchResult[];
  ```

---

## 3. 프론트엔드(A) 호출 예시 코드

### 3.1 공모전 맞춤 추천 연동 예시

```tsx
import React, { useMemo } from 'react';
import { recommendOpportunities } from '../algorithms/opportunityRecommendation';
import { adaptOpportunityMatchesToUi } from '../algorithms/adapters';
import { validateUserProfile, validateOpportunity } from '../algorithms/validation';
import type { Opportunity, MatchResult } from '../types';

interface RecommendedOpportunitiesProps {
  rawProfile: unknown;       // B 백엔드에서 받은 사용자 프로필
  rawOpportunities: unknown[]; // B 백엔드에서 받은 공고 목록
}

export const RecommendedOpportunities: React.FC<RecommendedOpportunitiesProps> = ({
  rawProfile,
  rawOpportunities,
}) => {
  const matches: MatchResult[] = useMemo(() => {
    // 1. 프로필 DTO 검증 및 정제
    const profileValidation = validateUserProfile(rawProfile);
    if (!profileValidation.isValid || !profileValidation.data) {
      console.warn('프로필 유효성 검증 실패:', profileValidation.errors);
      return [];
    }

    // 2. 공고 목록 검증 및 정제
    const validOpportunities: Opportunity[] = [];
    for (const rawOpp of rawOpportunities) {
      const oppValidation = validateOpportunity(rawOpp);
      if (oppValidation.isValid && oppValidation.data) {
        validOpportunities.push(oppValidation.data);
      }
    }

    if (validOpportunities.length === 0) return [];

    // 3. 알고리즘 실행 (OpportunityMatchResult[] 반환)
    const rawMatches = recommendOpportunities(profileValidation.data, validOpportunities);

    // 4. UI 어댑터로 변환 (MatchResult[]: targetId 기반)
    return adaptOpportunityMatchesToUi(rawMatches);
  }, [rawProfile, rawOpportunities]);

  if (matches.length === 0) {
    return <div className="text-gray-400">추천 가능한 공모전이 없습니다.</div>;
  }

  return (
    <div className="space-y-4">
      {matches.map((m) => (
        <div key={m.targetId} className="p-4 rounded-xl bg-[#1C1D29] border border-[#2B2C3B]">
          <div className="flex justify-between items-center mb-2">
            <span className="font-bold text-white">공모전 ID: {m.targetId}</span>
            <span className="text-[#C6FF33] font-extrabold">{m.score}점</span>
          </div>
          <div className="text-xs text-[#94A3B8]">{m.reasons.join(' · ')}</div>
        </div>
      ))}
    </div>
  );
};
```

---

### 3.2 팀원 매칭 적합도 연동 예시

```typescript
import { useMemo } from 'react';
import { calculateMemberMatch } from '../algorithms/memberMatching';
import { adaptMemberMatchesToUi } from '../algorithms/adapters';
import { filterValidAvailabilities } from '../algorithms/validation';
import type { UserProfile, MatchResult } from '../types';

export function useMemberRecommendations(
  targetRequirements: { desiredRoles: string[]; requiredTechStacks: string[] },
  myRawAvailability: unknown[],
  rawCandidates: { profile: UserProfile; availability: unknown[] }[]
): MatchResult[] {
  return useMemo(() => {
    // 1. 시간표 슬롯 정수 검증 (소수 요일/슬롯 방어)
    const cleanMySlots = filterValidAvailabilities(myRawAvailability);

    const cleanCandidates = rawCandidates.map((c) => ({
      profile: c.profile,
      availability: filterValidAvailabilities(c.availability),
    }));

    // 2. 팀원 매칭 알고리즘 실행
    const results = calculateMemberMatch(targetRequirements, cleanMySlots, cleanCandidates);

    // 3. UI 어댑터 변환 (userId -> targetId, matchedTechStacks -> matchedTags)
    return adaptMemberMatchesToUi(results);
  }, [targetRequirements, myRawAvailability, rawCandidates]);
}
```

---

## 4. 빈 배열 및 유효하지 않은 데이터 처리 방식

1. **빈 배열 입력 시**:
   - `recommendOpportunities(validProfile, [])` → 즉시 `[]` 반환 (에러 미발생).
   - `calculateMemberMatch(..., candidates: [])` → 즉시 `[]` 반환.
   - `calculateOptimalMeetingSlots({})` → 즉시 `[]` 반환.
   - `adaptOpportunityMatchesToUi([])` → 즉시 `[]` 반환.
2. **소수 요일 및 소수 슬롯 (dayOfWeek: 1.5, slot: 20.3)**:
   - `filterValidAvailabilities` 및 `extractAvailableSlotKeys`, `buildMemberSlotGrid` 내부에서 `Number.isInteger` 검사를 통해 안전하게 건너뛰며, 런타임 `TypeError`를 차단합니다.
3. **미래 게시 공고 (postedAt > now)**:
   - 아직 학부 홈페이지에 정식 게시되지 않은 미래 일시의 공고는 추천 목록에서 자동으로 제외됩니다.
4. **마감일 지난 공고 (deadline < now)**:
   - `status === 'active'` 상태이더라도 현재 시각보다 이전 마감일인 공고는 추천 목록에서 제외됩니다.

---

## 5. A(프론트엔드) 화면 연동 시 주의사항

1. **식별자 일원화**: 알고리즘 함수는 내부적으로 `opportunityId` / `userId`를 반환하므로, 프론트엔드 화면 컴포넌트(`HomePage`, `OpportunityExplorer`)에 전달할 때는 반드시 `adaptOpportunityMatchesToUi` / `adaptMemberMatchesToUi`를 거쳐 `targetId`로 전달해야 합니다.
2. **모집 예정 공고 표시**: 게시 완료(`postedAt <= now`)되었으나 접수 시작일(`applicationStart > now`)이 미래인 공고는 추천 목록에 정상 포함됩니다. 프론트엔드에서는 이를 마감으로 취급하지 말고 **'모집 예정'** 뱃지와 함께 노출해 주시기 바랍니다.
3. **추천 미제공 상태 분리**: 추천 결과가 빈 배열(`[]`)인 경우, '추천 점수 0점'을 표시하지 않고 **'조건에 맞는 추천 공모전/팀원이 없습니다'**라는 빈 상태 화면(Empty State)을 표시해야 합니다.

---

## 6. B(백엔드)가 데이터를 제공할 때 필요한 필드 요건

1. **camelCase 키 준수**:
   - Supabase의 `snake_case` 컬럼(`tech_stacks`, `is_public`, `day_of_week` 등)을 TypeScript DTO `camelCase`(`techStacks`, `isPublic`, `dayOfWeek` 등)로 명시적 변환하여 제공해야 합니다.
2. **시간표 정수 및 범위 준수**:
   - `dayOfWeek`: `0, 1, 2, 3, 4, 5, 6` (정수, 0=일요일 ~ 6=토요일).
   - `slot`: `0 ~ 47` (정수, 30분 단위).
3. **보유 기술 없음**:
   - 기술이 없는 학생의 경우 문자열 `['없음']`이 아닌 **빈 배열 `[]`**로 제공해야 합니다.
4. **타인 프로필 조회 시 학교 이메일 제외**:
   - 팀원 탐색 및 후보 추천을 위한 프로필 조회 API에서는 **개인정보 보호를 위해 `email` 컬럼을 SELECT 목록에서 제외**하고 전달해야 합니다.


## 7. 실제 소스 기준 전체 export 명세 (검수 반영)

아래 선언은 최신 TypeScript AST에서 추출했다. 기본 매개변수는 생략 가능하다. 새 오류 정책과 연결 진입점은 [ALGORITHM_INTEGRATION.md](./ALGORITHM_INTEGRATION.md)를 참조한다.

### src/algorithms/tagClassification.ts

```typescript
export type TagCategory = 'field' | 'tech' | 'general';

export type StandardInterest = (typeof STANDARD_INTEREST_OPTIONS)[number];

export interface ClassifiedTags {
  fields: string[];       // 관심 분야 태그 (점수 계산 대상)
  techs: string[];        // 기술 스택 태그 (점수 계산 대상)
  generals: string[];     // 일반 태그 (점수 계산 제외: 해커톤, KNU 등)
  canonicalMap: Map<string, string>; // canonical -> original 태그 매핑
}

export function normalizeTag(tag: string): string;

export function getCanonicalTag(tag: string): string;

export function normalizeInterest(interest: string): string;

export function getCanonicalFieldTag(tag: string): string;

export function classifyTag(rawTag: string): {
  category: TagCategory;
  canonical: string;
  original: string;
};

export function classifyTags(tags: string[]): ClassifiedTags;

export function formatWithJosa(word: string, josaType: '과/와' | '을/를'): string;
```

import 경로(src/pages 기준): `../algorithms/tagClassification`.

추가 export 상수: `STANDARD_INTEREST_OPTIONS`, `SYNONYM_MAP`, `INTEREST_SYNONYM_MAP`, `KNOWN_FIELD_CANONICALS`, `KNOWN_TECH_CANONICALS`, `KNOWN_GENERAL_TAGS`.

### src/algorithms/opportunityTagExtractor.ts

```typescript
export interface ExtractedOpportunityTags {
  fields: string[];       // 추출된 관심 분야 태그 목록 (표준 명칭)
  techs: string[];        // 추출된 기술 스택 태그 목록 (Canonical 명칭)
  allTags: string[];      // 중복 제거된 전체 태그 목록 (fields + techs + 원본 보존)
}

export function extractTagsFromOpportunity(
  title?: string | null,
  description?: string | null
): ExtractedOpportunityTags;
```

import 경로(src/pages 기준): `../algorithms/opportunityTagExtractor`.

### src/algorithms/validation.ts

```typescript
export interface AlgorithmUserProfile extends UserProfile {
  visibility: ProfileVisibility | null;
  otherInterest?: string;
  otherRole?: string;
}

export interface ValidationResult<T> {
  isValid: boolean;
  errors: string[];
  data?: T;
}

export function validateAndCleanTeamAvailabilities(
  input: unknown
): Record<string, Availability[]>;

export function validateUserProfile(dto: unknown): ValidationResult<AlgorithmUserProfile>;

export function validateOpportunity(dto: unknown): ValidationResult<Opportunity>;
```

import 경로(src/pages 기준): `../algorithms/validation`.

### src/algorithms/adapters.ts

```typescript
export function adaptOpportunityMatchToUi(result: OpportunityMatchResult): MatchResult;

export function adaptOpportunityMatchesToUi(results: OpportunityMatchResult[]): MatchResult[];

export function adaptMemberMatchToUi(result: MemberMatchResult): MatchResult;

export function adaptMemberMatchesToUi(results: MemberMatchResult[]): MatchResult[];

export function adaptTeamCandidatesToUi(
  candidates: TeamBalanceAnalysisResult['recommendedCandidates']
): MatchResult[];
```

import 경로(src/pages 기준): `../algorithms/adapters`.

### src/algorithms/opportunityRecommendation.ts

```typescript
export interface OpportunityMatchResult {
  opportunityId: string;
  score: number;           // 0 ~ 100점 (반올림된 정수)
  matchedTags: string[];   // 실제 일치한 태그 목록
  reasons: string[];       // 추천 이유 목록
}

export function recommendOpportunities(
  userProfile: UserProfile,
  opportunities: Opportunity[],
  currentDate: Date = new Date()
): OpportunityMatchResult[];
```

import 경로(src/pages 기준): `../algorithms/opportunityRecommendation`.

### src/algorithms/memberMatching.ts

```typescript
export interface MemberMatchResult {
  userId: string;
  score: number;                      // 0 ~ 100점 (반올림된 정수)
  roleMatch: boolean;                 // 모집 역할 일치 여부
  matchedTechStacks: string[];        // 실제 일치한 보유 기술 목록
  commonAvailableHoursWeekly: number; // 주간 공통 가능 시간 (시간 단위)
  reasons: string[];                  // 추천 이유 목록
}

export type StandardRoleKey = (typeof STANDARD_ROLE_KEYS)[number];

export function normalizeRoleToStandardKey(role: string): string;

export function normalizeRole(role: string): string;

export function isSameRole(roleA: string, roleB: string): boolean;

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
): MemberMatchResult[];
```

import 경로(src/pages 기준): `../algorithms/memberMatching`.

추가 export 상수: `STANDARD_ROLE_KEYS`, `ROLE_SYNONYM_MAP`, `TO_STANDARD_ROLE_KEY_MAP`.

### src/algorithms/teamAnalyzer.ts

```typescript
export type TechSubject =
  | 'Frontend'
  | 'Backend'
  | 'Database'
  | 'AI/Data'
  | 'DevOps'
  | 'UI/UX';

export interface RadarChartScore {
  subject: TechSubject;
  score: number;      // 0 ~ 100점 (기술 보유 범위 지표)
  fullMark: 100;
}

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

export function normalizeRoleToSubject(roleName: string): TechSubject | null;

export function getCandidateCapableSubjects(roles: string[] | undefined): TechSubject[];

export function getCandidateAllCapableRoles(roles: string[] | undefined): string[];

export function analyzeTeamBalanceForRoles(
  teamMembers: UserProfile[],
  allCandidatesPool: UserProfile[],
  requiredRoles: string[]
): TeamBalanceAnalysisResult;

export function analyzeTeamBalance(
  teamMembers: UserProfile[],
  allCandidatesPool: UserProfile[]
): TeamBalanceAnalysisResult;
```

import 경로(src/pages 기준): `../algorithms/teamAnalyzer`.

추가 export 상수: `ALL_TECH_SUBJECTS`, `TECH_TO_SUBJECT_MAP`.

### src/algorithms/scheduleOptimizer.ts

```typescript
export interface RecommendedSlot {
  dayOfWeek: DayOfWeek;             // 요일 (0: 일요일 ~ 6: 토요일)
  startSlot: number;                 // 시작 슬롯 번호 (0 ~ 47)
  endSlot: number;                   // 종료 슬롯 번호 (0 ~ 47, 양 끝 포함)
  durationMinutes: number;           // 연속 회의 시간 (분 단위, 예: 60, 120)
  attendanceRatio: number;           // 참석률 (0.0 ~ 1.0, 예: 1.0 = 전원 참석)
  availableMemberIds: string[];      // 해당 구간 전체에 참석 가능한 팀원 ID 목록
  missingMemberIds: string[];        // 해당 구간에 참석 불가능한 팀원 ID 목록
  isOptimal: boolean;                // 전원 참석 최적 슬롯 여부
}

export function slotToTimeString(slot: number, isEndTime = false): string;

export function calculateOptimalMeetingSlots(
  teamMemberAvailabilities: Record<string, Availability[]>,
  minimumDurationMinutes: number = 60
): RecommendedSlot[];
```

import 경로(src/pages 기준): `../algorithms/scheduleOptimizer`.

### src/algorithms/inputSafety.ts

```typescript
export type ProfileVisibility = 'public' | 'team_only' | 'private';

export function isPublicAlgorithmCandidate(profile: { isPublic?: boolean; visibility?: unknown }): boolean;

export function parseOpportunityTimestamp(value: unknown): string | null;

export function isValidAvailabilityItem(item: unknown): item is Availability;

export function filterValidAvailabilities(input: unknown): Availability[];
```

import 경로(src/pages 기준): `../algorithms/inputSafety`.

## 8. 검수 후 입력 계약

[연동 진입점의 최신 오류 정책](./ALGORITHM_INTEGRATION.md)을 함께 적용한다. 기존의 공개 기본값, 게시일 자동 생성 및 선택 URL 유실 동작은 이번 검수에서 수정했다.

- validateUserProfile은 ValidationResult<AlgorithmUserProfile>을 반환하는 알고리즘 전용 투영이다. 전체 DTO/DB 매퍼가 아니므로 원본을 덮어쓰지 않는다. visibility와 기타 상세는 보존하며, 숙련도·협업 선택값·longBio는 원본 DTO에서 별도로 보관한다.
- visibility 누락은 null/isPublic=false, 명시한 세 단계 값은 보존한다. 충돌은 검증 실패다. team_only는 일반 공개가 아니다. 실제 권한 및 타인 이메일 제거는 B 담당이다.
- postedAt 누락·null·날짜만 입력은 실패한다. 국내 명시 시분에서 시간대만 없으면 +09:00으로 해석하며, 명시 시간대는 보존한다. deadline/applicationStart 미정은 null, 잘못된 시각은 오류다. 누락 수집/갱신 시각은 실제 시각을 만들지 않고 계산용 호환 필드에 빈 문자열을 사용하므로 운영 DTO로 저장하지 않는다.
- validateOpportunity는 sourcePostId/sourceUrl/applicationUrl 및 기존 메타데이터를 보존한다. B는 camelCase와 실제 원문 날짜·시각을 제공한다. 검증 결과를 그대로 DB upsert하지 않는다.
- 태그·역할 문자열 배열은 요소 타입도 검사한다. grade는 기존 5개 학년만 허용한다. track은 현재 공통 타입/계약 간 불일치를 유지한 호환 필드로, 실제 전공 이행과 전체 DTO 타입 확정은 A/B/C 후속 합의가 필요하다.

## 9. 추출 태그를 연결하는 실제 호출 예시

아래 코드는 `src/pages`에서 import하는 순수 TypeScript 예시입니다. JSX는 `.tsx` 파일에서만 사용합니다. 함수는 B의 DTO를 받아 C의 검증 → 추출·기존 태그 병합 → 추천 → targetId 어댑터 순서로 실행합니다. 원본 status/deadline/본문을 변경하지 않습니다.

```typescript
import type { MatchResult, Opportunity } from '../types';
import { validateUserProfile, validateOpportunity } from '../algorithms/validation';
import { extractTagsFromOpportunity } from '../algorithms/opportunityTagExtractor';
import { getCanonicalTag, normalizeTag } from '../algorithms/tagClassification';
import { recommendOpportunities } from '../algorithms/opportunityRecommendation';
import { adaptOpportunityMatchesToUi } from '../algorithms/adapters';

export function getOpportunityCards(
  rawProfile: unknown,
  rawOpportunities: unknown[],
  currentDate: Date = new Date(),
): MatchResult[] {
  const profile = validateUserProfile(rawProfile);
  if (!profile.isValid || !profile.data) return [];
  const opportunities: Opportunity[] = [];
  for (const raw of rawOpportunities) {
    const validated = validateOpportunity(raw);
    if (!validated.isValid || !validated.data) continue;
    const opportunity = validated.data;
    const extracted = extractTagsFromOpportunity(opportunity.title, opportunity.description);
    const uniqueTags = new Map<string, string>();
    for (const tag of [...opportunity.tags, ...extracted.allTags]) {
      const canonical = getCanonicalTag(tag);
      const key = normalizeTag(canonical);
      if (key && !uniqueTags.has(key)) uniqueTags.set(key, canonical);
    }
    opportunities.push({ ...opportunity, tags: [...uniqueTags.values()] });
  }
  return adaptOpportunityMatchesToUi(
    recommendOpportunities(profile.data, opportunities, currentDate),
  );
}
```

`allTags`는 추출 결과만 포함하며 기존 `tags`는 받지 않습니다. 따라서 위처럼 호출 측에서 병합해야 합니다. 분야 `인공지능`과 기존 `AI`, 기술 `react.js`와 `React`는 canonical key로 중복을 제거합니다. 일반 태그는 보존하되 추천 점수에서는 제외됩니다. `allTags`에는 사전상 일반 태그도 있을 수 있으므로 반드시 `fields + techs`와 같다고 가정하지 마십시오.

키워드 기반 추출에는 문맥 판별 한계가 있습니다. 예를 들어 `React Native`의 `React`, `GitHub Actions`의 `GitHub`도 함께 추출될 수 있습니다. 부정문·선택 기술·인용문도 요구 기술로 단정하지 않습니다. 또한 모든 기술·분야를 지원하지 않고, `fields`에는 자유 분야(예: 블록체인)도 들어갈 수 있어 추천의 분야 분류 결과와 다를 수 있습니다. 실제 텍스트와 대조하여 오탐 후보를 따로 검토하십시오. 제목만 있으면 제목만 분석했다고 표시합니다.

### 팀 분석·시간표·정규화 호출

```typescript
import type { UserProfile } from '../types';
import { calculateMemberMatch, normalizeRole, normalizeRoleToStandardKey, isSameRole } from '../algorithms/memberMatching';
import { analyzeTeamBalanceForRoles, analyzeTeamBalance, normalizeRoleToSubject, getCandidateCapableSubjects, getCandidateAllCapableRoles } from '../algorithms/teamAnalyzer';
import { filterValidAvailabilities, validateAndCleanTeamAvailabilities, isValidAvailabilityItem } from '../algorithms/validation';
import { adaptMemberMatchesToUi, adaptTeamCandidatesToUi, adaptMemberMatchToUi, adaptOpportunityMatchToUi } from '../algorithms/adapters';
import type { OpportunityMatchResult } from '../algorithms/opportunityRecommendation';
import { calculateOptimalMeetingSlots, slotToTimeString } from '../algorithms/scheduleOptimizer';
import { normalizeTag, getCanonicalTag, normalizeInterest, classifyTag, classifyTags, formatWithJosa } from '../algorithms/tagClassification';

export function inspectAlgorithms(
  members: UserProfile[], // validateUserProfile으로 검증한 프로필
  pool: UserProfile[],
  rawSlots: unknown,
  rawTeamSlots: unknown,
  opportunityResult: OpportunityMatchResult,
) {
  const slots = filterValidAvailabilities(rawSlots);
  const matches = calculateMemberMatch(
    { desiredRoles: ['Frontend'], requiredTechStacks: ['React'] },
    slots,
    pool.map(profile => ({ profile, availability: [] })),
  );
  const balance = analyzeTeamBalanceForRoles(members, pool, ['Frontend', 'Backend', 'PM/기획']);
  const meetings = calculateOptimalMeetingSlots(validateAndCleanTeamAvailabilities(rawTeamSlots), 60);
  return {
    matches: adaptMemberMatchesToUi(matches),
    firstMatch: matches[0] ? adaptMemberMatchToUi(matches[0]) : null,
    opportunity: adaptOpportunityMatchToUi(opportunityResult),
    balance, candidates: adaptTeamCandidatesToUi(balance.recommendedCandidates),
    unspecifiedRoles: analyzeTeamBalance(members, pool),
    meetings,
    firstTime: meetings[0] ? `${slotToTimeString(meetings[0].startSlot)}~${slotToTimeString(meetings[0].endSlot, true)}` : null,
    validSlot: isValidAvailabilityItem(slots[0]),
    role: normalizeRole('프론트엔드'), standardRole: normalizeRoleToStandardKey('프론트엔드'),
    sameRole: isSameRole('Frontend', '프론트엔드'),
    subject: normalizeRoleToSubject('Frontend'),
    subjects: getCandidateCapableSubjects(['FullStack']),
    capableRoles: getCandidateAllCapableRoles(['PM/기획']),
    normalized: normalizeTag(' React '), canonical: getCanonicalTag('react.js'),
    interest: normalizeInterest('AI'), tag: classifyTag('React'), tags: classifyTags(['React', '해커톤']),
    label: formatWithJosa('React', '을/를'),
  };
}
```

## 10. 화면 처리와 후속 과제

빈 추천 배열은 추천 없음이며 0점 결과와 다르다. UI 어댑터는 점수의 유한성·0~100 범위·대상 ID·문자열 배열을 검사하고 잘못된 결과는 예외를 발생시킨다. 유효한 점수에만 기존 정수 반올림을 유지한다. A는 예외를 연동 오류로 표시한다.

시간표 가드는 id/userId, 정수 요일/슬롯, boolean, updatedAt 문자열을 검사한다. 중복은 사용자/요일/슬롯으로 제거하고 false 우선으로 상충을 해결한다. updatedAt은 날짜 파싱하지 않으며 빈 문자열은 기존 호환으로 허용한다. map의 사용자 ID와 슬롯 ID가 다른 데이터는 제외한다. 미등록 팀원은 빈 배열로 유지한다.

신구 분야 비교에는 getCanonicalFieldTag를 사용하며 기존 결과 태그명·가중치·분모 계산은 유지한다. normalizeRole은 기존 내부명, normalizeRoleToStandardKey는 화면 표준 key용이다. 자유 문자열은 보존하되 원문에 없는 기술을 생성하지 않는다.

함수별 입력·출력은 7절, 실제 연결 순서·책임·미연결 사항은 [연동 진입점](./ALGORITHM_INTEGRATION.md), 8건 실제/통제 결과는 [실데이터 보고서](./ALGORITHM_REAL_DATA_VALIDATION.md)를 참조한다. 웹서비스명 오탐·복합 기술명·구분자 누락은 별도 후속 작업이다.
