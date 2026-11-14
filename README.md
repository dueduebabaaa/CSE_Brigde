# CSE_Brigde
장전노컴학해커톤 Bridge

---

# BRIDGE — KNU CSE · PROJECT NETWORK
> **BEYOND CONNECTION. 우리 사이, 가능성을 잇다.**  
> 경북대학교 컴퓨터학부 학생들을 위한 맞춤형 공모전 탐색, 팀원 매칭 및 협업 지원 올인원 플랫폼

---

## 1. 프로젝트 소개
**BRIDGE**는 경북대학교 컴퓨터학부 공식 홈페이지에 게시되는 공모전 및 대외활동 공고를 자동으로 수집하고, 학생들의 관심 분야와 기술 스택을 기반으로 **맞춤형 활동 추천, 팀원 모집, 스마트 팀 빌더, 그리고 30분 단위 주간 시간표 회의 조율**까지 원스톱으로 지원하는 학생 협업 플랫폼입니다.

- **브랜드 대표 컬러**: Black (`#000000`), Violet (`#7D39EB`), Lime (`#C6FF33`), White (`#FFFFFF`)
- **디자인 철학**: 세련되고 직관적인 IT 스타트업 스타일의 대시보드 및 모바일 반응형 인터페이스

---

## 2. 기술 스택
- **Frontend**: React 18, Vite, TypeScript
- **Styling**: Tailwind CSS v3, PostCSS, Autoprefixer
- **Routing**: React Router v6
- **Data Visualization**: Recharts (팀 역량 레이더 차트)
- **Icons**: Lucide React
- **Backend & Database**: Supabase, PostgreSQL
- **Authentication**: Supabase Auth (향후 `@knu.ac.kr` 웹메일 인증 확장)
- **Web Crawling**: Node.js, Cheerio
- **Scheduled Automation**: GitHub Actions
- **Testing**: Vitest, React Testing Library
- **Deployment**: Vercel

---

## 3. 설치 및 로컬 개발 환경 실행

### 3-1. 패키지 설치
```bash
npm install
```

### 3-2. 환경변수 설정
저장소에 포함된 `.env.example`을 복사하여 `.env.local`을 생성하고 필요한 환경변수를 설정합니다.
```bash
cp .env.example .env.local
```

### 3-3. 개발 서버 실행
```bash
npm run dev
```
기본적으로 `http://localhost:3000`에서 브라우저를 통해 접속할 수 있습니다.

### 3-4. TypeScript 검사 및 프로덕션 빌드
```bash
npm run build
```

### 3-5. 단위 테스트 실행
```bash
npm test
```

---

## 4. 팀원별 담당 영역 (R&R)
3인 협업 체계로 운영되며, 디렉터리별 소유권이 명확히 구분되어 있습니다.

- **팀원 A (UI/UX & 프론트엔드)**:
  - `src/pages/`, `src/components/`, `src/layouts/`, `src/styles/`, `src/assets/`
- **팀원 B (백엔드, 인증, 데이터베이스 & 공고 수집)**:
  - `src/lib/`, `src/services/`, `supabase/`, `scripts/crawler/`, `.github/workflows/`
- **팀원 C (추천, 매칭 및 시간표 알고리즘)**:
  - `src/algorithms/`, `src/utils/`, `src/tests/`
- **공통 관리 영역**:
  - `src/types/`, `src/data/`, `docs/`, 프로젝트 공통 설정 파일

---

## 5. 공동 개발 및 협업 문서 (docs/)
모든 팀원과 Antigravity AI 에이전트는 코드 작성 전 `docs/` 폴더의 아래 문서들을 우선 참조해야 합니다.

- 📄 [SERVICE_SPEC.md](file:///c:/Users/SAMSUNG/장전노/CSE_Brigde/docs/SERVICE_SPEC.md) : 전체 10대 핵심 서비스 기능 명세서
- 📄 [DATA_SCHEMA.md](file:///c:/Users/SAMSUNG/장전노/CSE_Brigde/docs/DATA_SCHEMA.md) : 공통 데이터 타입 및 Supabase PostgreSQL DDL / RLS 정책
- 📄 [API_CONTRACT.md](file:///c:/Users/SAMSUNG/장전노/CSE_Brigde/docs/API_CONTRACT.md) : 프론트/백엔드/알고리즘 간 데이터 교환 및 함수 인터페이스 규약
- 📄 [CRAWLING.md](file:///c:/Users/SAMSUNG/장전노/CSE_Brigde/docs/CRAWLING.md) : 경북대 컴퓨터학부 공식 홈페이지 공고 수집 설계 및 보안 수칙
- 📄 [TEAM_RULES.md](file:///c:/Users/SAMSUNG/장전노/CSE_Brigde/docs/TEAM_RULES.md) : GitHub Git Flow 브랜치 전략, 커밋 컨벤션 및 AI 협업 지침

---

## 6. 브랜치 전략
- `main`: Vercel 연동 최종 릴리즈 브랜치
- `develop`: 스테이징 기능 통합 브랜치
- `frontend`: 팀원 A 프론트엔드 작업 브랜치
- `backend`: 팀원 B 백엔드/크롤러 작업 브랜치
- `algorithm`: 팀원 C 알고리즘 작업 브랜치
