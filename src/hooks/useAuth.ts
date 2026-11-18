
import { useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

export const useAuth = () => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [schoolAuthFailed, setSchoolAuthFailed] = useState(false);

    useEffect(() => {
        let mounted = true;

        const isSchoolUser = (candidate: User | undefined) =>
            Boolean(
                candidate?.email
                && candidate.email.trim().toLowerCase().endsWith('@knu.ac.kr')
                && candidate.email_confirmed_at
            );

        const rejectNonSchoolSession = () => {
            setUser(null);
            setSchoolAuthFailed(true);
            // Leave the auth callback before signing out to avoid re-entrant auth events.
            setTimeout(() => { void supabase.auth.signOut(); }, 0);
        };

        // 현재 로그인 상태 확인
        supabase.auth.getSession().then(({ data, error }) => {
            if (!mounted) return;

            if (error) {
                console.error('로그인 상태 확인 실패:', error);
            }

            const sessionUser = data.session?.user;
            if (sessionUser && !isSchoolUser(sessionUser)) {
                rejectNonSchoolSession();
            } else {
                if (sessionUser) setSchoolAuthFailed(false);
                setUser(sessionUser ?? null);
            }
            setLoading(false);
        });

        // 로그인 및 로그아웃 상태 변화 감지
        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
            const sessionUser = session?.user;
            if (sessionUser && !isSchoolUser(sessionUser)) {
                rejectNonSchoolSession();
            } else {
                if (sessionUser) setSchoolAuthFailed(false);
                setUser(sessionUser ?? null);
            }
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
        authStatus: loading
            ? 'checking'
            : user
                ? 'authenticated'
                : schoolAuthFailed
                    ? 'school_failed'
                    : 'signed_out',
    };
};
