# BRIDGE — 팀원 간 API 규약 및 인터페이스 계약서 (API_CONTRACT.md)

## 1. 개요
본 문서는 팀원 A (프론트엔드), 팀원 B (백엔드/인증), 팀원 C (알고리즘) 간의 원활한 데이터 교환, 에러 처리 규칙 및 알고리즘 입출력 함수 규격을 정의한 인터페이스 계약서입니다.

> [!NOTE]
> **팀원 간 규약 협의 안내**  
> 섹션 2와 3의 기본 함수 시그니처는 현재 코드베이스 기준이며, 섹션 4의 **Google OAuth 온보딩 및 신규 프로필 연동 규약**은 A 담당자(기획/UI)가 제안하는 **팀원 B, C와의 협의 예정 설계안(Draft Proposal)**입니다.

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

### 2-2. 기준 서비스 함수 규격 (Baseline)

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

#### [시간표 서비스] (`src/services/scheduleService.ts`)
- `getUserAvailability(userId: string): Promise<ApiResponse<Availability[]>>`
- `saveUserAvailability(userId: string, slots: { dayOfWeek: DayOfWeek; slot: number; isAvailable: boolean }[]): Promise<ApiResponse<void>>`
- `getTeamAvailabilities(teamId: string): Promise<ApiResponse<Record<string, Availability[]>>>`

---

## 3. 프론트엔드/백엔드 ↔ 알고리즘(C) 인터페이스 규약

모든 추천 및 계산 알고리즘은 `src/algorithms/*.ts`에 순수 함수(Pure Function)로 구현하여 프론트엔드 브라우저 및 백엔드 엣지 펑션 어디서든 독립적으로 테스트 및 실행할 수 있도록 설계합니다.

### 3-1. 공모전 맞춤 추천 함수 (`src/algorithms/opportunityRecommendation.ts`)
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
```typescript
export interface MemberMatchResult {
  userId: string;
  score: number; // 0 ~ 100점
  roleMatch: boolean;
  matchedTechStacks: string[];
  commonAvailableHoursWeekly: number; // 주간 공통 가능 시간 (시간 단위)
  reasons: string[]; // 예: ["매주 2시간의 공통 활동 가능 시간이 있습니다."]
}

export function calculateMemberMatch(
  targetRequirements: {
    desiredRoles: string[];
    requiredTechStacks: string[];
  },
  myAvailability: Availability[],
  candidates: {
    profile: Pick<UserProfile, 'id' | 'visibility' | 'isPublic' | 'desiredRoles' | 'techStacks'>;
    availability: Availability[];
  }[]
): MemberMatchResult[];
```

