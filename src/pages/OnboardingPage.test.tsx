// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { OnboardingPage } from './OnboardingPage';

const profileMocks = vi.hoisted(() => ({
  fetchMyProfile: vi.fn(),
  saveMyProfile: vi.fn(),
  user: { id: 'test-user', email: 'student@knu.ac.kr', email_confirmed_at: '2026-01-01T00:00:00Z', user_metadata: {} as Record<string, string> },
}));

vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({
    user: profileMocks.user,
    loading: false,
  }),
}));

vi.mock('../services/profileService', () => ({
  fetchMyProfile: profileMocks.fetchMyProfile,
  saveMyProfile: profileMocks.saveMyProfile,
}));

const click = (name: string) => fireEvent.click(screen.getByRole('button', { name }));
const change = (element: HTMLElement, value: string) => fireEvent.change(element, { target: { value } });
async function start() {
  render(<MemoryRouter><OnboardingPage /></MemoryRouter>);
  await waitFor(() => expect(profileMocks.fetchMyProfile).toHaveBeenCalled());
  await waitFor(() => expect(screen.getByPlaceholderText('홍길동').closest('fieldset')?.hasAttribute('disabled')).toBe(false));
  change(screen.getByPlaceholderText('홍길동'), '테스트');
  fireEvent.click(screen.getByText('1학년', { selector: 'button' }));
  click('플랫폼소프트웨어전공');
  click('다음');
}
async function reachTech() {
  await start();
  click('웹 개발');
  click('Frontend 웹 사용자 인터페이스 개발');
  click('다음');
}
async function openConfirmation() {
  await start();
  click('웹 개발');
  click('Frontend 웹 사용자 인터페이스 개발');
  click('다음');
  fireEvent.click(screen.getByText('🌱 아직 보유 기술 스택이 없어요 (초급자 환영)'));
  click('다음');
  click('나중에 설정하기');
  click('BRIDGE 회원에게 공개 인증된 BRIDGE 회원만 열람 가능');
  click('BRIDGE 시작하기');
  expect(screen.queryByText('프로필 입력 확인')).not.toBeNull();
}

