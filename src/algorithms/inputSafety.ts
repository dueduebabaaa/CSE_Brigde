import type { Availability } from '../types';

export type ProfileVisibility = 'public' | 'team_only' | 'private';

/** General discovery only. This is not authorization or a database access policy. */
export function isPublicAlgorithmCandidate(profile: { isPublic?: boolean; visibility?: unknown }): boolean {
  if (profile.visibility !== undefined) {
    return profile.visibility === 'public' && profile.isPublic !== false;
  }
  return profile.isPublic === true;
}

/** Full timestamps only; an explicitly supplied domestic time without offset means Seoul. */
export function parseOpportunityTimestamp(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,9}))?)?(Z|[+-]\d{2}(?::\d{2})?)?$/.exec(value);
  if (!match) return null;
  const [, y, m, d, h, min, sec = '0', , zone] = match;
  const calendar = new Date(Date.UTC(Number(y), Number(m) - 1, Number(d)));
  if (calendar.getUTCFullYear() !== Number(y) || calendar.getUTCMonth() !== Number(m) - 1 ||
      calendar.getUTCDate() !== Number(d) || Number(h) > 23 || Number(min) > 59 || Number(sec) > 59) return null;
  const offset = zone?.length === 3 ? `${zone}:00` : zone ?? '+09:00';
  const timestamp = `${value.slice(0, 10)}T${value.slice(11, zone ? -zone.length : undefined)}${offset}`;
  return Number.isFinite(Date.parse(timestamp)) ? timestamp : null;
}

export function isValidAvailabilityItem(item: unknown): item is Availability {
  if (!item || typeof item !== 'object' || Array.isArray(item)) return false;
  const a = item as Partial<Availability>;
  return typeof a.id === 'string' && a.id.trim().length > 0 &&
    typeof a.userId === 'string' && a.userId.trim().length > 0 &&
    typeof a.dayOfWeek === 'number' && Number.isInteger(a.dayOfWeek) && a.dayOfWeek >= 0 && a.dayOfWeek <= 6 &&
    typeof a.slot === 'number' && Number.isInteger(a.slot) && a.slot >= 0 && a.slot <= 47 &&
    typeof a.isAvailable === 'boolean' && typeof a.updatedAt === 'string';
}

/** Same user/day/slot: one record; false wins regardless of ordering or timestamps. */
export function filterValidAvailabilities(input: unknown): Availability[] {
  if (!Array.isArray(input)) return [];
  const slots = new Map<string, Availability>();
  for (const item of input) {
    if (!isValidAvailabilityItem(item)) continue;
    const key = JSON.stringify([item.userId, item.dayOfWeek, item.slot]);
    const previous = slots.get(key);
    if (!previous || !item.isAvailable) slots.set(key, { ...item });
  }
  return [...slots.values()];
}
