// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Outlet, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getRecruitmentHeadcount,
  isRecruitmentOpen,
  validateRecruitmentForm,
  type RecruitmentSource,
} from '../features/recruitments/recruitmentModel';
import { RecruitmentsPage } from './RecruitmentsPage';
import { RecruitmentDetailPage } from './RecruitmentDetailPage';
import { RecruitmentCreatePage } from './RecruitmentCreatePage';
import { RecruitmentEditPage } from './RecruitmentEditPage';
import { App } from '../App';
import { ProjectsPage } from './ProjectsPage';
import { getApplicationsForRecruitment, getMyRecruitmentApplications, getRecruitmentById, getRecruitments, type MyRecruitmentApplication } from '../services/recruitmentService';
import { getAcceptedApplicationContact } from '../services/recruitmentContactService';
import type { Application, Recruitment } from '../types';

const testAuth = vi.hoisted(() => ({
  user: { id: 'applicant-user-id' } as { id: string } | null,
}));

vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({
    user: testAuth.user,
    loading: false,
    isLoggedIn: Boolean(testAuth.user),
  }),
}));

vi.mock('../contexts/MyProfileContext', () => ({
  useMyProfile: () => ({
    userId: testAuth.user?.id || null,
    status: 'ready',
  }),
}));

vi.mock('../services/recruitmentService', () => ({
  getRecruitments: vi.fn(),
  getMyRecruitmentApplications: vi.fn(),
  getRecruitmentById: vi.fn(),
  getApplicationsForRecruitment: vi.fn(),
}));

