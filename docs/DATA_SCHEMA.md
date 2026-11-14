# BRIDGE — 공통 데이터 타입 및 Supabase 데이터베이스 설계서 (DATA_SCHEMA.md)

## 1. 개요
본 문서는 BRIDGE 플랫폼의 공통 TypeScript 타입(`src/types/index.ts`)과 Supabase PostgreSQL 데이터베이스 스키마 간의 일관성을 유지하기 위한 DDL 및 RLS 보안 정책 설계서입니다.

---

## 2. 엔티티 관계 다이어그램 (ERD 개요)
- `users` (1) ─── (N) `recruitments` (작성한 모집글)
- `users` (1) ─── (N) `applications` (제출한 지원서)
- `users` (1) ─── (N) `availabilities` (활동 가능 시간 슬롯)
- `users` (1) ─── (N) `bookmarks` (저장한 공모전)
- `opportunities` (1) ─── (N) `recruitments` (연결된 팀원 모집글)
- `opportunities` (1) ─── (N) `bookmarks`
- `recruitments` (1) ─── (1) `teams` (결성된 팀)
- `teams` (1) ─── (N) `team_members` (소속 팀원)
- `teams` (1) ─── (N) `meetings` (팀 회의 일정)
- `teams` (1) ─── (N) `project_tasks` (체크리스트)

---

## 3. PostgreSQL 테이블 DDL 초안

```sql
-- 확장 모듈 활성화
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. 사용자 프로필 테이블
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

-- 11. 프로젝트 체크리스트 테이블
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
   - 조회: `is_public = true`인 프로필은 모든 인증된 학부생 조회 가능. 본인 프로필은 항상 조회/수정 가능.
   - 수정: `auth.uid() = id`인 본인만 UPDATE 가능.
2. **`opportunities` (공모전 공고)**:
   - 조회: 모든 사용자(익명/인증) 조회 가능 (`status != 'draft'`).
   - 등록/수정: 관리자 계정 또는 서비스 롤 키(크롤러 실행용)만 가능. 일반 사용자는 `source_type = 'user_manual'`로만 생성 가능.
3. **`recruitments` (팀원 모집글)**:
   - 조회: 모든 인증된 사용자 조회 가능.
   - 수정/삭제: `author_id = auth.uid()`인 작성자 본인만 가능.
4. **`applications` (팀 가입 신청)**:
   - 조회: 신청자 본인(`applicant_id = auth.uid()`) 또는 해당 모집글 작성자(`recruitments.author_id = auth.uid()`)만 가능.
   - 상태 변경(수락/거절): 해당 모집글 작성자만 UPDATE 가능.
5. **`teams`, `meetings`, `project_tasks`**:
   - `team_members`에 소속된 유저(`user_id = auth.uid()`)만 열람 및 작성/수정 가능.
6. **`availabilities` (시간표)**:
   - 본인 시간표는 항상 수정 가능.
   - 다른 사용자의 시간표는 팀 빌더 및 일정 조율 목적으로 동일 팀 소속 팀원 또는 프로필 공개 유저에 한해 조회 허용.
7. **`crawling_logs`**:
   - 일반 사용자 조회 차단, 관리자 Role 및 Service Role Key만 접근 허용.
