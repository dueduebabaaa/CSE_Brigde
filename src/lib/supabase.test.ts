import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@supabase/supabase-js', () => ({ createClient: vi.fn() }));

beforeEach(() => {
  vi.resetModules();
  vi.stubEnv('VITE_SUPABASE_URL', 'http://127.0.0.1:54321');
  vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'test-publishable-key');
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('Google OAuth connection preflight', () => {
  it.each([
    [401, {}, 'invalid_key'],
    [200, { external: { google: false } }, 'disabled'],
    [200, { external: { google: true } }, 'ready'],
  ])('maps status %s and provider settings to %s', async (status, body, expected) => {
    const fetchSettings = vi.fn().mockResolvedValue({
      status, ok: status === 200, json: async () => body,
    });
    vi.stubGlobal('fetch', fetchSettings);
    const { checkGoogleOAuthAvailability } = await import('./supabase');

    await expect(checkGoogleOAuthAvailability()).resolves.toBe(expected);
    expect(fetchSettings).toHaveBeenCalledWith(new URL('http://127.0.0.1:54321/auth/v1/settings'), {
      headers: { apikey: 'test-publishable-key' },
      signal: expect.any(AbortSignal),
    });
  });

  it('reports an unavailable Auth API as a connection failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ status: 503, ok: false }));
    const { checkGoogleOAuthAvailability } = await import('./supabase');

    await expect(checkGoogleOAuthAvailability()).rejects.toThrow();
  });

  it('reports a missing public key as a startup configuration error', async () => {
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', '');
    await expect(import('./supabase')).rejects.toMatchObject({ name: 'SupabaseConfigurationError' });
  });
});
