import React, { useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
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
  ShieldAlert,
  Menu,
  X,
  LogIn,
  UserPlus,
} from 'lucide-react';

interface NavItem {
  name: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  adminOnly?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { name: '홈 대시보드', path: '/', icon: LayoutDashboard },
  { name: '공모전·대외활동', path: '/opportunities', icon: Compass },
  { name: '팀원 모집', path: '/recruitments', icon: Users },
  { name: '팀원 탐색', path: '/members', icon: Search },
  { name: '팀 빌더', path: '/team-builder', icon: Sparkles, badge: 'AI' },
  { name: '시간표 조율', path: '/schedule', icon: Calendar },
  { name: '내 프로젝트', path: '/projects', icon: FolderGit2 },
  { name: '저장한 공모전', path: '/bookmarks', icon: Bookmark },
  { name: '마이페이지', path: '/profile', icon: User },
  { name: '관리자 관리', path: '/admin/opportunities', icon: ShieldAlert, adminOnly: true },
];

export const AppLayout: React.FC = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();

  // 로그인/회원가입 등 전체화면 레이아웃이 필요한 경우도 지원
  const isAuthPage = location.pathname === '/login' || location.pathname === '/signup';

  if (isAuthPage) {
    return (
      <div className="min-h-screen bg-[#0B0C10] flex flex-col justify-between text-slate-100">
        <header className="px-6 py-4 border-b border-[#242634] flex items-center justify-between">
          <NavLink to="/" className="flex items-center gap-2 group">
            <span className="font-extrabold text-2xl tracking-tight text-white group-hover:text-[#C6FF33] transition-colors">
              BRIDGE
            </span>
            <span className="text-[10px] tracking-wider px-2 py-0.5 rounded bg-[#7D39EB]/20 text-[#C6FF33] font-semibold border border-[#7D39EB]/40">
              KNU CSE
            </span>
          </NavLink>
          <NavLink
            to="/"
            className="text-xs text-slate-400 hover:text-white transition-colors"
          >
            ← 메인으로 돌아가기
          </NavLink>
        </header>
        <main className="flex-1 flex items-center justify-center p-4">
          <Outlet />
        </main>
        <footer className="py-4 text-center text-xs text-slate-500 border-t border-[#242634]">
          © BRIDGE. KNU CSE · PROJECT NETWORK. BEYOND CONNECTION.
        </footer>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B0C10] flex text-slate-100 font-sans">
      {/* 모바일 사이드바 오버레이 */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* 데스크톱 & 모바일 반응형 사이드바 */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-[#0A0A0C] border-r border-[#242634] flex flex-col transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* 서비스 로고 및 브랜딩 */}
        <div className="p-5 border-b border-[#242634]">
          <div className="flex items-center justify-between">
            <NavLink
              to="/"
              className="flex items-center gap-2"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-[#7D39EB] to-[#C6FF33] flex items-center justify-center text-black font-black text-lg shadow-md shadow-[#7D39EB]/20">
                B
              </div>
              <div>
                <span className="font-black text-xl tracking-tight text-white">BRIDGE</span>
                <span className="block text-[10px] text-[#C6FF33] font-semibold tracking-wider uppercase">
                  BEYOND CONNECTION.
                </span>
              </div>
            </NavLink>
            <button
              className="lg:hidden text-slate-400 hover:text-white p-1 rounded-md"
              onClick={() => setIsMobileMenuOpen(false)}
              aria-label="메뉴 닫기"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <p className="mt-2 text-[11px] text-slate-400 font-medium">
            우리 사이, 가능성을 잇다.
          </p>
          <div className="mt-1 text-[10px] text-slate-500 font-mono">
            KNU CSE · PROJECT NETWORK
          </div>
        </div>

        {/* 네비게이션 메뉴 */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/'}
                onClick={() => setIsMobileMenuOpen(false)}
                className={({ isActive }) =>
                  `flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-semibold transition-all group ${
                    isActive
                      ? 'bg-[#7D39EB] text-white shadow-lg shadow-[#7D39EB]/30'
                      : 'text-slate-400 hover:text-white hover:bg-[#181924]'
                  }`
                }
              >
                <div className="flex items-center gap-3">
                  <Icon className="w-4 h-4 shrink-0 transition-transform group-hover:scale-110" />
                  <span>{item.name}</span>
                </div>
                {item.badge && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#C6FF33] text-black font-bold uppercase">
                    {item.badge}
                  </span>
                )}
                {item.adminOnly && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-medium border border-amber-500/30">
                    Admin
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* 하단 시스템 상태 & 로그인 바로가기 */}
        <div className="p-4 border-t border-[#242634] bg-[#0E0F14]">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-2 h-2 rounded-full bg-[#C6FF33] animate-pulse" />
            <span className="text-[11px] text-slate-400">학부 연계 시스템 연결 대기중</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <NavLink
              to="/login"
              onClick={() => setIsMobileMenuOpen(false)}
              className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-[#181924] hover:bg-[#242634] text-xs font-semibold text-slate-300 hover:text-white transition-colors"
            >
              <LogIn className="w-3.5 h-3.5" />
              로그인
            </NavLink>
            <NavLink
              to="/signup"
              onClick={() => setIsMobileMenuOpen(false)}
              className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-[#7D39EB]/20 hover:bg-[#7D39EB]/30 border border-[#7D39EB]/40 text-xs font-semibold text-[#C6FF33] transition-colors"
            >
              <UserPlus className="w-3.5 h-3.5" />
              가입
            </NavLink>
          </div>
        </div>
      </aside>

      {/* 메인 영역 */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-64">
        {/* 상단 헤더 */}
        <header className="sticky top-0 z-30 h-16 bg-[#0B0C10]/90 backdrop-blur-md border-b border-[#242634] px-4 sm:px-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="lg:hidden text-slate-300 hover:text-white p-2 rounded-lg hover:bg-[#181924]"
              aria-label="메뉴 열기"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="hidden sm:block">
              <span className="text-xs text-[#C6FF33] font-bold tracking-wider">
                KNU CSE
              </span>
              <h1 className="text-sm font-bold text-white tracking-tight">
                경북대학교 컴퓨터학부 학생 통합 협업 플랫폼
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <NavLink
              to="/recruitments/new"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#C6FF33] text-black text-xs font-bold hover:bg-[#B8F224] transition-all shadow-md shadow-[#C6FF33]/20"
            >
              + 팀원 모집하기
            </NavLink>
            <NavLink
              to="/profile"
              className="w-8 h-8 rounded-full bg-[#181924] border border-[#242634] flex items-center justify-center text-slate-300 hover:text-white hover:border-[#7D39EB] transition-colors"
              title="마이페이지"
            >
              <User className="w-4 h-4" />
            </NavLink>
          </div>
        </header>

        {/* 본문 콘텐츠 */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>

        {/* 하단 푸터 */}
        <footer className="border-t border-[#242634] px-6 py-4 bg-[#0A0A0C] text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div>
            <span className="font-bold text-slate-300">BRIDGE</span> — BEYOND CONNECTION. 우리 사이, 가능성을 잇다.
          </div>
          <div className="text-[11px] text-slate-500">
            경북대학교 컴퓨터학부 협업 플랫폼 (KNU CSE)
          </div>
        </footer>
      </div>
    </div>
  );
};
