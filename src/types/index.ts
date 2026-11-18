import type { MajorTrack } from '../constants/majors';

/**
 * BRIDGE — 경북대학교 컴퓨터학부 학생 통합 협업 플랫폼
 * 공통 TypeScript 데이터 타입 정의 (초안)
 *
 * 모든 엔티티는 Supabase PostgreSQL 스키마 및 RLS(Row Level Security) 설계와 일관성을 유지합니다.
 */

// -----------------------------------------------------------------------------
// 1. 사용자 프로필 (UserProfile)
// -----------------------------------------------------------------------------
export type GradeType = '1학년' | '2학년' | '3학년' | '4학년' | '대학원생';

export type TrackType =
  | MajorTrack
  | '플랫폼소프트웨어'
  | '인공지능컴퓨팅'
  | '데이터사이언스'
  | '글로벌소프트웨어융합'
  | '심화컴퓨터공학';

export type ProfileVisibility = 'public' | 'team_only' | 'private';

export interface UserProfile {
  id: string; // Supabase auth.users UUID
  email: string;
  name: string;
  nickname: string;
  grade: GradeType;
  track: TrackType;
  bio: string;
  longBio?: string;
  interests: string[];
  techStacks: string[];
  wantedTechStacks: string[];
  desiredRoles: string[];
  experiences: string[];
  githubUrl?: string | null;
  portfolioUrl?: string | null;
  visibility?: ProfileVisibility | null;
  isPublic: boolean; // 기존 알고리즘 호환용 공개 여부
  createdAt: string;
  updatedAt: string;
}

// -----------------------------------------------------------------------------
// 2. 공모전 및 대외활동 (Opportunity)
// -----------------------------------------------------------------------------
export type OpportunityCategory =
  | '해커톤'
  | '공모전'
  | '경진대회'
  | '대외활동'
  | '서포터즈'
  | '교육/특강';

export type OpportunitySourceType =
  | 'knu_cse_official' // 컴퓨터학부 공식 홈페이지 공지 자동 수집
  | 'admin_manual'     // 관리자 직접 등록
  | 'user_manual';     // 사용자 직접 등록 (자율 공모전)

export type OpportunityStatus =
  | 'active'              // 접수 진행 중
  | 'closed'              // 접수 마감
  | 'needs_confirmation'  // 마감일/일정 확인 필요
  | 'draft';              // 임시 저장

export interface Opportunity {
  id: string;
  title: string;
  description: string;
  category: OpportunityCategory;
  tags: string[];
  organizer: string;
  postedAt: string;
  applicationStart: string | null; // 확인되지 않은 경우 null
  deadline: string | null;         // 확인되지 않은 경우 null
  sourceType: OpportunitySourceType;
  sourcePostId?: string | null;    // 학부 공지 게시글 고유 ID
  sourceUrl?: string | null;       // 학부 홈페이지 원본 게시글 링크
  applicationUrl?: string | null;  // 공식 접수/신청 페이지 링크
  collectedAt: string;             // 데이터 수집 일시
  updatedAt: string;               // 최근 업데이트 일시
  status: OpportunityStatus;
}

// -----------------------------------------------------------------------------
// 3. 팀원 모집 게시글 (Recruitment)
// -----------------------------------------------------------------------------
export type ActivityType = 'online' | 'offline' | 'hybrid';
export type RecruitmentStatus = 'recruiting' | 'completed' | 'cancelled';

export interface Recruitment {
  id: string;
  opportunityId?: string | null;           // 기존 등록된 공고 ID (연결 시)
  customOpportunityTitle?: string | null;  // 공고 미등록 시 자율 입력 제목
  customOpportunityUrl?: string | null;    // 공고 미등록 시 자율 입력 링크
  title: string;
  content: string;
  targetMemberCount: number;
  currentMemberCount: number;
  roles: string[];                         // 모집 역할 (예: Frontend, Backend 등)
  requiredTechStacks: string[];            // 요구 기술 스택
  deadline: string | null;                 // 모집 마감일
  expectedDuration: string;                // 예상 활동 기간 (예: "2개월", "방학 중")
  activityType: ActivityType;
  status: RecruitmentStatus;
  authorId: string;                        // 작성자 UserProfile id
  authorProfile?: UserProfile;
  createdAt: string;
  updatedAt: string;
}

