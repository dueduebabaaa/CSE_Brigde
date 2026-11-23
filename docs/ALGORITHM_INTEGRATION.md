# BRIDGE 알고리즘 연동 진입점

검수 반영일: 2026-11-17. 실제 상세 명세·전체 export 선언은 [기존 연동 가이드](./ALGORITHM_INTEGRATION_GUIDE.md)를 재사용한다. 실제 8건의 데이터·통제 실험은 [실데이터 검증 보고서](./ALGORITHM_REAL_DATA_VALIDATION.md)를 참조한다. 이 문서는 A가 요청한 고정 경로에서 최신 호출 순서와 검수 후 오류 정책을 안내한다.

## 연결 순서와 책임

B의 서버 권한 검사·snake_case→camelCase DTO 매핑 → C 입력 검증·알고리즘용 투영 → C 실행 → targetId 어댑터 → A 화면 표시 순서다. 원본 DTO는 별도로 보관한다. `validateUserProfile()` 출력으로 원본 프로필을 덮어쓰거나 DB에 저장하지 않는다.

실제 인증·팀 소속 확인·조회 권한·타인 응답 이메일 제거·RLS·DB 저장은 B의 책임이다. 알고리즘 필터는 일반 탐색 후보를 보수적으로 제한할 뿐, DB 접근 권한을 보장하지 않는다. `public`도 인터넷 전체 공개가 아니라 인증 회원 공개다. `team_only`를 일반 탐색에 넣지 않으며 별도의 팀 권한 조회가 필요하다.

## 함수와 타입

| 실제 파일(src/algorithms/) | 함수 | 입력 → 출력 |
| --- | --- | --- |
| validation.ts | validateUserProfile | unknown → ValidationResult<AlgorithmUserProfile> |
| validation.ts | validateOpportunity | unknown → ValidationResult<Opportunity> |
| validation.ts (inputSafety.ts에서 재수출) | isValidAvailabilityItem / filterValidAvailabilities | unknown → Availability 타입 가드 / Availability[] |
| validation.ts | validateAndCleanTeamAvailabilities | unknown → Record<string, Availability[]> |
| opportunityRecommendation.ts | recommendOpportunities | UserProfile, Opportunity[], Date=현재 시각 → OpportunityMatchResult[] |
| memberMatching.ts | calculateMemberMatch | 역할·기술 요구 조건, Availability[], 후보별 `{ profile: Pick<UserProfile, 'id' \| 'visibility' \| 'isPublic' \| 'desiredRoles' \| 'techStacks'>, availability: Availability[] }` 배열 → MemberMatchResult[] |
| publicMemberRecommendations.ts | recommendPublicMembers | 본인 ID, 역할·기술 요구 조건, 공개 프로필 후보 → PublicMemberRecommendations |
| teamAnalyzer.ts | analyzeTeamBalanceForRoles / analyzeTeamBalance | UserProfile[], UserProfile[], string[] / 역할 생략 → TeamBalanceAnalysisResult |
| scheduleOptimizer.ts | calculateOptimalMeetingSlots / slotToTimeString | Record<string,Availability[]>, number=60 → RecommendedSlot[] / number, boolean=false → string |
| opportunityTagExtractor.ts | extractTagsFromOpportunity | title?:string\|null, description?:string\|null → ExtractedOpportunityTags |
| adapters.ts | adaptOpportunityMatchToUi / adaptOpportunityMatchesToUi | OpportunityMatchResult / 배열 → MatchResult / 배열 |
| adapters.ts | adaptMemberMatchToUi / adaptMemberMatchesToUi | MemberMatchResult / 배열 → MatchResult / 배열 |
| adapters.ts | adaptTeamCandidatesToUi | TeamBalanceAnalysisResult['recommendedCandidates'] → MatchResult[] |
| tagClassification.ts | getCanonicalFieldTag | string → 신구 분야의 비교용 canonical 문자열 |

전체 결과 타입의 필드와 보조 함수는 기존 가이드에 둔다. 공통 타입은 `src/types/index.ts`, `AlgorithmUserProfile`은 `validation.ts`, `ProfileVisibility`는 `inputSafety.ts`에서 import한다.

## 화면 연결용 호출 예시

