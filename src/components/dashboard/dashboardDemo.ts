import { mockOpportunities, mockRecruitments, mockTeams, mockTeamMembers, mockUsers, mockBookmarks } from '../../data/mockData';
import type { DashboardData } from './dashboardModel';

// Explicit visual fixtures, never calculated recommendations. Imported only in DEV.
export const DEMO_NOW = '2026-11-15T12:00:00+09:00';
const demoUserId = 'user-01';
export const demoBookmarkIds = mockBookmarks.filter((item) => item.userId === demoUserId).map((item) => item.opportunityId);
export const demoDashboard: DashboardData = {
  opportunities: mockOpportunities,
  recruitments: mockRecruitments,
  myTeams: mockTeams.filter((team) => team.leaderId === demoUserId
    || mockTeamMembers.some((member) => member.teamId === team.id && member.userId === demoUserId)),
  members: mockUsers.filter((user) => user.id !== demoUserId && user.isPublic)
    .map(({ id, name, nickname, bio, interests, techStacks, desiredRoles, isPublic }) => ({ id, name, nickname, bio, interests, techStacks, desiredRoles, isPublic })),
  opportunityMatches: [
    { targetId: 'opp-official-01', score: 96, matchedTags: ['React', 'Node.js'], reasons: ['관심 있는 웹 개발과 팀 프로젝트를 함께 경험할 기회예요.'] },
    { targetId: 'opp-official-02', score: 91, matchedTags: ['오픈소스', 'GitHub'], reasons: ['오픈소스에 대한 관심을 실무 협업으로 이어갈 수 있어요.'] },
    { targetId: 'opp-official-03', score: 87, matchedTags: ['캡스톤', '성과발표'], reasons: ['만들어 온 결과물을 소개하고 동료를 만날 수 있어요.'] },
  ],
  memberMatches: [
    { targetId: 'user-03', score: 93, matchedTags: [], reasons: ['서로 다른 개발 역량으로 팀을 채울 수 있어요.'] },
    { targetId: 'user-08', score: 89, matchedTags: [], reasons: ['사용자 경험에 관심이 있는 동료예요.'] },
    { targetId: 'user-09', score: 86, matchedTags: [], reasons: ['웹 프로젝트를 함께 만들어 볼 동료예요.'] },
  ],
};
