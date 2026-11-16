import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, Calendar, MapPin, ArrowRight } from 'lucide-react';
import { PlaceholderCard } from '../components/PlaceholderCard';

const SAMPLE_RECRUITMENTS = [
  {
    id: 'rec-1',
    title: '[UI 프로토타입 예시] 오픈소스 컨트리뷰션 아카데미 프론트엔드 팀원 모집',
    opportunityTitle: '2026 하계방학 오픈소스 SW 집중 아카데미',
    author: '김프론트 (3학년)',
    roles: ['Frontend (React)', 'Backend (Node.js)'],
    activityType: '온라인 (전국)',
    status: '모집중',
    targetCount: 4,
    currentCount: 2,
    deadline: '2026-11-25',
  },
  {
    id: 'rec-2',
    title: '[UI 프로토타입 예시] 데이터 분석 기반 환경 보호 프로젝트 팀원 모집합니다',
    opportunityTitle: 'AI/데이터 활용 프로젝트 경진대회',
    author: '이알고리즘(4학년)',
    roles: ['Data Analyst', 'ML Engineer'],
    activityType: '오프라인',
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
            <h1 className="text-2xl font-black text-[#111111] tracking-tight">팀원 모집 게시판</h1>
            <span className="px-2 py-0.5 text-xs font-semibold rounded bg-[#F7FEDF] text-[#5a7a00] border border-[#C6FF33]/40">
              RECRUIT
            </span>
          </div>
          <p className="text-xs text-[#64748B] mt-1">
            원하는 프로젝트를 위한 팀원을 직접 모집하거나 지원서를 작성해 팀에 합류해 보세요.
          </p>
        </div>
        <Link
          to="/recruitments/new"
          className="self-start sm:self-auto px-4 py-2 rounded-lg bg-[#C6FF33] text-black text-xs font-bold hover:bg-[#B8F224] transition-colors flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" />
          모집글 작성하기
        </Link>
      </div>

      <PlaceholderCard
        title="팀원 모집 및 지원자 관리 시스템"
        description="공모전 연결 공고 또는 사용자 직접 작성 게시글에 지원하고, 지원서 확인/수락/거절을 통해 팀을 구성하는 플랫폼입니다."
        assignedRole="A (게시판 UI) + B (Supabase CRUD & 지원자 RLS 연동)"
        plannedFeatures={[
          '공모전 연결 여부 및 모집 중 상태 필터',
          '필요 기술 태그 및 활동 형태 기반 정렬',
          '지원서 제출 및 작성자의 수락/거절 알림/알림',
          '모집 완료 시 자동으로 팀 워크스페이스(내 프로젝트) 생성 연동',
        ]}
      />

      {/* 검색 & 필터 */}
      <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 text-[#94A3B8] absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="모집글 제목, 역할, 필요 기술 검색..."
            className="w-full pl-9 pr-4 py-2 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] focus:border-[#7D39EB] focus:outline-none focus:ring-1 focus:ring-[#7D39EB] text-xs text-[#111111] placeholder-[#94A3B8]"
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
                  : 'bg-[#F1F5F9] text-[#64748B] hover:text-[#111111]'
              }`}
            >
              {status === 'all' ? '전체 상태' : status}
            </button>
          ))}
        </div>
      </div>

      {/* 목록 */}
      <div className="space-y-3">
        <div className="text-xs text-[#94A3B8]">
          * 아래는 확인용 프로토타입 샘플 데이터입니다.
        </div>

        {SAMPLE_RECRUITMENTS.map((rec) => (
          <div
            key={rec.id}
            className="bg-white border border-[#E2E8F0] hover:border-[#7D39EB] hover:shadow-md rounded-xl p-5 transition-all group"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
              <span className="text-xs text-[#7D39EB] font-bold">
                ↗ {rec.opportunityTitle}
              </span>
              <span className="self-start sm:self-auto px-2 py-0.5 rounded text-[10px] font-bold bg-[#F7FEDF] text-[#5a7a00] border border-[#C6FF33]/40">
                {rec.status} ({rec.currentCount}/{rec.targetCount}명)
              </span>
            </div>

            <Link
              to={`/recruitments/${rec.id}`}
              className="text-base font-bold text-[#111111] group-hover:text-[#7D39EB] transition-colors"
            >
              {rec.title}
            </Link>

            <div className="flex flex-wrap gap-2 mt-3">
              {rec.roles.map((r) => (
                <span
                  key={r}
                  className="text-[11px] px-2.5 py-1 rounded-md bg-[#F1F5F9] text-[#64748B] border border-[#E2E8F0]"
                >
                  {r}
                </span>
              ))}
            </div>

            <div className="mt-4 pt-3 border-t border-[#F1F5F9] flex flex-wrap items-center justify-between gap-3 text-xs text-[#94A3B8]">
              <div className="flex items-center gap-4">
                <span>작성자: <strong className="text-[#64748B]">{rec.author}</strong></span>
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" />
                  {rec.activityType}
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  마감: {rec.deadline}
                </span>
              </div>

              <Link
                to={`/recruitments/${rec.id}`}
                className="text-[#7D39EB] hover:text-[#6025C5] font-semibold flex items-center gap-1"
              >
                자세히 보기 / 지원하기<ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
