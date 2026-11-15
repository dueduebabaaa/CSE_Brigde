import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppLayout } from './layouts/AppLayout';

// 페이지 목록
import { HomePage } from './pages/HomePage';
import { LoginPage } from './pages/LoginPage';
import { SignupPage } from './pages/SignupPage';
import { OnboardingPage } from './pages/OnboardingPage';
import { OpportunitiesPage } from './pages/OpportunitiesPage';
import { OpportunityDetailPage } from './pages/OpportunityDetailPage';
import { RecruitmentsPage } from './pages/RecruitmentsPage';
import { RecruitmentCreatePage } from './pages/RecruitmentCreatePage';
import { RecruitmentDetailPage } from './pages/RecruitmentDetailPage';
import { RecruitmentEditPage } from './pages/RecruitmentEditPage';
import { MembersPage } from './pages/MembersPage';
import { MemberDetailPage } from './pages/MemberDetailPage';
import { TeamBuilderPage } from './pages/TeamBuilderPage';
import { SchedulePage } from './pages/SchedulePage';
import { ProjectsPage } from './pages/ProjectsPage';
import { ProjectDetailPage } from './pages/ProjectDetailPage';
import { BookmarksPage } from './pages/BookmarksPage';
import { ProfilePage } from './pages/ProfilePage';
import { AdminOpportunitiesPage } from './pages/AdminOpportunitiesPage';
import { NotFoundPage } from './pages/NotFoundPage';

// 최초 접속 분기: 인증 또는 개발용 프리뷰 세션이 없으면 LoginPage 표시
const RootRoute: React.FC = () => {
  const isAuthed =
    Boolean(import.meta.env.DEV) &&
    typeof window !== 'undefined' &&
    localStorage.getItem('bridge_auth_preview') === 'true';

  return isAuthed ? <HomePage /> : <LoginPage />;
};

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          {/* 최초 접속 화면 (비로그인: 로그인 랜딩 / 로그인: 홈 대시보드) */}
          <Route path="/" element={<RootRoute />} />

          {/* 인증 및 온보딩 */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/onboarding" element={<OnboardingPage />} />

          {/* 공모전 & 대외활동 탐색 */}
          <Route path="/opportunities" element={<OpportunitiesPage />} />
          <Route path="/opportunities/:id" element={<OpportunityDetailPage />} />

          {/* 팀원 모집 게시판 */}
          <Route path="/recruitments" element={<RecruitmentsPage />} />
          <Route path="/recruitments/new" element={<RecruitmentCreatePage />} />
          <Route path="/recruitments/:id" element={<RecruitmentDetailPage />} />
          <Route path="/recruitments/:id/edit" element={<RecruitmentEditPage />} />

          {/* 팀원 탐색 및 매칭 */}
          <Route path="/members" element={<MembersPage />} />
          <Route path="/members/:id" element={<MemberDetailPage />} />

          {/* 스마트 팀 빌더 */}
          <Route path="/team-builder" element={<TeamBuilderPage />} />

          {/* 시간표 조율 */}
          <Route path="/schedule" element={<SchedulePage />} />

          {/* 내 프로젝트 워크스페이스 */}
          <Route path="/projects" element={<ProjectsPage />} />
          <Route path="/projects/:id" element={<ProjectDetailPage />} />

          {/* 북마크 및 마이페이지 */}
          <Route path="/bookmarks" element={<BookmarksPage />} />
          <Route path="/profile" element={<ProfilePage />} />

          {/* 관리자 공고 및 수집 관리 */}
          <Route path="/admin/opportunities" element={<AdminOpportunitiesPage />} />

          {/* 404 Not Found */}
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
};

export default App;
