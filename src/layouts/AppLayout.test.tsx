// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

const appMocks = vi.hoisted(() => ({
  user: null as null | { id: string; email: string; user_metadata: Record<string, unknown>; app_metadata: Record<string, unknown> },
  fetchMyProfile: vi.fn(),
}));

vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({
    user: appMocks.user,
    loading: false,
    isLoggedIn: Boolean(appMocks.user),
    authStatus: appMocks.user ? 'authenticated' : 'signed_out',
  }),
}));

vi.mock('../lib/supabase', () => ({ supabase: { auth: { signOut: vi.fn() } } }));
vi.mock('../services/profileService', () => ({
  fetchMyProfile: appMocks.fetchMyProfile,
  isProfileComplete: (profile: { complete?: boolean } | null) => profile?.complete === true,
}));

import { AppLayout } from './AppLayout';

function renderRoutes(initialEntry: string) {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<p>HOME_BODY</p>} />
          <Route path="/login" element={<p>LOGIN_BODY</p>} />
          <Route path="/onboarding" element={<p>ONBOARDING_BODY</p>} />
          <Route path="/admin/opportunities" element={<p>ADMIN_BODY</p>} />
        </Route>
      </Routes>
    </MemoryRouter>
  );
}

beforeEach(() => {
  appMocks.user = { id: 'u1', email: 'student@knu.ac.kr', user_metadata: {}, app_metadata: {} };
  appMocks.fetchMyProfile.mockResolvedValue(null);
});
afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe('AppLayout 인증 및 회원 분기', () => {
  it('미로그인 사용자는 내부 경로 대신 로그인으로 이동한다', async () => {
    appMocks.user = null;
    renderRoutes('/');
    expect(await screen.findByText('LOGIN_BODY')).not.toBeNull();
    expect(appMocks.fetchMyProfile).not.toHaveBeenCalled();
  });

  it('신규 또는 미완료 회원에게 독립 온보딩 화면을 표시한다', async () => {
    appMocks.fetchMyProfile.mockResolvedValueOnce(null);
    renderRoutes('/');
    expect(await screen.findByText('ONBOARDING_BODY')).not.toBeNull();
    expect(screen.queryByRole('navigation')).toBeNull();
  });

  it('완료 회원이 온보딩 경로에 오면 홈으로 보낸다', async () => {
    appMocks.fetchMyProfile.mockResolvedValueOnce({ complete: true });
    renderRoutes('/onboarding');
    expect(await screen.findByText('HOME_BODY')).not.toBeNull();
  });

  it('프로필 조회 실패를 신규 회원으로 처리하지 않는다', async () => {
    appMocks.fetchMyProfile.mockRejectedValueOnce(new Error('read failed'));
    renderRoutes('/');
    await waitFor(() => expect(screen.queryByText('프로필 상태를 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.')).not.toBeNull());
    expect(screen.queryByText('ONBOARDING_BODY')).toBeNull();
  });

  it('관리자 화면 경로를 일반 사용자에게 허용하지 않는다', async () => {
    appMocks.fetchMyProfile.mockResolvedValueOnce({ complete: true });
    renderRoutes('/admin/opportunities');
    expect(await screen.findByText('HOME_BODY')).not.toBeNull();
    expect(screen.queryByText('ADMIN_BODY')).toBeNull();
  });
});
