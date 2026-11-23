import { supabase } from '../lib/supabase';
import type {
  ActivityType,
  Application,
  ApplicationStatus,
  Recruitment,
  RecruitmentStatus,
} from '../types';

export interface RecruitmentServiceError {
  code: string;
  message: string;
  details?: unknown;
}

/** Shape matches the shared service wrapper documented in docs/API_CONTRACT.md. */
export interface RecruitmentServiceResponse<T> {
  data: T | null;
  error: RecruitmentServiceError | null;
}

export type CreateRecruitmentInput = Omit<
  Recruitment,
  'id' | 'currentMemberCount' | 'createdAt' | 'updatedAt' | 'authorProfile'
>;

export type UpdateRecruitmentInput = Partial<Omit<
  Recruitment,
  'id' | 'currentMemberCount' | 'authorId' | 'authorProfile' | 'createdAt' | 'updatedAt'
>>;

export interface RecruitmentFilters {
  status?: RecruitmentStatus;
  search?: string;
  opportunityId?: string;
}

type Row = Record<string, unknown>;
type SchoolUser = { id: string };
type AuthResult = { user: SchoolUser; error: null } | { user: null; error: RecruitmentServiceResponse<never> };

const ACTIVITY_TYPES: readonly ActivityType[] = ['online', 'offline', 'hybrid'];
const RECRUITMENT_STATUSES: readonly RecruitmentStatus[] = ['recruiting', 'completed', 'cancelled'];
const APPLICATION_STATUSES: readonly ApplicationStatus[] = ['pending', 'accepted', 'rejected', 'cancelled'];
export interface MyRecruitmentApplication {
  applicationId: string;
  recruitmentId: string;
  applicationStatus: ApplicationStatus;
  appliedAt: string;
  recruitmentTitle: string;
  recruitmentStatus: RecruitmentStatus;
}

export const RECRUITMENT_COLUMNS = [
  'id', 'opportunity_id', 'custom_opportunity_title', 'custom_opportunity_url', 'title', 'content',
  'target_member_count', 'current_member_count', 'roles', 'required_tech_stacks', 'deadline',
  'expected_duration', 'activity_type', 'status', 'author_id', 'created_at', 'updated_at',
].join(',');

export const APPLICATION_COLUMNS = [
  'id', 'recruitment_id', 'applicant_id', 'applied_role', 'message', 'status', 'created_at', 'updated_at',
].join(',');

const ok = <T>(data: T): RecruitmentServiceResponse<T> => ({ data, error: null });
const fail = <T = never>(code: string, message: string, details?: unknown): RecruitmentServiceResponse<T> => ({
  data: null,
  error: details === undefined ? { code, message } : { code, message, details },
});

const isRecord = (value: unknown): value is Row =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isOneOf = <T extends string>(values: readonly T[], value: unknown): value is T =>
  typeof value === 'string' && values.includes(value as T);

const validDate = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0 && Number.isFinite(Date.parse(value));

const mapSupabaseError = (error: unknown): RecruitmentServiceError => {
  const row = isRecord(error) ? error : {};
  const rawMessage = typeof row.message === 'string' ? row.message : '요청을 처리하지 못했습니다.';
  const rawCode = typeof row.code === 'string' ? row.code : '';
  const rpcCodes: Record<string, [string, string]> = {
    UNAUTHENTICATED: ['UNAUTHENTICATED', '로그인이 필요합니다.'],
    SCHOOL_EMAIL_REQUIRED: ['INVALID_EMAIL_DOMAIN', '인증된 경북대학교 이메일 계정만 사용할 수 있습니다.'],
    VALIDATION_ERROR: ['VALIDATION_ERROR', '입력값을 확인해 주세요.'],
    NOT_FOUND: ['NOT_FOUND', '모집글 또는 지원서를 찾을 수 없습니다.'],
    FORBIDDEN: ['FORBIDDEN', '이 작업을 수행할 권한이 없습니다.'],
    SELF_APPLICATION: ['FORBIDDEN', '본인이 작성한 모집글에는 지원할 수 없습니다.'],
    RECRUITMENT_CLOSED: ['RECRUITMENT_CLOSED', '모집이 종료되었거나 마감일이 지났습니다.'],
    RECRUITMENT_FULL: ['RECRUITMENT_FULL', '모집 정원이 가득 찼습니다.'],
    DUPLICATE_APPLICATION: ['CONFLICT_DUPLICATE', '이미 이 모집글에 지원했습니다.'],
    APPLICATION_ALREADY_REVIEWED: ['CONFLICT_STATUS', '이미 검토가 끝난 지원서입니다.'],
  };
  const rpcCode = Object.keys(rpcCodes).find((code) => rawMessage.includes(code));
  if (rpcCode) {
    const [code, message] = rpcCodes[rpcCode];
    return { code, message };
  }
  if (rawCode === '23505') return { code: 'CONFLICT_DUPLICATE', message: '이미 등록된 항목입니다.' };
  if (rawCode === '23514' || rawCode === '22P02' || rawCode === '22007') {
    return { code: 'VALIDATION_ERROR', message: '입력값을 확인해 주세요.' };
  }
  if (rawCode === '42501' || rawCode === 'PGRST301') {
    return { code: 'FORBIDDEN', message: '이 작업을 수행할 권한이 없습니다.' };
  }
  return { code: 'DATABASE_ERROR', message: rawMessage };
};

