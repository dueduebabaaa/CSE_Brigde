# BRIDGE — A·B·C 공통 데이터 계약

작성일: 2026-11-16 (Asia/Seoul)

## 1. 적용 범위와 근거

이 문서는 A·B·C 회의의 16개 합의를 최신 원격 코드와 대조한 구현 기준이다. 이번 작업에서는 이 문서만 작성했으며 소스, 공통 타입, 알고리즘, DB 및 기존 명세서는 수정하지 않았다.

다음 표기를 구분한다.

- **합의 확정**: 회의에서 결정한 의미·선택지·책임 범위. 이후 구현이 따라야 한다.
- **코드 확인**: 해당 커밋의 실제 함수·타입·저장 요청에서 확인한 사실. 배포나 DB 적용 완료를 뜻하지 않는다.
- **구현 권고안**: 합의를 코드로 옮기기 위한 변수명·직렬화·어댑터 제안. C가 타입을 확정하고 A·B가 검토해야 한다.
- **확인 필요**: 원격 DB 구조, 기존 데이터 의미 등 저장소만으로 확정할 수 없는 사항.

`git fetch --all` 이후 확인한 기준은 아래와 같다. 브랜치는 전환하지 않았다.

| 원격 브랜치 | 커밋 | 확인한 주요 소스 |
| --- | --- | --- |
| `origin/frontend` | `c5e9d79` | `OnboardingPage.tsx`, `majors.ts`, `technologies.ts`, `TechnologyPicker.tsx`, 홈·공고 UI |
| `origin/backend` | `505ee52` | `crawler/test-crawl.js`, `crawler/upload-to-supabase.js`, `src/lib/supabase.ts` |
| `origin/algorithm` | `5dadaca` | `tagClassification.ts`, `memberMatching.ts`, `opportunityRecommendation.ts`, `teamAnalyzer.ts`, `scheduleOptimizer.ts` |
| `origin/develop` | `692731f` | 기존 공통 타입과 `PROFILE_SPEC.md`, `DATA_SCHEMA.md`, `API_CONTRACT.md` |

네 브랜치의 `src/types/index.ts`는 동일하다. 최신 frontend의 `PROFILE_SPEC.md`만 전공 선택지가 갱신됐으며, 나머지 브랜치 문서·타입에는 이전 전공이 남아 있다. 관련 합의가 기존 문서의 협의 예정안과 충돌하면 본 문서의 **합의 확정** 내용을 우선 적용한다. 권고안을 추가 합의로 간주하지 않는다.

## 2. 그대로 유지할 구조

| 항목 | 유지할 기준 | 필요한 보완 |
| --- | --- | --- |
| 학년 | `1학년`, `2학년`, `3학년`, `4학년`, `대학원생` | 신규 폼은 미선택; 미선택 `''`는 저장 값이 아님 |
| 프로필 기본 필드 | `id`, `name`, `nickname`, `grade`, `track`, `bio`, `interests`, `techStacks`, `wantedTechStacks`, `desiredRoles` | 이메일이 포함된 본인 DTO와 타인 조회 DTO 분리 |
| 공고 카테고리 | `해커톤`, `공모전`, `경진대회`, `대외활동`, `서포터즈`, `교육/특강` | 프로필의 희망 활동 유형과 다른 분류임 |
| 공고 출처 | `knu_cse_official`, `admin_manual`, `user_manual` | 실제 주최 기관과 공고 게시 출처를 혼동하지 않음 |
| 공고 저장 상태 | `active`, `closed`, `needs_confirmation`, `draft` | 접수 예정은 날짜로 계산하는 표시 상태; 새 DB 상태를 임의 추가하지 않음 |
| 미정 공고 날짜 | `applicationStart: null`, `deadline: null` 허용 | 원문 시각을 손실하거나 날짜·시각을 생성하지 않음 |
| 시간표 | `Availability[]`, `Record<string, Availability[]>`, 30분 슬롯 | 정수·범위·사용자 ID 일치 검증 추가 |
| 응답 래퍼 | `ApiResponse<T>`의 `data` / `error` | 문서상 규격이며 서비스 구현은 B의 후속 작업 |
| 북마크 기본 정보 | `id`, `userId`, `opportunityId`, `createdAt` | Supabase 사용자별 저장 및 권한 검증 |

## 3. 프로필의 정확한 선택지

### 3.1 세부전공 — 합의 확정

기준: frontend `src/constants/majors.ts`의 `MAJOR_TRACKS`.

1. 글로벌소프트웨어융합전공
2. 플랫폼소프트웨어전공
3. 인공지능컴퓨팅전공
4. 심화컴퓨팅전공
5. 첨단컴퓨팅연구전공

`track`은 위 문자열 중 하나다. 데이터과학전공·데이터사이언스를 신규 별도 선택지로 제공하지 않는다. 기존 `TrackType` 및 문서의 `플랫폼소프트웨어`, `데이터사이언스`, `인공지능컴퓨팅`, `글로벌소프트웨어융합`, `심화컴퓨터공학`은 변경 대상이다.

기존 사용자 데이터는 일괄 치환하지 않는다. 특히 데이터사이언스의 귀속 및 심화컴퓨터공학과 새 전공의 관계는 B가 기존 데이터를 확인하고 A·C와 변환표를 검토한 후 마이그레이션한다. 상수 파일의 설명만으로 실제 학적 이력을 추론하지 않는다.

### 3.2 관심 분야 — A의 15개 선택지로 통일

기준: frontend `OnboardingPage.tsx`의 `INTEREST_OPTIONS`. 아래 문자열 자체가 선택 값이다.

| 순서 | 선택 값 | 순서 | 선택 값 | 순서 | 선택 값 |
| --- | --- | --- | --- | --- | --- |
| 1 | 웹 개발 | 6 | 게임 개발 | 11 | 마케팅 |
| 2 | 앱 개발 | 7 | 임베디드 및 IoT | 12 | 창업 |
| 3 | 인공지능 | 8 | 클라우드 | 13 | 알고리즘 |
| 4 | 데이터 분석 | 9 | UI/UX 디자인 | 14 | 오픈소스 |
| 5 | 정보보안 | 10 | 서비스 기획 | 15 | 기타 |