vi.mock('../layouts/AppLayout', () => ({ AppLayout: Outlet }));
vi.mock('../contexts/MyProfileProvider', () => ({
  MyProfileProvider: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock('../services/recruitmentContactService', () => ({
  getAcceptedApplicationContact: vi.fn(),
}));

afterEach(() => {
  cleanup();
  vi.mocked(getAcceptedApplicationContact).mockReset();
  vi.unstubAllGlobals();
});

const mockRecruitment: Recruitment = {
  id: 'rec-test-1',
  title: '해커톤 프론트엔드/백엔드 모집',
  content: '함께 해커톤에 참여할 팀원을 구합니다.',
  targetMemberCount: 4, // 추가 모집 4명
  currentMemberCount: 1, // 확정 1명 (남은 3자리)
  roles: ['Frontend', 'Backend'],
  requiredTechStacks: ['React', 'TypeScript'],
  activityType: 'hybrid',
  expectedDuration: '2개월',
  status: 'recruiting',
  deadline: '2026-12-31T23:59:59+09:00',
  opportunityId: null,
  customOpportunityTitle: '2026 대학생 해커톤',
  customOpportunityUrl: 'https://example.com/hackathon',
  authorId: 'author-user-id',
  authorProfile: {
    name: '김팀장',
    nickname: '코드마스터',
  } as unknown as Recruitment['authorProfile'],
  createdAt: '2026-11-20T10:00:00+09:00',
  updatedAt: '2026-11-20T10:00:00+09:00',
};

const mockApplication: Application = {
  id: 'app-test-1',
  recruitmentId: 'rec-test-1',
  applicantId: 'applicant-user-id',
  appliedRole: 'Frontend',
  message: '열심히 참여하겠습니다!',
  status: 'pending',
  applicantProfile: {
    name: '이개발',
    nickname: '리액트러버',
  } as unknown as Application['applicantProfile'],
  createdAt: '2026-11-21T12:00:00+09:00',
  updatedAt: '2026-11-21T12:00:00+09:00',
};

function createMockSource(): RecruitmentSource {
  return {
    getRecruitments: vi.fn<RecruitmentSource['getRecruitments']>().mockResolvedValue([mockRecruitment]),
    getRecruitmentById: vi.fn<RecruitmentSource['getRecruitmentById']>().mockResolvedValue(mockRecruitment),
    createRecruitment: vi.fn<RecruitmentSource['createRecruitment']>().mockImplementation(async (payload) => ({
      ...payload,
      id: 'rec-created-id',
      currentMemberCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })),
    updateRecruitment: vi.fn<RecruitmentSource['updateRecruitment']>().mockImplementation(async (id, updates) => ({
      ...mockRecruitment,
      ...updates,
      id,
      updatedAt: new Date().toISOString(),
    })),
    deleteRecruitment: vi.fn<RecruitmentSource['deleteRecruitment']>().mockResolvedValue(undefined),
    applyToRecruitment: vi.fn<RecruitmentSource['applyToRecruitment']>().mockResolvedValue({
      id: 'app-new-id',
      recruitmentId: 'rec-test-1',
      applicantId: 'applicant-user-id',
      appliedRole: 'Frontend',
      message: '새 지원서입니다.',
      status: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }),
    getApplicationsForRecruitment: vi.fn<RecruitmentSource['getApplicationsForRecruitment']>().mockResolvedValue([mockApplication]),
    updateApplicationStatus: vi.fn<RecruitmentSource['updateApplicationStatus']>().mockImplementation(async (applicationId, status) => ({
      ...mockApplication,
      id: applicationId,
      status,
      updatedAt: new Date().toISOString(),
    })),
  };
}

describe('모집 인원 정책 및 헬퍼 함수', () => {
  it('작성자를 제외한 추가 모집 정원과 남은 자리를 정확히 계산한다', () => {
    // 추가 모집 정원 4명, 확정 1명 -> 남은 3자리, 총 팀 규모 2/5명
    const hc1 = getRecruitmentHeadcount({ targetMemberCount: 4, currentMemberCount: 1 });
    expect(hc1.target).toBe(4);
    expect(hc1.current).toBe(1);
    expect(hc1.remaining).toBe(3);
    expect(hc1.totalTeamCurrent).toBe(2);
    expect(hc1.totalTeamTarget).toBe(5);
    expect(hc1.isFull).toBe(false);

    // 최초 생성 상태: 추가 모집 정원 4명, 확정 0명 -> 남은 4자리, 총 팀 규모 1/5명
    const hc2 = getRecruitmentHeadcount({ targetMemberCount: 4, currentMemberCount: 0 });
    expect(hc2.current).toBe(0);
    expect(hc2.remaining).toBe(4);
    expect(hc2.totalTeamCurrent).toBe(1);
    expect(hc2.totalTeamTarget).toBe(5);
    expect(hc2.isFull).toBe(false);

    // 정원 충족 상태: 추가 모집 정원 4명, 확정 4명 -> 남은 0자리, 총 팀 규모 5/5명
    const hc3 = getRecruitmentHeadcount({ targetMemberCount: 4, currentMemberCount: 4 });
    expect(hc3.remaining).toBe(0);
    expect(hc3.totalTeamCurrent).toBe(5);
    expect(hc3.isFull).toBe(true);
  });

  it('모집 가능 상태를 마감일, 정원, 상태에 따라 판단한다', () => {
    expect(isRecruitmentOpen(mockRecruitment)).toBe(true);

    // 정원 만석
    expect(isRecruitmentOpen({ ...mockRecruitment, currentMemberCount: 4 })).toBe(false);

    // 모집 완료 상태
    expect(isRecruitmentOpen({ ...mockRecruitment, status: 'completed' })).toBe(false);

    // 마감일 경과
    expect(isRecruitmentOpen({ ...mockRecruitment, deadline: '2020-01-01T00:00:00+09:00' })).toBe(false);
  });

  it('모집글 입력 폼 유효성 검증이 비어있는 필수 항목을 감지한다', () => {
    const invalid = validateRecruitmentForm({
      title: '',
      content: '',
      targetMemberCount: 0,
      expectedDuration: '',
      roles: [],
      requiredTechStacks: [],
    });
    expect(invalid.isValid).toBe(false);
    expect(invalid.errors.title).toBeDefined();
    expect(invalid.errors.content).toBeDefined();
    expect(invalid.errors.targetMemberCount).toBeDefined();
    expect(invalid.errors.expectedDuration).toBeDefined();
    expect(invalid.errors.roles).toBeDefined();
    expect(invalid.errors.requiredTechStacks).toBeDefined();

    const valid = validateRecruitmentForm({
      title: '정상 제목',
      content: '정상 내용입니다.',
      targetMemberCount: 3,
      expectedDuration: '2개월',
      roles: ['Frontend'],
      requiredTechStacks: ['React'],
      activityType: 'hybrid',
      deadline: '2026-12-31',
    });
    expect(valid.isValid).toBe(true);
    expect(Object.keys(valid.errors).length).toBe(0);
  });
});

describe('RecruitmentsPage (모집 목록 화면)', () => {
  it('서비스 미연결 시 예시 데이터 대신 준비 상태를 표시한다', () => {
    render(
      <MemoryRouter>
        <RecruitmentsPage source={null} />
      </MemoryRouter>
    );
    expect(screen.getByText('팀원 모집 서비스 연결 준비 중')).toBeTruthy();
    expect(screen.queryByText(/UI 프로토타입 예시/)).toBeNull();
  });

  it('실제 서비스를 통해 모집글 목록과 추가 모집 인원을 렌더링한다', async () => {
    const source = createMockSource();
    render(
      <MemoryRouter>
        <RecruitmentsPage source={source} />
      </MemoryRouter>
    );

    expect(screen.getByText('모집글 목록을 불러오는 중입니다...')).toBeTruthy();

    await waitFor(() => {
      expect(screen.getByText('해커톤 프론트엔드/백엔드 모집')).toBeTruthy();
    });

    // 추가 모집 현황 표시 검증 (1/4명, 3자리 남음)
    expect(screen.getByText(/추가 모집 1\/4명/)).toBeTruthy();
    expect(screen.getByText(/3자리 남음/)).toBeTruthy();
    expect(screen.getByText('작성자:')).toBeTruthy();
    expect(screen.getByText('코드마스터')).toBeTruthy();
  });

  it('오류 발생 시 재시도 버튼을 제공한다', async () => {
    const source = createMockSource();
    (source.getRecruitments as any).mockRejectedValueOnce(new Error('Network error'));

    render(
      <MemoryRouter>
        <RecruitmentsPage source={source} />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('모집글을 불러오지 못했어요')).toBeTruthy();
    });

    fireEvent.click(screen.getByRole('button', { name: '다시 시도' }));
    await waitFor(() => {
      expect(screen.getByText('해커톤 프론트엔드/백엔드 모집')).toBeTruthy();
    });
  });
});

describe('RecruitmentDetailPage (모집 상세 및 지원 화면)', () => {
  it('서비스 미연결 시 준비 상태를 표시한다', () => {
    render(
      <MemoryRouter initialEntries={['/recruitments/rec-test-1']}>
        <Routes>
          <Route path="/recruitments/:id" element={<RecruitmentDetailPage source={null} />} />
        </Routes>
      </MemoryRouter>
    );
    expect(screen.getByText('팀원 모집 서비스 연결 준비 중')).toBeTruthy();
  });

  it('모집글 상세 정보 및 추가 모집 현황 메트릭스를 표시한다', async () => {
    testAuth.user = { id: 'other-user-id' };
    const source = createMockSource();
    (source.getApplicationsForRecruitment as any).mockResolvedValue([]);

    render(
      <MemoryRouter initialEntries={['/recruitments/rec-test-1']}>
        <Routes>
          <Route path="/recruitments/:id" element={<RecruitmentDetailPage source={source} />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: '해커톤 프론트엔드/백엔드 모집' })).toBeTruthy();
    });

    expect(screen.getByText('1명 확정 / 4명 정원')).toBeTruthy();
    expect(screen.getByText('(팀장 1명 포함 총 2/5명 규모)')).toBeTruthy();
    expect(screen.getByText('함께 해커톤에 참여할 팀원을 구합니다.')).toBeTruthy();
  });

  it('지원자가 역할을 선택하고 동기를 작성하여 지원서를 제출한다', async () => {
    testAuth.user = { id: 'new-applicant-id' };
    const source = createMockSource();
    (source.getApplicationsForRecruitment as any).mockResolvedValue([]);

    render(
      <MemoryRouter initialEntries={['/recruitments/rec-test-1']}>
        <Routes>
          <Route path="/recruitments/:id" element={<RecruitmentDetailPage source={source} />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('이 팀에 지원하시겠습니까?')).toBeTruthy();
    });

    const textarea = screen.getByPlaceholderText(/자신의 경험/);
    fireEvent.change(textarea, { target: { value: '열심히 개발하겠습니다.' } });

    const submitBtn = screen.getByRole('button', { name: '팀 가입 지원하기' });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(source.applyToRecruitment).toHaveBeenCalledWith(
        'rec-test-1',
        'Frontend',
        '열심히 개발하겠습니다.'
      );
    });
  });

  it('작성자는 지원자 목록을 확인하고 승인/거절할 수 있다', async () => {
    testAuth.user = { id: 'author-user-id' }; // 작성자 본인 계정
    const source = createMockSource();

    render(
      <MemoryRouter initialEntries={['/recruitments/rec-test-1']}>
        <Routes>
          <Route path="/recruitments/:id" element={<RecruitmentDetailPage source={source} />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/지원서 목록/)).toBeTruthy();
    });

    expect(screen.getByText('열심히 참여하겠습니다!')).toBeTruthy();
    const approveBtn = screen.getByRole('button', { name: /승인/ });
    fireEvent.click(approveBtn);

    await waitFor(() => {
      expect(source.updateApplicationStatus).toHaveBeenCalledWith('app-test-1', 'accepted');
    });
  });
});

