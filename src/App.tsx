import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppLayout } from './layouts/AppLayout';
import { MyProfileProvider } from './contexts/MyProfileProvider';
import { OpportunitySourceLayout } from './components/opportunities/OpportunitySourceLayout';

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
import { recruitmentSource } from './features/recruitments/recruitmentSource';


// 최초 접속 화면: 실제 인증 여부는 AppLayout에서 처리
const RootRoute: React.FC = () => {
  return <HomePage />;
};

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <MyProfileProvider>
        <Routes>
          <Route element={<AppLayout />}>
            {/* 최초 접속 화면 (비로그인: 로그인 랜딩 / 로그인: 홈 대시보드) */}
            <Route element={<OpportunitySourceLayout />}>
              <Route path="/" element={<RootRoute />} />
              <Route path="/opportunities" element={<OpportunitiesPage />} />
              <Route path="/opportunities/:id" element={<OpportunityDetailPage />} />
              <Route path="/bookmarks" element={<BookmarksPage />} />
            </Route>

            {/* 인증 및 온보딩 */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/onboarding" element={<OnboardingPage />} />

            {/* 팀원 모집 게시판 */}
            <Route path="/recruitments" element={<RecruitmentsPage source={recruitmentSource} />} />
            <Route path="/recruitments/new" element={<RecruitmentCreatePage source={recruitmentSource} />} />
            <Route path="/recruitments/:id" element={<RecruitmentDetailPage source={recruitmentSource} />} />
            <Route path="/recruitments/:id/edit" element={<RecruitmentEditPage source={recruitmentSource} />} />

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
            <Route path="/profile" element={<ProfilePage />} />

            {/* 관리자 공고 및 수집 관리 */}
            <Route path="/admin/opportunities" element={<AdminOpportunitiesPage />} />

            {/* 404 Not Found */}
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </MyProfileProvider>
    </BrowserRouter>
  );
};

export default App;
