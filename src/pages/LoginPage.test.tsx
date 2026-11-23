// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { checkGoogleOAuthAvailability, supabase } from '../lib/supabase';
import { LoginPage } from './LoginPage';

vi.mock('../lib/supabase', () => ({
  checkGoogleOAuthAvailability: vi.fn(),
  supabase: { auth: { signInWithOAuth: vi.fn() } },
}));

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(checkGoogleOAuthAvailability).mockResolvedValue('ready');
});
afterEach(cleanup);

function submitLogin() {
  render(<MemoryRouter><LoginPage /></MemoryRouter>);
  fireEvent.change(screen.getByLabelText('경북대학교 웹메일 아이디'), { target: { value: 'student' } });
  fireEvent.click(screen.getByRole('button', { name: '로그인' }));
}

describe('Google 로그인', () => {
  it('공개 키가 거부되면 이동 전에 오류를 표시한다', async () => {
    vi.mocked(checkGoogleOAuthAvailability).mockResolvedValue('invalid_key');
    submitLogin();

    expect((await screen.findByRole('alert')).textContent).toContain('공개 키를 거부');
    expect(supabase.auth.signInWithOAuth).not.toHaveBeenCalled();
    expect(screen.getByRole<HTMLButtonElement>('button', { name: '로그인' }).disabled).toBe(false);
  });

  it('Google이 비활성화된 경우 화면에 안내한다', async () => {
    vi.mocked(checkGoogleOAuthAvailability).mockResolvedValue('disabled');
    submitLogin();

    expect((await screen.findByRole('alert')).textContent).toContain('비활성화');
    expect(supabase.auth.signInWithOAuth).not.toHaveBeenCalled();
  });

  it('학교 이메일과 앱 반환 주소를 전달하고 이동 URL이 없으면 오류를 표시한다', async () => {
    vi.mocked(supabase.auth.signInWithOAuth).mockResolvedValue({
      data: { provider: 'google', url: '' },
      error: null,
    });

    submitLogin();

    expect((await screen.findByRole('alert')).textContent).toContain('Google 로그인 페이지를 열 수 없습니다');
    expect(supabase.auth.signInWithOAuth).toHaveBeenCalledWith({
      provider: 'google',
      options: {
        queryParams: { login_hint: 'student@knu.ac.kr' },
        redirectTo: `${window.location.origin}/`,
        skipBrowserRedirect: true,
      },
    });
  });

  it('설정 조회가 실패하면 오류를 표시하고 재시도를 허용한다', async () => {
    vi.mocked(checkGoogleOAuthAvailability).mockRejectedValue(new Error('private error details'));
    submitLogin();

    expect((await screen.findByRole('alert')).textContent).toContain('연결 상태');
    expect(screen.getByRole<HTMLButtonElement>('button', { name: '로그인' }).disabled).toBe(false);
  });
});