describe('수락된 지원 연락처', () => {
  function loadContactPage(userId: string, applications: Application[]) {
    testAuth.user = { id: userId };
    const source = createMockSource();
    vi.mocked(source.getApplicationsForRecruitment).mockResolvedValue(applications);
    render(
      <MemoryRouter initialEntries={['/recruitments/rec-test-1']}>
        <Routes><Route path="/recruitments/:id" element={<RecruitmentDetailPage source={source} />} /></Routes>
      </MemoryRouter>
    );
  }

  it('지원자는 수락된 자신의 지원 건을 사용해 상대방 연락처를 조회하고 복사한다', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', Object.create(navigator, { clipboard: { value: { writeText } } }));
    vi.mocked(getAcceptedApplicationContact)
      .mockResolvedValueOnce('author-fixture')
      .mockResolvedValueOnce(null);
    loadContactPage(mockApplication.applicantId, [{ ...mockApplication, status: 'accepted' }]);

    const reveal = await screen.findByRole('button', { name: '연락처 확인' });
    expect(getAcceptedApplicationContact).not.toHaveBeenCalled();
    fireEvent.click(reveal);
    expect(await screen.findByText('카카오톡 ID author-fixture')).toBeTruthy();
    expect(getAcceptedApplicationContact).toHaveBeenCalledWith(mockApplication.id);
    fireEvent.click(screen.getByRole('button', { name: '카카오톡 ID 복사' }));
    await screen.findByText('카카오톡 ID를 복사했어요.');
    expect(writeText).toHaveBeenCalledWith('author-fixture');

    fireEvent.click(reveal);
    await screen.findByText(/두 사람 모두 카카오톡 ID/);
    expect(screen.queryByText('카카오톡 ID author-fixture')).toBeNull();
  });

  it('작성자는 수락된 지원의 연락처만 요청하고 미수락 지원은 기존 승인 UI를 유지한다', async () => {
    vi.mocked(getAcceptedApplicationContact).mockResolvedValue('applicant-fixture');
    loadContactPage(mockRecruitment.authorId, [
      mockApplication,
      { ...mockApplication, id: 'accepted-app', applicantId: 'other-applicant', status: 'accepted' },
      { ...mockApplication, id: 'rejected-app', applicantId: 'rejected-applicant', status: 'rejected' },
    ]);
    expect(await screen.findByRole('button', { name: '승인' })).toBeTruthy();
    const reveal = screen.getByRole('button', { name: '연락처 확인' });
    fireEvent.click(reveal);
    expect(await screen.findByText('카카오톡 ID applicant-fixture')).toBeTruthy();
    expect(getAcceptedApplicationContact).toHaveBeenCalledWith('accepted-app');
  });

  it('수락된 다른 지원자의 연락처 버튼은 표시하지 않는다', async () => {
    loadContactPage('unrelated-user', [{ ...mockApplication, status: 'accepted' }]);
    expect(await screen.findByText(mockRecruitment.content)).toBeTruthy();
    expect(screen.queryByRole('button', { name: '연락처 확인' })).toBeNull();
    expect(getAcceptedApplicationContact).not.toHaveBeenCalled();
  });
});

