# BRIDGE — 팀원별 역할 분담 및 GitHub 협업 규칙 (TEAM_RULES.md)

## 1. 프로젝트 참여자 및 담당 영역 (R&R)

현재 팀원 B와 C는 각각의 전용 브랜치에서 크롤러와 공모전 추천 알고리즘을 병렬 개발하고 있습니다.  
**기존 코드를 일방적으로 교체하지 않고, 상호 인터페이스 호환성을 유지하며 점진적으로 통합**하는 것이 대원칙입니다.

| 팀원 | 역할 | 작업 브랜치 | 주 담당 영역 (Directory / Files) | 책임 범위 |
| :---: | :---: | :---: | :--- | :--- |
| **팀원 A** | **서비스 기획, UI/UX & 프론트엔드** | `frontend` | `src/pages/`<br>`src/components/`<br>`src/layouts/`<br>`src/styles/`<br>`src/assets/` | - 전체 페이지 컴포넌트 및 반응형 웹 구현<br>- 디자인 시스템(`DESIGN_SYSTEM.md`) 가이드 준수<br>- 초기 프로필 설정(온보딩) 및 대시보드 인터랙션<br>- Linear / Contra / Peerlist 벤치마크 기반 UI 고도화 |
| **팀원 B** | **백엔드, 인증, 데이터베이스 & 크롤링** | `backend` | `src/lib/`<br>`src/services/`<br>`supabase/`<br>`scripts/crawler/`<br>`.github/workflows/` | - Supabase Auth + Google OAuth (`@knu.ac.kr`) 연동 및 RLS 정책 수립<br>- PostgreSQL 테이블 스키마 구축 및 데이터 CRUD API<br>- Node.js + Cheerio 학부 공고 수집기 및 GitHub Actions 1일 1회 스케줄링<br>- Vercel 프로덕션 배포 및 보안 환경변수 관리 |
| **팀원 C** | **추천, 태그 분류, 매칭 & 일정 알고리즘** | `algorithm` | `src/algorithms/`<br>`src/utils/`<br>`src/tests/` | - 공모전 개인화 맞춤 추천 알고리즘 구현<br>- `tagClassification.ts` 기반 태그 정규화 및 분류<br>- 팀원 매칭 적합도(0~100%) 및 추천 이유 도출<br>- 팀 빌더 역량 균형도 레이더 분석 및 결손 인재 추천<br>- 주간 30분 단위 최적 회의 슬롯 추천 알고리즘 및 Vitest 단위 테스트 |
| **공통** | **공통 거버넌스** | `develop` | `src/types/`<br>`src/data/`<br>`docs/`<br>`package.json` 등 설정 파일 | - 공통 데이터 타입 및 인터페이스 규약 수정 시 3인 사전 합의 필수<br>- 빌드 및 린트 환경 무결성 유지 |

---

## 2. GitHub 브랜치 전략 (Git Flow)

```
[main] (Production 배포 브랜치 - Vercel 자동 연동)
  ▲
  │ PR & 태그 릴리즈 (11/23 ~ 11/24)
[develop] (스테이징 통합 브랜치)
  ▲
  ├───────────────────┼───────────────────┐
  │                   │                   │
[frontend]         [backend]         [algorithm]
(팀원 A: UI/UX)    (팀원 B: DB/OAuth) (팀원 C: 알고리즘)
```

### 2-1. 브랜치 운영 수칙
- **`main`**: 최종 릴리즈 및 Vercel 프로덕션 배포 전용 브랜치 (직접 push 절대 금지).
- **`develop`**: 모든 팀원의 작업 결과물이 통합되는 중심 브랜치.
- **`frontend`, `backend`, `algorithm`**: 각 담당자의 독립 기능 개발 브랜치.

### 2-2. 작업 및 머지 워크플로
1. 각 팀원은 본인 담당 브랜치에서 작업을 진행합니다.
2. 기능 단위 완료 시 `develop` 브랜치를 향해 Pull Request(PR)를 생성합니다.
3. PR 생성 전 본인 브랜치에서 반드시 `npm run build` 및 TypeScript 검사를 통과해야 합니다.
4. 최소 1인 이상의 코드 리뷰 및 승인(Approved)을 거친 후 `develop`에 병합합니다.

---

## 3. 커밋 메시지 컨벤션 (Conventional Commits)

```
<type>(<scope>): <subject>

[본문 - 선택 사항]
```