// -----------------------------------------------------------------------------
// 4. 팀 가입 신청 (Application)
// -----------------------------------------------------------------------------
export type ApplicationStatus = 'pending' | 'accepted' | 'rejected' | 'cancelled';

export interface Application {
  id: string;
  recruitmentId: string;
  applicantId: string;                     // 신청자 UserProfile id
  applicantProfile?: UserProfile;
  appliedRole: string;
  message: string;
  status: ApplicationStatus;
  createdAt: string;
  updatedAt: string;
}

// -----------------------------------------------------------------------------
// 5. 팀원 초대 (Invitation)
// -----------------------------------------------------------------------------
export type InvitationStatus = 'pending' | 'accepted' | 'rejected' | 'cancelled';

export interface Invitation {
  id: string;
  recruitmentId?: string | null;
  teamId?: string | null;
  senderId: string;                        // 초대한 팀장 id
  receiverId: string;                      // 초대받은 학생 id
  invitedRole: string;
  message: string;
  status: InvitationStatus;
  createdAt: string;
  updatedAt: string;
}

// -----------------------------------------------------------------------------
// 6. 팀 정보 (Team)
// -----------------------------------------------------------------------------
export type TeamStatus = 'active' | 'completed' | 'disbanded';

export interface Team {
  id: string;
  recruitmentId?: string | null;
  opportunityId?: string | null;
  name: string;
  description: string;
  leaderId: string;
  githubRepoUrl?: string | null;
  figmaUrl?: string | null;
  status: TeamStatus;
  createdAt: string;
  updatedAt: string;
}

// -----------------------------------------------------------------------------
// 7. 팀원 매핑 (TeamMember)
// -----------------------------------------------------------------------------
export interface TeamMember {
  id: string;
  teamId: string;
  userId: string;
  userProfile?: UserProfile;
  role: string;
  joinedAt: string;
}

// -----------------------------------------------------------------------------
// 8. 활동 가능 시간표 (Availability) - Asia/Seoul 기준
// -----------------------------------------------------------------------------
// dayOfWeek: 0(일), 1(월), 2(화), 3(수), 4(목), 5(금), 6(토)
// slot: 0 ~ 47 (30분 단위, 0: 00:00~00:30, 18: 09:00~09:30, 47: 23:30~24:00)
export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export interface Availability {
  id: string;
  userId: string;
  dayOfWeek: DayOfWeek;
  slot: number; // 0 ~ 47
  isAvailable: boolean;
  updatedAt: string;
}

// -----------------------------------------------------------------------------
// 9. 회의 일정 (Meeting)
// -----------------------------------------------------------------------------
export interface Meeting {
  id: string;
  teamId: string;
  title: string;
  scheduledAt: string; // ISO 8601 (한국 시간 기준)
  durationMinutes: number; // 회의 지속 시간(분)
  location: string;
  isOnline: boolean;
  meetingUrl?: string | null;
  notes?: string | null;
  createdAt: string;
}

// -----------------------------------------------------------------------------
// 10. 추천 및 매칭 결과 (MatchResult)
// -----------------------------------------------------------------------------
export interface MatchResult {
  targetId: string; // 추천 대상 ID (userId 또는 opportunityId)
  score: number;    // 매칭 적합도 (0 ~ 100)
  matchedTags: string[];
  reasons: string[];
}

// -----------------------------------------------------------------------------
// 11. 북마크 (Bookmark)
// -----------------------------------------------------------------------------
export interface Bookmark {
  id: string;
  userId: string;
  opportunityId: string;
  createdAt: string;
}

// -----------------------------------------------------------------------------
// 12. 프로젝트 체크리스트 (ProjectTask)
// -----------------------------------------------------------------------------
export interface ProjectTask {
  id: string;
  teamId: string;
  title: string;
  isCompleted: boolean;
  assignedTo?: string | null; // UserProfile id
  dueDate?: string | null;
  createdAt: string;
}

// -----------------------------------------------------------------------------
// 13. 공고 수집 실행 기록 (CrawlingLog)
// -----------------------------------------------------------------------------
export type CrawlingTriggerType = 'github_actions' | 'admin_manual';
export type CrawlingExecutionStatus = 'success' | 'failed' | 'partial';

export interface CrawlingLog {
  id: string;
  executedAt: string;
  status: CrawlingExecutionStatus;
  newItemsCount: number;
  updatedItemsCount: number;
  errorMessage?: string | null;
  triggeredBy: CrawlingTriggerType;
}
