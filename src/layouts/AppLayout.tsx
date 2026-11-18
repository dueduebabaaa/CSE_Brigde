
import React, { useEffect, useState } from 'react';
import {
  NavLink,
  Outlet,
  useLocation,
  useNavigate,
  Navigate,
} from 'react-router-dom';

import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import { fetchMyProfile, isProfileComplete } from '../services/profileService';

import {
  LayoutDashboard,
  Compass,
  Users,
  Search,
  Sparkles,
  Calendar,
  FolderGit2,
  Bookmark,
  User,
  Menu,
  X,
  LogOut,
  Plus,
} from 'lucide-react';

import { Avatar } from '../components/ui/Avatar';

// ─── 네비게이션 그룹 ──────────────────────────────

interface NavItem {
  name: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    label: 'WORKSPACE',
    items: [
      { name: '홈 대시보드', path: '/', icon: LayoutDashboard },
      { name: '공모전·대외활동', path: '/opportunities', icon: Compass },
      { name: '팀원 모집', path: '/recruitments', icon: Users },
      { name: '팀원 탐색', path: '/members', icon: Search },
    ],
  },
  {
    label: 'COLLABORATION',
    items: [
      { name: '팀 빌더', path: '/team-builder', icon: Sparkles, badge: 'AI' },
      { name: '시간표 조율', path: '/schedule', icon: Calendar },
      { name: '내 프로젝트', path: '/projects', icon: FolderGit2 },
    ],
  },
  {
    label: 'PERSONAL',
    items: [
      { name: '저장한 공모전', path: '/bookmarks', icon: Bookmark },
      { name: '마이페이지', path: '/profile', icon: User },
    ],
  },
];

// ─── 사이드바 ─────────────────────────────────────

interface SidebarProps {
  onClose: () => void;
  onLogout: () => void;
  userName: string;
  userEmail: string;
  avatarUrl: string | null;
}

