import React from 'react';
import { Link } from 'react-router-dom';
import { Compass, AlertCircle } from 'lucide-react';

export const NotFoundPage: React.FC = () => {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-6 space-y-4">
      <div className="w-16 h-16 rounded-2xl bg-[#F4EFFE] text-[#7D39EB] border border-[#7D39EB]/30 flex items-center justify-center">
        <AlertCircle className="w-8 h-8" />
      </div>
      <h1 className="text-4xl font-black text-[#111111]">404</h1>
      <h2 className="text-lg font-bold text-[#111111]">페이지를 찾을 수 없습니다</h2>
      <p className="text-xs text-[#64748B] max-w-sm">
        요청하신 페이지가 존재하지 않거나 잘못된 경로입니다. 메인 홈 대시보드로 이동해 보세요.
      </p>
      <Link
        to="/"
        className="px-5 py-2.5 rounded-lg bg-[#7D39EB] hover:bg-[#6025C5] text-white text-xs font-bold flex items-center gap-2 transition-all shadow-sm mt-2"
      >
        <Compass className="w-4 h-4" />
        홈 대시보드로 이동
      </Link>
    </div>
  );
};