최소 1개, 복수 선택 가능. C의 현행 분야 canonical에는 `AI`, `모바일 앱`, `UI/UX` 등이 있으므로 A 값과의 비교 규칙을 보완해야 한다. 예를 들어 `AI` ↔ `인공지능`, `모바일 앱` ↔ `앱 개발`, `UI/UX` ↔ `UI/UX 디자인`은 분야 문맥에서 동일 의미로 취급한다. `임베디드 및 IoT`, `서비스 기획`, `마케팅`, `창업` 등의 누락도 점검한다. 기술 정규화 함수에 분야 변환을 무차별 적용하지 않는다.

### 3.3 희망 역할 — A의 11개 key로 통일

기준: frontend `OnboardingPage.tsx`의 `DESIRED_ROLE_OPTIONS`. label과 저장·전달 key를 구분한다.

| key: 저장·전달 값 | UI label: 표시 문구 |
| --- | --- |
| `Frontend` | Frontend |
| `Backend` | Backend |
| `AI/ML` | AI / ML |
| `Data` | Data |
| `UI/UX` | UI/UX 디자인 |
| `PM/기획` | PM / 서비스 기획 |
| `Mobile` | Mobile (iOS/Android) |
| `DevOps` | DevOps / 인프라 |
| `Security` | 정보보안 |
| `Marketing` | 마케팅 / 홍보 |
| `기타` | 기타 역할 |

최소 1개, 복수 선택 가능. C의 `normalizeRole`은 현재 `Frontend Developer`, `ML Engineer`, `UI/UX Designer` 등의 이전 표준어를 반환한다. 다음은 호환 매핑의 구현 권고안이며, C가 실제 기존 값의 의미를 검토해 적용한다.

| 기존 별칭 | 새 역할 key |
| --- | --- |
| Frontend Developer, 프론트엔드 | Frontend |
| Backend Developer, 백엔드 | Backend |
| ML Engineer, AI Engineer | AI/ML |
| Data Scientist, Data Analyst | Data |
| UI/UX Designer | UI/UX |
| Product Manager, PM | PM/기획 |
| Mobile App Developer | Mobile |
| DevOps Engineer | DevOps |
| Security Engineer, 정보보안 | Security |

DBA·QA·FullStack·Tech Lead 등은 새 선택지에 정확한 일대일 대응이 없으므로 자동으로 다른 역할 하나로 치환하지 않는다. C의 기존 복수 수행 가능 분야 해석은 별도 호환 계층으로 유지하고 기존 데이터 변환은 검토한다.

희망 역할 11개와 팀 빌더의 레이더 6축(`Frontend`, `Backend`, `Database`, `AI/Data`, `DevOps`, `UI/UX`)은 서로 다른 개념이다. 새 역할을 저장하기 위해 레이더 축을 임의로 변경하지 않는다. PM·마케팅 등 레이더 밖의 필수 역할을 누락시킨 뒤 충족됐다고 안내해서는 안 된다.

### 3.4 기타 직접 입력 — 기존 입력 상태 보존

현재 A는 `otherInterest`, `otherRole` 문자열을 배열과 분리해 유지한다. 다음 표현을 권고한다. 정확한 공통 필드 타입은 C가 확정한다.

- `interests` / `desiredRoles`에는 표준 선택 값 `기타`를 유지한다.
- 해당 항목을 선택했을 때만 trim한 `otherInterest` / `otherRole`을 전달하고 빈 내용은 거부한다.
- 선택 해제 후에도 폼의 입력 중 내용은 유지할 수 있지만, 비활성 기타 내용을 추천 입력으로 전달하지 않는다.
- 자유 문자열을 표준 역할 enum에 직접 삽입하거나 `기타` 자체를 일치 기술로 점수화하지 않는다. 자유 문자열의 의미 분류는 C가 담당한다.

### 3.5 참여 상태 및 나머지 온보딩 선택지

참여 상태는 A의 `STATUS_OPTIONS` key와 동일하게 **팀 구하는 중 / 제안 환영 / 활동 중 / 참여 어려움**을 사용한다. 초기 미선택은 참여 어려움 또는 팀 구하는 중으로 자동 간주하지 않는다. 선택 상태별 추천 제외·가중치는 이번 합의에서 확정되지 않았으므로 C가 정책을 확인한다.

아래는 A에서 확인한 현재 값이며 이번 합의가 범위를 넓혀 새 저장 enum까지 확정한 것은 아니다. 기존 값은 유지하고 명칭 차이만 정리한다.

| 폼 필드 | A의 실제 선택지 | 기존 문서와 차이 |
| --- | --- | --- |
| `activityTypes` | 공모전, 해커톤, 대외활동, 사이드 프로젝트, 스터디, 창업 | 공고 카테고리와 혼용 금지 |
| `activityGoals` | 수상 목표, 실무 경험, 포트폴리오, 기술 학습, 네트워킹 | PROFILE_SPEC·확장 DDL 예시는 `수상` |
| `meetingWay` | 대면, 비대면, 혼합 | DB 확장안의 `activity_mode`; 모집글의 `online/offline/hybrid`와 별도 경계 변환 |
| `activityDuration` | 단기 (1개월 이내), 장기 (3개월 이상), 무관 | DB 확장안은 단기/장기/무관; 축약 저장 시 명시적 양방향 매핑 필요 |

## 4. 기술 스택과 숙련도

### 4.1 공통 정규화 — 합의 확정

C의 `src/algorithms/tagClassification.ts` 규칙을 공통으로 사용한다. 현재 함수의 역할을 혼동하지 않는다.

- `normalizeTag`: trim, 연속 공백 정리, 소문자 비교 키 생성. **대표 기술명 반환 함수가 아니다.**
- `getCanonicalTag`: 위 비교 키에 동의어 사전을 적용해 대표 기술명 반환. `react.js` → `React`, `spring` → `Spring Boot`, `postgres` → `PostgreSQL`, `html`·`css` → `HTML/CSS`.
- `classifyTag` / `classifyTags`: 기술·분야·일반 분류. 현재 알 수 없는 문자열은 general이며 기술이라고 임의 분류하지 않는다.