위 `UserProfile`은 알고리즘 공통 타입이다. 공개 프로필에서 팀원 탐색용 결과를 만드는 별도 함수의 입력과 반환값은 [공개 프로필 팀원 추천 계약](./ALGORITHM_INTEGRATION_GUIDE.md#공개-프로필-팀원-추천)을 참조한다.

### 3-3. 팀 빌더 역량 균형도 분석 함수 (`src/algorithms/teamAnalyzer.ts`)
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
```typescript
export interface RecommendedSlot {
  dayOfWeek: DayOfWeek;
  startSlot: number; // 0 ~ 47 (30분 단위)
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

## 4. Google OAuth 온보딩 및 신규 프로필 연동 규약 (협의 예정 설계안)

### 4-1. Google OAuth 인증 흐름 및 API 제안 (팀원 B 협의안)

1. **Google 로그인 트리거 (`signInWithGoogle`)**:
   ```typescript
   // 프론트엔드에서 호출
   export async function signInWithGoogle(): Promise<{ error: Error | null }>;
   ```
   - Supabase `auth.signInWithOAuth({ provider: 'google', options: { queryParams: { hd: 'knu.ac.kr' } } })` 연동.
   - `hd: 'knu.ac.kr'` 파라미터를 추가하여 1차적으로 학교 계정 선택 유도.

2. **도메인 사후 검증 및 신규 사용자 판별 API (`verifyUserOnboardingState`)**:
   ```typescript
   export interface OnboardingState {
     isAuthenticated: boolean;
     isKnuDomain: boolean;
     hasCompletedProfile: boolean;
     userId: string;
     email: string;
     googleName?: string;
     avatarUrl?: string;
   }
   
   export function checkOnboardingState(): Promise<ApiResponse<OnboardingState>>;
   ```
   - 서버에서 `user.email.endsWith('@knu.ac.kr')` 확인.
   - `isKnuDomain: false` 시 즉시 `auth.signOut()` 호출 및 에러 반환.
   - `hasCompletedProfile: false` 시 초기 프로필 온보딩 페이지(`/onboarding`)로 리다이렉트.

3. **초기 프로필 생성 API (`createInitialProfile`)**:
   ```typescript
   export interface InitialProfilePayload {
     name: string;
     department: string; // '컴퓨터학부'
     track: TrackType;
     grade: GradeType;
     interests: string[];
     techStacks: string[]; // ['아직 보유 기술 없음'] 가능
     desiredRoles: string[];
     techProficiency?: Record<string, '입문' | '활용 가능' | '숙련'>;
     wantedTechStacks?: string[];
     bio?: string;
     availabilityStatus?: '팀 구하는 중' | '제안 환영' | '활동 중' | '참여 어려움';
   }
   
   export function createInitialProfile(payload: InitialProfilePayload): Promise<ApiResponse<UserProfile>>;
   ```

### 4-2. 태그 표준화 및 알고리즘 연계 규약 (팀원 C 협의안)

1. **태그 정규화 헬퍼 함수 (`normalizeTag`)**:
   - 프론트엔드와 알고리즘 간 공통 키 사용:
   ```typescript
   export function normalizeTag(tag: string): string;
   // 예: "react.js" -> "React", "pytorch" -> "PyTorch", "ai/ml" -> "AI/ML"
   ```
2. **팀원 매칭의 보유 기술 평가**:
   - 요구 기술이 없으면 기술 가중치를 제외한다. 요구 기술이 있고 후보의 보유 기술이 비어 있으면 기술 점수는 0이다. 공개 프로필 연결에서는 비교할 역할 정보도 없으면 해당 후보의 점수를 반환하지 않는다.
   - 기본 가중치는 희망 역할 45%, 보유 기술 30%, 주간 공통 활동 가능 시간 25%다. 관심 분야는 점수에 반영하지 않는다.

---

## 5. 에러 처리 및 표준 상태 코드

| 상황 | 에러 코드 | UI 권장 처리 |
| :--- | :--- | :--- |
| 비로그인 사용자의 내부 접근 | `UNAUTHENTICATED` | 로그인 화면(`/login`)으로 리다이렉트 및 진입 경로 저장 |
| 비(非) `@knu.ac.kr` 도메인 계정 | `INVALID_EMAIL_DOMAIN` | 세션 강제 종료 후 "경북대학교 계정으로만 접근 가능합니다" 경고 모달 표시 |
| 초기 프로필 미완료 상태 접근 | `PROFILE_INCOMPLETE` | 온보딩 설정 화면으로 강제 이동 |
| 비공개 프로필 접근 | `PROFILE_PRIVATE` | "비공개 프로필입니다" 안내 플레이스홀더 출력 |
| 타인의 모집글/게시물 수정 시도 | `FORBIDDEN` | 경고 토스트 팝업 및 작업 차단 |
| 존재하지 않는 공고/게시글 조회 | `NOT_FOUND` | `NotFoundPage` 컴포넌트 렌더링 |
| 중복 공고 등록 시도 (`sourcePostId`) | `CONFLICT_DUPLICATE` | 기존 공고 업데이트(Upsert)로 자동 전환 |
| 크롤러 실행 타임아웃/차단 | `CRAWLER_FETCH_FAILED` | 기존 데이터 유지 및 `crawling_logs`에 실패 사유 기록 |
