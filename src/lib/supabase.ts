import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim();
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();

function configurationError() {
    const error = new Error('Supabase 연결 설정을 확인해 주세요.');
    error.name = 'SupabaseConfigurationError';
    return error;
}

function initializeSupabase() {
    if (!supabaseUrl || !supabaseKey) throw configurationError();

    try {
        return createClient(supabaseUrl, supabaseKey);
    } catch {
        throw configurationError();
    }
}

export const supabase = initializeSupabase();

// signInWithOAuth builds a redirect URL locally, so check the API key before leaving the app.
export async function checkGoogleOAuthAvailability(): Promise<'ready' | 'invalid_key' | 'disabled'> {
    const response = await fetch(new URL('/auth/v1/settings', supabaseUrl), {
        headers: { apikey: supabaseKey! },
        signal: AbortSignal.timeout(8000),
    });
    if (response.status === 401 || response.status === 403) return 'invalid_key';
    if (!response.ok) throw new Error('Google OAuth 설정을 확인하지 못했습니다.');

    const settings = await response.json();
    return settings.external?.google === false ? 'disabled' : 'ready';
}
