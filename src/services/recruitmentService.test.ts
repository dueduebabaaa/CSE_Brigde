import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  from: vi.fn(),
  rpc: vi.fn(),
  insert: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  select: vi.fn(),
  eq: vi.fn(),
  or: vi.fn(),
  order: vi.fn(),
  single: vi.fn(),
  maybeSingle: vi.fn(),
  result: { data: [] as unknown[] | null, error: null as unknown },
}));

vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: { getUser: mocks.getUser },
    from: mocks.from,
    rpc: mocks.rpc,
  },
}));

import {
  applyToRecruitment,
  createRecruitment,
  deleteRecruitment,
  getApplicationsForRecruitment,
  getRecruitmentById,
  getRecruitments,
  mapApplicationRow,
  mapRecruitmentRow,
  updateApplicationStatus,
  updateRecruitment,
} from './recruitmentService';

const recruitmentRow = {
  id: 'rec-1',
  opportunity_id: null,
  custom_opportunity_title: '외부 해커톤',
  custom_opportunity_url: 'https://example.com/event',
  title: '프론트엔드 모집',
  content: '함께 만들 팀원을 찾습니다.',
  target_member_count: 4,
  current_member_count: 1,
  roles: ['Frontend'],
  required_tech_stacks: ['React'],
  deadline: '2027-01-01T00:00:00Z',
  expected_duration: '2개월',
  activity_type: 'hybrid',
  status: 'recruiting',
  author_id: 'owner-1',
  created_at: '2026-11-19T00:00:00Z',
  updated_at: '2026-11-19T00:00:00Z',
};

const applicationRow = {
  id: 'app-1',
  recruitment_id: 'rec-1',
  applicant_id: 'applicant-1',
  applied_role: 'Frontend',
  message: '지원합니다.',
  status: 'pending',
  created_at: '2026-11-19T00:00:00Z',
  updated_at: '2026-11-19T00:00:00Z',
};

const query = {
  insert: mocks.insert,
  update: mocks.update,
  delete: mocks.delete,
  select: mocks.select,
  eq: mocks.eq,
  or: mocks.or,
  order: mocks.order,
  single: mocks.single,
  maybeSingle: mocks.maybeSingle,
  then(resolve: (value: unknown) => unknown, reject?: (reason: unknown) => unknown) {
    return Promise.resolve(mocks.result).then(resolve, reject);
  },
};

const signedInUser = {
  id: 'owner-1',
  email: 'owner@knu.ac.kr',
  email_confirmed_at: '2026-01-01T00:00:00Z',
};

const createInput = {
  opportunityId: null,
  customOpportunityTitle: '외부 해커톤',
  customOpportunityUrl: 'https://example.com/event',
  title: '프론트엔드 모집',
  content: '함께 만들 팀원을 찾습니다.',
  targetMemberCount: 4,
  roles: ['Frontend'],
  requiredTechStacks: ['React'],
  deadline: '2027-01-01T00:00:00Z',
  expectedDuration: '2개월',
  activityType: 'hybrid' as const,
  status: 'recruiting' as const,
  authorId: 'spoofed-user',
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getUser.mockResolvedValue({ data: { user: signedInUser }, error: null });
  mocks.result = { data: [recruitmentRow], error: null };
  mocks.from.mockReturnValue(query);
  mocks.rpc.mockResolvedValue({ data: applicationRow, error: null });
  for (const method of [mocks.insert, mocks.update, mocks.delete, mocks.select, mocks.eq,
    mocks.or, mocks.order]) method.mockReturnValue(query);
  mocks.single.mockResolvedValue({ data: recruitmentRow, error: null });
  mocks.maybeSingle.mockResolvedValue({ data: recruitmentRow, error: null });
});

describe('recruitment row mappers', () => {
  it('maps recruitment fields to the shared camelCase type', () => {
    expect(mapRecruitmentRow(recruitmentRow)).toMatchObject({
      id: 'rec-1',
      opportunityId: null,
      customOpportunityTitle: '외부 해커톤',
      targetMemberCount: 4,
      currentMemberCount: 1,
      activityType: 'hybrid',
      authorId: 'owner-1',
    });
  });

  it('rejects malformed recruitment and application rows', () => {
    expect(mapRecruitmentRow({ ...recruitmentRow, target_member_count: '4' })).toBeNull();
    expect(mapApplicationRow({ ...applicationRow, status: 'unknown' })).toBeNull();
  });

  it('maps application data without embedding a profile or email', () => {
    const mapped = mapApplicationRow({ ...applicationRow, email: 'private@knu.ac.kr' });
    expect(mapped).toMatchObject({ applicantId: 'applicant-1', status: 'pending' });
    expect(mapped).not.toHaveProperty('email');
    expect(mapped).not.toHaveProperty('applicantProfile');
  });
});

