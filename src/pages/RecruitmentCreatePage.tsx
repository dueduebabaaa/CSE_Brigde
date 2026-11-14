import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save } from 'lucide-react';
import { PlaceholderCard } from '../components/PlaceholderCard';

export const RecruitmentCreatePage: React.FC = () => {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    alert('모집글 등록 기능은 추후 Supabase 연동 시 활성화됩니다.');
    navigate('/recruitments');
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Link
        to="/recruitments"
        className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        모집 게시판으로 돌아가기
      </Link>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">팀원 모집 게시글 작성</h1>
          <p className="text-xs text-slate-400 mt-1">
            공모전 정보와 함께 필요한 팀원의 역할, 기술 스택, 활동 방식을 작성해 주세요.
          </p>
        </div>
      </div>

      <div className="bg-[#13141C] border border-[#242634] rounded-2xl p-6 sm:p-8">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              공모전 / 대외활동 선택
            </label>
            <select className="w-full px-3.5 py-2.5 rounded-lg bg-[#0B0C10] border border-[#242634] focus:border-[#7D39EB] focus:outline-none text-xs text-white">
              <option value="">[선택] 수집된 공모전 선택 또는 직접 입력</option>
              <option value="1">2026 대학생 오픈소스 SW 개발 챌린지</option>
              <option value="2">AI/빅데이터 융합 프로젝트 경진대회</option>
              <option value="custom">직접 공모전 입력</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              모집글 제목
            </label>
            <input
              type="text"
              placeholder="예: [해커톤] 프론트엔드/백엔드 각 1분 모집합니다!"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg bg-[#0B0C10] border border-[#242634] focus:border-[#7D39EB] focus:outline-none text-xs text-white"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                모집 인원 (명)
              </label>
              <input
                type="number"
                defaultValue={4}
                min={2}
                max={10}
                className="w-full px-3.5 py-2.5 rounded-lg bg-[#0B0C10] border border-[#242634] focus:border-[#7D39EB] focus:outline-none text-xs text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                활동 방식
              </label>
              <select className="w-full px-3.5 py-2.5 rounded-lg bg-[#0B0C10] border border-[#242634] focus:border-[#7D39EB] focus:outline-none text-xs text-white">
                <option value="hybrid">대면 / 비대면 혼합</option>
                <option value="online">온라인 (비대면 중심)</option>
                <option value="offline">오프라인 (대면 중심)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                모집 마감일
              </label>
              <input
                type="date"
                className="w-full px-3.5 py-2.5 rounded-lg bg-[#0B0C10] border border-[#242634] focus:border-[#7D39EB] focus:outline-none text-xs text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              상세 모집 내용 & 활동 목표
            </label>
            <textarea
              rows={6}
              placeholder="프로젝트의 목표, 회의 주기, 찾고 있는 팀원상 등을 자세히 적어주세요."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg bg-[#0B0C10] border border-[#242634] focus:border-[#7D39EB] focus:outline-none text-xs text-white"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3">
            <Link
              to="/recruitments"
              className="px-4 py-2.5 rounded-lg bg-[#181924] text-slate-300 text-xs font-semibold hover:text-white"
            >
              취소
            </Link>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-lg bg-[#C6FF33] hover:bg-[#B8F224] text-black text-xs font-bold flex items-center gap-2 shadow-md shadow-[#C6FF33]/20"
            >
              <Save className="w-4 h-4" />
              모집글 등록하기
            </button>
          </div>
        </form>
      </div>

      <PlaceholderCard
        title="모집글 작성 기능 프리뷰"
        description="이 화면은 폼 레이아웃 프로토타입입니다. 실제 작성 데이터는 담당자(B)의 Supabase recruitments 테이블에 저장될 예정입니다."
        assignedRole="A (폼 UI) + B (Supabase DB 연동)"
      />
    </div>
  );
};