describe('RecruitmentCreatePage (모집글 작성 화면)', () => {
  it('기존 작성 주소는 실제 작성 폼에 연결한다', async () => {
    testAuth.user = { id: mockRecruitment.authorId };
    window.history.replaceState(null, '', '/recruitments/create');
    try {
      render(<App />);

      expect(await screen.findByRole('button', { name: '모집글 등록하기' })).toBeTruthy();
      expect(screen.getByPlaceholderText(/약 2개월/)).toBeTruthy();
    } finally {
      cleanup();
      window.history.replaceState(null, '', '/');
    }
  });

  it('서비스 미연결 시 준비 상태를 표시한다', () => {
    render(
      <MemoryRouter>
        <RecruitmentCreatePage source={null} />
      </MemoryRouter>
    );
    expect(screen.getByText('팀원 모집 서비스 연결 준비 중')).toBeTruthy();
  });

  it('추가 모집 인원 가이드를 제공하고 폼 등록을 처리한다', async () => {
    testAuth.user = { id: 'author-user-id' };
    const source = createMockSource();
    render(
      <MemoryRouter>
        <RecruitmentCreatePage source={source} />
      </MemoryRouter>
    );

    const duration = screen.getByPlaceholderText(/약 2개월/) as HTMLInputElement;
    const roles = screen.getByPlaceholderText(/Frontend, Backend/) as HTMLInputElement;
    const stacks = screen.getByPlaceholderText(/React, TypeScript, Node.js/) as HTMLInputElement;
    const count = screen.getByLabelText(/추가 모집 인원/) as HTMLInputElement;
    const activity = screen.getByLabelText(/활동 방식/) as HTMLSelectElement;
    const submitBtn = screen.getByRole('button', { name: '모집글 등록하기' });

    for (const field of [duration, roles, stacks, count, activity]) {
      expect(field.value).toBe('');
    }
    expect(screen.queryByText(/총 .* 규모/)).toBeNull();

    fireEvent.click(submitBtn);
    expect(screen.getByText('예상 활동 기간을 입력해 주세요.')).toBeTruthy();
    expect(screen.getByText('모집할 역할을 최소 1개 이상 지정해 주세요.')).toBeTruthy();
    expect(screen.getByText('필요 기술 스택을 최소 1개 이상 지정해 주세요.')).toBeTruthy();
    expect(screen.getByText('추가 모집 인원은 1명 이상의 정수여야 합니다.')).toBeTruthy();
    expect(screen.getByText('활동 방식을 선택해 주세요.')).toBeTruthy();
    expect(source.createRecruitment).not.toHaveBeenCalled();

    const titleInput = screen.getByPlaceholderText(/예: \[해커톤\]/);
    fireEvent.change(titleInput, { target: { value: '신규 프로젝트 팀원 모집' } });

    const contentInput = screen.getByPlaceholderText(/프로젝트의 목표/);
    fireEvent.change(contentInput, { target: { value: '방학 동안 사이드 프로젝트를 진행합니다.' } });

    fireEvent.change(duration, { target: { value: '3주' } });
    fireEvent.change(roles, { target: { value: 'Designer, QA' } });
    fireEvent.change(stacks, { target: { value: 'Figma, Playwright' } });
    fireEvent.change(activity, { target: { value: 'online' } });

    for (const value of ['0', '-1', '1.5', '2abc']) {
      fireEvent.change(count, { target: { value } });
      fireEvent.click(submitBtn);
      expect(screen.getByText('추가 모집 인원은 1명 이상의 정수여야 합니다.')).toBeTruthy();
      expect(source.createRecruitment).not.toHaveBeenCalled();
    }
    fireEvent.change(count, { target: { value: '21' } });
    fireEvent.click(submitBtn);
    expect(screen.getByText('추가 모집 인원은 최대 20명까지 입력할 수 있습니다.')).toBeTruthy();
    expect(source.createRecruitment).not.toHaveBeenCalled();

    fireEvent.change(count, { target: { value: '1' } });
    expect(screen.getByText('팀장 1명 + 추가 모집 1명 = 총 2명 규모')).toBeTruthy();
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(source.createRecruitment).toHaveBeenCalledWith(
        expect.objectContaining({
          title: '신규 프로젝트 팀원 모집',
          content: '방학 동안 사이드 프로젝트를 진행합니다.',
          targetMemberCount: 1,
          expectedDuration: '3주',
          roles: ['Designer', 'QA'],
          requiredTechStacks: ['Figma', 'Playwright'],
          activityType: 'online',
        })
      );
    });
  });
});

