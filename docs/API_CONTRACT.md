# BRIDGE — 팀원 간 API 규약 및 인터페이스 계약서 (API_CONTRACT.md)

## 1. 개요
본 문서는 팀원 A (프론트엔드), 팀원 B (백엔드/인증), 팀원 C (알고리즘) 간의 협업을 위해 데이터 교환 포맷, 에러 처리 규칙 및 알고리즘 입출력 함수 규격을 정의한 인터페이스 계약서입니다.

---

## 2. 프론트엔드(A) ↔ 백엔드(B) 연동 규약

### 2-1. 공통 응답 포맷 (Service Layer Wrapper)
모든 Supabase API 호출 함수(`src/services/*.ts`)는 UI에서 일관된 로딩/에러 처리를 할 수 있도록 다음 타입을 반환합니다.

```typescript
export interface ApiResponse<T> {
  data: T | null;
  error: {
    code: string;
    message: string;
    details?: unknown;
  } | null;
}
```

### 2-2. 주요 서비스 함수 규격

#### [인증 & 프로필 서비스] (`src/services/authService.ts`, `src/services/profileService.ts`)
- `getProfile(userId: string): Promise<ApiResponse<UserProfile>>`
- `updateProfile(userId: string, updates: Partial<UserProfile>): Promise<ApiResponse<UserProfile>>`
- `searchPublicProfiles(keyword: string, trackFilter?: TrackType): Promise<ApiResponse<UserProfile[]>>`
  - *동작 규칙*: `isPublic: true`인 프로필만 조회하며, `name` 또는 `nickname` 부분 일치 필터링을 지원합니다.

#### [공모전 서비스] (`src/services/opportunityService.ts`)
- `getOpportunities(filters?: { category?: string; sourceType?: string; search?: string }): Promise<ApiResponse<Opportunity[]>>`
- `getOpportunityById(id: string): Promise<ApiResponse<Opportunity>>`
- `createManualOpportunity(payload: Omit<Opportunity, 'id' | 'collectedAt' | 'updatedAt'>): Promise<ApiResponse<Opportunity>>`

#### [팀원 모집 & 지원 서비스] (`src/services/recruitmentService.ts`)
- `getRecruitments(filters?: { status?: string; search?: string }): Promise<ApiResponse<Recruitment[]>>`
- `createRecruitment(payload: Omit<Recruitment, 'id' | 'currentMemberCount' | 'createdAt' | 'updatedAt'>): Promise<ApiResponse<Recruitment>>`
- `applyToRecruitment(recruitmentId: string, role: string, message: string): Promise<ApiResponse<Application>>`
- `updateApplicationStatus(applicationId: string, status: 'accepted' | 'rejected'): Promise<ApiResponse<Application>>`
  - *트랜잭션 규칙*: `accepted` 처리 시 자동으로 `teams` 및 `team_members` 테이블에 유저가 등록되며 `currentMemberCount`가 1 증가합니다.

#### [시간표 서비스] (`src/services/scheduleService.ts`)
- `getUserAvailability(userId: string): Promise<ApiResponse<Availability[]>>`
- `saveUserAvailability(userId: string, slots: { dayOfWeek: DayOfWeek; slot: number; isAvailable: boolean }[]): Promise<ApiResponse<void>>`
- `getTeamAvailabilities(teamId: string): Promise<ApiResponse<Record<string, Availability[]>>>`

---

## 3. 프론트엔드/백엔드 ↔ 알고리즘(C) 인터페이스 규약

모든 추천 및 계산 알고리즘은 `src/algorithms/*.ts`에 순수 함수(Pure Function)로 구현하여 프론트엔드 브라우저 및 백엔드 엣지 펑션 어디서든 독립적으로 테스트 및 실행할 수 있도록 설계합니다.

### 3-1. 공모전 맞춤 추천 함수 (`src/algorithms/opportunityRecommendation.ts`)
사용자의 관심사, 기술 스택, 세부전공을 바탕으로 공모전의 적합도 점수와 추천 이유를 산출합니다.

