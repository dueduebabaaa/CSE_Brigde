import { describe, expect, it } from 'vitest';
import type { PublicProfile, UserProfile } from '../services/profileService';
import { publicProfileToAlgorithmProfile, toAlgorithmProfile } from './profileAlgorithmAdapter';
import { calculateMemberMatch } from '../algorithms/memberMatching';

const profile = (overrides: Partial<UserProfile> = {}): UserProfile => ({
  id: 'user-1',
  email: 'student@knu.ac.kr',
  name: '학생',
  nickname: '닉네임',
  grade: '1학년',
  track: '플랫폼소프트웨어전공',
  department: '경북대학교 컴퓨터학부',
  bio: '한 줄 소개',
  long_bio: '상세 소개',
  interests: ['AI', '웹 개발'],
  tech_stacks: ['React', 'TypeScript'],
  tech_proficiency: { React: null },
  wanted_tech_stacks: ['Rust', 'Go'],
  desired_roles: ['Frontend', 'Backend'],
  activity_types: [],
  activity_goals: [],
  activity_mode: null,
  activity_duration: null,
  availability_status: null,
  experiences: [],
  github_url: 'https://github.com/student',
  portfolio_url: null,
  is_public: true,
  visibility: 'public',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  ...overrides,
});

describe('toAlgorithmProfile', () => {
  it('DB snake_case 배열의 값과 순서를 camelCase 필드에 보존한다', () => {
    const result = toAlgorithmProfile(profile());

    expect(result.techStacks).toEqual(['React', 'TypeScript']);
    expect(result.wantedTechStacks).toEqual(['Rust', 'Go']);
    expect(result.desiredRoles).toEqual(['Frontend', 'Backend']);
    expect(result.longBio).toBe('상세 소개');
    expect(result.githubUrl).toBe('https://github.com/student');
    expect(result.portfolioUrl).toBeNull();
  });

  it('visibility가 정확히 public일 때만 공개로 표시한다', () => {
    expect(toAlgorithmProfile(profile({ visibility: 'public' })).isPublic).toBe(true);
    expect(toAlgorithmProfile(profile({ visibility: 'team_only', is_public: true })).isPublic).toBe(false);
    expect(toAlgorithmProfile(profile({ visibility: null, is_public: true })).isPublic).toBe(false);
    expect(toAlgorithmProfile(profile({ visibility: 'legacy-value' as UserProfile['visibility'] })).isPublic).toBe(false);
  });

  it('누락 또는 null 배열을 빈 배열로 바꾸고 기존 배열은 수정하지 않는다', () => {
    const techStacks = ['React'];
    const result = toAlgorithmProfile(profile({
      interests: null,
      tech_stacks: techStacks,
      wanted_tech_stacks: null,
      desired_roles: undefined,
    }));

    expect(result.interests).toEqual([]);
    expect(result.techStacks).toEqual(['React']);
    expect(result.wantedTechStacks).toEqual([]);
    expect(result.desiredRoles).toEqual([]);
    expect(techStacks).toEqual(['React']);
  });

  it('잘못된 필수 필드와 배열 값을 거부한다', () => {
    expect(() => toAlgorithmProfile({ ...profile(), email: null } as unknown as UserProfile)).toThrow(/email/);
    expect(() => toAlgorithmProfile({ ...profile(), tech_stacks: ['React', 1] } as unknown as UserProfile)).toThrow(/tech_stacks/);
    expect(() => toAlgorithmProfile({ ...profile(), grade: '5학년' } as unknown as UserProfile)).toThrow(/학년/);
    expect(() => toAlgorithmProfile(null as unknown as UserProfile)).toThrow(/형식/);
  });

  it('숙련도는 알고리즘 프로필에 포함하거나 점수로 변환하지 않는다', () => {
    const result = toAlgorithmProfile(profile({ tech_proficiency: { React: null } }));
    expect(result).not.toHaveProperty('tech_proficiency');
    expect(result).not.toHaveProperty('techProficiency');
  });
});

describe('publicProfileToAlgorithmProfile', () => {
  const publicProf = (overrides: Partial<PublicProfile> = {}): PublicProfile => {
    const full = profile();
    const { email: _email, ...rest } = full;
    return {
      ...rest,
      ...overrides,
    };
  };

  it('이메일 필드가 없는 공개 프로필을 알고리즘 UserProfile로 안전하게 변환한다', () => {
    const pub = publicProf({
      name: '김공개',
      desired_roles: ['Frontend Developer'],
      tech_stacks: ['React', 'TypeScript'],
      visibility: 'public',
      is_public: true,
    });
    const result = publicProfileToAlgorithmProfile(pub);

    expect(result.id).toBe('user-1');
    expect(result.name).toBe('김공개');
    expect(result.email).toBe('');
    expect(result.techStacks).toEqual(['React', 'TypeScript']);
    expect(result.desiredRoles).toEqual(['Frontend Developer']);
    expect(result.isPublic).toBe(true);
  });

  it('변환된 프로필이 C의 memberMatching 알고리즘 입력으로 정상 작동한다', () => {
    const pub = publicProf({
      id: 'candidate-1',
      name: '후보학생',
      desired_roles: ['Frontend Developer'],
      tech_stacks: ['React', 'TypeScript'],
      visibility: 'public',
      is_public: true,
    });
    const algorithmProfile = publicProfileToAlgorithmProfile(pub);

    const matches = calculateMemberMatch(
      {
        desiredRoles: ['Frontend Developer'],
        requiredTechStacks: ['React'],
      },
      [],
      [
        {
          profile: algorithmProfile,
          availability: [],
        },
      ]
    );

    expect(matches).toHaveLength(1);
    expect(matches[0].userId).toBe('candidate-1');
    expect(matches[0].roleMatch).toBe(true);
    expect(matches[0].matchedTechStacks).toContain('React');
    expect(matches[0].score).toBeGreaterThan(0);
  });
});