describe('RecruitmentEditPage (모집글 수정 화면)', () => {
  it('서비스 미연결 시 준비 상태를 표시한다', () => {
    render(
      <MemoryRouter initialEntries={['/recruitments/rec-test-1/edit']}>
        <Routes>
          <Route path="/recruitments/:id/edit" element={<RecruitmentEditPage source={null} />} />
        </Routes>
      </MemoryRouter>
    );
    expect(screen.getByText('팀원 모집 서비스 연결 준비 중')).toBeTruthy();
  });

  it('작성자가 아닌 경우 수정 권한 없음 안내를 표시한다', async () => {
    testAuth.user = { id: 'non-author-user-id' };
    const source = createMockSource();

    render(
      <MemoryRouter initialEntries={['/recruitments/rec-test-1/edit']}>
        <Routes>
          <Route path="/recruitments/:id/edit" element={<RecruitmentEditPage source={source} />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('수정 권한이 없습니다')).toBeTruthy();
    });
  });

  it('작성자에게 기존 값을 채워주고 수정을 처리한다', async () => {
    testAuth.user = { id: 'author-user-id' };
    const source = createMockSource();

    render(
      <MemoryRouter initialEntries={['/recruitments/rec-test-1/edit']}>
        <Routes>
          <Route path="/recruitments/:id/edit" element={<RecruitmentEditPage source={source} />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByDisplayValue('해커톤 프론트엔드/백엔드 모집')).toBeTruthy();
    });

    const titleInput = screen.getByDisplayValue('해커톤 프론트엔드/백엔드 모집');
    fireEvent.change(titleInput, { target: { value: '수정된 모집글 제목' } });

    const saveBtn = screen.getByRole('button', { name: '수정 사항 저장하기' });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(source.updateRecruitment).toHaveBeenCalledWith(
        'rec-test-1',
        expect.objectContaining({
          title: '수정된 모집글 제목',
          targetMemberCount: 4,
          expectedDuration: '2개월',
          requiredTechStacks: ['React', 'TypeScript'],
          activityType: 'hybrid',
        })
      );
    });
  });
});