```typescript
export interface OpportunityMatchResult {
  opportunityId: string;
  score: number; // 0 ~ 100점
  matchedTags: string[];
  reasons: string[]; // 예: ["보유 기술 React, TypeScript 일치", "플랫폼소프트웨어 전공 추천"]
}

export function recommendOpportunities(
  userProfile: UserProfile,
  opportunities: Opportunity[]
): OpportunityMatchResult[];
```

### 3-2. 팀원 매칭 적합도 계산 함수 (`src/algorithms/memberMatching.ts`)
찾고 있는 역할, 요구 기술 스택, 세부전공 및 주간 가능 시간의 일치도를 종합 분석합니다.

```typescript
export interface MemberMatchResult {
  userId: string;
  score: number; // 0 ~ 100점
  roleMatch: boolean;
  matchedTechStacks: string[];
  commonAvailableHoursWeekly: number; // 주간 공통 가능 시간 (시간 단위)
  reasons: string[]; // 예: ["필요 역할 Frontend 완벽 일치", "화요일 저녁 2시간 공통 회의 가능"]
}

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

### 3-3. 팀 빌더 역량 균형도 분석 함수 (`src/algorithms/teamAnalyzer.ts`)
현재 팀원 구성에 따른 기술 스택 커버리지와 필수 포지션 결손 여부를 분석합니다.

```typescript
export interface RadarChartScore {
  subject: 'Frontend' | 'Backend' | 'Database' | 'AI/Data' | 'DevOps' | 'UI/UX';
  score: number; // 0 ~ 100점
  fullMark: 100;
}

export interface TeamBalanceAnalysisResult {
  radarData: RadarChartScore[];
  coveredRoles: string[];
  missingRoles: string[]; // 예: ["Backend", "DevOps"]
  isBalanced: boolean;
  warnings: string[];     // 예: ["현재 백엔드 개발자가 비어 있어 API 구축 지연이 우려됩니다."]
  recommendedCandidates: {
    candidateProfile: UserProfile;
    fitScore: number;
    complementRole: string; // 보완 가능한 역할
  }[];
}

export function analyzeTeamBalance(
  teamMembers: UserProfile[],
  allCandidatesPool: UserProfile[]
): TeamBalanceAnalysisResult;
```

### 3-4. 주간 시간표 최적 회의 슬롯 추천 함수 (`src/algorithms/scheduleOptimizer.ts`)
팀원들의 30분 단위 시간표를 비트마스크(또는 48 슬롯 불리언 배열)로 교차 연산하여 회의 시간을 도출합니다.

```typescript
export interface RecommendedSlot {
  dayOfWeek: DayOfWeek;
  startSlot: number; // 0 ~ 47
  endSlot: number;   // 0 ~ 47
  durationMinutes: number; // 연속 시간 (분)
  attendanceRatio: number; // 1.0 = 전원 참석(100%), 0.75 = 3/4명 참석
  availableMemberIds: string[];
  missingMemberIds: string[];
  isOptimal: boolean;      // 전원 참석 최적 슬롯 여부
}

export function calculateOptimalMeetingSlots(
  teamMemberAvailabilities: Record<string, Availability[]>, // userId -> 슬롯 목록
  minimumDurationMinutes: number = 60 // 기본 최소 연속 1시간 (2슬롯)
): RecommendedSlot[];
```

---

## 4. 에러 처리 및 표준 상태 코드

| 상황 | 에러 코드 | UI 권장 처리 |
| :--- | :--- | :--- |
| 미인증 사용자 보호 라우트 접근 | `UNAUTHORIZED` | `/login` 페이지로 리다이렉트 및 이전 경로 저장 |
| 비공개 프로필 접근 | `PROFILE_PRIVATE` | "비공개 프로필입니다" 안내 플레이스홀더 출력 |
| 타인의 모집글/게시물 수정 시도 | `FORBIDDEN` | 경고 토스트 팝업 및 작업 차단 |
| 존재하지 않는 공고/게시글 조회 | `NOT_FOUND` | `NotFoundPage` 컴포넌트 렌더링 |
| 중복 공고 등록 시도 (`sourcePostId`) | `CONFLICT_DUPLICATE` | 기존 공고 업데이트(Upsert)로 자동 전환 |
| 크롤러 실행 타임아웃/차단 | `CRAWLER_FETCH_FAILED` | 기존 데이터 유지 및 `CrawlingLog`에 실패 사유 기록 |
