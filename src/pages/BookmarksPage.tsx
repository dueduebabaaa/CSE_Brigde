import React from 'react';
import { Link } from 'react-router-dom';
import { Bookmark, Compass } from 'lucide-react';
import { PlaceholderCard } from '../components/PlaceholderCard';

export const BookmarksPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <h1 className="text-2xl font-black text-white tracking-tight">저장한 공모전 & 북마크</h1>
        <span className="px-2 py-0.5 text-xs font-semibold rounded bg-[#7D39EB]/20 text-[#C6FF33] border border-[#7D39EB]/30">
          SAVED
        </span>
      </div>
      <p className="text-xs text-slate-400 -mt-4">
        관심 등록한 공모전과 대외활동 공고를 한곳에서 확인하고 마감 기한을 관리하세요.
      </p>

      <PlaceholderCard
        title="북마크 및 알림 보관함"
        description="사용자가 저장한 공모전의 마감 임박 알림을 제공하고, 해당 공모전에 대한 신규 팀원 모집글이 등록될 경우 알림을 제공합니다."
        assignedRole="A (북마크 리스트 UI) + B (Bookmark 테이블 & Supabase 연동)"
        plannedFeatures={[
          '저장한 공모전 카드 목록 및 1-Click 북마크 해제',
          '마감 임박 공고 우선 정렬 및 D-Day 배지 표시',
          '북마크한 공고 기반 추천 팀원 모집글 실시간 연계',
        ]}
      />

      {/* 빈 상태 프리뷰 */}
      <div className="p-12 text-center rounded-2xl bg-[#13141C] border border-[#242634] space-y-3">
        <div className="w-12 h-12 rounded-xl bg-[#181924] border border-[#242634] flex items-center justify-center mx-auto text-slate-500">
          <Bookmark className="w-6 h-6" />
        </div>
        <h3 className="text-base font-bold text-white">아직 저장한 공모전이 없습니다</h3>
        <p className="text-xs text-slate-400 max-w-sm mx-auto">
          컴퓨터학부 공식 공고 및 다양한 대외활동 중 마음에 드는 공고를 북마크해 보세요.
        </p>
        <Link
          to="/opportunities"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#7D39EB] hover:bg-[#6025C5] text-white text-xs font-bold transition-all shadow-md mt-2"
        >
          <Compass className="w-4 h-4" />
          공모전 둘러보기
        </Link>
      </div>
    </div>
  );
};
