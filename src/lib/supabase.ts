import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    throw new Error(
        'Supabase 환경변수(VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)를 확인해 주세요.'
    );
}

export const supabase = createClient(supabaseUrl, supabaseKey);