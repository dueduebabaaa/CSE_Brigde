# BRIDGE — 디자인 시스템 가이드 (DESIGN_SYSTEM.md)

## 1. 디자인 철학 및 브랜드 아이덴티티

- **서비스명**: BRIDGE (브릿지)
- **서비스 정의**: 경북대학교 컴퓨터학부 학생들을 위한 통합 프로젝트 네트워킹 플랫폼
- **영문 슬로건**: BEYOND CONNECTION.
- **한글 슬로건**: 우리 사이, 가능성을 잇다.
- **서브타이틀**: KNU CSE · PROJECT NETWORK
- **핵심 가치**: 
  - **발견 (Discovery)**: 학부 공지 속에 흩어진 공모전과 교내외 기회의 발견
  - **연결 (Connection)**: 관심 분야와 기술 스택이 통하는 최적의 동료 연결
  - **협업 (Collaboration)**: 팀 빌딩부터 시간표 조율까지 막힘없는 프로젝트 완주

---

## 2. 디자인 레퍼런스 분석 및 재구성

BRIDGE는 업계를 선도하는 IT 서비스들의 강점을 분석하여, 대학생 협업 플랫폼에 맞게 독창적으로 재구성합니다.

| 레퍼런스 서비스 | 주요 벤치마킹 요소 | BRIDGE만의 차별화 재구성 |
| :--- | :--- | :--- |
| **Linear**<br>([linear.app](https://linear.app/)) | - 세련되고 정돈된 블랙 계열 사이드바<br>- 극도로 정제된 타이포그래피 및 여백<br>- 직관적인 키보드 인터랙션과 반응형 레이아웃 | - 다크 사이드바와 화이트 콘텐츠 영역의 대비로 정보 가독성 극대화<br>- 과도한 블러/발광 효과를 덜어내고 선과 면 중심의 미니멀리즘 구현 |
| **Contra**<br>([contra.com](https://contra.com/)) | - 시원한 카드형 UI<br>- 직관적인 포지션/역할 뱃지 및 상태 인디케이터<br>- 탐색하기 쉬운 필터 바와 검색 경험 | - 공모전 출처(공식/관리자/사용자)의 시각적 분리<br>- 지원 자격, 모집 역할, 마감일을 한눈에 파악할 수 있는 카드 메트릭스 구축 |
| **Peerlist**<br>([peerlist.io](https://peerlist.io/)) | - 개발자 중심의 프로필 카드<br>- 기술 스택 및 프로젝트 기여 이력의 신뢰도 높은 시각화 | - 경북대 컴퓨터학부 전공 트랙(플랫폼SW, 데이터, AI 등) 맞춤 태그<br>- 기술 숙련도 및 주간 활동 가능 시간의 유기적 결합 |

---

## 3. 컬러 시스템 (Color Palette)

BRIDGE의 대표 색상은 순수 블랙과 화이트를 뼈대로 하며, 지적인 **바이올렛(Violet)**과 활력 넘치는 **라임(Lime)**을 기능적 포인트 컬러로 사용합니다.

```
[Brand Core Colors]
┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│      Black       │  │      Violet      │  │       Lime       │  │      White       │
│     #000000      │  │     #7D39EB      │  │     #C6FF33      │  │     #FFFFFF      │
└──────────────────┘  └──────────────────┘  └──────────────────┘  └──────────────────┘
```

### 3-1. 메인 브랜드 컬러
- **Black (`#000000`)**: 최상위 브랜드 블랙. 사이드바 및 독립 로그인 화면의 베이스.
- **Violet (`#7D39EB`)**: 메인 포인트 컬러. 신뢰감 있는 IT 기술과 연결의 의미를 상징하며, Primary 버튼, 활성 네비게이션, 주요 강조 배지에 적용.
  - `Hover Violet`: `#6025C5`
  - `Light Violet`: `#9B65F1`
  - `Soft Violet Tint`: `#F4EFFE` (화이트 모드 배경 배지용)
- **Lime (`#C6FF33`)**: 액션 & 하이라이트 포인트 컬러. 가능성과 에너지를 상징하며, CTA 버튼, 실시간 매칭률, 추천 점수, 긍정 상태 뱃지에 적용.
  - `Dark Lime`: `#93C418` (가독성 보정 텍스트용)
  - `Hover Lime`: `#B8F224`
- **White (`#FFFFFF`)**: 콘텐츠 영역의 메인 캔버스. 깨끗하고 정돈된 정보 전달을 담당.

### 3-2. 서페이스 & 레이아웃 컬러
- **사이드바 영역 (Dark Theme)**:
  - Background: `#0B0C10` ~ `#0A0A0C`
  - Border: `#242634`
  - Text Primary: `#FFFFFF`
  - Text Secondary: `#94A3B8` (Slate-400)
- **콘텐츠 영역 (White / Light-Card Theme)**:
  - Page Background: `#F8FAFC` ~ `#FFFFFF`
  - Card Background: `#FFFFFF`
  - Border: `#E2E8F0` (경계선은 얇고 절제되게 표현)
  - Text Primary: `#0F172A` (Slate-900)
  - Text Secondary: `#64748B` (Slate-500)
- **독립 로그인 화면 (Identity Dark)**:
  - Linear 스타일의 딥 다크 테마 유지 (`#000000` ~ `#0B0C10`)

---

## 4. 타이포그래피 (Typography)

정보의 위계가 명확하게 드러나도록 영문과 한글의 전용 서체를 조합합니다.

### 4-1. 폰트 패밀리
- **영문 / 로고 / 코드**: `Space Grotesk`, `system-ui`, `sans-serif`
  - 기하학적이고 현대적인 엔지니어링 감성 표현
- **한글 / 본문**: `Pretendard`, `-apple-system`, `BlinkMacSystemFont`, `sans-serif`
  - 모바일과 PC 전 환경에서 뛰어난 한글 가독성 보장

### 4-2. 타이포그래피 계층 (Scale)
- **Display Heading**: 32px ~ 40px (Font Weight: 800/900, Line Height: 1.2) - 랜딩 및 히어로
- **Page Title (H1)**: 24px ~ 28px (Font Weight: 800, Line Height: 1.3)
- **Section Title (H2)**: 18px ~ 20px (Font Weight: 700, Line Height: 1.4)
- **Card Title (H3)**: 15px ~ 16px (Font Weight: 700, Line Height: 1.4)
- **Body Regular**: 14px (Font Weight: 400/500, Line Height: 1.6) - 일반 본문
- **Caption / Meta**: 11px ~ 12px (Font Weight: 500/600, Line Height: 1.5) - 태그, 날짜, 주최기관

---

## 5. UI 컴포넌트 및 라운딩 규격

일관된 기하학적 리듬을 부여하여 세련된 스타트업 완성도를 유지합니다.

### 5-1. 모서리 곡률 (Border Radius)
- **Card / Modal**: `12px` (`rounded-xl`)
- **Button / Input Form**: `8px` (`rounded-lg`)
- **Badge / Pill Tag**: `9999px` (`rounded-full`) 또는 `6px` (`rounded-md`)

### 5-2. 그림자 및 경계선 (Border & Shadow)
- 과도한 네온 글로우 및 번지는 그라데이션은 지양합니다.
- 정교한 `1px solid` 경계선(`border-[#E2E8F0]` 또는 다크 영역 `border-[#242634]`)을 기본으로 합니다.
- 입체감이 필요한 경우 절제된 Subtle Shadow(`shadow-sm`, `shadow-md`)를 적용합니다.

### 5-3. 아이콘 시스템
- **Lucide Icons** 표준 적용 (선 두께 1.75px ~ 2px 유지)
- 의미가 명확한 아이콘만을 선별하여 인지 부하를 줄입니다.

---

## 6. 레이아웃 구조 원칙

```
┌─────────────────┬─────────────────────────────────────────────────────────┐
│  SIDEBAR        │  TOP HEADER (Global Search / Profile / Notifications)   │
│  (Dark #0B0C10) ├─────────────────────────────────────────────────────────┤
│                 │  MAIN CONTENT CANVAS                                    │
│  - Logo         │  (Clean White / Modern Cards / Border-radius 12px)      │
│  - WORKSPACE    │                                                         │
│  - COLLAB       │                                                         │
│  - PERSONAL     │                                                         │
│  - Bottom User  │                                                         │
└─────────────────┴─────────────────────────────────────────────────────────┘
```

1. **블랙 기반 사이드바 (Navigation Hub)**:
   - 메뉴 카테고리를 직관적으로 인지할 수 있도록 `WORKSPACE`, `COLLABORATION`, `PERSONAL`, `ACCOUNT` 그룹으로 분류.
   - 활성화된 메뉴는 Violet 배경과 명확한 대비를 제공.
2. **화이트 중심 콘텐츠 캔버스 (Content Focus)**:
   - 공모전 정보와 팀원 프로필의 텍스트가 묻히지 않도록 화이트 배경 위에 선명한 카드 형태로 배치.
3. **독립 로그인 게이트 (Gateway)**:
   - 최초 로그인 페이지는 서비스의 프리미엄 브랜딩을 각인시키기 위해 다크 테마 중심의 독립 레이아웃으로 설계.
4. **반응형 인터랙션 (Responsive Web)**:
   - 데스크톱(1024px 이상): 고정 좌측 사이드바(256px) + 유연한 멀티컬럼 그리드.
   - 모바일/태블릿: 햄버거 메뉴 기반의 슬라이드 오버레이 사이드바 + 1컬럼 적응형 레이아웃.
