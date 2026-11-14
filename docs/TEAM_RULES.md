# BRIDGE — 팀원별 역할 분담 및 GitHub 협업 규칙 (TEAM_RULES.md)

## 1. 프로젝트 참여자 및 담당 영역 (R&R)

| 팀원 | 역할 | 주 담당 영역 (Directory / Files) | 책임 범위 |
| :---: | :---: | :--- | :--- |
| **팀원 A** | **UI/UX & 프론트엔드** | `src/pages/`<br>`src/components/`<br>`src/layouts/`<br>`src/styles/`<br>`src/assets/` | - 전체 페이지 컴포넌트 구현 및 반응형 웹 인터페이스<br>- 공통 UI 컴포넌트 및 Tailwind 디자인 시스템 유지<br>- 사용자 인터랙션(드래그, 폼, 시각화 위젯 연결) |
| **팀원 B** | **백엔드 & 데이터베이스 & 크롤링** | `src/lib/`<br>`src/services/`<br>`supabase/`<br>`scripts/crawler/`<br>`.github/workflows/` | - Supabase Auth 인증(이메일/학부 인증 확장)<br>- PostgreSQL DDL 테이블 구축 및 RLS 보안 정책 수립<br>- Node.js + Cheerio 학부 공고 수집기 및 GitHub Actions 스케줄링<br>- Vercel 배포 및 환경변수 보안 관리 |
| **팀원 C** | **추천 & 매칭 & 일정 알고리즘** | `src/algorithms/`<br>`src/utils/`<br>`src/tests/` | - 공모전 개인화 맞춤 추천 알고리즘 구현<br>- 팀원 매칭 적합도(0~100%) 및 추천 사유 도출<br>- 팀 빌더 역량 균형도 레이더 분석 및 결손 인재 추천<br>- 30분 단위 주간 시간표 최적 회의 슬롯 추천 알고리즘 및 Vitest 단위 테스트 |
| **공통** | **공통 거버넌스** | `src/types/`<br>`src/data/`<br>`docs/`<br>`package.json` 등 설정 파일 | - 공통 데이터 타입 수정 시 사전 논의 필수<br>- 문서 업데이트 및 빌드 환경 관리 |

---

## 2. GitHub 브랜치 전략 (Git Flow)

```
[main] (Production 배포 브랜치 - Vercel 자동 연동)
  ▲
  │ PR & 태그 릴리즈
[develop] (스테이징 통합 브랜치)
  ▲
  ├───────────────────┼───────────────────┐
  │                   │                   │
[frontend]         [backend]         [algorithm]
(팀원 A 작업)       (팀원 B 작업)       (팀원 C 작업)
```

### 2-1. 브랜치 역할
- **`main`**: 최종 릴리즈 및 Vercel 프로덕션 배포 전용 브랜치 (직접 push 절대 금지).
- **`develop`**: 모든 팀원의 작업 결과물이 통합되는 중심 브랜치.
- **`frontend`**: 팀원 A의 프론트엔드 UI/UX 전용 작업 브랜치.
- **`backend`**: 팀원 B의 백엔드/Supabase/크롤러 전용 작업 브랜치.
- **`algorithm`**: 팀원 C의 알고리즘 및 Vitest 단위 테스트 전용 작업 브랜치.

### 2-2. 작업 및 머지 워크플로
1. 각 팀원은 본인 담당 브랜치(`frontend`, `backend`, `algorithm`)에서 작업합니다.
2. 기능 완결 시 `develop` 브랜치를 향해 Pull Request(PR)를 생성합니다.
3. 다른 팀원 1인 이상의 코드 리뷰 및 승인(Approved)을 거친 후 `develop`에 병합합니다.
4. 통합 테스트 완료 후 최종 검증을 거쳐 `develop`에서 `main`으로 병합하여 배포합니다.

---

## 3. 커밋 메시지 컨벤션 (Conventional Commits)

```
<type>(<scope>): <subject>

[본문 - 선택 사항]
```

### Type 목록
- `feat`: 새로운 기능 추가 (예: `feat(schedule): 주간 30분 슬롯 드래그 선택 UI 구현`)
- `fix`: 버그 수정 (예: `fix(auth): 로그인 세션 만료 시 리다이렉트 오류 수정`)
- `docs`: 문서 수정 및 추가 (예: `docs(api): 추천 함수 인터페이스 변경 사항 반영`)
- `style`: 코드 포맷팅, 세미콜론 누락, Tailwind 클래스 정렬 등 로직 변경 없는 수정
- `refactor`: 코드 리팩토링 (기능 변경 없는 구조 개선)
- `test`: 테스트 코드 추가 및 수정 (`src/tests/*`)
- `chore`: 빌드 설정, 패키지 설치 및 설정 파일 수정

---

## 4. 파일 수정 및 협업 원칙

> [!IMPORTANT]
> **타 영역 파일 수정 시 사전 협의 의무**
> - 다른 팀원이 소유한 디렉터리의 파일을 수정해야 할 경우(예: 프론트엔드 담당자가 `src/services` 내부 함수를 수정하거나, 알고리즘 담당자가 `src/types`를 변경해야 할 때), **반드시 PR 생성 전 슬랙/디스코드/이슈를 통해 사전 협의**해야 합니다.
> - `src/types/index.ts`는 모든 팀원의 인터페이스 기준점이므로 단독 수정이 불가하며, 수정 시 `docs/DATA_SCHEMA.md`와 `docs/API_CONTRACT.md`를 함께 갱신해야 합니다.

---

## 5. Antigravity AI 협업 지침 (AI Co-Working Protocol)

각 팀원이 자신의 **Antigravity AI 에이전트**에게 코드 구현이나 수정을 요청할 때, 반드시 다음 수칙을 준수하도록 프롬프트에 명시하세요:

```markdown
[Antigravity AI 요청 시 필수 가이드]
1. 작업 시작 전 docs/SERVICE_SPEC.md, docs/DATA_SCHEMA.md, docs/API_CONTRACT.md, docs/TEAM_RULES.md 문서를 먼저 정독하고 해당 규칙을 준수하여 작성해 줘.
2. 내 담당 영역({A: 프론트엔드 / B: 백엔드·크롤러 / C: 알고리즘})의 파일만 수정해 줘.
3. 다른 팀원의 담당 영역 파일이나 src/types를 수정해야 할 경우 사전에 변경 이유를 명시하고 확인을 받아줘.
4. 작업 완료 후에는 반드시 npm run build 및 TypeScript 컴파일 검사를 실행하여 다른 영역과의 타입 호환성이 깨지지 않았는지 검증해 줘.
```