const authUser = async (): Promise<AuthResult> => {
  try {
    const { data, error } = await supabase.auth.getUser();
    if (error) return { user: null, error: fail('AUTH_ERROR', '로그인 상태를 확인하지 못했습니다.') };
    const user = data.user;
    if (!user) return { user: null, error: fail('UNAUTHENTICATED', '로그인이 필요합니다.') };
    if (!user.email || !user.email.trim().toLowerCase().endsWith('@knu.ac.kr')) {
      return { user: null, error: fail('INVALID_EMAIL_DOMAIN', '경북대학교 이메일 계정만 사용할 수 있습니다.') };
    }
    if (!user.email_confirmed_at) {
      return { user: null, error: fail('EMAIL_NOT_VERIFIED', '학교 이메일 인증을 완료해 주세요.') };
    }
    return { user: { id: user.id }, error: null };
  } catch {
    return { user: null, error: fail('AUTH_ERROR', '로그인 상태를 확인하지 못했습니다.') };
  }
};

const stringField = (row: Row, key: string): string | null =>
  typeof row[key] === 'string' ? row[key] as string : null;

const nullableStringField = (row: Row, key: string): string | null | undefined => {
  if (row[key] === null) return null;
  return typeof row[key] === 'string' ? row[key] as string : undefined;
};

const stringArrayField = (row: Row, key: string): string[] | null => {
  const value = row[key];
  if (Array.isArray(value) && value.every((item) => typeof item === 'string')) return value;
  return null;
};

export function mapRecruitmentRow(value: unknown): Recruitment | null {
  if (!isRecord(value)) return null;
  const id = stringField(value, 'id');
  const opportunityId = nullableStringField(value, 'opportunity_id');
  const customOpportunityTitle = nullableStringField(value, 'custom_opportunity_title');
  const customOpportunityUrl = nullableStringField(value, 'custom_opportunity_url');
  const title = stringField(value, 'title');
  const content = stringField(value, 'content');
  const roles = stringArrayField(value, 'roles');
  const requiredTechStacks = stringArrayField(value, 'required_tech_stacks');
  const expectedDuration = stringField(value, 'expected_duration');
  const authorId = stringField(value, 'author_id');
  const createdAt = value.created_at;
  const updatedAt = value.updated_at;
  const deadline = nullableStringField(value, 'deadline');
  const targetMemberCount = value.target_member_count;
  const currentMemberCount = value.current_member_count;

  if (!id || opportunityId === undefined || customOpportunityTitle === undefined
      || customOpportunityUrl === undefined || !title || content === null || !roles
      || !requiredTechStacks || !expectedDuration || !authorId
      || !validDate(createdAt) || !validDate(updatedAt)
      || (deadline !== null && !validDate(deadline))
      || !Number.isInteger(targetMemberCount) || !Number.isInteger(currentMemberCount)
      || !isOneOf(ACTIVITY_TYPES, value.activity_type)
      || !isOneOf(RECRUITMENT_STATUSES, value.status)) return null;

  return {
    id, opportunityId, customOpportunityTitle, customOpportunityUrl,
    title, content, targetMemberCount: targetMemberCount as number,
    currentMemberCount: currentMemberCount as number, roles, requiredTechStacks,
    deadline, expectedDuration, activityType: value.activity_type, status: value.status,
    authorId, createdAt, updatedAt,
  };
}

