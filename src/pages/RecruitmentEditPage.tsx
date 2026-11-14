import React, { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save } from 'lucide-react';
import { PlaceholderCard } from '../components/PlaceholderCard';

export const RecruitmentEditPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [title, setTitle] = useState('[UI 테스트 예시] 오픈소스 챌린지 프론트엔드/백엔드 팀원 모집');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    alert('수정 완료 기능은 추후 연동됩니다.');
    navigate(`/recruitments/${id}`);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Link
        to={`/recruitments/${id}`}
        className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        게시글 상세로 돌아가기
      </Link>

      <div>
        <h1 className="text-2xl font-black text-white tracking-tight">팀원 모집 게시글 수정</h1>
        <p className="text-xs text-slate-400 mt-1">
          게시글 정보 (ID: {id})를 수정할 수 있습니다.
        </p>
      </div>

      <div className="bg-[#13141C] border border-[#242634] rounded-2xl p-6 sm:p-8">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              모집글 제목
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg bg-[#0B0C10] border border-[#242634] focus:border-[#7D39EB] focus:outline-none text-xs text-white"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3">
            <Link
              to={`/recruitments/${id}`}
              className="px-4 py-2.5 rounded-lg bg-[#181924] text-slate-300 text-xs font-semibold hover:text-white"
            >
              취소
            </Link>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-lg bg-[#7D39EB] hover:bg-[#6025C5] text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-[#7D39EB]/30"
            >
              <Save className="w-4 h-4" />
              수정 사항 저장하기
            </button>
          </div>
        </form>
      </div>

      <PlaceholderCard
        title="게시글 수정 권한 및 상태 관리"
        description="게시글 작성자 본인만 수정/삭제할 수 있도록 Supabase RLS 정책이 적용될 예정입니다."
        assignedRole="A (수정 폼) + B (본인 인증 RLS)"
      />
    </div>
  );
};