A의 현재 `TechnologyPicker`는 자체 NFKC·대소문자 비교 및 카탈로그 조회를 사용한다. 이를 공통 C 규칙으로 대체하고 서버 저장 경계에서도 같은 규칙을 적용한다. NFKC 적용 여부는 C의 공통 규칙에 반영한 뒤 맞춘다. 프론트만 별도 정규화를 추가해 다른 키를 만들지 않는다.

정규화 후 중복을 제거한다. 알려지지 않은 직접 입력도 저장 가능하되, 공백 입력은 제거하고 원래 표현을 보존한다. 미등록 기술이라는 이유로 삭제하거나 임의의 기술과 동의어로 묶지 않는다. 미등록 기술의 분야 배정·점수 반영은 C가 명시적으로 처리한다.

A의 기술 카탈로그는 입력 후보이지 허용 목록 제한이 아니다. `HTML`·`CSS`가 하나의 `HTML/CSS`가 되는 것처럼 여러 입력이 하나로 합쳐질 때 선택 목록·숙련도 객체의 키도 함께 정규화해야 한다.

### 4.2 보유 기술 없음·미입력

- **합의 확정:** 보유 기술 없음은 `techStacks: []`. `['아직 보유 기술 없음']`이나 `['없음']`을 저장하지 않는다.
- A의 `hasNoTech`는 폼에서 명시적 선택을 검증하기 위한 상태로 유지 가능하다. 공통 프로필에 별도 DB 플래그가 존재한다고 가정하지 않는다.
- **합의 확정:** 숙련도는 입문·활용 가능·숙련·미입력의 네 상태. 보유 기술이 없으면 숙련도도 빈 객체다. 새 기술 선택 시 활용 가능을 자동 지정하지 않는다.
- **직렬화 권고안:** `type TechProficiency = '입문' | '활용 가능' | '숙련' | null`; `미입력` 표시는 `null`로 표현하고 객체의 누락 키도 읽기 경계에서 미입력으로 해석한다. 문구 `미입력`을 저장할지 여부는 아직 별도 확정되지 않았다.
- 보유하지 않은 기술의 숙련도 키는 제거한다. 같은 canonical로 합쳐진 기술의 숙련도가 다르면 더 높은 값을 임의 채택하지 않고 사용자 확인 또는 미입력 처리 정책을 C·A가 정한다.

권고 DTO 예시이며 아직 공통 타입이나 DB 적용 결과가 아니다.

```json
{
  "techStacks": ["React", "Python"],
  "techProficiency": { "React": "활용 가능", "Python": null },
  "wantedTechStacks": ["Rust"]
}
```

## 5. 공개 범위와 학교 이메일

공개 범위 세 가지는 합의 확정이다. A의 기존 key를 재사용하는 방안을 권고한다.

| 의미 | A의 기존 `visibility` key | 접근 범위 |
| --- | --- | --- |
| 회원 공개 | `public` | 인증된 BRIDGE 회원. 인터넷 전체 공개가 아님 |
| 팀원 공개 | `team_only` | 동일 프로젝트·팀 소속임을 서버에서 확인한 회원 |
| 비공개 | `private` | 본인 외 일반 회원에게 비공개 |

현재 공통 타입·DDL의 `isPublic` / `is_public` boolean으로는 세 상태를 표현할 수 없다. C가 공통 공개 범위 타입·프로필 DTO를 보완하고 B가 DB·RLS를 구현한다. 임시 호환 boolean을 유지한다면 `visibility === 'public'`일 때만 참으로 파생하고, boolean을 원본 공개 범위로 사용하지 않는 방안을 권고한다. `false`는 팀원 공개와 비공개 중 무엇인지 알 수 없으므로 역변환하지 않는다.

본인 프로필·인증 응답의 학교 이메일 보유는 허용되지만 **다른 일반 회원에게는 공개 범위에 관계없이 응답에서 제외**한다. UI에서 숨기기만 해서는 안 된다. 타인 조회용 DTO에는 `email`을 포함하지 않도록 C가 타입을 분리하고 B가 조회 열·권한·뷰 또는 응답 가공을 구현한다. RLS는 행 접근 제어이므로 이메일 열 제외 수단도 함께 확인한다.

C의 매칭·후보 추천은 현재 `isPublic === false`만 걸러낸다. 공개 범위 변경 후에는 일반 탐색용 후보에서 팀원 공개·비공개를 제외해야 한다. 팀원 공개를 열람할 수 있다는 이유만으로 일반 추천 풀에 넣지 않는다. 권한 필터는 B에서 먼저 적용하고 C가 없는 인증 정보를 추정하지 않는다. `candidateProfile` 전체를 UI로 반환하는 기존 팀 빌더 결과도 이메일 제거 대상이다.

## 6. 변수명·타입·DB 매핑

회의는 camelCase/snake_case 경계 원칙을 확정했다. 아래 확장 필드명은 구현 권고안이며 실제 DB 컬럼 존재를 의미하지 않는다. 기존 이름은 가능한 유지한다.

