# 공개 프로필 개인정보 경계

## 조회 경로와 권한

- 본인 프로필은 `profileService.ts`의 `fetchMyProfile`, `saveMyProfile`, `updateMyProfile`가 `public.profiles`를 사용한다. migration은 본인 프로필 서비스에 필요한 컬럼 SELECT를 `authenticated`에 허용하고, restrictive SELECT 정책에서 `auth.uid()`와 확인된 학교 이메일을 요구한다. INSERT·UPDATE의 기존 경로와 권한은 별도로 유지한다.
- 타인 프로필의 상세 조회와 검색은 `bridge_m20261119_fetch_public_profile` 및 `bridge_m20261119_search_public_profiles` RPC만 사용한다. 응답 키는 SQL에 명시하며 `email`을 포함하지 않는다. RPC 오류 시 `profiles` 직접 조회로 우회하지 않는다.
- `profiles`의 직접 공개 SELECT 정책과 `public_profiles` 뷰의 클라이언트 SELECT 권한은 제거한다. 직접 테이블 조회는 본인 행만 반환하도록 제한한다.

## SECURITY DEFINER 소유권 미확정

두 공개 RPC와 `bridge_m20261117_current_school_email_verified()`는 `SECURITY DEFINER`다. RPC에는 `SET search_path = ''`와 schema-qualified 테이블 및 애플리케이션 함수 참조가 설정되어 있다. 공개 RPC는 호출자 인증, 학교 이메일 확인, 공개 범위 조건을 본문에서도 검사하고 명시된 키만 반환한다.

현재 저장소에는 migration 실행 역할을 고정하거나 조회하는 설정이 없고 `OWNER TO`도 지정되어 있지 않다. 신규 함수의 소유자는 `CREATE FUNCTION`을 실행한 역할이지만 그 역할은 이 코드만으로 확인할 수 없다. `CREATE FUNCTION` 전 동일 시그니처 충돌을 검사하며, 발견하면 migration을 실패시킨다. 역할을 추측해 소유권을 바꾸지 않는다.

`SECURITY DEFINER`의 소유자가 테이블 소유자 또는 RLS 우회 권한 보유자라면 PostgreSQL RLS를 우회할 수 있다. 현재 RPC 본문은 그 경우에도 공개 조건을 직접 적용하지만, 함수 및 호출되는 학교 인증 helper의 실제 소유자와 유효 권한은 정적 검토로 증명할 수 없다. **대상 DB의 함수 소유자, 실행 역할, RLS 우회 권한 및 중첩 helper 실행 권한을 확인하기 전에는 병합·원격 적용을 승인하지 않는다.**

## 공개 프로필 응답 필드 검토

현재 RPC SQL과 TypeScript `PublicProfile`은 다음 allowlist를 사용한다. 이메일은 응답에 포함하지 않는다. 공개 여부가 true라는 사실만으로 아래의 사용자 작성·활동 필드가 공개되어야 한다고 자동 간주하지 말고, 제품의 명시적 동의 및 개인정보 정책을 확정해야 한다.

| 필드 | 현재 응답 목적 | 공개 필요성 및 정책 상태 |
|---|---|---|
| `id` | 상세 조회 경로와 결과 연결 | 내부 식별자 노출을 허용하는지 확인. UI 연결에는 필요 |
| `name`, `nickname` | 프로필 식별·표시 | 사용자 선택에 따른 표시 필드인지 확인 |
| `grade`, `track` | 검색 필터와 팀원 탐색 | 탐색 목적상 유용하지만 학적 정보 공개 동의 필요 |
| `department` | 소속 표시 | 소속 정보 공개 동의 필요 |
| `interests`, `tech_stacks`, `wanted_tech_stacks`, `desired_roles` | 프로필 매칭과 탐색 | 목적상 유용; 공개 프로필 opt-in에 포함되는지 확인 |
| `tech_proficiency` | 숙련도 기반 탐색 | 자기평가 및 역량 정보이므로 공개 동의·표시 정책 확인 필요 |
| `bio`, `long_bio`, `experiences` | 소개 및 경험 표시 | 자유 입력·이력성 정보이므로 명시적 공개 동의와 길이·콘텐츠 정책 확인 필요 |
| `activity_types`, `activity_goals` | 참여 관심 분야 표시 | 공개 프로필 목적과 동의 범위 확인 필요 |
| `activity_mode`, `activity_duration`, `availability_status` | 참여 방식·기간·현재 가능 상태 표시 | 개인의 일정·활동 가능성을 드러내므로 특히 정책 확인 필요 |
| `github_url`, `portfolio_url` | 외부 작업물 연결 | 사용자가 공개 제출한 링크인지 확인하고 안전한 URL만 렌더링 |
| `is_public`, `visibility` | 현재 응답에서 공개 판정 값을 되돌려 검증 | 서버 판정에 필요한 값이지만 화면 결과에 필요한지 확인; 최소 응답 원칙상 제외 검토 |
| `created_at`, `updated_at` | 현재 응답에 포함되는 프로필 메타데이터 | UI 요구가 없다면 활동 시점 노출을 줄이기 위해 제외 검토 |
| `email` | 없음 | 공개 RPC와 `PublicProfile`에서 제외. 본인 프로필 경로에서만 사용 |

현 migration은 `is_public`, `visibility`, `created_at`, `updated_at`도 반환하므로 최소 필드 정책과 대조가 필요하다. 위의 미확정 필드는 임의로 비공개/공개 결정하지 않았다.

## 정적 검증 범위와 남은 DB 검증

`profileSecurityMigration.test.ts`는 SQL 텍스트에서 SELECT 회수·재부여, 본인 행 restrictive 정책, RPC의 `SECURITY DEFINER`·빈 search path·학교 인증·공개 조건·이메일 키 부재·실행 권한 구문을 검사한다. 이것은 SQL 문자열 정적 검사이며 PostgreSQL이 migration을 적용하고 정책을 평가한 결과를 검증하지 않는다.

`profileService.test.ts`는 mock Supabase 호출로 본인 프로필 조회·upsert, 공개 RPC 인자와 매핑, 비공개 응답 거부, RPC 오류 시 직접 테이블 fallback 부재를 검사한다. 실제 DB 권한, RLS, 인증 JWT, SECURITY DEFINER 소유권 또는 RPC 실행을 검증하지 않는다.

원격 적용 전 별도 PostgreSQL 환경에서 migration 순서, 실제 함수 소유자와 `BYPASSRLS`, PUBLIC/anon/authenticated 및 상속 역할의 effective ACL, 본인 이메일 조회·수정·upsert, 타인 이메일·비공개 행 직접 조회 거부, 비인증·학교 미인증 RPC 거부, 공개 RPC allowlist를 검증해야 한다. 원격 DB는 이 문서 작성 과정에서 조회하거나 변경하지 않았다.
