import { useContext, useEffect, useMemo, useState } from 'react';
import type { OpportunitySource } from './opportunityModel';
import { fetchOpportunities } from '../../services/opportunityService';
import { MyProfileContext } from '../../contexts/MyProfileContext';
import { getRecommendedOpportunitiesForProfile } from '../../algorithms/profileRecommendations';
import type { MatchResult, Opportunity } from '../../types';

const BOOKMARK_KEY = 'bridge_opportunity_demo_bookmarks_v1';
function readBookmarks(): string[] {
  if (!import.meta.env.DEV) return [];
  try {
    const values: unknown = JSON.parse(sessionStorage.getItem(BOOKMARK_KEY) || '[]');
    return Array.isArray(values) ? values.filter((value): value is string => typeof value === 'string') : [];
  } catch { return []; }
}

export function useOpportunitySource(): OpportunitySource {
  const profileContext = useContext(MyProfileContext);
  const profile = profileContext?.profile ?? null;
  const profileStatus = profileContext?.status ?? 'signed_out';
  const [bookmarkIds, setBookmarkIds] = useState(readBookmarks);
  const [attempt, setAttempt] = useState(0);
  const userId = profileContext?.userId;
  const canFetch = userId != null && profileStatus !== 'signed_out';
  const request = useMemo(() => ({ userId, attempt }), [userId, attempt]);
  const [settled, setSettled] = useState<{
    request: typeof request;
    opportunities?: Opportunity[];
    error: string | null;
    now?: Date;
  }>();
  const source = canFetch && settled?.request === request ? settled : undefined;

  useEffect(() => {
    if (!canFetch) return;
    let active = true;
    void fetchOpportunities()
      .then((opportunities) => {
        if (active) {
          setSettled({
            request,
            opportunities,
            error: null,
            now: new Date(),
          });
        }
      })
      .catch((error: unknown) => {
        if (active) {
          setSettled({
            request,
            error: error instanceof Error ? error.message : '공고를 불러오지 못했습니다.',
          });
        }
      });
    return () => { active = false; };
  }, [canFetch, request]);

  const matches = useMemo<MatchResult[]>(() => {
    if (!source?.opportunities || !profile || profile.id !== userId || profileStatus !== 'ready') return [];
    return getRecommendedOpportunitiesForProfile(profile, source.opportunities, { currentDate: source.now })
      .filter((match) => match.evaluable);
  }, [source, profile, profileStatus, userId]);

  const toggle = async (id: string, next: boolean) => {
    if (!import.meta.env.DEV) throw new Error('Demo disabled');
    const updated = next ? [...new Set([...bookmarkIds, id])] : bookmarkIds.filter((value) => value !== id);
    sessionStorage.setItem(BOOKMARK_KEY, JSON.stringify(updated));
    setBookmarkIds(updated);
  };

  return {
    opportunities: source?.opportunities,
    matches,
    recruitments: [],
    loading: (canFetch && !source) || (!canFetch && profileStatus === 'loading'),
    error: source?.error,
    profileStatus,
    onProfileRetry: profileContext?.refresh,
    demo: false,
    now: source?.now,
    bookmarkIds,
    onBookmark: import.meta.env.DEV ? toggle : undefined,
    onRetry: () => setAttempt((value) => value + 1),
  };
}
