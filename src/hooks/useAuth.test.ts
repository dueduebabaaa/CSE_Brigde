// @vitest-environment jsdom
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const authMocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  onAuthStateChange: vi.fn(),
  signOut: vi.fn(),
  callback: undefined as undefined | ((event: string, session: { user: unknown } | null) => void),
}));

vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: authMocks.getSession,
      onAuthStateChange: authMocks.onAuthStateChange,
      signOut: authMocks.signOut,
    },
  },
}));

import { useAuth } from './useAuth';

const schoolUser = {
  id: 'student-1',
  email: 'student@knu.ac.kr',
  email_confirmed_at: '2026-01-01T00:00:00Z',
  user_metadata: {},
};

beforeEach(() => {
  authMocks.callback = undefined;
  authMocks.getSession.mockResolvedValue({ data: { session: null }, error: null });
  authMocks.onAuthStateChange.mockImplementation((callback) => {
    authMocks.callback = callback;
    return { data: { subscription: { unsubscribe: vi.fn() } } };
  });
  authMocks.signOut.mockResolvedValue({ error: null });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('useAuth 학교 계정 검증', () => {
  it('확인된 실제 @knu.ac.kr 계정은 로그인 상태로 둔다', async () => {
    authMocks.getSession.mockResolvedValue({ data: { session: { user: schoolUser } }, error: null });
    const { result } = renderHook(() => useAuth());
    await waitFor(() => expect(result.current.authStatus).toBe('authenticated'));
    expect(result.current.user?.email).toBe(schoolUser.email);
    expect(authMocks.signOut).not.toHaveBeenCalled();
  });

  it('login_hint와 무관하게 외부 도메인 계정의 세션을 종료한다', async () => {
    authMocks.getSession.mockResolvedValue({
      data: { session: { user: { ...schoolUser, email: 'student@gmail.com' } } },
      error: null,
    });
    const { result } = renderHook(() => useAuth());
    await waitFor(() => expect(result.current.authStatus).toBe('school_failed'));
    await waitFor(() => expect(authMocks.signOut).toHaveBeenCalled());
    expect(result.current.user).toBeNull();
  });

  it('학교 도메인이어도 이메일 확인 시각이 없으면 차단한다', async () => {
    authMocks.getSession.mockResolvedValue({
      data: { session: { user: { ...schoolUser, email_confirmed_at: null } } },
      error: null,
    });
    const { result } = renderHook(() => useAuth());
    await waitFor(() => expect(result.current.authStatus).toBe('school_failed'));
    await waitFor(() => expect(authMocks.signOut).toHaveBeenCalled());
  });

  it('로그아웃 후 비로그인 상태로 바뀐다', async () => {
    const { result } = renderHook(() => useAuth());
    await waitFor(() => expect(result.current.authStatus).toBe('signed_out'));
    act(() => authMocks.callback?.('SIGNED_IN', { user: schoolUser }));
    await waitFor(() => expect(result.current.authStatus).toBe('authenticated'));
    act(() => authMocks.callback?.('SIGNED_OUT', null));
    await waitFor(() => expect(result.current.authStatus).toBe('signed_out'));
  });
});
