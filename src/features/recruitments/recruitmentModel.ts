import type {
  ActivityType,
  Application,
  ApplicationStatus,
  Recruitment,
  RecruitmentStatus,
} from '../../types';

export interface RecruitmentFilters {
  status?: 'all' | 'recruiting' | 'completed' | 'cancelled';
  search?: string;
  opportunityId?: string;
}

export type CreateRecruitmentPayload = Omit<
  Recruitment,
  'id' | 'currentMemberCount' | 'createdAt' | 'updatedAt' | 'authorProfile'
>;

export type UpdateRecruitmentPayload = Partial<Omit<
  Recruitment,
  'id' | 'currentMemberCount' | 'authorId' | 'authorProfile' | 'createdAt' | 'updatedAt'
>>;

export interface RecruitmentSource {
  getRecruitments: (filters?: RecruitmentFilters) => Promise<Recruitment[]>;
  getRecruitmentById: (id: string) => Promise<Recruitment | null>;
  createRecruitment: (payload: CreateRecruitmentPayload) => Promise<Recruitment>;
  updateRecruitment: (id: string, updates: UpdateRecruitmentPayload) => Promise<Recruitment>;
  deleteRecruitment: (id: string) => Promise<void>;
  applyToRecruitment: (recruitmentId: string, role: string, message: string) => Promise<Application>;
  getApplicationsForRecruitment: (recruitmentId: string) => Promise<Application[]>;
  updateApplicationStatus: (applicationId: string, status: 'accepted' | 'rejected') => Promise<Application>;
}

/**
 * 인원 정책 헬퍼 (작성자 제외 추가 모집 인원 기준)
 * - targetMemberCount: 작성자를 제외한 추가 모집 정원 (예: 4명)
 * - currentMemberCount: 모집 경로로 확정된 추가 인원 (최초 0명)
 * - 남은 자리: targetMemberCount - currentMemberCount
 * - 총 팀원 수 (참고): currentMemberCount + 1 (팀장 포함)
 * - 목표 총 팀 규모: targetMemberCount + 1 (팀장 포함)
 */
export function getRecruitmentHeadcount(recruitment: Pick<Recruitment, 'targetMemberCount' | 'currentMemberCount'>) {
  const target = Math.max(1, recruitment.targetMemberCount);
  const current = Math.max(0, recruitment.currentMemberCount);
  const remaining = Math.max(0, target - current);
  const totalTeamCurrent = current + 1;
  const totalTeamTarget = target + 1;
  const isFull = current >= target;

  return {
    target,
    current,
    remaining,
    totalTeamCurrent,
    totalTeamTarget,
    isFull,
  };
}

export function isRecruitmentOpen(recruitment: Recruitment): boolean {
  if (recruitment.status !== 'recruiting') return false;
  const { isFull } = getRecruitmentHeadcount(recruitment);
  if (isFull) return false;
  if (recruitment.deadline && Date.parse(recruitment.deadline) < Date.now()) return false;
  return true;
}

export const activityTypeLabels: Record<ActivityType, string> = {
  hybrid: '대면/비대면 혼합',
  online: '온라인 (비대면)',
  offline: '오프라인 (대면)',
};

export const recruitmentStatusLabels: Record<RecruitmentStatus, { label: string; badgeClass: string }> = {
  recruiting: {
    label: '모집중',
    badgeClass: 'bg-[#F7FEDF] text-[#5a7a00] border border-[#C6FF33]/40',
  },
  completed: {
    label: '모집완료',
    badgeClass: 'bg-slate-100 text-slate-600 border border-slate-200',
  },
  cancelled: {
    label: '모집취소',
    badgeClass: 'bg-rose-50 text-rose-600 border border-rose-200',
  },
};

export const applicationStatusLabels: Record<ApplicationStatus, { label: string; badgeClass: string }> = {
  pending: {
    label: '검토 중',
    badgeClass: 'bg-amber-50 text-amber-700 border border-amber-200',
  },
  accepted: {
    label: '수락됨',
    badgeClass: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  },
  rejected: {
    label: '거절됨',
    badgeClass: 'bg-rose-50 text-rose-600 border border-rose-200',
  },
  cancelled: {
    label: '취소됨',
    badgeClass: 'bg-slate-100 text-slate-500 border border-slate-200',
  },
};

export function validateRecruitmentForm(data: {
  title?: string;
  content?: string;
  targetMemberCount?: number;
  expectedDuration?: string;
  roles?: string[];
  requiredTechStacks?: string[];
  activityType?: ActivityType;
  deadline?: string | null;
  customOpportunityUrl?: string | null;
}): { isValid: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {};

  if (!data.title?.trim()) {
    errors.title = '모집글 제목을 입력해 주세요.';
  } else if (data.title.trim().length < 2) {
    errors.title = '제목은 2자 이상 입력해 주세요.';
  }

  if (!data.content?.trim()) {
    errors.content = '모집 내용 및 활동 목표를 입력해 주세요.';
  }

  if (
    data.targetMemberCount === undefined ||
    !Number.isInteger(data.targetMemberCount) ||
    data.targetMemberCount < 1
  ) {
    errors.targetMemberCount = '추가 모집 인원은 1명 이상의 정수여야 합니다.';
  }

  if (!data.expectedDuration?.trim()) {
    errors.expectedDuration = '예상 활동 기간을 입력해 주세요.';
  }

  if (!data.roles || data.roles.length === 0) {
    errors.roles = '모집할 역할을 최소 1개 이상 지정해 주세요.';
  }

  if (!data.requiredTechStacks || data.requiredTechStacks.length === 0) {
    errors.requiredTechStacks = '필요 기술 스택을 최소 1개 이상 지정해 주세요.';
  }

  if (!data.activityType || !['online', 'offline', 'hybrid'].includes(data.activityType)) {
    errors.activityType = '활동 방식을 선택해 주세요.';
  }

  if (data.deadline) {
    const timestamp = Date.parse(data.deadline);
    if (!Number.isFinite(timestamp)) {
      errors.deadline = '올바른 날짜 형식을 입력해 주세요.';
    }
  }

  if (data.customOpportunityUrl?.trim()) {
    try {
      const url = new URL(data.customOpportunityUrl.trim());
      if (url.protocol !== 'http:' && url.protocol !== 'https:') {
        errors.customOpportunityUrl = '공모전 링크는 http 또는 https 주소여야 합니다.';
      }
    } catch {
      errors.customOpportunityUrl = '올바른 URL 형식이어야 합니다.';
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}
