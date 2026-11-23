import type { UserProfile } from '../services/profileService';
import type { MatchResult } from '../types';
import { adaptMemberMatchesToUi } from './adapters';
import { hasExplicitPublicProfileConsent } from './inputSafety';
import { calculateMemberMatch } from './memberMatching';
import { getCanonicalTag } from './tagClassification';

type PublicMemberProfile = Pick<
  UserProfile,
  'id' | 'visibility' | 'is_public' | 'desired_roles' | 'tech_stacks'
>;

export interface PublicMemberRecommendations {
  status:
    | 'no-candidates'
    | 'no-public-candidates'
    | 'self-only'
    | 'insufficient-profile-data'
    | 'no-evaluable-match'
    | 'evaluated';
  matches: (MatchResult & { hasMissingRequestedProfileData: boolean })[];
}

/** Rank only the supplied candidates. Public activity status carries no weekly time slots. */
export function recommendPublicMembers(
  myUserId: string,
  requirements: {
    desiredRoles?: readonly string[] | null;
    requiredTechStacks?: readonly string[] | null;
  } | null,
  profiles: readonly (PublicMemberProfile | null)[] | null | undefined,
): PublicMemberRecommendations {
  const candidates = (profiles ?? []).filter((profile) => profile && profile.id.trim());
  if (candidates.length === 0) return { status: 'no-candidates', matches: [] };

  const publicProfiles = candidates.filter((profile) =>
    profile && hasExplicitPublicProfileConsent(profile.visibility, profile.is_public)
  );
  if (publicProfiles.length === 0) return { status: 'no-public-candidates', matches: [] };

  const desiredRoles = (requirements?.desiredRoles ?? []).filter((role) => role.trim());
  const requiredTechStacks = (requirements?.requiredTechStacks ?? []).filter((tech) => getCanonicalTag(tech).trim());
  const unique = new Map<string, Parameters<typeof calculateMemberMatch>[2][number]>();
  for (const profile of publicProfiles) {
    if (!profile || profile.id === myUserId || unique.has(profile.id)) continue;
    unique.set(profile.id, {
      profile: {
        id: profile.id,
        isPublic: true,
        desiredRoles: (profile.desired_roles ?? []).filter((role) => role.trim()),
        techStacks: (profile.tech_stacks ?? []).filter((tech) => getCanonicalTag(tech).trim()),
      },
      availability: [],
    });
  }
  if (unique.size === 0) return { status: 'self-only', matches: [] };

  const withProfileData = [...unique.values()].filter(({ profile }) =>
    profile.desiredRoles.length > 0 || profile.techStacks.length > 0,
  );
  if (withProfileData.length === 0) return { status: 'insufficient-profile-data', matches: [] };

  const evaluable = withProfileData.filter(({ profile }) =>
    (desiredRoles.length > 0 && profile.desiredRoles.length > 0) ||
    (requiredTechStacks.length > 0 && profile.techStacks.length > 0),
  );
  if (evaluable.length === 0) return { status: 'no-evaluable-match', matches: [] };

  const matches = adaptMemberMatchesToUi(
    calculateMemberMatch({ desiredRoles, requiredTechStacks }, [], evaluable),
  ).map((match) => {
    const { profile } = unique.get(match.targetId)!;
    return {
      ...match,
      hasMissingRequestedProfileData:
        (desiredRoles.length > 0 && profile.desiredRoles.length === 0) ||
        (requiredTechStacks.length > 0 && profile.techStacks.length === 0),
    };
  });
  return { status: 'evaluated', matches };
}