export function mapApplicationRow(value: unknown): Application | null {
  if (!isRecord(value)) return null;
  const id = stringField(value, 'id');
  const recruitmentId = stringField(value, 'recruitment_id');
  const applicantId = stringField(value, 'applicant_id');
  const appliedRole = stringField(value, 'applied_role');
  const message = stringField(value, 'message');
  const createdAt = value.created_at;
  const updatedAt = value.updated_at;
  if (!id || !recruitmentId || !applicantId || !appliedRole || message === null
      || !isOneOf(APPLICATION_STATUSES, value.status)
      || !validDate(createdAt) || !validDate(updatedAt)) return null;
  return { id, recruitmentId, applicantId, appliedRole, message, status: value.status, createdAt, updatedAt };
}

const validateRecruitment = (input: Partial<CreateRecruitmentInput>): RecruitmentServiceError | null => {
  if (typeof input.title !== 'string' || !input.title.trim()) return { code: 'VALIDATION_ERROR', message: '모집글 제목을 입력해 주세요.' };
  if (typeof input.content !== 'string' || !input.content.trim()) return { code: 'VALIDATION_ERROR', message: '모집 내용을 입력해 주세요.' };
  if (typeof input.expectedDuration !== 'string' || !input.expectedDuration.trim()) return { code: 'VALIDATION_ERROR', message: '예상 활동 기간을 입력해 주세요.' };
  if (!Number.isInteger(input.targetMemberCount) || (input.targetMemberCount ?? 0) < 1) {
    return { code: 'VALIDATION_ERROR', message: '모집 정원은 1명 이상의 정수여야 합니다.' };
  }
  if (!Array.isArray(input.roles) || !input.roles.every((item) => typeof item === 'string' && item.trim())) {
    return { code: 'VALIDATION_ERROR', message: '모집 역할 목록을 확인해 주세요.' };
  }
  if (!Array.isArray(input.requiredTechStacks)
      || !input.requiredTechStacks.every((item) => typeof item === 'string' && item.trim())) {
    return { code: 'VALIDATION_ERROR', message: '필요 기술 목록을 확인해 주세요.' };
  }
  if (!isOneOf(ACTIVITY_TYPES, input.activityType)) return { code: 'VALIDATION_ERROR', message: '활동 방식을 확인해 주세요.' };
  if (!isOneOf(RECRUITMENT_STATUSES, input.status)) return { code: 'VALIDATION_ERROR', message: '모집 상태를 확인해 주세요.' };
  if (input.deadline !== null && !validDate(input.deadline)) return { code: 'VALIDATION_ERROR', message: '모집 마감일을 확인해 주세요.' };
  if (input.customOpportunityUrl && !isHttpUrl(input.customOpportunityUrl)) {
    return { code: 'VALIDATION_ERROR', message: '공모전 링크는 http 또는 https 주소여야 합니다.' };
  }
  return null;
};

const isHttpUrl = (value: string): boolean => {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
};

const toRecruitmentRow = (input: CreateRecruitmentInput, authorId: string) => ({
  opportunity_id: input.opportunityId ?? null,
  custom_opportunity_title: input.customOpportunityTitle ?? null,
  custom_opportunity_url: input.customOpportunityUrl ?? null,
  title: input.title.trim(),
  content: input.content.trim(),
  target_member_count: input.targetMemberCount,
  roles: input.roles.map((role) => role.trim()),
  required_tech_stacks: input.requiredTechStacks.map((tag) => tag.trim()),
  deadline: input.deadline,
  expected_duration: input.expectedDuration.trim(),
  activity_type: input.activityType,
  status: input.status,
  // Never trust a caller supplied authorId; RLS also checks it against auth.uid().
  author_id: authorId,
});

const UPDATE_FIELDS: Record<keyof UpdateRecruitmentInput, string> = {
  opportunityId: 'opportunity_id',
  customOpportunityTitle: 'custom_opportunity_title',
  customOpportunityUrl: 'custom_opportunity_url',
  title: 'title',
  content: 'content',
  targetMemberCount: 'target_member_count',
  roles: 'roles',
  requiredTechStacks: 'required_tech_stacks',
  deadline: 'deadline',
  expectedDuration: 'expected_duration',
  activityType: 'activity_type',
  status: 'status',
};

