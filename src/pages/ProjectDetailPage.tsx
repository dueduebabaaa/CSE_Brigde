
import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, FolderKanban } from 'lucide-react';

export const ProjectDetailPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <Link
        to="/projects"
        className="inline-flex items-center gap-2 text-sm text-[#64748B] hover:text-[#7D39EB]"
      >
        <ArrowLeft className="w-4 h-4" />
        내 프로젝트로 돌아가기
      </Link>

      <div className="rounded-2xl border border-[#E2E8F0] bg-white p-10 text-center space-y-4">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-[#F4EFFE] text-[#7D39EB]">
          <FolderKanban className="h-7 w-7" />
        </div>

        <h1 className="text-xl font-bold text-[#111111]">
          프로젝트 워크스페이스 준비 중
        </h1>

        <p className="mx-auto max-w-md text-sm leading-6 text-[#64748B]">
          현재 프로젝트 멤버십 및 협업 데이터가 연결되지 않아
          워크스페이스 기능을 제공하지 않습니다.
        </p>

        <Link
          to="/projects"
          className="inline-flex items-center justify-center rounded-lg bg-[#7D39EB] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#6025C5]"
        >
          내 프로젝트 목록으로 이동
        </Link>
      </div>
    </div>
  );
};
