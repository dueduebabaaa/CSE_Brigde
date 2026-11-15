import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Filter, Calendar, ArrowRight } from 'lucide-react';
import { PlaceholderCard } from '../components/PlaceholderCard';

// 임시 화면용 테스트 샘플 (공식 공고가 아닌 프로토타입 UI 레이아웃 확인용 목업)
const SAMPLE_OPPORTUNITIES = [
  {
    id: 'sample-1',
    title: '[UI 테스트 예시] 2026 대학생 오픈소스 SW 개발 챌린지',
    organizer: '과학기술정보통신부 (예시)',
    category: '해커톤/공모전',
    sourceType: 'user_manual',
    sourceLabel: '테스트용 샘플',
    deadline: '2026-12-31',
    tags: ['React', 'TypeScript', 'OpenSource'],
    recommendedScore: 94,
  },
  {
    id: 'sample-2',
    title: '[UI 테스트 예시] AI/빅데이터 융합 프로젝트 경진대회',
    organizer: '대구디지털혁신진흥원 (예시)',
    category: '경진대회',
    sourceType: 'user_manual',
    sourceLabel: '테스트용 샘플',
    deadline: '2026-11-30',
    tags: ['Python', 'PyTorch', 'Data'],
    recommendedScore: 88,
  },
];

export const OpportunitiesPage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  return (
    <div className="space-y-6">
      {/* 상단 타이틀 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-[#111111] tracking-tight">공모전 &amp; 대외활동 탐색</h1>
            <span className="px-2 py-0.5 text-xs font-semibold rounded bg-[#F4EFFE] text-[#7D39EB] border border-[#7D39EB]/20">
              EXPLORE
            </span>
          </div>
          <p className="text-xs text-[#64748B] mt-1">
            컴퓨터학부 공식 홈페이지 공고와 직접 등록된 교내외 공모전을 탐색하고 팀원을 모집해 보세요.
          </p>
        </div>
        <Link
          to="/recruitments/new"
          className="self-start sm:self-auto px-4 py-2 rounded-lg bg-[#C6FF33] text-black text-xs font-bold hover:bg-[#B8F224] transition-colors"
        >
          + 이 공모전으로 팀원 모집
        </Link>
      </div>

      {/* 안내 카드 */}
      <PlaceholderCard
        title="공고 수집 및 탐색 시스템"
        description="학부 홈페이지 크롤러 연동 후 실시간 공고가 수집되며, 수집된 공식 공고와 사용자/관리자가 직접 등록한 공고의 출처를 명확히 구분하여 표시합니다."
        assignedRole="A (프론트엔드/필터링) + B (크롤러 & DB) + C (추천 점수)"
        plannedFeatures={[
          '학부 공식 홈페이지 크롤링 데이터 자동 동기화 (Source 배지 구분)',
          '분야별(해커톤, 경진대회, 서포터즈, 교육) 다중 필터링',
          '마감 임박순 / 최신순 / 내 관심도 추천순 정렬',
          '원문 게시글 링크 및 공식 지원 페이지 원클릭 연결',
          '관심 공고 원클릭 북마크 보관함 연동',
        ]}
      />

      {/* 검색 및 필터 바 */}
      <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 flex flex-col md:flex-row gap-3 items-center justify-between shadow-sm">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 text-[#94A3B8] absolute left-3 top-3" />
          <input
            type="text"
            placeholder="공모전 제목, 키워드, 기술 스택 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] focus:border-[#7D39EB] focus:outline-none text-xs text-[#111111] placeholder-[#94A3B8]"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          <Filter className="w-4 h-4 text-[#94A3B8] shrink-0" />
          {['all', '해커톤', '경진대회', '대외활동', '교육/특강'].map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                selectedCategory === cat
                  ? 'bg-[#7D39EB] text-white shadow-sm'
                  : 'bg-[#F1F5F9] text-[#64748B] hover:text-[#111111]'
              }`}
            >
              {cat === 'all' ? '전체 보기' : cat}
            </button>
          ))}
        </div>
      </div>

      {/* 프로토타입 목업 공고 카드 목록 */}
      <div className="space-y-4">
        <div className="text-xs text-[#64748B] flex items-center justify-between">
          <span>* 아래 목록은 레이아웃 확인용 프로토타입 샘플 카드입니다. (크롤링 전)</span>
          <span>총 2건 예시 표시</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {SAMPLE_OPPORTUNITIES.map((opp) => (
            <div
              key={opp.id}
              className="bg-white border border-[#E2E8F0] hover:border-[#7D39EB] hover:shadow-md rounded-xl p-5 flex flex-col justify-between transition-all group shadow-sm"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#F1F5F9] text-[#64748B] border border-[#E2E8F0]">
                    {opp.sourceLabel}
                  </span>
                  <span className="text-xs text-[#7D39EB] font-bold bg-[#F4EFFE] px-1.5 py-0.5 rounded">
                    추천 매칭도 {opp.recommendedScore}%
                  </span>
                </div>

                <Link
                  to={`/opportunities/${opp.id}`}
                  className="text-base font-bold text-[#111111] group-hover:text-[#7D39EB] transition-colors line-clamp-2"
                >
                  {opp.title}
                </Link>

                <p className="text-xs text-[#64748B] mt-1">주최: {opp.organizer}</p>

                <div className="flex flex-wrap gap-1.5 mt-3">
                  {opp.tags.map((t) => (
                    <span
                      key={t}
                      className="text-[10px] px-2 py-0.5 rounded bg-[#F8FAFC] text-[#64748B] border border-[#E2E8F0]"
                    >
                      #{t}
                    </span>
                  ))}
                </div>
              </div>

              <div className="mt-5 pt-4 border-t border-[#E2E8F0] flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 text-[#64748B]">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>마감: {opp.deadline}</span>
                </div>
                <Link
                  to={`/opportunities/${opp.id}`}
                  className="text-[#7D39EB] group-hover:text-[#6025C5] font-semibold flex items-center gap-1"
                >
                  상세보기 <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
