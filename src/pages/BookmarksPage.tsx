import React from 'react';
import { Link } from 'react-router-dom';
import { Bookmark, Compass } from 'lucide-react';
import { PlaceholderCard } from '../components/PlaceholderCard';

export const BookmarksPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <h1 className="text-2xl font-black text-[#111111] tracking-tight">저장한 공모전 &amp; 북마크</h1>
        <span className="px-2 py-0.5 text-xs font-semibold rounded bg-[#F4EFFE] text-[#7D39EB] border border-[#7D39EB]/20">
          SAVED
        </span>
      </div>
      <p className="text-xs text-[#64748B] -mt-4">
        관심 등록한 공모전과 대외활동 공고를 한곳에서 확인하세요.
      </p>

      <PlaceholderCard
        title="북마크 및 알림 보관함"
        description="저장한 공고에 신규 팀원 모집글이 등록되면 알림을 제공합니다."
        assignedRole="A (북마크 리스트 UI) + B (Bookmark 테이블 & Supabase 연동)"
        plannedFeatures={[
          '저장한 공모전 카드 목록 및 1-Click 북마크 해제',
          '북마크한 공고 기반 추천 팀원 모집글 실시간 연계',
        ]}
      />

      {/* 빈 상태 프리뷰 */}
      <div className="p-12 text-center rounded-2xl bg-white border border-[#E2E8F0] space-y-3">
        <div className="w-12 h-12 rounded-xl bg-[#F1F5F9] border border-[#E2E8F0] flex items-center justify-center mx-auto text-[#94A3B8]">
          <Bookmark className="w-6 h-6" />
        </div>
        <h3 className="text-base font-bold text-[#111111]">아직 저장한 공모전이 없습니다</h3>
        <p className="text-xs text-[#64748B] max-w-sm mx-auto">
          컴퓨터학부 공식 공고 및 다양한 대외활동 중 마음에 드는 공고를 북마크해 보세요.
        </p>
        <Link
          to="/opportunities"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#7D39EB] hover:bg-[#6025C5] text-white text-xs font-bold transition-all mt-2"
        >
          <Compass className="w-4 h-4" />
          공모전 둘러보기
        </Link>
      </div>
    </div>
  );
};
