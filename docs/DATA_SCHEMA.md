# BRIDGE — 공통 데이터 타입 및 Supabase 데이터베이스 설계서 (DATA_SCHEMA.md)

## 1. 개요
본 문서는 BRIDGE 플랫폼의 공통 TypeScript 타입(`src/types/index.ts`)과 Supabase PostgreSQL 데이터베이스 스키마 간의 일관성을 정의한 설계서입니다.

> [!NOTE]
> **팀원 간 데이터 구조 협의 안내**  
> 섹션 3의 **기본 DDL**은 현재 코드베이스(`src/types/index.ts`)에 구현된 안정적인 기준 스키마이며, 섹션 5의 **프로필 확장 스키마 설계안**은 A 담당자(기획/UI)가 제안하는 **팀원 B, C와의 협의 예정 설계안(Draft Proposal)**입니다. 실제 확정 및 적용은 백엔드(B)와 알고리즘(C)의 검토를 거쳐 진행됩니다.

---

## 2. 엔티티 관계 다이어그램 (ERD 개요)
- `profiles` (1) ─── (N) `recruitments` (작성한 모집글)
- `profiles` (1) ─── (N) `applications` (제출한 지원서)
- `profiles` (1) ─── (N) `availabilities` (활동 가능 시간 슬롯)
- `profiles` (1) ─── (N) `bookmarks` (저장한 공모전)
- `opportunities` (1) ─── (N) `recruitments` (연결된 팀원 모집글)
- `opportunities` (1) ─── (N) `bookmarks`
- `recruitments` (1) ─── (1) `teams` (결성된 팀)
- `teams` (1) ─── (N) `team_members` (소속 팀원)
- `teams` (1) ─── (N) `meetings` (팀 회의 일정)
- `teams` (1) ─── (N) `project_tasks` (체크리스트)

---

## 3. PostgreSQL 기준 테이블 DDL (현재 구현 기준)

