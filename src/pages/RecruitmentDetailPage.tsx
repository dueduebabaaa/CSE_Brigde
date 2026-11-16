import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Edit3, Trash2, Send, Calendar, MapPin } from 'lucide-react';
import { PlaceholderCard } from '../components/PlaceholderCard';

export const RecruitmentDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <Link
          to="/recruitments"
          className="inline-flex items-center gap-1.5 text-xs text-[#64748B] hover:text-[#111111] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          모집 게시판으로 돌아가기
        </Link>
        <div className="flex items-center gap-2">
          <Link
            to={`/recruitments/${id}/edit`}
            className="px-3 py-1.5 rounded-lg bg-[#F1F5F9] hover:bg-[#E2E8F0] text-xs font-semibold text-[#64748B] hover:text-[#111111] flex items-center gap-1.5 transition-colors"
          >
            <Edit3 className="w-3.5 h-3.5" />
            수정
          </Link>
          <button
            onClick={() => alert('삭제 기능은 추후 연동됩니다.')}
            className="px-3 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-xs font-semibold text-rose-600 flex items-center gap-1.5 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            삭제
          </button>
        </div>
      </div>

      {/* 본문 카드 */}
      <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 sm:p-8 space-y-6 shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs text-[#7D39EB] font-bold">
              연결 공모전: 2026 대학생 오픈소스 SW 개발 챌린지
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#F4EFFE] text-[#7D39EB] border border-[#7D39EB]/20">
              모집중 (2/4명)
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black text-[#111111] tracking-tight">
            [UI 테스트 예시] 오픈소스 챌린지 프론트엔드/백엔드 팀원 모집 (ID: {id})
          </h1>

          <div className="flex items-center gap-4 text-xs text-[#64748B] mt-2">
            <span>작성자: <strong className="text-[#111111]">김컴학 (3학년)</strong></span>
            <span>작성일: 2026-11-15</span>
          </div>
        </div>

        {/* 조건 메트릭스 */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="bg-[#F8FAFC] p-3 rounded-lg border border-[#E2E8F0]">
            <span className="text-[#64748B] block mb-0.5">활동 형태</span>
            <span className="text-[#111111] font-semibold flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-[#7D39EB]" /> 대면+비대면 혼합
            </span>
          </div>
          <div className="bg-[#F8FAFC] p-3 rounded-lg border border-[#E2E8F0]">
            <span className="text-[#64748B] block mb-0.5">모집 마감일</span>
            <span className="text-rose-600 font-semibold flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" /> 2026-11-25
            </span>
          </div>
          <div className="bg-[#F8FAFC] p-3 rounded-lg border border-[#E2E8F0]">
            <span className="text-[#64748B] block mb-0.5">예상 활동 기간</span>
            <span className="text-[#111111] font-semibold">약 2개월</span>
          </div>
          <div className="bg-[#F8FAFC] p-3 rounded-lg border border-[#E2E8F0]">
            <span className="text-[#64748B] block mb-0.5">현재 팀 인원</span>
            <span className="text-[#7D39EB] font-bold">2명 확정 / 2명 추가 모집</span>
          </div>
        </div>

        {/* 모집 상세 내용 */}
        <div className="pt-4 border-t border-[#E2E8F0] space-y-3 text-sm text-[#334155] leading-relaxed">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#64748B]">
            프로젝트 소개 &amp; 상세 모집 요강
          </h3>
          <p>
            안녕하세요! 컴퓨터학부 3학년 학생입니다. 이번 2026 오픈소스 SW 개발 챌린지에 출전하기 위해 뜻이 맞는 학우분들을 모시고 있습니다.
          </p>
          <p>
            현재 프론트엔드 1명과 기획 1명이 확정되었으며, React 환경에 익숙한 프론트엔드 개발자 1분과 Node.js / PostgreSQL 기반 API 개발을 담당해 주실 백엔드 개발자 1분을 모십니다.
          </p>
        </div>

        {/* 지원하기 섹션 */}
        <div className="p-5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h4 className="text-sm font-bold text-[#111111]">이 팀에 관심이 있으신가요?</h4>
            <p className="text-xs text-[#64748B] mt-0.5">
              희망 역할과 함께 간단한 소개를 담아 팀 가입 신청서를 제출해 보세요.
            </p>
          </div>
          <button
            onClick={() => alert('팀 가입 신청 기능은 추후 연동됩니다.')}
            className="w-full sm:w-auto px-5 py-2.5 rounded-lg bg-[#7D39EB] hover:bg-[#6025C5] text-white text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition-all shrink-0"
          >
            <Send className="w-4 h-4" />
            팀 가입 신청하기
          </button>
        </div>
      </div>

      <PlaceholderCard
        title="모집글 상세 및 지원자 관리"
        description="모집글 작성자는 들어온 가입 신청 목록을 열람하고 수락/거절할 수 있으며, 팀원 수락 시 팀 워크스페이스에 즉시 반영됩니다."
        assignedRole="A (지원서 관리 UI) + B (Application 테이블 CRUD)"
      />
    </div>
  );
};
