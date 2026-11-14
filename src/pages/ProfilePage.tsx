import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { User, Clock, FileText, Mail, Save } from 'lucide-react';
import { PlaceholderCard } from '../components/PlaceholderCard';

export const ProfilePage: React.FC = () => {
  const [isPublic, setIsPublic] = useState(true);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* 헤더 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-white tracking-tight">마이페이지 & 프로필 설정</h1>
            <span className="px-2 py-0.5 text-xs font-semibold rounded bg-[#C6FF33]/20 text-[#C6FF33] border border-[#C6FF33]/40">
              MY PROFILE
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            내 프로필 정보, 기술 스택, 세부전공, 공개 범위 및 지원 현황을 관리합니다.
          </p>
        </div>

        <button
          onClick={() => alert('프로필 변경 사항이 저장되었습니다 (예시).')}
          className="self-start sm:self-auto px-4 py-2 rounded-lg bg-[#C6FF33] text-black text-xs font-bold hover:bg-[#B8F224] flex items-center gap-1.5 shadow-md shadow-[#C6FF33]/20"
        >
          <Save className="w-3.5 h-3.5" />
          프로필 저장
        </button>
      </div>

      <PlaceholderCard
        title="사용자 프로필 & 온보딩 관리"
        description="이름, 학년, 세부전공, 보유 기술 스택, 희망 역할 및 개인 활동 가능 시간표를 설정하여 매칭 알고리즘의 추천 정확도를 높입니다."
        assignedRole="A (프로필 폼 UI) + B (UserProfile 스키마 & Supabase 연동)"
        plannedFeatures={[
          '개인 프로필 공개 범위 제어 (전체 공개 / 팀원에게만 공개 / 비공개)',
          '내가 작성한 팀원 모집글 및 보낸 지원서 상태(대기/수락/거절) 실시간 추적',
          '나에게 도착한 팀 초대장 수락 및 거절 승인 인터페이스',
          '주간 활동 가능 시간표(30분 단위) 개인 슬롯 설정 링크 연동',
        ]}
      />

      {/* 기본 정보 카드 */}
      <div className="bg-[#13141C] border border-[#242634] rounded-2xl p-6 sm:p-8 space-y-5">
        <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-[#242634] pb-3">
          <User className="w-4 h-4 text-[#7D39EB]" />
          학부 및 기본 정보 (프로토타입 샘플)
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div>
            <label className="block text-slate-400 font-semibold mb-1">이름 / 닉네임</label>
            <input
              type="text"
              defaultValue="김컴학"
              className="w-full px-3 py-2 rounded-lg bg-[#0B0C10] border border-[#242634] text-white font-medium"
            />
          </div>
          <div>
            <label className="block text-slate-400 font-semibold mb-1">학년</label>
            <select
              defaultValue="3학년"
              className="w-full px-3 py-2 rounded-lg bg-[#0B0C10] border border-[#242634] text-white font-medium"
            >
              <option value="1학년">1학년</option>
              <option value="2학년">2학년</option>
              <option value="3학년">3학년</option>
              <option value="4학년">4학년</option>
              <option value="대학원">대학원생</option>
            </select>
          </div>
          <div>
            <label className="block text-slate-400 font-semibold mb-1">세부 전공</label>
            <select
              defaultValue="플랫폼소프트웨어"
              className="w-full px-3 py-2 rounded-lg bg-[#0B0C10] border border-[#242634] text-white font-medium"
            >
              <option value="플랫폼소프트웨어">플랫폼소프트웨어</option>
              <option value="데이터사이언스">데이터사이언스</option>
              <option value="인공지능컴퓨팅">인공지능컴퓨팅</option>
              <option value="글로벌소프트웨어융합">글로벌소프트웨어융합</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-slate-400 font-semibold mb-1 text-xs">한 줄 자기소개</label>
          <input
            type="text"
            defaultValue="사용자 중심의 프론트엔드 개발과 인터랙션 구현을 좋아하는 3학년 학생입니다."
            className="w-full px-3 py-2 rounded-lg bg-[#0B0C10] border border-[#242634] text-white text-xs"
          />
        </div>

        {/* 공개 범위 설정 */}
        <div className="pt-4 border-t border-[#242634] flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-white block">팀원 검색 시 내 프로필 공개</span>
            <span className="text-[11px] text-slate-400">
              비공개 시 다른 학우들이 팀원 탐색 및 매칭에서 나를 검색할 수 없습니다.
            </span>
          </div>
          <button
            onClick={() => setIsPublic(!isPublic)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
              isPublic
                ? 'bg-[#C6FF33] text-black'
                : 'bg-[#181924] text-slate-400 border border-[#242634]'
            }`}
          >
            {isPublic ? '공개 중' : '비공개'}
          </button>
        </div>
      </div>

      {/* 활동 현황 퀵 바로가기 */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link
          to="/recruitments"
          className="p-4 rounded-xl bg-[#13141C] border border-[#242634] hover:border-[#7D39EB] transition-colors"
        >
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>내 모집글</span>
            <FileText className="w-4 h-4 text-[#7D39EB]" />
          </div>
          <span className="text-xl font-black text-white">1건</span>
        </Link>

        <div className="p-4 rounded-xl bg-[#13141C] border border-[#242634]">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>받은 팀 초대장</span>
            <Mail className="w-4 h-4 text-[#C6FF33]" />
          </div>
          <span className="text-xl font-black text-white">2건 (대기)</span>
        </div>

        <Link
          to="/schedule"
          className="p-4 rounded-xl bg-[#13141C] border border-[#242634] hover:border-[#7D39EB] transition-colors"
        >
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>활동 가능 시간표</span>
            <Clock className="w-4 h-4 text-sky-400" />
          </div>
          <span className="text-xs font-bold text-[#C6FF33]">설정하러 가기 →</span>
        </Link>
      </div>
    </div>
  );
};