describe('recruitment CRUD', () => {
  it('lists and filters recruitment posts', async () => {
    const result = await getRecruitments({ status: 'recruiting', search: 'React', opportunityId: 'opp-1' });
    expect(result.error).toBeNull();
    expect(result.data?.[0].id).toBe('rec-1');
    expect(mocks.from).toHaveBeenCalledWith('recruitments');
    expect(mocks.eq).toHaveBeenCalledWith('status', 'recruiting');
    expect(mocks.eq).toHaveBeenCalledWith('opportunity_id', 'opp-1');
    expect(mocks.or).toHaveBeenCalledWith('title.ilike.%React%,content.ilike.%React%');
  });

  it('returns one recruitment or NOT_FOUND', async () => {
    mocks.maybeSingle.mockResolvedValueOnce({ data: null, error: null });
    const result = await getRecruitmentById('missing');
    expect(result.error?.code).toBe('NOT_FOUND');
    expect(mocks.eq).toHaveBeenCalledWith('id', 'missing');
  });

  it('creates a post with the authenticated owner instead of the supplied authorId', async () => {
    mocks.single.mockResolvedValueOnce({ data: recruitmentRow, error: null });
    const result = await createRecruitment(createInput);
    expect(result.data?.authorId).toBe('owner-1');
    expect(mocks.insert).toHaveBeenCalledWith(expect.objectContaining({
      author_id: 'owner-1',
      target_member_count: 4,
      roles: ['Frontend'],
    }));
    expect(mocks.insert.mock.calls[0][0]).not.toHaveProperty('current_member_count');
  });

  it('rejects invalid payloads before making a database write', async () => {
    const result = await createRecruitment({ ...createInput, targetMemberCount: 0 });
    expect(result.error?.code).toBe('VALIDATION_ERROR');
    expect(mocks.insert).not.toHaveBeenCalled();
  });

  it('updates only editable fields and includes a fresh updated_at', async () => {
    mocks.maybeSingle.mockResolvedValueOnce({ data: { ...recruitmentRow, title: '새 제목' }, error: null });
    const result = await updateRecruitment('rec-1', { title: '새 제목' });
    expect(result.data?.title).toBe('새 제목');
    expect(mocks.update).toHaveBeenCalledWith({ title: '새 제목', updated_at: expect.any(String) });
    expect(mocks.eq).toHaveBeenCalledWith('id', 'rec-1');
  });

  it('blocks attempts to modify owner or server-maintained member count', async () => {
    const result = await updateRecruitment('rec-1', { currentMemberCount: 99 } as never);
    expect(result.error?.code).toBe('FORBIDDEN');
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it('deletes through the owner-scoped table policy', async () => {
    mocks.maybeSingle.mockResolvedValueOnce({ data: { id: 'rec-1' }, error: null });
    const result = await deleteRecruitment('rec-1');
    expect(result).toEqual({ data: undefined, error: null });
    expect(mocks.delete).toHaveBeenCalledOnce();
  });

  it('maps an RLS denial to FORBIDDEN', async () => {
    mocks.maybeSingle.mockResolvedValueOnce({ data: null, error: { code: '42501', message: 'denied' } });
    const result = await updateRecruitment('rec-1', { title: '다른 사람 글' });
    expect(result.error?.code).toBe('FORBIDDEN');
  });
});

describe('applications', () => {
  it('submits an application through the atomic RPC', async () => {
    const result = await applyToRecruitment('rec-1', 'Frontend', '지원합니다.');
    expect(result.data?.id).toBe('app-1');
    expect(mocks.rpc).toHaveBeenCalledWith('bridge_apply_to_recruitment', {
      p_recruitment_id: 'rec-1',
      p_applied_role: 'Frontend',
      p_message: '지원합니다.',
    });
  });

  it('maps duplicate and full recruitment responses to stable error codes', async () => {
    mocks.rpc.mockResolvedValueOnce({ data: null, error: { code: 'P0001', message: 'DUPLICATE_APPLICATION' } });
    expect((await applyToRecruitment('rec-1', 'Frontend', '지원')).error?.code).toBe('CONFLICT_DUPLICATE');
    mocks.rpc.mockResolvedValueOnce({ data: null, error: { code: 'P0001', message: 'RECRUITMENT_FULL' } });
    expect((await applyToRecruitment('rec-1', 'Frontend', '지원')).error?.code).toBe('RECRUITMENT_FULL');
  });

  it('lists only application fields; database RLS controls applicant/author visibility', async () => {
    mocks.result = { data: [applicationRow], error: null };
    const result = await getApplicationsForRecruitment('rec-1');
    expect(result.data?.[0].applicantId).toBe('applicant-1');
    expect(mocks.from).toHaveBeenCalledWith('applications');
    expect(mocks.eq).toHaveBeenCalledWith('recruitment_id', 'rec-1');
    expect(mocks.select.mock.calls.at(-1)?.[0]).not.toContain('email');
  });

  it('accepts or rejects by RPC and maps the returned application', async () => {
    mocks.rpc.mockResolvedValueOnce({ data: { ...applicationRow, status: 'accepted' }, error: null });
    const result = await updateApplicationStatus('app-1', 'accepted');
    expect(result.data?.status).toBe('accepted');
    expect(mocks.rpc).toHaveBeenCalledWith('bridge_update_application_status', {
      p_application_id: 'app-1',
      p_status: 'accepted',
    });
  });

  it('requires an authenticated, verified KNU account', async () => {
    mocks.getUser.mockResolvedValueOnce({ data: { user: null }, error: null });
    expect((await getRecruitments()).error?.code).toBe('UNAUTHENTICATED');
    mocks.getUser.mockResolvedValueOnce({ data: { user: { ...signedInUser, email: 'other@example.com' } }, error: null });
    expect((await getRecruitments()).error?.code).toBe('INVALID_EMAIL_DOMAIN');
    mocks.getUser.mockResolvedValueOnce({ data: { user: { ...signedInUser, email_confirmed_at: null } }, error: null });
    expect((await getRecruitments()).error?.code).toBe('EMAIL_NOT_VERIFIED');
    expect(mocks.from).not.toHaveBeenCalled();
  });
});