const validateUpdates = (updates: UpdateRecruitmentInput): RecruitmentServiceError | null => {
  if (!isRecord(updates) || Object.keys(updates).length === 0) {
    return { code: 'VALIDATION_ERROR', message: '수정할 항목을 하나 이상 입력해 주세요.' };
  }
  const allowed = new Set(Object.keys(UPDATE_FIELDS));
  if (Object.keys(updates).some((key) => !allowed.has(key))) {
    return { code: 'FORBIDDEN', message: '작성자 또는 모집 인원 수는 수정할 수 없습니다.' };
  }
  for (const [key, value] of Object.entries(updates)) {
    if (['title', 'content', 'expectedDuration'].includes(key)
        && (typeof value !== 'string' || !value.trim())) {
      return { code: 'VALIDATION_ERROR', message: `${key} 값을 입력해 주세요.` };
    }
    if (key === 'targetMemberCount' && (!Number.isInteger(value) || (value as number) < 1)) {
      return { code: 'VALIDATION_ERROR', message: '모집 정원은 1명 이상의 정수여야 합니다.' };
    }
    if ((key === 'roles' || key === 'requiredTechStacks')
        && (!Array.isArray(value) || !value.every((item) => typeof item === 'string' && item.trim()))) {
      return { code: 'VALIDATION_ERROR', message: '역할 또는 기술 목록을 확인해 주세요.' };
    }
    if (key === 'activityType' && !isOneOf(ACTIVITY_TYPES, value)) {
      return { code: 'VALIDATION_ERROR', message: '활동 방식을 확인해 주세요.' };
    }
    if (key === 'status' && !isOneOf(RECRUITMENT_STATUSES, value)) {
      return { code: 'VALIDATION_ERROR', message: '모집 상태를 확인해 주세요.' };
    }
    if (key === 'deadline' && value !== null && !validDate(value)) {
      return { code: 'VALIDATION_ERROR', message: '모집 마감일을 확인해 주세요.' };
    }
    if (key === 'customOpportunityUrl' && value !== null
        && (typeof value !== 'string' || !isHttpUrl(value))) {
      return { code: 'VALIDATION_ERROR', message: '공모전 링크는 http 또는 https 주소여야 합니다.' };
    }
    if (['opportunityId', 'customOpportunityTitle'].includes(key)
        && value !== null && typeof value !== 'string') {
      return { code: 'VALIDATION_ERROR', message: `${key} 값을 확인해 주세요.` };
    }
  }
  return null;
};

const responseFromError = <T>(error: unknown): RecruitmentServiceResponse<T> => {
  const mapped = mapSupabaseError(error);
  return fail(mapped.code, mapped.message);
};

/** List authenticated school users' recruitment posts. */
export async function getRecruitments(
  filters: RecruitmentFilters = {},
): Promise<RecruitmentServiceResponse<Recruitment[]>> {
  const auth = await authUser();
  if (auth.error) return auth.error;
  if (filters.status !== undefined && !isOneOf(RECRUITMENT_STATUSES, filters.status)) {
    return fail('VALIDATION_ERROR', '모집 상태 필터를 확인해 주세요.');
  }
  try {
    let query = supabase.from('recruitments').select(RECRUITMENT_COLUMNS);
    if (filters.status) query = query.eq('status', filters.status);
    if (filters.opportunityId) query = query.eq('opportunity_id', filters.opportunityId);
    if (filters.search?.trim()) {
      const search = filters.search.trim().replace(/[%_,().]/g, '');
      if (search) query = query.or(`title.ilike.%${search}%,content.ilike.%${search}%`);
    }
    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) return responseFromError(error);
    if (!Array.isArray(data)) return fail('INVALID_RESPONSE', '모집글 응답 형식이 올바르지 않습니다.');
    const rows = data.map(mapRecruitmentRow);
    if (rows.some((row) => row === null)) return fail('INVALID_RESPONSE', '모집글 데이터 형식이 올바르지 않습니다.');
    return ok(rows as Recruitment[]);
  } catch (error) {
    return responseFromError(error);
  }
}

/** Fetch one recruitment post; RLS permits reads to verified school users. */
export async function getRecruitmentById(id: string): Promise<RecruitmentServiceResponse<Recruitment>> {
  const auth = await authUser();
  if (auth.error) return auth.error;
  if (typeof id !== 'string' || !id.trim()) return fail('VALIDATION_ERROR', '모집글 ID가 필요합니다.');
  try {
    const { data, error } = await supabase.from('recruitments').select(RECRUITMENT_COLUMNS)
      .eq('id', id.trim()).maybeSingle();
    if (error) return responseFromError(error);
    const recruitment = mapRecruitmentRow(data);
    return recruitment ? ok(recruitment) : fail('NOT_FOUND', '모집글을 찾을 수 없습니다.');
  } catch (error) {
    return responseFromError(error);
  }
}

