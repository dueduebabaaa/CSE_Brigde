import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, ExternalLink, Users, Bookmark, Share2 } from 'lucide-react';
import { PlaceholderCard } from '../components/PlaceholderCard';

export const OpportunityDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  return (
    <div className="space-y-6">
      {/* 뒤로가기 */}
      <Link
        to="/opportunities"
        className="inline-flex items-center gap-1.5 text-xs text-[#64748B] hover:text-[#111111] transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        공모전 목록으로 돌아가기
      </Link>

      {/* 상단 공고 요약 헤더 */}
      <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 sm:p-8 space-y-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 text-xs font-bold rounded bg-[#F1F5F9] text-[#64748B] border border-[#E2E8F0]">
              테스트 샘플 (ID: {id})
            </span>
            <span className="px-2.5 py-0.5 text-xs font-semibold rounded bg-[#F4EFFE] text-[#7D39EB] border border-[#7D39EB]/20">
              해커톤/공모전
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => alert('북마크 기능은 추후 연동됩니다.')}
              className="p-2 rounded-lg bg-[#F1F5F9] hover:bg-[#E2E8F0] text-[#64748B] hover:text-[#111111] transition-colors"
              title="북마크"
            >
              <Bookmark className="w-4 h-4" />
            </button>
            <button
              onClick={() => alert('링크가 복사되었습니다 (예시).')}
              className="p-2 rounded-lg bg-[#F1F5F9] hover:bg-[#E2E8F0] text-[#64748B] hover:text-[#111111] transition-colors"
              title="공유"
            >
              <Share2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        <h1 className="text-2xl sm:text-3xl font-black text-[#111111] tracking-tight">
          [UI 테스트 예시] 2026 대학생 오픈소스 SW 개발 챌린지
        </h1>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 text-xs">
          <div className="bg-[#F8FAFC] p-3 rounded-lg border border-[#E2E8F0]">
            <span className="text-[#64748B] block mb-0.5">주최/주관</span>
            <span className="text-[#111111] font-semibold">과학기술정보통신부</span>
          </div>
          <div className="bg-[#F8FAFC] p-3 rounded-lg border border-[#E2E8F0]">
            <span className="text-[#64748B] block mb-0.5">모집 마감일</span>
            <span className="text-rose-600 font-semibold">2026-12-31 (D-45)</span>
          </div>
          <div className="bg-[#F8FAFC] p-3 rounded-lg border border-[#E2E8F0]">
            <span className="text-[#64748B] block mb-0.5">활동 형태</span>
            <span className="text-[#111111] font-semibold">온/오프라인 병행</span>
          </div>
          <div className="bg-[#F8FAFC] p-3 rounded-lg border border-[#E2E8F0]">
            <span className="text-[#64748B] block mb-0.5">추천 매칭 점수</span>
            <span className="text-[#7D39EB] font-bold">94점 (적합도 높음)</span>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 pt-2">
          <Link
            to="/recruitments/new"
            className="px-4 py-2.5 rounded-lg bg-[#7D39EB] hover:bg-[#6025C5] text-white text-xs font-bold flex items-center gap-2 transition-all shadow-sm"
          >
            <Users className="w-4 h-4" />
            이 공모전 팀원 모집글 작성하기
          </Link>
          <a
            href="https://computer.knu.ac.kr"
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2.5 rounded-lg bg-white hover:bg-[#F8FAFC] border border-[#E2E8F0] text-[#64748B] hover:text-[#111111] text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm"
          >
            <ExternalLink className="w-4 h-4" />
            컴퓨터학부 원본 공지 바로가기
          </a>
        </div>
      </div>

      {/* 안내 카드 */}
      <PlaceholderCard
        title="공고 상세 및 팀 빌딩 연계 화면"
        description="해당 공고와 직접 연결된 팀원 모집 게시글 목록, 참여 희망 학생 리스트, 그리고 알고리즘에 기반한 추천 팀원 프로필을 한곳에서 제공합니다."
        assignedRole="A (상세 UI) + B (공고 상세 API) + C (공고-팀원 추천 알고리즘)"
        plannedFeatures={[
          '공고 핵심 요약 내용 및 지원 자격, 모집 인원 표시',
          '해당 공고를 타겟으로 생성된 팀원 모집글 실시간 피드',
          '해당 활동에 관심 있는 경북대 컴퓨터학부 학생 프로필 조회',
          '기술 스택 일치도 기반 최적 팀원 AI 추천 위젯',
        ]}
      />
    </div>
  );
};
