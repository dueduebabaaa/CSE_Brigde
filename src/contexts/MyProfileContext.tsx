import { createContext, useContext } from 'react';
import type { ProfileUpdate, UserProfile } from '../services/profileService';
type Status = 'loading' | 'ready' | 'missing' | 'error' | 'signed_out';
export type Snapshot = { userId: string | null; profile: UserProfile | null; status: Status; error: string | null };
interface MyProfileValue extends Snapshot {
  saving: boolean;
  refresh: () => void;
  update: (patch: ProfileUpdate) => Promise<void>;
}
export const MyProfileContext = createContext<MyProfileValue | null>(null);
export function useMyProfile() {
  const context = useContext(MyProfileContext);
  if (!context) throw new Error('useMyProfile은 MyProfileProvider 안에서 사용해야 합니다.');
  return context;
}