### Type 목록
- `feat`: 새로운 기능 추가 (예: `feat(auth): 경북대 Google OAuth 로그인 연동`)
- `fix`: 버그 수정 (예: `fix(schedule): 30분 슬롯 인덱스 범위 오류 수정`)
- `docs`: 문서 수정 및 추가 (예: `docs(spec): 프로필 상세 명세서 작성`)
- `style`: 코드 포맷팅, 세미콜론 누락, Tailwind 클래스 정렬 등 로직 변경 없는 수정
- `refactor`: 코드 리팩토링 (기능 변경 없는 구조 개선)
- `test`: 테스트 코드 추가 및 수정 (`src/tests/*`)
- `chore`: 빌드 설정, 패키지 설치 및 설정 파일 수정

---

## 4. 파일 소유권 및 사전 협의 원칙

> [!IMPORTANT]
> **타 영역 파일 수정 시 사전 협의 의무**
> - 다른 팀원이 소유한 디렉터리의 파일을 수정해야 할 경우(예: 프론트엔드 담당자가 `src/services` 내부 함수를 수정하거나, 알고리즘 담당자가 `src/types`를 변경해야 할 때), **반드시 PR 생성 전 슬랙/디스코드/이슈를 통해 사전 협의**해야 합니다.
> - `src/types/index.ts`는 모든 팀원의 인터페이스 기준점이므로 단독 수정이 불가하며, 수정 시 `docs/DATA_SCHEMA.md`와 `docs/API_CONTRACT.md`를 함께 갱신해야 합니다.
> - **현재 B와 C가 별도 브랜치에서 개발 중인 크롤러와 추천 알고리즘 코드는 기존 구현을 교체하지 않고 상호 호환성을 유지**해야 합니다.

---

## 5. 개발 우선순위 및 마일스톤

### 5-1. 기능 개발 우선순위
1. **[핵심 기능 - P0]**: 
   - Google 로그인 및 초기 프로필 설정
   - 공고 자동 수집 및 조회
   - 맞춤 공모전 추천
   - 팀원 모집 게시판
   - 팀원 탐색 및 매칭
   - 팀 빌더 역량 분석
   - 공통 시간표 조율
2. **[추가 기능 - P1]**:
   - 관심 공모전 북마크
   - 가입 신청 및 수락
   - 팀 구성 저장
   - 프로젝트 기본 관리
3. **[시간 여유 시 구현 - P2]**:
   - 팀원 초대 및 알림
   - 프로젝트 체크리스트
   - 상세 관리자 페이지

### 5-2. 일정 마일스톤
- **11월 22일**: 전체 핵심 기능 개발 완료 및 통합 테스트
- **11월 23일**: 발표 자료(PPT) 및 시연 영상 준비
- **11월 24일 정오 (12:00)**: 최종 제출

---

## 6. Antigravity AI 협업 지침 (AI Co-Working Protocol)

각 팀원이 자신의 **Antigravity AI 에이전트**에게 코드 구현이나 수정을 요청할 때, 반드시 다음 수칙을 준수하도록 프롬프트에 명시하세요:

```markdown
[Antigravity AI 요청 시 필수 가이드]
1. 작업 시작 전 docs 폴더의 문서들을 먼저 정독하고 해당 규칙을 준수하여 작성해 줘:
   - docs/SERVICE_SPEC.md (전체 서비스 기능 명세)
   - docs/DESIGN_SYSTEM.md (Linear/Contra/Peerlist 스타일 디자인 시스템)
   - docs/USER_FLOW.md (14단계 전체 사용자 이용 흐름)
   - docs/PROFILE_SPEC.md (사용자 프로필 세부 항목 및 태그 표준화)
   - docs/DATA_SCHEMA.md (데이터베이스 스키마 및 RLS)
   - docs/API_CONTRACT.md (팀원 간 인터페이스 규약)
   - docs/TEAM_RULES.md (협업 규칙 및 마일스톤)
2. 내 담당 영역({A: 프론트엔드 / B: 백엔드·크롤러 / C: 알고리즘})의 파일만 수정해 줘.
3. 다른 팀원의 담당 영역 파일이나 src/types를 수정해야 할 경우 사전에 변경 이유를 명시하고 확인을 받아줘.
4. 작업 완료 후에는 반드시 npm run build 및 TypeScript 컴파일 검사를 실행하여 다른 영역과의 타입 호환성이 깨지지 않았는지 검증해 줘.
```
