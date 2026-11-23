import { describe, expect, it } from 'vitest';
import { GRADE_OPTIONS, MAJOR_TRACKS } from '../constants/majors';
import type { UserProfile } from '../services/profileService';
import { adaptMemberMatchesToUi } from '../algorithms/adapters';
import { calculateMemberMatch } from '../algorithms/memberMatching';
import { recommendPublicMembers } from '../algorithms/publicMemberRecommendations';

// PR #10 defines PublicProfile as the service UserProfile without email.
const publicProfile = (id: string, overrides: Partial<Omit<UserProfile, 'email'>> = {}):
  Omit<UserProfile, 'email'> => ({
  id,
  name: 'Fixture',
  nickname: 'Fixture',
  grade: GRADE_OPTIONS[0],
  track: MAJOR_TRACKS[0],
  department: null,
  bio: null,
  long_bio: null,
  interests: ['AI'],
  tech_stacks: ['springboot', 'Spring Boot'],
  tech_proficiency: null,
  wanted_tech_stacks: ['Python'],
  desired_roles: ['백엔드'],
  activity_types: null,
  activity_goals: null,
  activity_mode: null,
  activity_duration: null,
  availability_status: '팀 구하는 중',
  experiences: null,
  github_url: null,
  portfolio_url: null,
  is_public: true,
  visibility: 'public',
  created_at: '2026-11-01T00:00:00Z',
  updated_at: '2026-11-01T00:00:00Z',
  ...overrides,
});

const requirements = {
  desiredRoles: ['Backend Developer'],
  requiredTechStacks: ['Spring Boot', 'springboot', 'Python'],
};

describe('recommendPublicMembers', () => {
  it('preserves 45:30 weighting, aliases, deduplication, reasons and role-first ordering without time slots', () => {
    const profiles = [
      publicProfile('tech-only', { desired_roles: ['Frontend'], tech_stacks: ['Python'] }),
      publicProfile('both'),
      publicProfile('role-only', { tech_stacks: ['React'] }),
      publicProfile('zero', { desired_roles: ['Frontend'], tech_stacks: ['React'] }),
    ];
    const before = structuredClone({ profiles, requirements });
    const result = recommendPublicMembers('me', requirements, profiles);
    expect(result.status).toBe('evaluated');
    expect(result.matches.map(({ targetId, score }) => [targetId, score])).toEqual([
      ['both', 80], ['role-only', 60], ['tech-only', 20], ['zero', 0],
    ]);
    expect(result.matches[0].matchedTags).toEqual(['Spring Boot']);
    const direct = calculateMemberMatch(requirements, [], profiles.map((p) => ({
      profile: { id: p.id, isPublic: true, desiredRoles: p.desired_roles!, techStacks: p.tech_stacks! },
      availability: [],
    })));
    expect(result.matches).toEqual(adaptMemberMatchesToUi(direct).map((match) => ({
      ...match, hasMissingRequestedProfileData: false,
    })));
    expect(direct.every((match) => match.commonAvailableHoursWeekly === 0)).toBe(true);
    expect(result.matches[0].reasons).toContain('활동 가능 시간 확인이 필요합니다.');
    expect({ profiles, requirements }).toEqual(before);
  });

  it('filters self and nonpublic profiles before taking the first public record per user', () => {
    const profiles = [
      publicProfile('me'),
      publicProfile('same', { visibility: 'private' }),
      publicProfile('same'),
      publicProfile('same', { desired_roles: ['Frontend'] }),
      publicProfile('team', { visibility: 'team_only' }),
      publicProfile('disabled', { is_public: false }),
      publicProfile('unknown', { visibility: null, is_public: null }),
      publicProfile('legacy', { visibility: null }),
      publicProfile('explicit', { is_public: null }),
    ];
    expect(recommendPublicMembers('me', requirements, profiles).matches.map((m) => [m.targetId, m.score]))
      .toEqual([['explicit', 80], ['legacy', 80], ['same', 80]]);
  });

  it('reports empty, private-only, self-only, insufficient and non-comparable inputs separately', () => {
    expect(recommendPublicMembers('me', null, null)).toEqual({ status: 'no-candidates', matches: [] });
    expect(recommendPublicMembers('me', requirements, [])).toEqual({ status: 'no-candidates', matches: [] });
    expect(recommendPublicMembers('me', requirements, [publicProfile('private', { visibility: 'private' })]))
      .toEqual({ status: 'no-public-candidates', matches: [] });
    expect(recommendPublicMembers('me', requirements, [publicProfile('me')]))
      .toEqual({ status: 'self-only', matches: [] });
    expect(recommendPublicMembers('me', requirements, [null, publicProfile('empty', {
      desired_roles: null, tech_stacks: [],
    })])).toEqual({ status: 'insufficient-profile-data', matches: [] });
    expect(recommendPublicMembers('me', { desiredRoles: null, requiredTechStacks: [] }, [publicProfile('p')]))
      .toEqual({ status: 'no-evaluable-match', matches: [] });
    expect(recommendPublicMembers('me', { desiredRoles: ['Backend'] }, [publicProfile('p', {
      desired_roles: null,
    })])).toEqual({ status: 'no-evaluable-match', matches: [] });
  });

  it('keeps an evaluated zero in a mixed list without assigning zero to unevaluable candidates', () => {
    const result = recommendPublicMembers('me', { desiredRoles: ['Backend'] }, [
      publicProfile('empty', { desired_roles: [' '], tech_stacks: null }),
      publicProfile('unrelated-data', { desired_roles: null }),
      publicProfile('zero', { desired_roles: ['Frontend'], availability_status: null }),
    ]);

    expect(result).toEqual({
      status: 'evaluated',
      matches: [{
        targetId: 'zero',
        score: 0,
        matchedTags: [],
        reasons: ['활동 가능 시간 확인이 필요합니다.'],
        hasMissingRequestedProfileData: false,
      }],
    });
  });

  it('marks a partial result and returns only UI match fields even when extra personal data is present', () => {
    const candidate = {
      ...publicProfile('partial', { desired_roles: null, bio: 'private fixture text' }),
      email: 'private@example.invalid',
    };
    const result = recommendPublicMembers('me', requirements, [candidate]);
    expect(result.matches).toEqual([{
      targetId: 'partial',
      score: 20,
      matchedTags: ['Spring Boot'],
      reasons: expect.any(Array),
      hasMissingRequestedProfileData: true,
    }]);
    expect(JSON.stringify(result)).not.toMatch(/private|email|nickname/);
  });
});