/** Create a post. authorId in the compatibility payload is replaced with the authenticated user ID. */
export async function createRecruitment(
  payload: CreateRecruitmentInput,
): Promise<RecruitmentServiceResponse<Recruitment>> {
  const auth = await authUser();
  if (auth.error) return auth.error;
  if (!payload || typeof payload !== 'object') return fail('VALIDATION_ERROR', '모집글 입력값을 확인해 주세요.');
  const validationError = validateRecruitment(payload);
  if (validationError) return { data: null, error: validationError };
  try {
    const { data, error } = await supabase.from('recruitments')
      .insert(toRecruitmentRow(payload, auth.user.id)).select(RECRUITMENT_COLUMNS).single();
    if (error) return responseFromError(error);
    const recruitment = mapRecruitmentRow(data);
    return recruitment ? ok(recruitment) : fail('INVALID_RESPONSE', '저장된 모집글 형식이 올바르지 않습니다.');
  } catch (error) {
    return responseFromError(error);
  }
}

/** Update editable fields on the current user's post; the database RLS remains authoritative. */
export async function updateRecruitment(
  id: string,
  updates: UpdateRecruitmentInput,
): Promise<RecruitmentServiceResponse<Recruitment>> {
  const auth = await authUser();
  if (auth.error) return auth.error;
  if (typeof id !== 'string' || !id.trim()) return fail('VALIDATION_ERROR', '모집글 ID가 필요합니다.');
  const validationError = validateUpdates(updates);
  if (validationError) return { data: null, error: validationError };
  const patch: Row = {};
  for (const [key, value] of Object.entries(updates)) {
    const field = UPDATE_FIELDS[key as keyof UpdateRecruitmentInput];
    if (field) patch[field] = typeof value === 'string' && ['title', 'content', 'expectedDuration'].includes(key)
      ? value.trim()
      : Array.isArray(value) ? value.map((item) => item.trim()) : value;
  }
  patch.updated_at = new Date().toISOString();
  try {
    const { data, error } = await supabase.from('recruitments').update(patch)
      .eq('id', id.trim()).select(RECRUITMENT_COLUMNS).maybeSingle();
    if (error) return responseFromError(error);
    const recruitment = mapRecruitmentRow(data);
    return recruitment ? ok(recruitment) : fail('FORBIDDEN', '모집글이 없거나 수정 권한이 없습니다.');
  } catch (error) {
    return responseFromError(error);
  }
}

/** Delete the current user's post; related applications cascade in the database. */
export async function deleteRecruitment(id: string): Promise<RecruitmentServiceResponse<void>> {
  const auth = await authUser();
  if (auth.error) return auth.error;
  if (typeof id !== 'string' || !id.trim()) return fail('VALIDATION_ERROR', '모집글 ID가 필요합니다.');
  try {
    const { data, error } = await supabase.from('recruitments').delete()
      .eq('id', id.trim()).select('id').maybeSingle();
    if (error) return responseFromError(error);
    return data ? ok(undefined) : fail('FORBIDDEN', '모집글이 없거나 삭제 권한이 없습니다.');
  } catch (error) {
    return responseFromError(error);
  }
}

/** Submit one application; the RPC locks the recruitment and the unique key blocks duplicates. */
export async function applyToRecruitment(
  recruitmentId: string,
  role: string,
  message: string,
): Promise<RecruitmentServiceResponse<Application>> {
  const auth = await authUser();
  if (auth.error) return auth.error;
  if (typeof recruitmentId !== 'string' || !recruitmentId.trim()
      || typeof role !== 'string' || !role.trim()
      || typeof message !== 'string' || !message.trim()) {
    return fail('VALIDATION_ERROR', '모집글, 희망 역할, 지원 동기를 입력해 주세요.');
  }
  try {
    const { data, error } = await supabase.rpc('bridge_apply_to_recruitment', {
      p_recruitment_id: recruitmentId.trim(),
      p_applied_role: role.trim(),
      p_message: message.trim(),
    });
    if (error) return responseFromError(error);
    const application = mapApplicationRow(Array.isArray(data) ? data[0] : data);
    return application ? ok(application) : fail('INVALID_RESPONSE', '지원 응답 형식이 올바르지 않습니다.');
  } catch (error) {
    return responseFromError(error);
  }
}