| A 폼·기존 값 | 권고 공통 TypeScript 값 | DB 대응 또는 상태 | 변경 필요 사항 |
| --- | --- | --- | --- |
| `track: string`, 기존 `TrackType` 5개 구 명칭 | 새 전공 5종의 `TrackType` | `track`: 문서상 baseline | C 타입 변경, B CHECK·기존 데이터 확인 |
| `interests: string[]` | 관심 분야 15종 배열 | `interests`: 문서상 baseline | C 표준 값·분류 보완 |
| `desiredRoles: string[]` | 역할 key 11종 배열 | `desired_roles`: 문서상 baseline | label과 key 분리, C 별칭 호환 |
| `otherInterest`, `otherRole` | 같은 이름의 선택 문자열 권고 | `other_interest`, `other_role`: 신규 후보, 미확인 | 폼 비활성 값과 저장 값을 분리 |
| `hasNoTech`, `techStacks` | `techStacks: string[]` | `tech_stacks`: 문서상 baseline | 기술 없음은 빈 배열 |
| `techProficiencies` | `techProficiency` 권고 | `tech_proficiency`: 기존 문서 확장안, 미확인 | 기존 API의 단수 이름 유지; 키 정규화·미입력 표현 확정 |
| `wantedTechStacks` | 같은 이름 | `wanted_tech_stacks`: 문서상 baseline | C 기술 정규화 공통 적용 |
| `visibility`, 기존 `isPublic` | `visibility` 3값 권고 | `visibility`: 신규 후보; `is_public`은 문서상 baseline | boolean 대체·호환과 RLS 설계 |
| `participationStatus` | `availabilityStatus` 권고 | `availability_status`: 기존 문서 확장안, 미확인 | 기존 API 이름 유지, 미선택은 `null` 권고 |
| `department` | 같은 이름 | `department`: 기존 문서 확장안, 미확인 | A는 `경북대학교 컴퓨터학부`, 기존 API 주석은 `컴퓨터학부`; 저장 문자열은 추가 확정 |
| `longBio` | 같은 이름 권고 | `long_bio`: 신규 후보, 미확인 | `bio` 60자와 상세 소개 500자를 구분 |
| `meetingWay` | `activityMode` 권고 | `activity_mode`: 기존 문서 확장안, 미확인 | 대면·비대면·혼합 값 유지 |
| `activityTypes`, `activityGoals`, `activityDuration` | 같은 이름 권고 | 기존 확장안의 snake_case, 미확인 | 수상 목표/수상, 기간 축약 여부 합의 후 어댑터 작성 |

기존 `id`, `name`, `nickname`, `grade`, `bio`, `githubUrl`, `portfolioUrl`, `createdAt`, `updatedAt` 명칭은 유지한다. 선택 URL의 폼 `''`를 저장할 때 `null`로 변환하는 방안을 권고한다. 닉네임 미입력은 UI에서 이름으로 표시하며, 저장 값에 이름을 복제할지는 별도 정책이다. `avatarColor`의 Tailwind 클래스 문자열을 DB 컬럼으로 저장한다고 가정하지 않는다.

`experiences: string[]`와 기존 문서의 `ProjectExperience[]` 확장안은 이번 16개 합의에서 구조가 확정되지 않았다. 임의로 교체하지 않는다.

서비스 경계는 `DB row → 검증·명시적 필드 매핑 → TypeScript DTO → C 알고리즘 또는 A UI` 순서다. `as UserProfile` 같은 타입 단언만으로 snake_case 행을 변환하지 않는다. 저장은 반대 방향으로 수행하며 알 수 없는 필드를 그대로 upsert하지 않는다.

## 7. B 코드에서 확인한 DB 접근과 실제 DB 미확인 사항

### 7.1 실제 코드의 저장 요청

아래는 `origin/backend:crawler/upload-to-supabase.js`가 사용하는 **필드명과 요청 형태**다. 원격 DB의 컬럼·자료형·제약·기본값이 이와 일치한다고 확인된 것은 아니다.

| `opportunities` 요청 필드 | TypeScript 대응 | 현재 코드 동작 |
| --- | --- | --- |
| `title`, `description`, `category`, `tags`, `organizer`, `status` | 같은 이름 | 설명은 요약; 태그는 활동 키워드; 주최는 컴퓨터학부 고정 |
| `posted_at` | `postedAt` | 원본 `created_at` 날짜에 한국 자정 추가; 날짜가 없으면 null |
| `application_start` | `applicationStart` | 항상 null |
| `deadline` | `deadline` | 날짜 추출 후 UTC 자정; 시·분을 잃음 |
| `source_type` | `sourceType` | `knu_cse_official` |
| `source_post_id` | `sourcePostId` | 원본 ID의 문자열; 기존 조회 및 upsert 충돌 기준 |
| `source_url` | `sourceUrl` | 원본 URL |
| `application_url` | `applicationUrl` | 항상 null |
| `source_updated_at` | `sourceUpdatedAt` 후보 | 항상 null; 공통 타입·baseline DDL에 없음 |

업로더는 `id`, `collected_at`, `updated_at`을 직접 보내지 않는다. DB 기본값·트리거로 생성되는지 B 확인이 필요하다. 기존 조회는 `source_post_id`를 select하고 upsert의 `onConflict`도 `source_post_id`다. 실제 unique 제약이 적용됐는지 확인해야 한다.

`crawling_logs`에는 `status`, `new_items_count`, `updated_items_count`, `error_message`, `triggered_by`를 insert한다. 현재 `triggered_by`는 항상 `admin_manual`이므로 Actions 실행은 `github_actions`로 구분하도록 B가 보완한다. `executed_at`·ID 생성은 실제 DB 확인 대상이다.

원시 `crawler/notices.json`의 `created_at`은 공지 게시 날짜이지 DB 생성 시각이 아니다. `source_id`, `created_at`, `source_url`, `content`, `author`, `attachments`는 크롤러 중간 형식이며 공통 `Opportunity`나 실제 DB 행과 동일하지 않다.

### 7.2 문서와 실제 DB를 구분

- `DATA_SCHEMA.md`에는 profiles·opportunities·availabilities·bookmarks 등 DDL과 RLS 원칙이 있지만, 네 브랜치에 실행 가능한 SQL 마이그레이션 파일은 없다.
- 실제 Supabase 구조·컬럼·CHECK·인덱스·트리거·RLS·뷰는 이번에 조회하지 않았다. profiles·bookmarks·availabilities의 실제 필드 존재도 확인되지 않았다.
- B가 실제 스키마와 정책을 확인하고 저장소에 재현 가능한 마이그레이션을 제공한 후 `DATA_SCHEMA.md`를 갱신한다. 자격 증명이나 환경변수 값은 문서에 기록하지 않는다.

## 8. 공고 태그와 날짜

