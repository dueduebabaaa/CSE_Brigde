# CSE_Brigde
장전노컴학해커톤 Bridge

---

# BRIDGE — KNU CSE · PROJECT NETWORK
> **BEYOND CONNECTION. 우리 사이, 가능성을 잇다.**  
> 경북대학교 컴퓨터학부 학생들을 위한 통합 프로젝트 네트워킹 플랫폼  
> **핵심 가치**: **발견 (Discovery)** · **연결 (Connection)** · **협업 (Collaboration)**

---

## 1. 프로젝트 소개
**BRIDGE**는 경북대학교 컴퓨터학부 공식 홈페이지에 게시되는 공모전 및 대외활동 공고를 자동으로 수집하고, 학생들의 관심 분야와 기술 스택을 기반으로 **맞춤형 활동 추천, 팀원 모집, 스마트 팀 빌더, 그리고 30분 단위 주간 시간표 회의 조율**까지 원스톱으로 지원하는 학생 협업 플랫폼입니다.

- **서비스 대상**: 경북대학교 컴퓨터학부 재학생 및 대학원생
- **인증 방식**: 경북대학교 Google 계정(`@knu.ac.kr`) 기반 간편 로그인 (Google OAuth + Supabase Auth)
- **브랜드 대표 컬러**:
  - Black: `#000000` (다크 사이드바 및 아이덴티티)
  - Violet: `#7D39EB` (메인 포인트 및 네비게이션)
  - Lime: `#C6FF33` (액션 버튼 및 매칭률 하이라이트)
  - White: `#FFFFFF` (깔끔하고 정돈된 콘텐츠 캔버스)
- **디자인 철학 & 레퍼런스**:
  - **Linear**의 정갈하고 미니멀한 사이드바 레이아웃
  - **Contra**의 시원하고 직관적인 카드형 공모전/모집글 인터페이스
  - **Peerlist**의 신뢰도 높은 개발자 프로필 및 기술 스택 시각화
  - 영문 `Space Grotesk`, 한글 `Pretendard` 서체 적용

---

## 2. 전체 메뉴 구조

```
BRIDGE
├── WORKSPACE (핵심 작업 공간)
│   ├── 홈 대시보드 (맞춤 공모전, 최신 학부 공고, 마감 임박, 추천 팀원)
│   ├── 공모전 및 대외활동 (공식 공고 자동 수집, 검색, 필터, 추천 점수)
│   ├── 팀원 모집 게시판 (모집글 작성/수정/삭제, 공고 연계, 지원/수락)
│   └── 팀원 탐색 (이름/닉네임 검색, 세부전공/기술 필터, 매칭 점수)
├── COLLABORATION (팀 협업 도구)
│   ├── 스마트 팀 빌더 (역할 충족률 분석, 레이더 차트, 결손 인재 추천)
│   ├── 주간 시간표 조율 (Asia/Seoul 30분 단위 히트맵, 연속 회의 슬롯 추천)
│   └── 내 프로젝트 (참여 프로젝트 목록, D-Day, 회의 일정, 협업 링크)
├── PERSONAL (개인화 보관함)
│   ├── 저장한 공모전 (북마크 목록 관리)
│   └── 마이페이지 (프로필 수정, 가능 시간표, 내 모집글/지원 현황)
├── ACCOUNT (계정 관리)
│   ├── Google 간편 로그인 (@knu.ac.kr 학교 계정 전용)
│   └── 초기 프로필 설정 (온보딩 위저드)
└── ADMIN (관리자 관제 - 일반 유저 숨김)
    └── 공고 및 수집 관리 (수집 상태 확인, 수동 즉시 수집, 직접 등록)
```

---

## 3. 기술 스택
- **Frontend**: React 18, Vite, TypeScript
- **Styling**: Tailwind CSS v3, PostCSS, Autoprefixer
- **Routing**: React Router v6
- **Data Visualization**: Recharts (팀 역량 레이더 차트)
- **Icons**: Lucide React
- **Backend & Database**: Supabase, PostgreSQL (RLS 보안 적용)
- **Authentication**: Supabase Auth + Google OAuth (`@knu.ac.kr` 도메인 검증)
- **Web Crawling**: Node.js, Cheerio
- **Scheduled Automation**: GitHub Actions
- **Testing**: Vitest, React Testing Library
- **Deployment**: Vercel

---

## 4. 설치 및 로컬 개발 환경 실행

### 4-1. 패키지 설치
```bash
npm install
```

