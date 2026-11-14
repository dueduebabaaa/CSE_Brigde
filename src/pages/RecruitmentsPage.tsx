import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, Calendar, MapPin, ArrowRight } from 'lucide-react';
import { PlaceholderCard } from '../components/PlaceholderCard';

const SAMPLE_RECRUITMENTS = [
  {
    id: 'rec-1',
    title: '[UI 테스트 예시] 오픈소스 챌린지 프론트엔드/백엔드 팀원 모집',
    opportunityTitle: '2026 대학생 오픈소스 SW 개발 챌린지',
    author: '김컴학 (3학년)',
    roles: ['Frontend (React)', 'Backend (Node.js)'],
    activityType: '혼합 (대면+비대면)',
    status: '모집중',
    targetCount: 4,
    currentCount: 2,
    deadline: '2026-11-25',
  },
  {
    id: 'rec-2',
    title: '[UI 테스트 예시] 빅데이터 분석 및 시각화 프로젝트 팀원 구합니다',
    opportunityTitle: 'AI/빅데이터 융합 프로젝트 경진대회',
    author: '이알고 (4학년)',
    roles: ['Data Analyst', 'ML Engineer'],
    activityType: '비대면',
    status: '모집중',
    targetCount: 3,
    currentCount: 1,
    deadline: '2026-11-20',
  },
];

export const RecruitmentsPage: React.FC = () => {
  const [filterStatus, setFilterStatus] = useState('all');

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-white tracking-tight">팀원 모집 게시판</h1>
            <span className="px-2 py-0.5 text-xs font-semibold rounded bg-[#C6FF33]/20 text-[#C6FF33] border border-[#C6FF33]/40">
              RECRUIT
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            공모전과 프로젝트를 함께 완주할 동료를 직접 모집하거나 팀에 지원해 보세요.
          </p>
        </div>
        <Link
          to="/recruitments/new"
          className="self-start sm:self-auto px-4 py-2 rounded-lg bg-[#C6FF33] text-black text-xs font-bold hover:bg-[#B8F224] transition-colors flex items-center gap-1.5 shadow-md shadow-[#C6FF33]/20"
        >
          <Plus className="w-4 h-4" />
          모집글 작성하기
        </Link>
      </div>

      <PlaceholderCard
        title="팀원 모집 및 지원자 관리 시스템"
        description="학부 공식 공고 또는 사용자 입력 공모전과 직접 연결하여 팀원을 모집하고, 지원서 수락/거절을 통해 팀을 빌딩하는 공간입니다."
        assignedRole="A (게시판 UI) + B (Supabase CRUD & 지원자 RLS 보안)"
        plannedFeatures={[
          '공모전 연계 및 자율 입력 지원',
          '필요 기술 스택 및 희망 역할별 상세 태깅',
          '지원서 제출 및 작성자의 실시간 수락/거절 관리',
          '모집 완료 시 자동으로 팀 워크스페이스(내 프로젝트) 생성 연동',
        ]}
      />

      {/* 검색 & 필터 */}
      <div className="bg-[#13141C] border border-[#242634] rounded-xl p-4 flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="모집글 제목, 역할, 필요 기술 검색..."
            className="w-full pl-9 pr-4 py-2 rounded-lg bg-[#0B0C10] border border-[#242634] focus:border-[#7D39EB] focus:outline-none text-xs text-white placeholder-slate-500"
          />
        </div>

        <div className="flex items-center gap-2">
          {['all', '모집중', '모집완료'].map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                filterStatus === status
                  ? 'bg-[#7D39EB] text-white'
                  : 'bg-[#181924] text-slate-400 hover:text-white'
              }`}
            >
              {status === 'all' ? '전체 상태' : status}
            </button>
          ))}
        </div>
      </div>

      {/* 목록 */}
      <div className="space-y-3">
        <div className="text-xs text-slate-400">
          * 레이아웃 확인용 프로토타입 샘플 카드입니다.
        </div>

        {SAMPLE_RECRUITMENTS.map((rec) => (
          <div
            key={rec.id}
            className="bg-[#13141C] border border-[#242634] hover:border-[#7D39EB] rounded-xl p-5 transition-all group"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
              <span className="text-xs text-[#7D39EB] font-bold">
                🎯 {rec.opportunityTitle}
              </span>
              <span className="self-start sm:self-auto px-2 py-0.5 rounded text-[10px] font-bold bg-[#C6FF33]/15 text-[#C6FF33] border border-[#C6FF33]/30">
                {rec.status} ({rec.currentCount}/{rec.targetCount}명)
              </span>
            </div>

            <Link
              to={`/recruitments/${rec.id}`}
              className="text-base font-bold text-white group-hover:text-[#C6FF33] transition-colors"
            >
              {rec.title}
            </Link>

            <div className="flex flex-wrap gap-2 mt-3">
              {rec.roles.map((r) => (
                <span
                  key={r}
                  className="text-[11px] px-2.5 py-1 rounded-md bg-[#0B0C10] text-slate-300 border border-[#242634]"
                >
                  {r}
                </span>
              ))}
            </div>

            <div className="mt-4 pt-3 border-t border-[#242634] flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
              <div className="flex items-center gap-4">
                <span>작성자: <strong className="text-slate-200">{rec.author}</strong></span>
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-500" />
                  {rec.activityType}
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-500" />
                  마감: {rec.deadline}
                </span>
              </div>

              <Link
                to={`/recruitments/${rec.id}`}
                className="text-[#7D39EB] group-hover:text-[#9B65F1] font-semibold flex items-center gap-1"
              >
                상세보기 및 지원 <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