### 8.1 C 추출·정규화 → B 저장 — 합의 확정

현재 C의 `classifyTags(tags)`는 **이미 추출된 태그 배열을 분류**할 뿐 원문 제목·본문에서 분야·기술을 추출하는 함수가 아니다. B의 현재 `INCLUDE_KEYWORDS` 기반 태그 생성만으로 C의 책임이 구현됐다고 판단하지 않는다.

C가 원문 기반 추출과 정규화를 구현하고 B가 그 결과를 저장한다. 기존 `Opportunity.tags: string[]`와 DB `tags`는 유지 가능한 경로다. C가 분류한 canonical 분야·기술·일반 태그를 중복 없이 이 배열에 합쳐 저장하는 방안을 권고한다. 분리된 `field_tags`, `tech_tags` 컬럼은 이번 회의에서 확정되지 않았으며 실제로 존재한다고 가정하지 않는다.

분야 태그는 A 관심 분야 기준과 의미 비교가 가능해야 하고 기술 태그는 C 기술 canonical을 사용한다. 원문에 없는 기술을 채우거나 일반 태그를 기술로 점수화하지 않는다. 추출 함수 이름·입출력·중간 결과의 JSON 표현은 C·B가 확정한다. C의 현재 `canonicalMap: Map`은 내부 자료형이므로 그대로 JSON/DB에 전달하지 않는다.

#### 8.1.1 태그 신뢰도 및 본문 근거 정책 — 합의 확정

- **본문 근거 원칙**: 공고 제목(title) 및 본문(description)의 실제 문장에 명시적 근거(키워드 출현)가 있는 태그만 추출·정규화하여 추천 점수 계산에 사용한다.
- **임의 추정 금지**: 단순 기관명, 주최명, 또는 브랜드명(예: Upstage 등)으로부터 Python, AI, LLM 등의 기술을 임의로 유추하거나 확장하지 않는다.
- **일반 태그 점수화 배제**: 원문에 기술/분야 근거가 없는 단순 행사 구분 태그(해커톤, 공모전, 경진대회, 부트캠프 등)는 기술/분야 일치 점수에 가산하지 않는다.

### 8.2 날짜 계약 — 합의 확정

- 원문에 시간대가 없는 국내 날짜·시각은 Asia/Seoul로 해석한다. 명시된 다른 시간대가 있으면 그 순간을 보존하고 UI에서 서울 시간으로 표시한다.
- 저장·전달은 시간대가 명시된 ISO 8601을 사용한다. `2026-11-20T18:00:00+09:00`과 `2026-11-20T09:00:00.000Z`는 같은 순간이다. UTC의 `Z` 저장 자체가 문제인 것은 아니다.
- `2026-11-20T00:00:00.000Z`는 한국 오전 9시이므로 원문의 오후 6시를 대체할 수 없다. B의 `toISODate` / `extractDeadline`은 시·분을 보존하도록 수정 대상이다.
- 마감일 미정은 `deadline: null`. 날짜만 있고 시각이 없으면 00:00·18:00·23:59 등을 임의로 넣지 않는다. 정확한 시각을 표현할 수 없는 현 타입에서는 null로 두고, 원문 날짜·정밀도 보존 방법은 B·C가 확정한다. 이 추가 메타데이터 컬럼은 아직 미확인이다.
- 누락된 연도나 연말/연초 날짜를 게시 연도만으로 자동 확정하지 않는다. 근거가 부족한 경우 null과 원문 정보를 유지한다.
- `postedAt`도 없는 시각을 생성하지 않는다. 현재 B는 게시 날짜만 수집하며 한국 자정을 붙인다. 날짜 전용 값 보존·게시 시각 확인 방식과 `postedAt: string`의 nullable 여부는 C·B 확인 대상이다. 잘못된 문자열·null을 빈 문자열 또는 현재 시각으로 대체하지 않는다.
- 게시 순간을 확인할 수 없는 공고를 자동으로 게시 완료 추천 대상으로 간주하지 않는다. 날짜 정밀도 정책을 확정한 뒤 동일한 게시 판정 규칙을 A·C에 적용한다.

#### 8.2.1 마감일 누락 및 확인 필요 공고 처리 — 합의 확정

- **마감일 누락(null) 처리**: `deadline === null`인 공고는 마감일 미정 상태일 뿐이므로 추천 후보에서 제외하거나 점수를 감점하지 않는다.
- **날짜 오판 방지**: 제목이나 본문에 자연어로 날짜가 기재되어 있더라도 날짜 파싱이 불확실한 자연어(예: '추후 공지', '선착순 마감', '상시 모집', '마감 시까지')는 마감으로 오판하지 않고 기존대로 null을 유지하며 추천 후보에 정상 포함한다.
- **행사일과 마감일 구분**: 행사일, 대회 일시, 또는 교육 기간(예: '교육 기간: 11월 10일 ~ 11월 12일')을 접수 마감일로 오판하지 않도록 엄격히 분리한다. 접수/신청/모집 마감 키워드가 명시된 경우만 마감일로 취급한다.
- **명확한 마감 경과 공고의 안전 처리**: 제목/본문에 명시적인 마감 일시(예: '~11월 9일 13시 마감')가 기재되어 있고 기준 시각보다 과거임이 명백한 경우에 한해, DB나 서비스 수정 없이 알고리즘/어댑터 레벨의 순수 함수(`filterExplicitTextDeadline: true`)를 통해 추천 후보(`matches`)에서 안전하게 제외한다. 단, 이 필터는 맞춤 추천 판정에만 적용되며 전체 공고 탐색 데이터 자체나 DB 상태는 일절 변경하지 않는다.

### 8.3 추천 대상과 상태 — 합의 확정

A와 B, C가 합의한 공고 추천 대상 및 필터링 정책은 다음과 같다.

