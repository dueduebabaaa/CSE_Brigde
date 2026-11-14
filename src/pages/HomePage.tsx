import React from 'react';
import { Link } from 'react-router-dom';
import { PlaceholderCard } from '../components/PlaceholderCard';
import { Compass, Users, Sparkles, Calendar, Clock, ArrowRight } from 'lucide-react';

export const HomePage: React.FC = () => {
  return (
    <div className="space-y-8">
      {/* 히어로 배너 */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#13141C] via-[#10111A] to-[#0A0A0C] border border-[#242634] p-8 sm:p-10">
        <div className="absolute -top-24 -right-24 w-80 h-80 bg-[#7D39EB]/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-80 h-80 bg-[#C6FF33]/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#7D39EB]/20 border border-[#7D39EB]/40 text-[#C6FF33] text-xs font-bold mb-4">
            <span>KNU CSE · PROJECT NETWORK</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight leading-tight mb-3">
            우리 사이, <span className="text-[#C6FF33]">가능성</span>을 잇다.
          </h1>
          <p className="text-sm sm:text-base text-slate-300 mb-6 leading-relaxed">
            경북대학교 컴퓨터학부 공식 홈페이지 공고 자동 수집부터 관심 분야 기반 팀원 추천, 팀 구성 및 주간 시간표 조율까지 지원하는 올인원 협업 플랫폼 <strong className="text-white">BRIDGE</strong>입니다.
          </p>

          <div className="flex flex-wrap gap-3">
            <Link
              to="/opportunities"
              className="px-4 py-2.5 rounded-lg bg-[#7D39EB] hover:bg-[#6025C5] text-white text-xs sm:text-sm font-bold flex items-center gap-2 transition-all shadow-lg shadow-[#7D39EB]/30"
            >
              <Compass className="w-4 h-4" />
              공모전 둘러보기
            </Link>
            <Link
              to="/recruitments"
              className="px-4 py-2.5 rounded-lg bg-[#181924] hover:bg-[#242634] border border-[#242634] text-slate-200 text-xs sm:text-sm font-semibold flex items-center gap-2 transition-all"
            >
              <Users className="w-4 h-4" />
              팀원 모집 게시판
            </Link>
          </div>
        </div>
      </div>

      {/* 대시보드 상태 안내 카드 */}
      <PlaceholderCard
        title="홈 대시보드 (Home Dashboard)"
        description="학생 개인별 관심 분야와 기술 스택에 최적화된 공모전/대외활동 추천, 학부 공식 홈페이지의 최신 수집 공고, 마감 임박 공고, 그리고 내 프로젝트 현황을 종합적으로 보여주는 메인 관제 화면입니다."
        assignedRole="A (UI/UX & 프론트엔드) + C (추천 알고리즘)"
        plannedFeatures={[
          '학부 공식 홈페이지 공고 자동 수집 피드 (최근 업데이트 시간 표시)',
          '사용자 기술 스택 및 관심사 기반 AI 공모전 맞춤 추천',
          '마감 임박 공모전 실시간 카운트다운 배너',
          '모집 중인 팀원 모집 게시글 퀵 리스트',
          '내 참여 프로젝트 현황 및 다가오는 미팅 일정 위젯',
        ]}
      />

      {/* 주요 기능 바로가기 그리드 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link
          to="/opportunities"
          className="p-5 rounded-xl bg-[#13141C] border border-[#242634] hover:border-[#7D39EB] transition-all group flex flex-col justify-between"
        >
          <div>
            <div className="w-10 h-10 rounded-lg bg-[#7D39EB]/15 text-[#7D39EB] flex items-center justify-center mb-3">
              <Compass className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white group-hover:text-[#C6FF33] transition-colors">
              공모전 & 대외활동
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              컴퓨터학부 공식 공고 및 직접 등록된 교내외 활동 탐색
            </p>
          </div>
          <div className="mt-4 flex items-center text-xs font-semibold text-[#7D39EB] group-hover:translate-x-1 transition-transform">
            탐색하기 <ArrowRight className="w-3.5 h-3.5 ml-1" />
          </div>
        </Link>

        <Link
          to="/recruitments"
          className="p-5 rounded-xl bg-[#13141C] border border-[#242634] hover:border-[#7D39EB] transition-all group flex flex-col justify-between"
        >
          <div>
            <div className="w-10 h-10 rounded-lg bg-[#C6FF33]/15 text-[#C6FF33] flex items-center justify-center mb-3">
              <Users className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white group-hover:text-[#C6FF33] transition-colors">
              팀원 모집
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              공모전별 팀원을 모집하고 지원서를 실시간 관리
            </p>
          </div>
          <div className="mt-4 flex items-center text-xs font-semibold text-[#C6FF33] group-hover:translate-x-1 transition-transform">
            모집글 보기 <ArrowRight className="w-3.5 h-3.5 ml-1" />
          </div>
        </Link>

        <Link
          to="/team-builder"
          className="p-5 rounded-xl bg-[#13141C] border border-[#242634] hover:border-[#7D39EB] transition-all group flex flex-col justify-between"
        >
          <div>
            <div className="w-10 h-10 rounded-lg bg-[#7D39EB]/15 text-[#7D39EB] flex items-center justify-center mb-3">
              <Sparkles className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white group-hover:text-[#C6FF33] transition-colors">
              스마트 팀 빌더
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              역할 충족도 분석 및 부족한 역량을 채울 팀원 추천
            </p>
          </div>
          <div className="mt-4 flex items-center text-xs font-semibold text-[#7D39EB] group-hover:translate-x-1 transition-transform">
            팀 구성하기 <ArrowRight className="w-3.5 h-3.5 ml-1" />
          </div>
        </Link>

        <Link
          to="/schedule"
          className="p-5 rounded-xl bg-[#13141C] border border-[#242634] hover:border-[#7D39EB] transition-all group flex flex-col justify-between"
        >
          <div>
            <div className="w-10 h-10 rounded-lg bg-[#C6FF33]/15 text-[#C6FF33] flex items-center justify-center mb-3">
              <Calendar className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white group-hover:text-[#C6FF33] transition-colors">
              주간 시간표 조율
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              30분 단위 활동 가능 시간 히트맵 및 회의 시간 자동 추천
            </p>
          </div>
          <div className="mt-4 flex items-center text-xs font-semibold text-[#C6FF33] group-hover:translate-x-1 transition-transform">
            일정 조율하기 <ArrowRight className="w-3.5 h-3.5 ml-1" />
          </div>
        </Link>
      </div>

      {/* 공식 공고 상태 알림 바 */}
      <div className="p-4 rounded-xl bg-[#0A0A0C] border border-[#242634] flex items-center justify-between flex-wrap gap-3 text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-[#C6FF33]" />
          <span>공식 공고 데이터 수집 상태: <strong className="text-slate-200">초기 환경 구성 완료 (수집 대기)</strong></span>
        </div>
        <Link to="/admin/opportunities" className="text-[#7D39EB] hover:text-[#9B65F1] font-semibold">
          관리자 수집 현황 확인 →
        </Link>
      </div>
    </div>
  );
};