```sql
-- 확장 모듈 활성화
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. 사용자 프로필 테이블 (Baseline)
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    name TEXT NOT NULL,
    nickname TEXT NOT NULL,
    grade TEXT NOT NULL CHECK (grade IN ('1학년', '2학년', '3학년', '4학년', '대학원생')),
    track TEXT NOT NULL CHECK (track IN ('플랫폼소프트웨어', '데이터사이언스', '인공지능컴퓨팅', '글로벌소프트웨어융합', '심화컴퓨터공학')),
    bio TEXT DEFAULT '',
    interests TEXT[] DEFAULT '{}',
    tech_stacks TEXT[] DEFAULT '{}',
    wanted_tech_stacks TEXT[] DEFAULT '{}',
    desired_roles TEXT[] DEFAULT '{}',
    experiences TEXT[] DEFAULT '{}',
    github_url TEXT,
    portfolio_url TEXT,
    is_public BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. 공모전 및 대외활동 테이블
CREATE TABLE public.opportunities (
    id TEXT PRIMARY KEY DEFAULT ('opp-' || uuid_generate_v4()),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('해커톤', '공모전', '경진대회', '대외활동', '서포터즈', '교육/특강')),
    tags TEXT[] DEFAULT '{}',
    organizer TEXT NOT NULL,
    posted_at TIMESTAMPTZ NOT NULL,
    application_start TIMESTAMPTZ, -- 미확인 시 NULL
    deadline TIMESTAMPTZ,          -- 미확인 시 NULL
    source_type TEXT NOT NULL CHECK (source_type IN ('knu_cse_official', 'admin_manual', 'user_manual')),
    source_post_id TEXT UNIQUE,    -- 학부 공지 ID 중복 방지
    source_url TEXT,
    application_url TEXT,
    collected_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'closed', 'needs_confirmation', 'draft'))
);

-- 3. 팀원 모집 게시글 테이블
CREATE TABLE public.recruitments (
    id TEXT PRIMARY KEY DEFAULT ('rec-' || uuid_generate_v4()),
    opportunity_id TEXT REFERENCES public.opportunities(id) ON DELETE SET NULL,
    custom_opportunity_title TEXT,
    custom_opportunity_url TEXT,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    target_member_count INT NOT NULL DEFAULT 4,
    current_member_count INT NOT NULL DEFAULT 1,
    roles TEXT[] NOT NULL DEFAULT '{}',
    required_tech_stacks TEXT[] NOT NULL DEFAULT '{}',
    deadline TIMESTAMPTZ,
    expected_duration TEXT NOT NULL,
    activity_type TEXT NOT NULL CHECK (activity_type IN ('online', 'offline', 'hybrid')),
    status TEXT NOT NULL DEFAULT 'recruiting' CHECK (status IN ('recruiting', 'completed', 'cancelled')),
    author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. 팀 가입 신청 테이블
CREATE TABLE public.applications (
    id TEXT PRIMARY KEY DEFAULT ('app-' || uuid_generate_v4()),
    recruitment_id TEXT NOT NULL REFERENCES public.recruitments(id) ON DELETE CASCADE,
    applicant_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    applied_role TEXT NOT NULL,
    message TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'cancelled')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (recruitment_id, applicant_id)
);

-- 5. 팀원 초대 테이블
CREATE TABLE public.invitations (
    id TEXT PRIMARY KEY DEFAULT ('inv-' || uuid_generate_v4()),
    recruitment_id TEXT REFERENCES public.recruitments(id) ON DELETE CASCADE,
    team_id TEXT,
    sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    receiver_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    invited_role TEXT NOT NULL,
    message TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'cancelled')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. 팀 정보 테이블
CREATE TABLE public.teams (
    id TEXT PRIMARY KEY DEFAULT ('team-' || uuid_generate_v4()),
    recruitment_id TEXT REFERENCES public.recruitments(id) ON DELETE SET NULL,
    opportunity_id TEXT REFERENCES public.opportunities(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    description TEXT DEFAULT '',
    leader_id UUID NOT NULL REFERENCES public.profiles(id),
    github_repo_url TEXT,
    figma_url TEXT,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'disbanded')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. 팀원 매핑 테이블
CREATE TABLE public.team_members (
    id TEXT PRIMARY KEY DEFAULT ('tm-' || uuid_generate_v4()),
    team_id TEXT NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    role TEXT NOT NULL,
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (team_id, user_id)
);

-- 8. 주간 활동 가능 시간표 테이블 (Asia/Seoul 기준 30분 단위)
-- day_of_week: 0(일) ~ 6(토)
-- slot: 0(00:00~00:30) ~ 47(23:30~24:00)
CREATE TABLE public.availabilities (
    id TEXT PRIMARY KEY DEFAULT ('av-' || uuid_generate_v4()),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    day_of_week INT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
    slot INT NOT NULL CHECK (slot BETWEEN 0 AND 47),
    is_available BOOLEAN NOT NULL DEFAULT true,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (user_id, day_of_week, slot)
);

-- 9. 회의 일정 테이블
CREATE TABLE public.meetings (
    id TEXT PRIMARY KEY DEFAULT ('meet-' || uuid_generate_v4()),
    team_id TEXT NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    scheduled_at TIMESTAMPTZ NOT NULL,
    duration_minutes INT NOT NULL DEFAULT 60,
    location TEXT NOT NULL,
    is_online BOOLEAN NOT NULL DEFAULT true,
    meeting_url TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. 북마크 테이블
CREATE TABLE public.bookmarks (
    id TEXT PRIMARY KEY DEFAULT ('bm-' || uuid_generate_v4()),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    opportunity_id TEXT NOT NULL REFERENCES public.opportunities(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (user_id, opportunity_id)
);

-- 11. 프로젝트 체크리스트 테이블 (추가 기능)
CREATE TABLE public.project_tasks (
    id TEXT PRIMARY KEY DEFAULT ('task-' || uuid_generate_v4()),
    team_id TEXT NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    is_completed BOOLEAN NOT NULL DEFAULT false,
    assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    due_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. 공고 수집 실행 기록 테이블 (서버/관리자 전용)
CREATE TABLE public.crawling_logs (
    id TEXT PRIMARY KEY DEFAULT ('log-' || uuid_generate_v4()),
    executed_at TIMESTAMPTZ DEFAULT NOW(),
    status TEXT NOT NULL CHECK (status IN ('success', 'failed', 'partial')),
    new_items_count INT NOT NULL DEFAULT 0,
    updated_items_count INT NOT NULL DEFAULT 0,
    error_message TEXT,
    triggered_by TEXT NOT NULL CHECK (triggered_by IN ('github_actions', 'admin_manual'))
);
```

---

## 4. Supabase RLS (Row Level Security) 정책 원칙

모든 테이블은 기본적으로 `ALTER TABLE [table] ENABLE ROW LEVEL SECURITY;`를 적용합니다.

1. **`profiles` (사용자 프로필)**:
   - **이메일 보호**: 사용자 이메일은 Google OAuth 인증 및 시스템 내부 식별용으로만 쓰이며, 타인에게 노출되지 않도록 Supabase View 또는 RLS 컬럼 권한으로 마스킹합니다.
   - **프로필 공개 범위**: `is_public = true`인 프로필에 한하여 인증된 학부생의 검색 및 열람을 허용합니다.
   - **수정 권한**: `auth.uid() = id`인 본인만 UPDATE 가능합니다.