팀원 탐색에서 공개 프로필 후보를 전달하는 경로는 [공개 프로필 팀원 추천 계약](./ALGORITHM_INTEGRATION_GUIDE.md#공개-프로필-팀원-추천)을 참조한다. `recommendPublicMembers(myUserId, requirements, publicProfiles)`의 `status`로 빈 상태를 구분하고 `matches[].targetId`로 전달한 공개 후보와 연결한다. 결과는 전달한 후보 범위에 한정된다. PR #17에는 실제 Supabase 조회나 팀원 탐색 UI 호출이 포함되지 않았다.

아래는 `src/pages` 기준 import이며 실제 화면 파일을 수정한 것은 아니다. B가 권한을 검사한 프로필·공고·후보·시간표를 인수로 공급한다. 같은 기준 시각을 한 번 정해 전달하고 검증 오류와 빈 추천 결과를 UI에서 구분한다.

```typescript
import type { UserProfile, Opportunity } from '../types';
import { validateUserProfile, validateOpportunity, filterValidAvailabilities, validateAndCleanTeamAvailabilities } from '../algorithms/validation';
import { extractTagsFromOpportunity } from '../algorithms/opportunityTagExtractor';
import { getCanonicalTag, normalizeTag } from '../algorithms/tagClassification';
import { recommendOpportunities } from '../algorithms/opportunityRecommendation';
import { calculateMemberMatch } from '../algorithms/memberMatching';
import { analyzeTeamBalanceForRoles } from '../algorithms/teamAnalyzer';
import { calculateOptimalMeetingSlots, slotToTimeString } from '../algorithms/scheduleOptimizer';
import { adaptOpportunityMatchesToUi, adaptMemberMatchesToUi, adaptTeamCandidatesToUi } from '../algorithms/adapters';

export function connectAlgorithms(
  rawProfile: unknown, rawOpportunities: unknown[],
  rawCandidates: { profile: unknown; availability: unknown }[],
  rawMyAvailability: unknown, rawTeamAvailability: unknown,
  members: UserProfile[], requiredRoles: string[], now: Date,
) {
  const checked = validateUserProfile(rawProfile);
  if (!checked.isValid || !checked.data) throw new Error(checked.errors.join('; '));
  const rejected: string[] = [];
  const opportunities: Opportunity[] = [];
  for (const raw of rawOpportunities) {
    const validation = validateOpportunity(raw);
    if (!validation.isValid || !validation.data) {
      rejected.push(...validation.errors);
      continue;
    }
    const opportunity = validation.data;
    const extracted = extractTagsFromOpportunity(opportunity.title, opportunity.description);
    const tags = new Map<string, string>();
    for (const tag of [...opportunity.tags, ...extracted.allTags]) {
      const canonical = getCanonicalTag(tag);
      const key = normalizeTag(canonical);
      if (key && !tags.has(key)) tags.set(key, canonical);
    }
    opportunities.push({ ...opportunity, tags: [...tags.values()] });
  }
  const candidates = rawCandidates.flatMap(candidate => {
    const profile = validateUserProfile(candidate.profile);
    if (!profile.isValid || !profile.data) {
      rejected.push(...profile.errors);
      return [];
    }
    return [{ profile: profile.data, availability: filterValidAvailabilities(candidate.availability) }];
  });
  const memberMatches = calculateMemberMatch(
    { desiredRoles: requiredRoles, requiredTechStacks: [] },
    filterValidAvailabilities(rawMyAvailability), candidates,
  );
  const balance = analyzeTeamBalanceForRoles(members, candidates.map(c => c.profile), requiredRoles);
  const meetings = calculateOptimalMeetingSlots(validateAndCleanTeamAvailabilities(rawTeamAvailability), 60);
  return {
    opportunities: adaptOpportunityMatchesToUi(recommendOpportunities(checked.data, opportunities, now)),
    members: adaptMemberMatchesToUi(memberMatches), memberMatches,
    balance, teamCandidates: adaptTeamCandidatesToUi(balance.recommendedCandidates),
    meetings,
    firstMeeting: meetings[0] ? `${slotToTimeString(meetings[0].startSlot)}~${slotToTimeString(meetings[0].endSlot, true)}` : null,
    rejected,
  };
}
```

`members`도 검증된 입력을 전달한다. requiredTechStacks는 예시에서 비어 있으며 실제 연결에서는 모집 DTO의 기술 조건을 전달한다. targetId로 원본 DTO를 조회해 제목·링크·상세를 표시한다. 단일 어댑터는 해당 배열 어댑터의 요소별 변환 함수다.

## 검수 후 입력·오류 처리 기준

- 공개 범위 누락은 `visibility:null, isPublic:false`다. legacy true는 public과 호환하되 false만으로 private/team_only를 추정하지 않는다. 명시 visibility를 보존하고 isPublic과 충돌하면 `isValid:false`다. team_only/private는 일반 후보에서 제외한다.
- `AlgorithmUserProfile`은 기존 UserProfile과 호환하는 **알고리즘 전용 투영**이며 전체 프로필 DTO가 아니다. visibility, otherInterest, otherRole은 보존한다. longBio·숙련도·협업 선택값은 계산에 쓰지 않아 투영하지 않는다. A/B는 원본 DTO에 이 값들을 별도로 보관하며 투영 결과로 덮어쓰지 않는다. 기타 선택 시 상세 값은 필수이고, 비활성 기타 내용으로 분야를 추정하지 않는다. 자유 상세를 임의의 분야·기술로 분류하지 않는다.
- postedAt 누락/미확인은 검증 실패, 잘못된 시각은 별도 오류다. 공통 타입이 string이므로 null·빈 문자열·현재 시각을 만들어 성공시키지 않는다. 날짜만 있는 값은 정밀도 부족으로 거부한다. 국내 시분이 명시되고 시간대만 없으면 +09:00으로 해석하고 명시된 Z/offset은 보존한다. 잘못된 달력 날짜·시각은 거부한다.
- deadline/applicationStart의 null 또는 미제공은 미정으로 허용하며 빈 문자열·비문자열·잘못된 날짜는 실패다. 미래 게시 공고는 DTO 검증은 가능해도 추천에서는 제외한다. 게시 완료된 접수 예정 공고는 추천 가능하다. 마감 경계는 기존대로 deadline < now다. 원문 URL 및 추가 메타데이터는 보존하되 DB 저장용으로 쓰지 않는다.
- 단일/배열 어댑터는 잘못된 score·빈 targetId·비문자열 reasons/matchedTags를 예외로 알린다. score는 유한한 0~100인지 검사한 뒤 기존 정수 반올림을 유지한다. NaN/Infinity/음수/100 초과는 보정하지 않는다. 배열의 잘못된 요소도 조용히 버리지 않고 예외로 알린다. A는 연동 오류로 표시하고 0점으로 대체하지 않는다. 빈 추천 배열과 검증 오류도 구분한다.
- 시간표는 동일 userId/요일/slot의 중복을 제거하고 true/false 상충은 순서와 무관하게 false 우선이다. 누락은 불가로 본다. 타입 가드는 id/userId의 비어 있지 않은 문자열, 요일·slot 정수 범위, boolean, updatedAt 문자열을 확인한다. updatedAt의 날짜 파싱은 하지 않고 기존 호환을 위해 빈 문자열도 허용한다. 미등록 팀원은 map의 빈 배열로 남긴다.
- 팀 map의 사용자 key와 슬롯 userId가 다르면 제외한다. 기존 팀원 매칭 함수의 배열 형식·계산 호환은 유지하며, 본인/후보별 시간표 소유자 검증은 B가 인증된 ID를 기준으로 수행해야 한다.
- getCanonicalFieldTag는 신구 분야 라벨의 **비교 경로**에만 사용하며 기존 결과 표시명과 계산식을 유지한다. normalizeRole은 기존 내부 역할명, normalizeRoleToStandardKey는 A 표준 key용이다. 기존 별칭·자유 입력을 임의로 치환 저장하지 않는다.

## A/B 연결 위치와 미연결 범위

| 담당 | 연결 위치·필요 데이터 |
| --- | --- |
| A | HomePage/dashboard·OpportunitiesPage·상세: 공고 추천과 targetId 원본 대조. MembersPage·상세: 후보 매칭. TeamBuilderPage: 필수 역할을 명시한 분석. SchedulePage: 주간 map과 종료 슬롯 표시. Profile/Onboarding: 원본 DTO와 알고리즘 투영 분리 |
| B | 권한이 검증된 프로필(id/name/grade/track/interests/techStacks/wantedTechStacks/desiredRoles/visibility, 필요 시 otherInterest/otherRole), 공개 후보, 실제 게시 시각·모집 상태·접수 시작/마감·원문 URL, 본인/후보/전체 팀원 시간표. snake_case 변환과 인증 userId 결합 담당 |

이번 변경은 C 코드·테스트·연동 문서에 한정되며 실제 Supabase·B 서비스·A 화면 연결, DB 저장 및 RLS 검증 완료를 뜻하지 않는다. 전체 프로필 DTO·새 전공 공통 타입 확정은 src/types/index.ts를 수정하지 않는 이번 범위 밖이다. 웹서비스명 오탐·복합 기술명·구분자에 따른 추출 정확도 개선은 실데이터 보고서의 후속 과제로 유지한다.

## 검수 결과

2026-11-17 기준 algorithm/ca32abe 위의 작업 트리에서 확인했다. 기존 125개 테스트를 모두 유지하고 검수 회귀 테스트 48개를 추가해 **13개 파일·173개 테스트가 통과**했다. 기존 validation 성공 사례 하나에는 새 계약에 맞는 postedAt을 추가했으며 테스트의 목적과 기대값은 유지했다. 실데이터 테스트 7개와 원본 fixture는 수정하지 않았다.

`npm.cmd test`, `npx.cmd tsc --noEmit`, `npm.cmd run build`, `git diff --check`가 모두 성공했다. UTC 및 America/Los_Angeles에서 신규 48개 회귀 테스트가 각각 통과했고, 가이드 두 문서의 import 호출 예제 5개도 가상 TypeScript 파일로 검사해 통과했다. Windows의 npm.ps1 실행 정책 때문에 동일 package.json 스크립트의 npm.cmd 진입점을 사용했다. React Router Future Flag·Vite 청크 크기 안내는 기존 경고이며 실패는 없다.

fixture SHA-256은 기존과 동일한 `FA2F94177F25DE078B8E1B989F1615943353614A467AAF1D7019DB92217219A3`이다. commit/push/merge는 실행하지 않았다.
