import { useEffect, useState } from 'react';
import type { OpportunitySource } from './opportunityModel';

const BOOKMARK_KEY = 'bridge_opportunity_demo_bookmarks_v1';
function readBookmarks(): string[] {
  if (!import.meta.env.DEV) return [];
  try {
    const values: unknown = JSON.parse(sessionStorage.getItem(BOOKMARK_KEY) || '[]');
    return Array.isArray(values) ? values.filter((value): value is string => typeof value === 'string') : [];
  } catch { return []; }
}

// Replace only this source boundary with B's queries and C's supplied results.
// No Supabase/auth/algorithm implementation. No fixtures are imported in production.
export function useOpportunitySource(): OpportunitySource {
  const [source, setSource] = useState<OpportunitySource>({ loading: Boolean(import.meta.env.DEV) });
  const [bookmarkIds, setBookmarkIds] = useState(readBookmarks);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    let active = true;
    setSource({ loading: true });
    Promise.all([import('../../data/mockData'), import('../dashboard/dashboardDemo')]).then(([mock, fixture]) => {
      if (active) setSource({ opportunities: mock.mockOpportunities, recruitments: mock.mockRecruitments,
        matches: fixture.demoDashboard.opportunityMatches, now: new Date(fixture.DEMO_NOW), loading: false });
    }).catch(() => { if (active) setSource({ error: 'load-failed', loading: false }); });
    return () => { active = false; };
  }, [attempt]);
  const toggle = async (id: string, next: boolean) => {
    if (!import.meta.env.DEV) throw new Error('Demo disabled');
    const updated = next ? [...new Set([...bookmarkIds, id])] : bookmarkIds.filter((value) => value !== id);
    sessionStorage.setItem(BOOKMARK_KEY, JSON.stringify(updated));
    setBookmarkIds(updated);
  };
  return { ...source, demo: Boolean(import.meta.env.DEV), bookmarkIds,
    onBookmark: import.meta.env.DEV ? toggle : undefined, onRetry: () => setAttempt((value) => value + 1) };
}