2. **`opportunities` (공모전 공고)**:
   - 조회: 모든 인증된 학부생 조회 가능 (`status != 'draft'`).
   - 관리자 등록: 관리자 권한(`auth.jwt() ->> 'role' = 'admin'`) 또는 Service Role Key만 등록/수정 가능.
3. **`recruitments` (팀원 모집글)**:
   - 조회: 인증된 학부생 전체 열람 가능.
   - 수정/삭제: `author_id = auth.uid()`인 작성자 본인만 가능.
4. **`applications` (팀 가입 신청)**:
   - 조회: 신청자 본인(`applicant_id = auth.uid()`) 또는 해당 모집글 작성자(`recruitments.author_id = auth.uid()`)만 가능.
   - 수락/거절: 모집글 작성자만 상태 UPDATE 가능.
5. **`teams`, `meetings`, `project_tasks`**:
   - `team_members`에 소속된 유저(`user_id = auth.uid()`)에게만 열람 및 수정 권한 부여.
6. **`availabilities` (시간표)**:
   - 본인 시간표는 항상 수정 가능.
   - 상세 시간표 슬롯은 본인 및 동일 프로젝트 팀원에게만 공개.
7. **`crawling_logs`**:
   - 일반 사용자 조회 완전 차단, 관리자 Role 및 Service Role Key 전용.

---

## 5. 최신 기획에 따른 프로필 스키마 확장안 (협의 예정 설계안)

> [!TIP]
> **팀 B(백엔드) 및 팀 C(알고리즘)와의 사전 협의 안건**  
> 최신 기획에 따라 사용자 프로필에 **소속 학부, 기술 숙련도, 활동 방식, 참여 가능 상태, 프로젝트 경험 구조체**를 도입하는 방안입니다. 현재 프론트엔드 코드나 `src/types/index.ts`를 즉시 수정하지 않고, 협의 완료 후 안전하게 마이그레이션할 계획입니다.

### 5-1. 제안 확장 필드 (Proposed Columns for `profiles`)

```sql
-- [협의안] profiles 테이블 확장 제안 DDL
ALTER TABLE public.profiles
    ADD COLUMN department TEXT DEFAULT '컴퓨터학부',
    ADD COLUMN avatar_url TEXT,
    ADD COLUMN tech_proficiency JSONB DEFAULT '{}', -- 예: {"React": "숙련", "Python": "활용 가능"}
    ADD COLUMN activity_types TEXT[] DEFAULT '{}',  -- ["공모전", "해커톤", "사이드 프로젝트"]
    ADD COLUMN activity_goals TEXT[] DEFAULT '{}',  -- ["수상", "실무 경험", "포트폴리오"]
    ADD COLUMN activity_mode TEXT DEFAULT '혼합' CHECK (activity_mode IN ('대면', '비대면', '혼합')),
    ADD COLUMN activity_duration TEXT DEFAULT '무관' CHECK (activity_duration IN ('단기', '장기', '무관')),
    ADD COLUMN availability_status TEXT DEFAULT '팀 구하는 중' 
        CHECK (availability_status IN ('팀 구하는 중', '제안 환영', '활동 중', '참여 어려움')),
    ADD COLUMN project_experiences JSONB DEFAULT '[]', -- 구조화된 프로젝트 경험 목록
    ADD COLUMN awards TEXT[] DEFAULT '{}';
```

### 5-2. `project_experiences` JSONB 구조 제안
```json
[
  {
    "id": "exp-01",
    "projectName": "2025 학부 해커톤 출전작",
    "description": "학부생 편의를 위한 강의실 예약 시스템 구축",
    "role": "Frontend Developer",
    "techStacks": ["React", "TypeScript", "TailwindCSS"],
    "period": "2025.09 - 2025.10",
    "awards": "우수상 수상",
    "linkUrl": "https://github.com/example/repo"
  }
]
```

### 5-3. B/C 담당자와의 주요 협의 사항
1. **기술 스택 '아직 보유 기술 없음' 저장 방식**:
   - `tech_stacks: []` (빈 배열)로 둘 것인지, `tech_stacks: ['아직 보유 기술 없음']` 문자열 태그로 포함할 것인지 결정.
2. **기술별 숙련도(`tech_proficiency`) 포맷**:
   - `JSONB` 객체(`{"React": "advanced"}`) 형태 vs 별도 매핑 테이블(`user_tech_skills`) 분리 여부.
3. **태그 표준화 및 추천 가중치**:
   - 팀 C의 `tagClassification.ts`와 연동하여, 대소문자 무관 정규화 및 `desiredRoles` 기반 가중치 매칭 규칙 확정.