/** List applications; RLS returns only the caller's own applications or posts they authored. */
export async function getApplicationsForRecruitment(
  recruitmentId: string,
): Promise<RecruitmentServiceResponse<Application[]>> {
  const auth = await authUser();
  if (auth.error) return auth.error;
  if (typeof recruitmentId !== 'string' || !recruitmentId.trim()) {
    return fail('VALIDATION_ERROR', '모집글 ID가 필요합니다.');
  }
  try {
    const { data, error } = await supabase.from('applications').select(APPLICATION_COLUMNS)
      .eq('recruitment_id', recruitmentId.trim()).order('created_at', { ascending: true });
    if (error) return responseFromError(error);
    if (!Array.isArray(data)) return fail('INVALID_RESPONSE', '지원 목록 응답 형식이 올바르지 않습니다.');
    const applications = data.map(mapApplicationRow);
    if (applications.some((application) => application === null)) {
      return fail('INVALID_RESPONSE', '지원 데이터 형식이 올바르지 않습니다.');
    }
    return ok(applications as Application[]);
  } catch (error) {
    return responseFromError(error);
  }
}
/** 로그인한 사용자가 직접 지원한 모집글 목록을 조회합니다. */
export async function getMyRecruitmentApplications():
  Promise<RecruitmentServiceResponse<MyRecruitmentApplication[]>> {
  const auth = await authUser();
  if (auth.error) return auth.error;

  try {
    const { data, error } = await supabase
      .from('applications')
      .select(`
        id,
        recruitment_id,
        status,
        created_at,
        recruitment:recruitments!applications_recruitment_id_fkey (
          title,
          status
        )
      `)
      .eq('applicant_id', auth.user.id)
      .order('created_at', { ascending: false });

    if (error) return responseFromError(error);

    if (!Array.isArray(data)) {
      return fail('INVALID_RESPONSE', '지원 내역 응답 형식이 올바르지 않습니다.');
    }

    const applications: MyRecruitmentApplication[] = [];

    for (const row of data) {
      if (!isRecord(row)) {
        return fail('INVALID_RESPONSE', '지원 내역 데이터 형식이 올바르지 않습니다.');
      }

      const recruitment = row.recruitment;
      if (!isRecord(recruitment)) {
        return fail('INVALID_RESPONSE', '연결된 모집글 정보를 확인할 수 없습니다.');
      }

      const applicationId = stringField(row, 'id');
      const recruitmentId = stringField(row, 'recruitment_id');
      const applicationStatus = row.status;
      const appliedAt = stringField(row, 'created_at');
      const recruitmentTitle = stringField(recruitment, 'title');
      const recruitmentStatus = recruitment.status;

      if (
        !applicationId ||
        !recruitmentId ||
        !isOneOf(APPLICATION_STATUSES, applicationStatus) ||
        !validDate(appliedAt) ||
        !recruitmentTitle ||
        !isOneOf(RECRUITMENT_STATUSES, recruitmentStatus)
      ) {
        return fail('INVALID_RESPONSE', '지원 내역 데이터 형식이 올바르지 않습니다.');
      }

      applications.push({
        applicationId,
        recruitmentId,
        applicationStatus,
        appliedAt,
        recruitmentTitle,
        recruitmentStatus,
      });
    }

    return ok(applications);
  } catch (error) {
    return responseFromError(error);
  }
}
/** Only a recruitment author may accept/reject a pending application; the RPC updates capacity atomically. */
export async function updateApplicationStatus(
  applicationId: string,
  status: 'accepted' | 'rejected',
): Promise<RecruitmentServiceResponse<Application>> {
  const auth = await authUser();
  if (auth.error) return auth.error;
  if (typeof applicationId !== 'string' || !applicationId.trim()
      || (status !== 'accepted' && status !== 'rejected')) {
    return fail('VALIDATION_ERROR', '지원서 ID 또는 처리 상태를 확인해 주세요.');
  }
  try {
    const { data, error } = await supabase.rpc('bridge_update_application_status', {
      p_application_id: applicationId.trim(),
      p_status: status,
    });
    if (error) return responseFromError(error);
    const application = mapApplicationRow(Array.isArray(data) ? data[0] : data);
    return application ? ok(application) : fail('INVALID_RESPONSE', '지원 상태 응답 형식이 올바르지 않습니다.');
  } catch (error) {
    return responseFromError(error);
  }
}
