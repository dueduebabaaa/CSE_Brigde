
import { useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

export const useAuth = () => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let mounted = true;

        // 현재 로그인 상태 확인
        supabase.auth.getSession().then(({ data, error }) => {
            if (!mounted) return;

            if (error) {
                console.error('로그인 상태 확인 실패:', error);
            }

            setUser(data.session?.user ?? null);
            setLoading(false);
        });

        // 로그인 및 로그아웃 상태 변화 감지
        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null);
            setLoading(false);
        });

        return () => {
            mounted = false;
            subscription.unsubscribe();
        };
    }, []);

    return {
        user,
        loading,
        isLoggedIn: !!user,
    };
};