const Sidebar: React.FC<SidebarProps> = ({
  onClose,
  onLogout,
  userName,
  userEmail,
  avatarUrl,
}) => {
  return (
    <div className="flex flex-col h-full bg-[#0A0A0C] border-r border-[#1E1E2A]">

      {/* 로고 */}
      <div className="px-5 py-5 border-b border-[#1E1E2A] flex items-center justify-between">
        <NavLink
          to="/"
          className="flex items-center gap-2.5"
          onClick={onClose}
        >
          <div className="w-8 h-8 rounded-lg bg-[#7D39EB] flex items-center justify-center shrink-0">
            <span className="text-white font-black text-base leading-none">B</span>
          </div>

          <div>
            <span className="block font-black text-lg text-white tracking-tight leading-none">
              BRIDGE
            </span>
            <span className="block text-[10px] text-[#C6FF33] font-semibold tracking-widest uppercase mt-0.5">
              BEYOND CONNECTION.
            </span>
          </div>
        </NavLink>

        <button
          onClick={onClose}
          className="lg:hidden text-[#64748B] hover:text-white p-1 rounded-md transition-colors"
          aria-label="메뉴 닫기"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* 네비게이션 */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {NAV_GROUPS.map((group, gi) => (
          <div key={group.label} className={gi > 0 ? 'mt-5' : ''}>
            <p className="px-2 mb-1 text-[10px] font-bold tracking-widest text-[#4B5563] uppercase select-none">
              {group.label}
            </p>

            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = item.icon;

                return (
                  <li key={item.path}>
                    <NavLink
                      to={item.path}
                      end={item.path === '/'}
                      onClick={onClose}
                      className={({ isActive }) =>
                        [
                          'flex items-center justify-between px-2.5 py-2 rounded-lg text-sm font-medium transition-colors duration-100 group',
                          isActive
                            ? 'bg-[#7D39EB] text-white'
                            : 'text-[#94A3B8] hover:text-white hover:bg-[#181924]',
                        ].join(' ')
                      }
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon className="w-4 h-4 shrink-0" />
                        <span>{item.name}</span>
                      </div>

                      {item.badge && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#C6FF33] text-black font-black tracking-wide">
                          {item.badge}
                        </span>
                      )}
                    </NavLink>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* 실제 로그인 사용자 정보 */}
      <div className="px-3 py-3 border-t border-[#1E1E2A]">
        <div className="flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-[#181924] transition-colors group">
          <Avatar
            name={userName}
            src={avatarUrl}
            size="sm"
          />

          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white leading-tight truncate">
              {userName}
            </p>
            <p className="text-[11px] text-[#64748B] truncate">
              {userEmail}
            </p>
          </div>

          <button
            onClick={onLogout}
            className="shrink-0 text-[#4B5563] hover:text-[#94A3B8] transition-colors p-1 rounded"
            title="로그아웃"
            aria-label="로그아웃"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── AppLayout ────────────────────────────────────

export const AppLayout: React.FC = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [profileStatus, setProfileStatus] = useState<'loading' | 'complete' | 'incomplete' | 'error' | 'skip'>('loading');

  const location = useLocation();
  const navigate = useNavigate();

  const { user, loading, isLoggedIn, authStatus } = useAuth();
  const isLoginPage = location.pathname === '/login';
  const isOnboardingPage = location.pathname === '/onboarding';

  useEffect(() => {
    if (loading) return;
    if (!user || isLoginPage) {
      setProfileStatus('skip');
      return;
    }

    let active = true;
    const refreshProfileStatus = () => {
      setProfileStatus('loading');
      void fetchMyProfile(user.id)
        .then((profile) => {
          if (active) setProfileStatus(isProfileComplete(profile) ? 'complete' : 'incomplete');
        })
        .catch((error) => {
          console.error('프로필 상태 확인 실패:', error);
          if (active) setProfileStatus('error');
        });
    };

    refreshProfileStatus();
    window.addEventListener('bridge-profile-updated', refreshProfileStatus);
    return () => {
      active = false;
      window.removeEventListener('bridge-profile-updated', refreshProfileStatus);
    };
  }, [user, loading, isLoginPage]);

  // Google 계정에서 사용자 정보 가져오기
  const userEmail = user?.email ?? '';
  const metadata = user?.user_metadata;

  const metadataName =
    typeof metadata?.full_name === 'string'
      ? metadata.full_name
      : typeof metadata?.name === 'string'
        ? metadata.name
        : '';

  const userName =
    metadataName ||
    userEmail.split('@')[0] ||
    '사용자';

  const avatarUrl =
    typeof metadata?.avatar_url === 'string'
      ? metadata.avatar_url
      : null;

  // 실제 Supabase 로그아웃
  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();

      if (error) {
        console.error('로그아웃 실패:', error);
        alert('로그아웃에 실패했습니다.');
        return;
      }

      navigate('/login', { replace: true });
    } catch (error) {
      console.error('로그아웃 오류:', error);
      alert('로그아웃 중 오류가 발생했습니다.');
    }
  };

  // 인증 상태 확인 중
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
        <p className="text-sm text-[#64748B]">
          로그인 상태 확인 중...
        </p>
      </div>
    );
  }

  // 로그인하지 않은 사용자의 내부 페이지 접근 차단
  if (!isLoggedIn && !isLoginPage) {
    return <Navigate to="/login" replace state={{ authStatus }} />;
  }

  // 이미 로그인한 사용자가 로그인 화면에 접근하는 경우
  if (isLoggedIn && isLoginPage) {
    return <Navigate to="/" replace />;
  }

  // 로그인 화면은 독립적으로 표시
  if (isLoginPage) {
    return <Outlet />;
  }

  if (location.pathname.startsWith('/admin') && user?.app_metadata?.role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  if (isOnboardingPage) {
    if (profileStatus === 'complete') return <Navigate to="/" replace />;
    return <Outlet />;
  }

  if (profileStatus === 'loading' || profileStatus === 'skip') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
        <p className="text-sm text-[#64748B]">프로필 상태를 확인하는 중입니다...</p>
      </div>
    );
  }

  if (profileStatus === 'error') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-[#F8FAFC]">
        <p className="text-sm text-[#64748B]">프로필 상태를 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.</p>
        <button className="text-sm font-semibold text-[#7D39EB]" onClick={() => window.location.reload()}>다시 시도</button>
      </div>
    );
  }

  if (profileStatus === 'incomplete') return <Navigate to="/onboarding" replace />;

  // 메인 레이아웃
  return (
    <div className="min-h-screen bg-[#F8FAFC] flex font-sans">

      {/* 모바일 오버레이 */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* 사이드바 */}
      <aside
        className={[
          'fixed top-0 bottom-0 left-0 z-50 w-60 transition-transform duration-200 ease-in-out',
          'lg:translate-x-0',
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full',
        ].join(' ')}
      >
        <Sidebar
          onClose={() => setIsMobileMenuOpen(false)}
          onLogout={handleLogout}
          userName={userName}
          userEmail={userEmail}
          avatarUrl={avatarUrl}
        />
      </aside>

      {/* 메인 영역 */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-60">

        {/* 상단 헤더 */}
        <header className="sticky top-0 z-30 h-14 bg-white border-b border-[#E2E8F0] px-4 sm:px-6 flex items-center justify-between">
          <div className="flex items-center gap-3">

            {/* 모바일 햄버거 */}
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="lg:hidden text-[#64748B] hover:text-[#0F172A] p-1.5 rounded-lg hover:bg-[#F1F5F9] transition-colors"
              aria-label="메뉴 열기"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* 헤더 텍스트 */}
            <div className="hidden sm:block">
              <span className="text-xs font-bold text-[#7D39EB] tracking-widest uppercase">
                KNU CSE
              </span>
              <p className="text-sm font-semibold text-[#0F172A] leading-tight">
                경북대학교 컴퓨터학부 학생 협업 플랫폼
              </p>
            </div>
          </div>

          {location.pathname === '/' && (
            <NavLink
              to="/"
              aria-label="BRIDGE 홈"
              className="absolute left-1/2 inline-flex min-h-11 -translate-x-1/2 items-center gap-2 rounded-lg px-2 sm:hidden"
            >
              <span
                aria-hidden="true"
                className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#7D39EB] text-sm font-black text-white"
              >
                B
              </span>
              <span className="text-base font-black tracking-tight text-black">
                BRIDGE
              </span>
            </NavLink>
          )}

          <div className="flex items-center gap-2">
            <NavLink
              to="/recruitments/new"
              className="hidden sm:inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-[#C6FF33] text-black text-xs font-bold hover:bg-[#B8F224] transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              팀원 모집
            </NavLink>

            <NavLink
              to="/profile"
              className="w-8 h-8 rounded-full border border-[#E2E8F0] flex items-center justify-center hover:border-[#7D39EB] transition-colors overflow-hidden"
              title="마이페이지"
            >
              <Avatar
                name={userName}
                src={avatarUrl}
                size="sm"
              />
            </NavLink>
          </div>
        </header>

        {/* 본문 */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>

        {/* 푸터 */}
        <footer className="border-t border-[#E2E8F0] px-6 py-3 bg-white text-xs text-[#94A3B8] flex flex-col sm:flex-row items-center justify-between gap-1">
          <span>
            <strong className="text-[#0F172A]">BRIDGE</strong> — 우리 사이, 가능성을 잇다.
          </span>
          <span>경북대학교 컴퓨터학부 협업 플랫폼</span>
        </footer>
      </div>
    </div>
  );
};