| 조건 | 추천 처리 | UI 표시 및 비고 |
| --- | --- | --- |
| `draft` 또는 확인된 `postedAt > currentDate` (미래 게시) | **제외** | 미게시 공고는 사용자에게 노출하지 않음 |
| `closed` 또는 확인된 `deadline < currentDate` (마감 경과) | **제외** | 종료된 공고는 추천 후보에서 배제 |
| 게시 완료 + `active` + `applicationStart > currentDate` (접수 시작 전) | **추천 가능** | UI에 '모집 예정' 표시 |
| 게시 완료 + `active` + 접수 중 (`applicationStart <= currentDate`) | **추천 가능** | 정상 추천 대상 |
| 게시 완료 + `active` + `deadline: null` | **추천 가능** | null만으로 감점하거나 제외하지 않음 |
| 게시 완료 + `needs_confirmation` | **추천 가능** | '일정 확인 중' 배지 유지 및 원문 공지 확인 유도 |

**공고 추천 최종 합의 11개 정책**:
1. 정상적으로 게시된 `active` 공고는 추천 후보에 포함한다.
2. 정상적으로 게시된 `needs_confirmation` 공고도 추천 후보에 포함한다.
3. 마감일 누락(`deadline === null`) 공고는 추천 후보에서 제외하거나 점수를 감점하지 않는다.
4. 명시적으로 마감(`status === 'closed'`)된 공고는 제외한다.
5. 실제 마감일이 지난(`deadline < currentDate`) 공고는 상태와 관계없이 제외한다.
6. 초안(`status === 'draft'`) 및 미래 게시일(`postedAt > currentDate`) 공고는 제외한다.
7. 평가 불가(`evaluable: false`)와 실제 0점(`evaluable: true, score: 0`)을 명확히 구분한다.
8. 평가 불가 공고는 추천 점수 표시를 생략한다 (UI에 점수 대신 미제공/안내 표시).
9. 실제 0점 공고는 점수(0점) 자체는 내부 보존하되, 맞춤 추천 목록, 추천 필터(`recommended=1`), 홈 대시보드 추천 카운트 배지에서 제외한다 (`match.score > 0 && match.evaluable`).
10. 본문 및 제목에 실제 문장 단위 근거가 있는 태그만 추천 점수 계산에 사용한다.
11. `needs_confirmation` 공고는 기존 '일정 확인 중' 안내 및 원문 확인 유도 UI를 온전히 유지한다.

기존 C의 마감 경계는 `deadline < 기준 시각`이며 같은 순간은 아직 제외하지 않는다. 이 경계는 임의 변경하지 않고 A·B·C 테스트에서 일치시킨다. D-Day는 서울 달력 날짜 기준 표시, 모집 종료 여부는 정확한 순간 기준으로 판단한다. 클라이언트와 서버가 비교하는 기준 시각의 출처도 통합 시 맞춘다.

## 9. 시간표 — C의 기존 입력·출력 형식 유지

하루 48개, 주간 336개의 30분 슬롯은 합의 확정이다. UI가 월요일부터 보여도 데이터의 요일 번호를 바꾸지 않는다.

```typescript
// 기존 공통 타입 그대로: 새로 구현된 타입이라는 뜻이 아니다.
type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6; // 일·월·화·수·목·금·토
interface Availability {
  id: string;
  userId: string;
  dayOfWeek: DayOfWeek;
  slot: number; // 정수 0~47
  isAvailable: boolean;
  updatedAt: string;
}

// 기존 API_CONTRACT의 저장 요청. id/userId/updatedAt은 서버에서 결합한다.
type AvailabilityInput = {
  dayOfWeek: DayOfWeek;
  slot: number;
  isAvailable: boolean;
};

// 실제 C 함수의 입력 시그니처
declare function calculateOptimalMeetingSlots(
  teamMemberAvailabilities: Record<string, Availability[]>,
  minimumDurationMinutes?: number // 기본 60
): RecommendedSlot[];
```

`AvailabilityInput`은 이 문서의 설명용 별칭이며 현재 공통 타입에 추가된 이름이 아니다. `RecommendedSlot`은 C가 이미 정의한 타입이다.

- slot 0 = 00:00~00:30, 18 = 09:00~09:30, 38 = 19:00~19:30, 47 = 23:30~다음 날 00:00. 데이터는 서울 주간 반복 시간표이며 슬롯을 UTC 시각으로 바꾸지 않는다.
- B가 확인할 문서상 컬럼 대응은 `user_id` ↔ `userId`, `day_of_week` ↔ `dayOfWeek`, `is_available` ↔ `isAvailable`, `updated_at` ↔ `updatedAt`, `slot`은 동일하다. 실제 테이블·unique 제약 존재는 미확인이다.
- 정수 요일 0~6, 정수 슬롯 0~47, boolean 값과 동일 사용자 내 중복을 검증한다. 그룹 key와 항목의 userId가 달라서는 안 된다. 저장 userId는 인증 정보에서 정하고 다른 사용자의 ID를 신뢰하지 않는다.
- C는 `isAvailable === true`만 사용하고 누락 슬롯을 사용 불가로 본다. 저장을 336행 전체로 할지 선택 슬롯만 할지는 미확정이다. 선택 해제를 삭제 또는 false로 반영하는 저장 방식·주간 갱신 방식도 B·C가 정해야 한다.
- 참여 팀원을 map에서 빼면 참석률 분모가 바뀐다. 미등록 팀원도 `{ userId: [] }` 형태로 포함하고 미등록/전 시간 불가의 UI 구분이 필요하면 별도 메타데이터를 합의한다.
- 현재 시간표 출력은 `dayOfWeek`, `startSlot`, `endSlot`, `durationMinutes`, `attendanceRatio`, `availableMemberIds`, `missingMemberIds`, `isOptimal`이다. start/end는 **양 끝 포함**이며 길이는 `(endSlot - startSlot + 1) * 30`분이다.
- 예: 화요일 `startSlot=38`, `endSlot=41`은 19:00~21:00, 120분이다. `slotToTimeString(endSlot, true)`를 사용한다. endSlot 47의 표시 종료는 24:00이지 같은 날 00:00이 아니다.
- 실제 일회성 회의를 저장할 때만 날짜를 선택하고 서울 시간으로 해석해 `scheduledAt` ISO로 변환한다. 주간 슬롯 자체에서 임의의 회의 날짜를 만들지 않는다.
- 매칭 함수는 `myAvailability: Availability[]`, 후보별 `{ profile, availability: Availability[] }[]`를 받으며 `commonAvailableHoursWeekly`는 공통 슬롯 수 × 0.5시간이다. 이 구조와 단위는 유지한다.
- 소수 요일에서 현재 C가 예외를 낼 수 있으므로 B 입력 검증과 C 방어 검증을 함께 보완한다. 최소 회의 시간의 유한 양수·30분 단위 올림 정책은 기존 C 기준으로 검증한다.