beforeEach(() => {
  vi.stubGlobal('scrollTo', vi.fn());
  profileMocks.user.user_metadata = {};
  profileMocks.fetchMyProfile.mockReset();
  profileMocks.saveMyProfile.mockReset();
  profileMocks.fetchMyProfile.mockResolvedValue(null);
  profileMocks.saveMyProfile.mockResolvedValue({ id: 'test-user' });
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe('온보딩 입력과 단계 검증', () => {
  it('Google 이미지 로딩 실패 시 이름 첫 글자와 선택 테마로 대체한다', async () => {
    profileMocks.user.user_metadata = { avatar_url: 'https://example.test/photo.jpg', full_name: '김학생' };
    render(<MemoryRouter><OnboardingPage /></MemoryRouter>);
    const image = screen.getByRole('img', { name: '김학생' });
    expect(image.getAttribute('src')).toBe('https://example.test/photo.jpg');
    expect(image.getAttribute('referrerpolicy')).toBe('no-referrer');
    expect(image.getAttribute('alt')).toBe('');
    fireEvent.error(image);
    expect(screen.queryByRole('img', { name: '김학생' })).toBeNull();
    const fallback = screen.getByLabelText('기본 프로필 아바타');
    expect(fallback.textContent).toBe('김');
    expect(fallback.className).toContain('bg-[#7D39EB]');
    const colorButton = Array.from(document.querySelectorAll('button')).find(button => button.classList.contains('bg-blue-600'))!;
    fireEvent.click(colorButton);
    expect(fallback.className).toContain('bg-blue-600');
    change(screen.getByPlaceholderText('홍길동'), '박학생');
    expect(fallback.textContent).toBe('박');
  });
  it('Google 이미지 URL이 공백이면 이미지 요청 없이 기본 아바타를 표시한다', async () => {
    profileMocks.user.user_metadata = { avatar_url: '   ', full_name: '이학생' };
    render(<MemoryRouter><OnboardingPage /></MemoryRouter>);
    expect(screen.queryByRole('img')).toBeNull();
    expect(screen.getByLabelText('기본 프로필 아바타').textContent).toBe('이');
  });
  it('프로필 조회가 실패하면 신규 회원 취급하지 않고 입력을 잠근다', async () => {
    profileMocks.fetchMyProfile.mockRejectedValueOnce(new Error('read failed'));
    render(<MemoryRouter><OnboardingPage /></MemoryRouter>);
    expect(await screen.findByText('기존 프로필을 불러오지 못했습니다. 새로고침 후 다시 시도해 주세요.')).not.toBeNull();
    expect(screen.getByPlaceholderText('홍길동').closest('fieldset')?.hasAttribute('disabled')).toBe(true);
  });

  it('빈 관심사와 기타 입력을 검증하고 이전 단계에서도 직접 입력을 유지한다', async () => {
    await start();
    click('다음');
    expect(screen.queryByText('관심 분야를 최소 1개 이상 선택해 주세요.')).not.toBeNull();
    click('기타');
    click('Frontend 웹 사용자 인터페이스 개발');
    click('다음');
    expect(screen.queryByText('기타로 선택한 항목을 직접 입력해 주세요.')).not.toBeNull();
    change(screen.getByLabelText('기타 관심 분야 (필수)'), '컴퓨터 그래픽스');
    click('기타');
    click('기타');
    expect((screen.getByLabelText('기타 관심 분야 (필수)') as HTMLInputElement).value).toBe('컴퓨터 그래픽스');
    click('다음');
    click('이전');
    expect((screen.getByLabelText('기타 관심 분야 (필수)') as HTMLInputElement).value).toBe('컴퓨터 그래픽스');
  });

  it('기술 필수 입력과 대소문자 중복을 차단하며 숙련도는 자동 지정하지 않는다', async () => {
    await reachTech();
    expect(screen.queryByRole('button', { name: '나중에 설정하기' })).toBeNull();
    click('다음');
    expect(screen.queryByText("보유 기술 스택을 선택하거나, '아직 보유 기술 없음'을 선택해 주세요.")).not.toBeNull();
    change(screen.getByLabelText('보유 기술 검색 또는 직접 추가'), ' react ');
    click('직접 추가');
    change(screen.getByLabelText('보유 기술 검색 또는 직접 추가'), 'REACT');
    click('직접 추가');
    expect(screen.queryByText('이미 선택한 기술입니다.')).not.toBeNull();
    expect(screen.getAllByRole('button', { name: 'React 삭제' })).toHaveLength(1);
    expect(screen.getByRole('button', { name: '활용 가능' }).className).toContain('bg-transparent');
    fireEvent.click(screen.getByText('🌱 아직 보유 기술 스택이 없어요 (초급자 환영)'));
    expect(screen.queryByRole('button', { name: 'React 삭제' })).toBeNull();
    click('다음');
    expect(screen.queryByRole('button', { name: '나중에 설정하기' })).not.toBeNull();
  });

  it('공개 범위와 URL을 검증하고 저장 전 확인 모달을 표시한다', async () => {
    await reachTech();
    click('React');
    click('다음');
    change(screen.getByLabelText('배우고 싶은 기술 검색 또는 직접 추가'), 'Rust');
    click('직접 추가');
    click('나중에 설정하기');
    click('BRIDGE 시작하기');
    expect(screen.queryByText('프로필 공개 범위를 선택해 주세요.')).not.toBeNull();
    click('BRIDGE 회원에게 공개 인증된 BRIDGE 회원만 열람 가능');
    change(screen.getByPlaceholderText('https://github.com/username'), 'javascript:alert(1)');
    click('BRIDGE 시작하기');
    expect(screen.queryByText(/GitHub URL을 확인/)).not.toBeNull();
    change(screen.getByPlaceholderText('https://github.com/username'), 'https://github.com/bridge');
    change(screen.getByPlaceholderText('https://my-portfolio.com'), 'invalid');
    click('BRIDGE 시작하기');
    expect(screen.queryByText(/포트폴리오 URL을 확인/)).not.toBeNull();
    change(screen.getByPlaceholderText('https://my-portfolio.com'), 'https://example.com');
    click('BRIDGE 시작하기');
    expect(screen.queryByText('프로필 입력 확인')).not.toBeNull();
    expect(screen.queryByText(/저장 후 BRIDGE를 시작합니다/)).not.toBeNull();
    expect(screen.getByRole('button', { name: '프로필 저장 후 BRIDGE 시작하기' })).not.toBeNull();
    click('입력 내용 계속 수정하기');
    click('이전');
    expect(within(screen.getByLabelText('배우고 싶은 기술 선택 목록')).queryByRole('button', { name: 'Rust 삭제' })).not.toBeNull();
  });

  it('저장 실패 시 완료 처리하지 않고 저장 오류를 표시한다', async () => {
    profileMocks.saveMyProfile.mockRejectedValueOnce(new Error('write failed'));
    await openConfirmation();
    const saveButton = screen.getByRole('button', { name: '프로필 저장 후 BRIDGE 시작하기' }) as HTMLButtonElement;
    expect(saveButton.disabled).toBe(false);
    fireEvent.click(saveButton);
    await waitFor(() => expect(profileMocks.saveMyProfile).toHaveBeenCalled());
    expect((await screen.findByRole('alert')).textContent).toContain('write failed');
    expect(profileMocks.saveMyProfile).toHaveBeenCalledWith(expect.objectContaining({
      tech_stacks: [],
      tech_proficiency: {},
      activity_mode: null,
      activity_duration: null,
      availability_status: null,
      is_public: true,
      visibility: 'public',
    }));
  });

  it('저장 성공 후에만 공유 프로필 상태 갱신 이벤트를 보낸다', async () => {
    const onProfileUpdated = vi.fn();
    window.addEventListener('bridge-profile-updated', onProfileUpdated);
    await openConfirmation();
    fireEvent.click(screen.getByRole('button', { name: '프로필 저장 후 BRIDGE 시작하기' }));
    await waitFor(() => expect(onProfileUpdated).toHaveBeenCalledTimes(1));
    window.removeEventListener('bridge-profile-updated', onProfileUpdated);
  });
});
