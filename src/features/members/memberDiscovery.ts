import { hasExplicitPublicProfileConsent } from '../../algorithms/inputSafety';
import { useEffect, useState } from 'react';
import type { GradeOption, MajorTrack } from '../../constants/majors';
import { fetchPublicProfileById, searchPublicProfiles, type PublicProfile, type TechProficiency } from '../../services/profileService';
export type { PublicProfile } from '../../services/profileService';

export interface MemberSearchOptions {
  keyword?: string;
  grade?: GradeOption;
  track?: MajorTrack;
  techStacks?: string[];
  techStackMatch?: 'any' | 'all';
  excludeUserId: string;
  page: number;
  pageSize: number;
}

export interface MemberSearchResult {
  profiles: PublicProfile[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasMore: boolean;
}

export interface PublicProfileSource {
  searchPublicProfiles: (options: MemberSearchOptions) => Promise<MemberSearchResult>;
  fetchPublicProfileById: (userId: string) => Promise<PublicProfile | null>;
}

export const publicProfileSource: PublicProfileSource = {
  searchPublicProfiles: (options) => searchPublicProfiles(options),
  fetchPublicProfileById: (id) => fetchPublicProfileById(id),
};

export function isDiscoverable(profile: PublicProfile): boolean {
  return hasExplicitPublicProfileConsent(profile.visibility, profile.is_public);
}

export function memberName(profile: PublicProfile): string {
  return profile.nickname.trim() || profile.name.trim() || '이름 미등록';
}

export const skillLevels: Record<TechProficiency, 'beginner' | 'intermediate' | 'advanced'> = {
  입문: 'beginner',
  '활용 가능': 'intermediate',
  숙련: 'advanced',
};

type RequestState<T> = { status: 'loading' | 'unavailable' | 'error' } | { status: 'ready'; data: T };

export function useMemberRequest<T>(load: (() => Promise<T>) | null) {
  const [attempt, setAttempt] = useState(0);
  const [response, setResponse] = useState<{
    load: () => Promise<T>;
    attempt: number;
    state: RequestState<T>;
  }>();

  useEffect(() => {
    if (!load) return;
    let active = true;
    void Promise.resolve().then(async () => {
      if (!active) return;
      const data = await load();
      if (active) setResponse({ load, attempt, state: { status: 'ready', data } });
    }).catch(() => {
      if (active) setResponse({ load, attempt, state: { status: 'error' } });
    });
    return () => { active = false; };
  }, [load, attempt]);

  const state: RequestState<T> = !load ? { status: 'unavailable' }
    : response?.load === load && response.attempt === attempt ? response.state : { status: 'loading' };
  return { state, retry: () => setAttempt((count) => count + 1) };
}