## 10. 추천 결과의 UI 경계

공통 UI의 필수 의미는 `targetId: string`, `score: number`, `reasons: string[]`다. C 내부의 알고리즘별 결과는 유지하고 UI 경계에서 변환한다.

| C의 기존 결과 | UI 매핑 | 보존할 추가 정보 |
| --- | --- | --- |
| `OpportunityMatchResult.opportunityId` | `targetId` | `matchedTags` |
| `MemberMatchResult.userId` | `targetId` | `matchedTechStacks` → `matchedTags` 호환 가능; 역할·공통 시간은 상세 결과에 보존 |
| 팀 빌더 후보의 `candidateProfile.id`, `fitScore` | `targetId`, `score` | 전체 팀 분석 구조는 별도 유지; `reasons` 생성 규칙은 C가 실제 근거로 정의 |

기존 `MatchResult`에는 `matchedTags: string[]`도 필수다. 이번 합의는 이 필드를 삭제하라는 뜻이 아니므로 기존 UI 호환을 위해 유지하는 방안을 권고하며, 근거 태그가 없으면 빈 배열로 전달한다. C가 타입 변경 여부를 결정한다.

```typescript
// 기존 MatchResult를 사용할 때의 명시적 경계 변환 예시
const uiResult = {
  targetId: algorithmResult.opportunityId,
  score: algorithmResult.score,
  matchedTags: algorithmResult.matchedTags,
  reasons: algorithmResult.reasons,
};
```

점수는 유한한 0~100 값이어야 한다. C의 현재 정수 반올림 결과를 그대로 전달할 수 있다. 범위를 벗어나거나 NaN인 결과를 UI가 임의의 유효 점수로 보정해 성공 결과처럼 보여주지 않는다. 추천이 없으면 빈 배열과 추천 미제공 상태를 표시하며 예시 점수를 운영 대체 값으로 사용하지 않는다. 반환 ID는 실제 전달된 공고·후보 데이터와 연결돼야 한다.

### 10.1 추천 점수와 배지 정책 — 합의 확정

- **평가 불가 (`evaluable: false`)와 실제 0점 (`evaluable: true, score: 0`)의 구분**:
  - **평가 불가 (`evaluable: false`)**: 공고에 분야/기술 태그가 없거나 학생 프로필에 관심 분야/기술 스택이 등록되지 않아 매칭 분모가 0인 경우다. 이때 점수는 0점으로 처리되지만 추천 점수 UI 표시는 생략('-' 또는 미제공 표시)하며 데이터 부족 안내 사유를 전달한다.
  - **실제 0점 (`evaluable: true, score: 0`)**: 학생과 공고 모두 평가 가능한 데이터가 존재하지만 일치하는 태그가 전혀 없는 경우다. 0점 점수는 유지하되, 추천 공고 카운트 배지, 맞춤 추천 목록, 추천 필터링(`recommended=1`)에서는 제외한다 (`score > 0 && evaluable`).
- **추천 점수 노출 경계**: UI는 `evaluable` 플래그와 `score > 0` 조건을 확인하여 추천 배지와 적합도 점수(예: '추천 적합도 85%')를 일관되게 표시한다.

## 11. 북마크 계약

사용자별 Supabase 저장은 합의 확정이다. 현재 홈은 React 화면 상태, 탐색·상세는 DEV 전용 sessionStorage이므로 운영 저장 구현으로 간주하지 않는다.

- 기존 `Bookmark`의 camelCase 형식과 문서상 `bookmarks(user_id, opportunity_id, created_at)` 대응은 유지한다. 실제 DB 구조는 B가 확인한다.
- 인증된 본인의 userId로만 조회·추가·삭제하고 다른 회원의 북마크를 노출하지 않는다. 사용자/공고 조합 중복 방지 및 본인 전용 정책은 B가 검증한다.
- 기존 UI `bookmarkIds: string[]`, `onBookmark(id, next): Promise<void>` 경계를 재사용한다. Promise는 실제 저장 성공 후 resolve하고, 실패 시 상태를 확정하지 않는다.
- A는 홈·목록·상세·저장한 공모전 화면이 하나의 사용자별 저장 상태를 공유하도록 연결한다. 로그인 사용자 변경 시 이전 사용자의 캐시·DEV 상태를 사용하지 않는다.
- 북마크 서비스 함수명은 기존 API 문서에 없으므로 아직 확정되지 않았다. B가 목록 조회·추가·삭제 인터페이스를 제시하고 A·C가 DTO를 검토한다.

## 12. 기존 문서의 정확한 불일치와 후속 수정

