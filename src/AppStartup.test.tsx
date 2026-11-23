// @vitest-environment jsdom
import { lazy } from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AppStartup } from './AppStartup';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('앱 초기화', () => {
  it('앱을 불러오는 동안 상태를 표시하고 완료되면 앱을 렌더링한다', async () => {
    const App = lazy(async () => ({ default: () => <h1>BRIDGE 홈</h1> }));
    render(<AppStartup><App /></AppStartup>);
    expect(screen.getByRole('status').textContent).toContain('불러오는 중');
    expect(await screen.findByRole('heading', { name: 'BRIDGE 홈' })).toBeTruthy();
  });

  it.each(['SupabaseConfigurationError', 'Error'])('초기화 실패(%s)에도 안내 화면을 표시한다', async (name) => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const error = new Error('raw error details');
    error.name = name;
    const App = lazy(async () => { throw error; });

    render(<AppStartup><App /></AppStartup>);

    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toContain('BRIDGE를 시작하지 못했어요');
    expect(alert.textContent).not.toContain('raw error details');
    if (name === 'SupabaseConfigurationError') {
      expect(alert.textContent).toContain('VITE_SUPABASE_ANON_KEY');
    }
  });
});
