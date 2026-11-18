import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { useAuth } from '../hooks/useAuth';
import { fetchMyProfile, updateMyProfile, type ProfileUpdate } from '../services/profileService';

import { MyProfileContext, type Snapshot } from './MyProfileContext';
const message = (error: unknown) => error instanceof Error ? error.message : '프로필 요청에 실패했습니다. 다시 시도해 주세요.';

export function MyProfileProvider({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const userId = user?.id ?? null;
  const [snapshot, setSnapshot] = useState<Snapshot>({ userId: null, profile: null, status: 'loading', error: null });
  const [revision, setRevision] = useState(0);
  const [saving, setSaving] = useState(false);
  const currentUser = useRef(userId);
  currentUser.current = userId;
  const generation = useRef(0);
  const writeLock = useRef(false);

  const refresh = useCallback(() => setRevision(value => value + 1), []);
  useEffect(() => {
    const request = ++generation.current;
    writeLock.current = false;
    setSaving(false);
    const active = () => request === generation.current && currentUser.current === userId;
    if (loading || !userId) {
      setSnapshot({ userId, profile: null, status: loading ? 'loading' : 'signed_out', error: null });
      return () => { generation.current++; };
    }
    setSnapshot({ userId, profile: null, status: 'loading', error: null });
    void fetchMyProfile(userId).then(profile => {
      if (!active()) return;
      if (profile && profile.id !== userId) throw new Error('현재 계정과 프로필 정보가 일치하지 않습니다.');
      setSnapshot({ userId, profile, status: profile ? 'ready' : 'missing', error: null });
    }).catch(error => {
      if (active()) setSnapshot({ userId, profile: null, status: 'error', error: message(error) });
    });
    return () => { generation.current++; };
  }, [userId, loading, revision]);

  // Onboarding already publishes this event. No changes to onboarding/auth are needed.
  useEffect(() => {
    window.addEventListener('bridge-profile-updated', refresh);
    return () => window.removeEventListener('bridge-profile-updated', refresh);
  }, [refresh]);

  const update = async (patch: ProfileUpdate) => {
    if (!userId || loading || snapshot.userId !== userId || snapshot.status !== 'ready') throw new Error('프로필을 먼저 불러와 주세요.');
    if (!Object.keys(patch).length) return;
    if (writeLock.current) throw new Error('이미 저장 중입니다.');
    const request = generation.current;
    const active = () => request === generation.current && currentUser.current === userId;
    writeLock.current = true;
    setSaving(true);
    try {
      const profile = await updateMyProfile(patch);
      if (!active()) throw new Error('계정이 변경되어 이전 저장 결과를 표시하지 않습니다.');
      if (!profile || profile.id !== userId) throw new Error('저장된 프로필을 확인할 수 없습니다. 다시 조회해 주세요.');
      setSnapshot({ userId, profile, status: 'ready', error: null });
    } finally {
      if (active()) { writeLock.current = false; setSaving(false); }
    }
  };
  // Mask old account data during render, before effect cleanup runs.
  const visible: Snapshot = loading || snapshot.userId !== userId
    ? { userId, profile: null, status: loading || userId ? 'loading' : 'signed_out', error: null }
    : snapshot;
  return <MyProfileContext.Provider value={{ ...visible, saving: visible.status === 'ready' && saving, refresh, update }}>{children}</MyProfileContext.Provider>;
}