| 파일 | 기존 내용 | 필요한 반영 |
| --- | --- | --- |
| `PROFILE_SPEC.md` | frontend만 전공 5종 갱신; 다른 브랜치는 구 전공. 일부 항목이 아직 협의 예정 | 전공·역할·관심 분야·기술 없음·공개 범위 합의 확정으로 갱신 |
| `DATA_SCHEMA.md` baseline | 구 전공 CHECK, boolean 공개 범위, 필수 posted_at | B가 실제 DB 확인 후 새 전공·공개 범위·정밀도 정책에 맞춰 마이그레이션 |
| `DATA_SCHEMA.md` 확장안 | 기술 없음 표현·숙련도·참여 상태가 미확정, 선택값 기본 자동 지정 | 기술 없음은 []; 미입력은 추정하지 않음. 새 권고 필드 적용 여부와 기존 데이터 이행 확인 |
| `API_CONTRACT.md` 초기 프로필 | `['아직 보유 기술 없음']` 허용, 공개 범위·기타 상세 값 없음 | 빈 배열만 사용, 3단계 공개 범위·필요 DTO 보완 |
| `API_CONTRACT.md` 정규화 예시 | `normalizeTag('react.js')`가 `React`를 반환하는 것처럼 기술 | 실제 대표명 변환은 `getCanonicalTag`; normalizeTag는 비교 키 함수 |
| `src/types/index.ts` | 구 TrackType, `isPublic`, 확장 필드 부재, MatchResult의 matchedTags 필수 | C가 타입 변경 주도, A·B 검토. 타인 DTO 이메일 제외·호환 경계 명시 |
| `추천 규약·A 홈` | 게시 전 검사 없음 / needs_confirmation 제외 | active 및 needs_confirmation 모두 추천 후보 포함; 게시 전·마감 공고 제외, 접수 예정 추천 허용 |
| 시간표 규약 | 48슬롯·요일·기존 입출력은 일치 | 정수 검증·종료 포함·미등록 팀원·저장 해제 의미를 명시 |

## 13. 담당자별 수정 파일과 검수 기준

아래는 **후속 수정 목록**이며 이번 문서 작성에서 실제로 수정한 파일 목록이 아니다.

| 담당 | 수정 대상 | 할 일 |
| --- | --- | --- |
| C 주도, A·B 검토 | `src/types/index.ts` | 새 TrackType, 관심 분야·역할·공개 범위·참여 상태·숙련도 타입, 본인/타인 DTO, nullable·선택 필드와 추천 호환 필드 확정 |
| C | `src/algorithms/tagClassification.ts` | A 분야 선택지와 비교 호환, 공통 기술 정규화, 원문 태그 추출의 명확한 인터페이스 구현. 미등록 기술 허용·일반 태그 점수화 금지 |
| C | `src/algorithms/memberMatching.ts` | 새 역할·구 별칭 정규화, 공개 범위가 검증된 후보 입력, 시간표 정수 검증 |
| C | `src/algorithms/opportunityRecommendation.ts` | 게시 전 제외, 게시 완료 접수 예정 허용, 시각 보존·null·상태 정책 일치 |
| C | `src/algorithms/teamAnalyzer.ts` | 역할 11종과 레이더 6축 구분, 지원하지 않는 필수 역할 충족 안내 방지, UI 후보 DTO 이메일 제외 |
| C | `src/algorithms/scheduleOptimizer.ts`, `src/tests/*` | 정수·범위·유한 값 검증; 태그/역할/추천 대상/공개 범위/시간표 경계 회귀 테스트 |
| A | `src/pages/OnboardingPage.tsx`, `src/components/TechnologyPicker.tsx`, `src/constants/majors.ts`, `src/constants/technologies.ts` | 정확한 선택지 유지, C 공통 기술 정규화 재사용, 폼→DTO 어댑터, 미선택·기타·숙련도 미입력 유지 |
| A | `src/pages/ProfilePage.tsx`, `MembersPage.tsx`, `MemberDetailPage.tsx` | 새 전공·역할·공개 범위 사용, 타인 이메일을 포함하지 않는 DTO 소비 |
| A | `src/pages/HomePage.tsx`, `src/components/dashboard/*` | 추천 가능/현재 접수 중 분리, 새 UI 결과·권한 필터된 후보 연결, 공통 북마크 상태 사용 |
| A | `src/components/opportunities/*`, `src/pages/OpportunitiesPage.tsx`, `OpportunityDetailPage.tsx`, `BookmarksPage.tsx` | 서비스 DTO·정규화 태그·원문 시각 표시·추천 변환·사용자별 북마크 연결 |
| B | `crawler/test-crawl.js`, `crawler/upload-to-supabase.js` | 원문 날짜·시각 근거 보존, C 추출·정규화 결과 저장, nullable/상태 처리, 실제 주최 확인, 정확한 수집 로그 분류 |
| B | `src/services/`의 프로필·공고·시간표·북마크 서비스(현재 미구현) | 인증 사용자 기준 조회·저장, snake_case↔camelCase 명시 매핑, 입력 검증·이메일 제외·실패 응답 구현 |
| B | `supabase/` 등의 신규 마이그레이션·정책 파일, `docs/DATA_SCHEMA.md` | 실제 컬럼·기본값·제약·unique·RLS 확인, 합의된 DB 변경 및 기존 데이터의 안전한 이행 |
| A·B·C | `docs/PROFILE_SPEC.md`, `docs/API_CONTRACT.md`, 이 문서 | 권고안의 최종 이름·직렬화·미확인 정책 확정 후 문서 동기화 |

통합 전 최소 확인 목록:

1. A의 전공 5·관심 분야 15·역할 11 선택 값과 C의 허용 타입·정규화가 일치하는가.
2. 기술 없음은 [], 선택 기술 숙련도 미입력은 임의 값 없이 왕복되는가. 동의어 병합 충돌을 처리하는가.
3. 회원 공개·팀원 공개·비공개가 분리되며 타인 응답에 학교 이메일이 없는가.
4. 원문에 있는 마감 시각을 ISO 왕복해도 동일한 서울 시각이며 미정 시각을 생성하지 않는가.
5. 게시 전·마감 공고는 추천에서 빠지고 게시 완료 접수 예정은 표시 상태와 함께 추천되는가.
6. 주간 336슬롯의 요일·끝 슬롯·정수 검증·미등록 팀원·선택 해제 의미가 A·B·C에서 같은가.
7. DB row와 TS DTO 변환, 실제 제약·RLS 적용, 사용자별 북마크 저장·실패 복구가 확인됐는가.

확인되지 않은 실제 DB 컬럼·정밀도 보존 필드·미입력 직렬화·구 데이터 변환표는 구현 전에 담당자 검토로 확정한다. 문서만으로 DB 적용이나 코드 구현 완료를 선언하지 않는다.