### 4-2. 환경변수 설정
저장소에 포함된 `.env.example`을 복사하여 `.env.local`을 생성하고 필요한 환경변수를 설정합니다.
```bash
cp .env.example .env.local
```

### 4-3. 개발 서버 실행
```bash
npm run dev
```
기본적으로 `http://localhost:3000`에서 브라우저를 통해 접속할 수 있습니다.

### 4-4. TypeScript 검사 및 프로덕션 빌드
```bash
npm run build
```

### 4-5. 단위 테스트 실행
```bash
npm test
```

---

## 5. 팀원별 담당 영역 (R&R)
3인 협업 체계로 운영되며, 디렉터리별 소유권이 명확히 구분되어 있습니다.

- **팀원 A (UI/UX, 디자인 & 프론트엔드)**:
  - `src/pages/`, `src/components/`, `src/layouts/`, `src/styles/`, `src/assets/`
- **팀원 B (백엔드, Google OAuth, Supabase & 공고 수집)**:
  - `src/lib/`, `src/services/`, `supabase/`, `scripts/crawler/`, `.github/workflows/`
- **팀원 C (추천, 태그 분류, 매칭 및 시간표 알고리즘)**:
  - `src/algorithms/`, `src/utils/`, `src/tests/`
- **공통 관리 영역**:
  - `src/types/`, `src/data/`, `docs/`, 프로젝트 공통 설정 파일

---

## 6. 공동 개발 및 협업 문서 (docs/)
모든 팀원과 Antigravity AI 에이전트는 코드 작성 전 `docs/` 폴더의 아래 문서들을 우선 참조해야 합니다.

- 📄 [docs/SERVICE_SPEC.md](file:///c:/Users/SAMSUNG/장전노/CSE_Brigde/docs/SERVICE_SPEC.md) : 전체 10대 핵심 서비스 기능 명세서 및 개발 우선순위
- 📄 [docs/DESIGN_SYSTEM.md](file:///c:/Users/SAMSUNG/장전노/CSE_Brigde/docs/DESIGN_SYSTEM.md) : 레퍼런스(Linear, Contra, Peerlist) 분석, 컬러, 타이포그래피 및 UI 시스템
- 📄 [docs/USER_FLOW.md](file:///c:/Users/SAMSUNG/장전노/CSE_Brigde/docs/USER_FLOW.md) : Google 로그인부터 프로젝트 완주까지의 14단계 전체 이용 흐름도
- 📄 [docs/PROFILE_SPEC.md](file:///c:/Users/SAMSUNG/장전노/CSE_Brigde/docs/PROFILE_SPEC.md) : 프로필 상세 항목, 15개 관심사, 11개 역할, 기술 스택 및 숙련도 체계
- 📄 [docs/DATA_SCHEMA.md](file:///c:/Users/SAMSUNG/장전노/CSE_Brigde/docs/DATA_SCHEMA.md) : 공통 데이터 타입 및 Supabase PostgreSQL DDL / RLS 정책 / 스키마 확장안
- 📄 [docs/API_CONTRACT.md](file:///c:/Users/SAMSUNG/장전노/CSE_Brigde/docs/API_CONTRACT.md) : 프론트/백엔드/알고리즘 간 데이터 교환 및 함수 인터페이스 규약
- 📄 [docs/CRAWLING.md](file:///c:/Users/SAMSUNG/장전노/CSE_Brigde/docs/CRAWLING.md) : 경북대 컴퓨터학부 공식 홈페이지 공고 수집 설계 및 보안 수칙
- 📄 [docs/TEAM_RULES.md](file:///c:/Users/SAMSUNG/장전노/CSE_Brigde/docs/TEAM_RULES.md) : GitHub Git Flow 브랜치 전략, 커밋 컨벤션 및 AI 협업 지침

---

## 7. 브랜치 전략 및 마일스톤

### 7-1. Git Flow
- `main`: Vercel 연동 최종 배포 브랜치
- `develop`: 스테이징 기능 통합 브랜치
- `frontend`: 팀원 A 프론트엔드 작업 브랜치
- `backend`: 팀원 B 백엔드/크롤러 작업 브랜치
- `algorithm`: 팀원 C 알고리즘 작업 브랜치

### 7-2. 개발 일정 목표
- **11월 22일**: 전체 핵심 기능 및 통합 개발 완료
- **11월 23일**: 최종 QA, 발표 자료(PPT) 및 시연 영상 준비
- **11월 24일 정오**: 최종 결과물 제출
