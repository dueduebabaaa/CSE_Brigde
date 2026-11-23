// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useParams } from 'react-router-dom';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { getMyRecruitmentApplications, getRecruitments, type MyRecruitmentApplication } from '../services/recruitmentService';
import { ProjectsPage } from './ProjectsPage';

vi.mock('../contexts/MyProfileContext', () => ({
  useMyProfile: () => ({ userId: 'me', status: 'ready' }),
}));
vi.mock('../services/recruitmentService', () => ({
  getMyRecruitmentApplications: vi.fn(),
  getRecruitments: vi.fn(),
}));

const application = (id: string, applicationStatus: MyRecruitmentApplication['applicationStatus']): MyRecruitmentApplication => ({
  applicationId: id,
  recruitmentId: 'rec-' + id,
  recruitmentTitle: '모집글 ' + id,
  recruitmentStatus: 'completed',
  appliedAt: '2026-11-24T00:00:00Z',
  applicationStatus,
});

function renderProjects() {
  render(<MemoryRouter initialEntries={['/projects']}><Routes>
    <Route path="/projects" element={<ProjectsPage />} />
    <Route path="/recruitments/:id" element={<RecruitmentRoute />} />
  </Routes></MemoryRouter>);
  return within(screen.getByRole('region', { name: '참여 확정된 프로젝트' }));
}

function RecruitmentRoute() {
  const { id } = useParams();
  return <h1>상세 {id}</h1>;
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(getRecruitments).mockResolvedValue({ data: [], error: null });
});
afterEach(cleanup);

it('수락된 지원 한 건을 표시하고 모집글 상세로 이동한다', async () => {
  vi.mocked(getMyRecruitmentApplications).mockResolvedValue({
    data: [application('one', 'accepted'), application('waiting', 'pending')], error: null,
  });
  const projects = renderProjects();
  expect(projects.getByRole('status')).toBeTruthy();
  const link = await projects.findByRole('link', { name: '모집글 one 모집글 상세보기' });
  expect(projects.getAllByRole('listitem')).toHaveLength(1);
  expect(projects.queryByText('모집글 waiting')).toBeNull();
  expect(screen.getByText('모집글 waiting')).toBeTruthy();
  expect(screen.getByText(/지원 상태 · 수락됨/)).toBeTruthy();
  expect(getMyRecruitmentApplications).toHaveBeenCalledOnce();
  fireEvent.click(link);
  expect(screen.getByRole('heading', { name: '상세 rec-one' })).toBeTruthy();
});

it('수락된 여러 건을 모두 표시한다', async () => {
  vi.mocked(getMyRecruitmentApplications).mockResolvedValue({
    data: [application('one', 'accepted'), application('two', 'accepted'), application('no', 'rejected')], error: null,
  });
  const projects = renderProjects();
  await projects.findByRole('link', { name: '모집글 two 모집글 상세보기' });
  expect(projects.getAllByRole('listitem')).toHaveLength(2);
  expect(projects.queryByText('모집글 no')).toBeNull();
});

it.each([
  ['대기만', [application('waiting', 'pending')]],
  ['거절만', [application('no', 'rejected')]],
  ['지원 없음', []],
] as const)('%s 있는 경우 빈 상태를 표시한다', async (_label, rows) => {
  vi.mocked(getMyRecruitmentApplications).mockResolvedValue({ data: [...rows], error: null });
  const projects = renderProjects();
  expect(await projects.findByText('아직 지원이 수락된 모집글이 없습니다.')).toBeTruthy();
  expect(projects.queryByRole('link')).toBeNull();
});

it('지원 내역 조회 오류를 빈 상태와 구분한다', async () => {
  vi.mocked(getMyRecruitmentApplications).mockResolvedValue({
    data: null, error: { code: 'UNKNOWN_ERROR', message: 'offline' },
  });
  const projects = renderProjects();
  expect((await projects.findByRole('alert')).textContent).toBe('참여 내역을 불러오지 못했어요.');
  expect(projects.queryByText('아직 지원이 수락된 모집글이 없습니다.')).toBeNull();
  expect(screen.getByRole('heading', { name: '내가 만든 모집글' })).toBeTruthy();
});
