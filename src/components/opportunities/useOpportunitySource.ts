import { useEffect, useState } from 'react';
import type { OpportunitySource } from './opportunityModel';
import { fetchOpportunities } from '../../services/opportunityService';

const BOOKMARK_KEY = 'bridge_opportunity_demo_bookmarks_v1';
function readBookmarks(): string[] {
  if (!import.meta.env.DEV) return [];
  try {
    const values: unknown = JSON.parse(sessionStorage.getItem(BOOKMARK_KEY) || '[]');
    return Array.isArray(values) ? values.filter((value): value is string => typeof value === 'string') : [];
  } catch { return []; }
}

export function useOpportunitySource(): OpportunitySource {
  const [source, setSource] = useState<OpportunitySource>({ loading: true, demo: false });
  const [bookmarkIds, setBookmarkIds] = useState(readBookmarks);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    setSource({ loading: true, demo: false, recruitments: [] });
    void fetchOpportunities()
      .then((opportunities) => {
        if (active) {
          setSource({
            opportunities,
            recruitments: [],
            now: new Date(),
            loading: false,
            demo: false,
          });
        }
      })
      .catch((error: unknown) => {
        if (active) {
          setSource({
            error: error instanceof Error ? error.message : '공고를 불러오지 못했습니다.',
            recruitments: [],
            loading: false,
            demo: false,
          });
        }
      });
    return () => { active = false; };
  }, [attempt]);
  const toggle = async (id: string, next: boolean) => {
    if (!import.meta.env.DEV) throw new Error('Demo disabled');
    const updated = next ? [...new Set([...bookmarkIds, id])] : bookmarkIds.filter((value) => value !== id);
    sessionStorage.setItem(BOOKMARK_KEY, JSON.stringify(updated));
    setBookmarkIds(updated);
  };
  return { ...source, demo: false, bookmarkIds,
    onBookmark: import.meta.env.DEV ? toggle : undefined, onRetry: () => setAttempt((value) => value + 1) };
}