describe('ProjectsPage (내 프로젝트)', () => {
  beforeEach(() => {
    vi.mocked(getMyRecruitmentApplications).mockReset();
    vi.mocked(getMyRecruitmentApplications).mockResolvedValue({ data: [], error: null });
  });

  afterEach(() => window.history.replaceState(null, '', '/'));

  it('내 프로젝트 헤더에서 모집글 작성 버튼을 표시하지 않는다', async () => {
    testAuth.user = { id: mockRecruitment.authorId };
    vi.mocked(getRecruitments).mockResolvedValueOnce({ data: [], error: null });
    window.history.replaceState(null, '', '/projects');
    render(<App />);

    await screen.findByText('아직 작성한 모집글이 없습니다');
    expect(screen.queryByRole('link', { name: '모집글 작성' })).toBeNull();
  });

  it('내 모집글 상세 링크로 실제 상세 라우트에 진입한다', async () => {
    testAuth.user = { id: mockRecruitment.authorId };
    vi.mocked(getRecruitments).mockResolvedValueOnce({ data: [mockRecruitment], error: null });
    vi.mocked(getRecruitmentById).mockResolvedValueOnce({ data: mockRecruitment, error: null });
    vi.mocked(getApplicationsForRecruitment).mockResolvedValueOnce({ data: [], error: null });
    window.history.replaceState(null, '', '/projects');
    render(<App />);

    fireEvent.click(await screen.findByRole('link', { name: '모집글 상세보기' }));

    expect(window.location.pathname).toBe('/recruitments/rec-test-1');
    expect(await screen.findByText(mockRecruitment.content)).toBeTruthy();
    expect(getRecruitmentById).toHaveBeenCalledWith('rec-test-1');
  });

  it('로딩과 오류 중에는 대시를 표시하고 재시도 성공 후 빈 목록에는 0개를 표시한다', async () => {
    testAuth.user = { id: mockRecruitment.authorId };
    vi.mocked(getRecruitments)
      .mockResolvedValueOnce({ data: null, error: { code: 'QUERY_FAILED', message: '조회 실패' } })
      .mockResolvedValueOnce({ data: [], error: null });

    render(
      <MemoryRouter>
        <ProjectsPage />
      </MemoryRouter>
    );

    expect(screen.getByText('모집글을 불러오는 중입니다.')).toBeTruthy();
    expect(screen.getByText('—')).toBeTruthy();

    expect(await screen.findByText('모집글을 불러오지 못했어요.')).toBeTruthy();
    expect(screen.getByText('—')).toBeTruthy();
    expect(screen.queryByText('0개')).toBeNull();
    expect(screen.queryByText('아직 작성한 모집글이 없습니다')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: '다시 시도' }));
    expect(screen.getByText('모집글을 불러오는 중입니다.')).toBeTruthy();
    expect(screen.getByText('—')).toBeTruthy();

    expect(await screen.findByText('아직 작성한 모집글이 없습니다')).toBeTruthy();
    expect(screen.getByText('0개')).toBeTruthy();
    expect(screen.queryByText('—')).toBeNull();
  });

  it('본인이 작성한 모집글만 표시하고 빈 지원 내역을 안내한다', async () => {
    testAuth.user = { id: mockRecruitment.authorId };
    vi.mocked(getRecruitments).mockResolvedValueOnce({
      data: [
        mockRecruitment,
        { ...mockRecruitment, id: 'other-post', authorId: 'other-user', title: '다른 학생의 모집글' },
      ],
      error: null,
    });

    render(
      <MemoryRouter>
        <ProjectsPage />
      </MemoryRouter>
    );

    expect(await screen.findByText(mockRecruitment.title)).toBeTruthy();
    expect(screen.getByText('1개')).toBeTruthy();
    expect(screen.queryByText('다른 학생의 모집글')).toBeNull();
    expect(screen.getByText('아직 지원한 모집글이 없습니다.')).toBeTruthy();
  });

  it('지원 내역의 모집 상태·지원 상태·지원일을 표시하고 상세 화면으로 이동한다', async () => {
    testAuth.user = { id: 'applicant-user-id' };
    const statuses = ['pending', 'accepted', 'rejected', 'cancelled'] as const;
    const applications: MyRecruitmentApplication[] = statuses.map((status, index) => ({
      applicationId: `app-${status}`,
      recruitmentId: index === 0 ? mockRecruitment.id : `rec-${status}`,
      applicationStatus: status,
      appliedAt: '2026-11-23T16:00:00.000Z',
      recruitmentTitle: `지원한 모집글 ${index + 1}`,
      recruitmentStatus: index === 0 ? 'recruiting' : index === 1 ? 'completed' : 'cancelled',
    }));
    vi.mocked(getMyRecruitmentApplications).mockResolvedValueOnce({ data: applications, error: null });
    vi.mocked(getRecruitments).mockResolvedValueOnce({ data: [], error: null });
    vi.mocked(getRecruitmentById).mockResolvedValueOnce({ data: mockRecruitment, error: null });
    vi.mocked(getApplicationsForRecruitment).mockResolvedValueOnce({ data: [], error: null });
    window.history.replaceState(null, '', '/projects');
    render(<App />);

    expect(screen.getByText('지원 내역을 불러오는 중입니다.')).toBeTruthy();
    const firstLink = await screen.findByRole('link', { name: /지원한 모집글 1/ });
    const applicationLabels = ['검토 중', '수락됨', '거절됨', '취소됨'];
    const recruitmentLabels = ['모집중', '모집완료', '모집취소', '모집취소'];
    for (const [index, application] of applications.entries()) {
      const link = screen.getByRole('link', { name: new RegExp(application.recruitmentTitle) });
      expect(within(link).getByText(`지원 상태 · ${applicationLabels[index]}`)).toBeTruthy();
      expect(within(link).getByText(`모집 상태 · ${recruitmentLabels[index]}`)).toBeTruthy();
      expect(within(link).getByText('지원일 2026. 11. 24.').getAttribute('datetime')).toBe(application.appliedAt);
    }

    fireEvent.click(firstLink);
    expect(window.location.pathname).toBe(`/recruitments/${mockRecruitment.id}`);
    expect(await screen.findByText(mockRecruitment.content)).toBeTruthy();
  });

  it('지원 내역 DB 조회가 실패하면 오류를 표시하고 작성 목록을 유지한다', async () => {
    testAuth.user = { id: mockRecruitment.authorId };
    vi.mocked(getMyRecruitmentApplications).mockResolvedValueOnce({
      data: null,
      error: { code: 'DATABASE_ERROR', message: 'applications relation missing' },
    });
    vi.mocked(getRecruitments).mockResolvedValueOnce({ data: [mockRecruitment], error: null });

    render(<MemoryRouter><ProjectsPage /></MemoryRouter>);

    expect((await screen.findByRole('alert')).textContent).toBe('지원 내역을 불러오지 못했어요.');
    expect(screen.queryByText('아직 지원한 모집글이 없습니다.')).toBeNull();
    expect(await screen.findByText(mockRecruitment.title)).toBeTruthy();
  });
});
