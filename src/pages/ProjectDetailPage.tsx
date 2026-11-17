import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Calendar, CheckSquare, Github, Figma, Plus } from 'lucide-react';
import { PlaceholderCard } from '../components/PlaceholderCard';

export const ProjectDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  return (
    <div className="space-y-6">
      <Link
        to="/projects"
        className="inline-flex items-center gap-1.5 text-xs text-[#64748B] hover:text-[#111111] transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        내 프로젝트 목록으로 돌아가기
      </Link>

      {/* 프로젝트 헤더 */}
      <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 sm:p-8 space-y-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="text-xs font-bold text-[#7D39EB]">
            참여 공모전: 2026 대학생 오픈소스 SW 개발 챌린지 (ID: {id})
          </span>
          <span className="px-2.5 py-0.5 rounded text-xs font-bold bg-rose-50 text-rose-600 border border-rose-200">
            제출 마감: D-45
          </span>
        </div>

        <h1 className="text-2xl sm:text-3xl font-black text-[#111111] tracking-tight">
          KNU 오픈소스 프론트엔드 팀 워크스페이스
        </h1>

        {/* 협업 도구 바로가기 */}
        <div className="flex flex-wrap gap-2 pt-2">
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1.5 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] hover:border-[#CBD5E1] text-xs font-semibold text-[#64748B] hover:text-[#111111] flex items-center gap-1.5 transition-colors"
          >
            <Github className="w-3.5 h-3.5" /> GitHub 레포지토리
          </a>
          <a
            href="https://figma.com"
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1.5 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] hover:border-[#CBD5E1] text-xs font-semibold text-[#64748B] hover:text-[#111111] flex items-center gap-1.5 transition-colors"
          >
            <Figma className="w-3.5 h-3.5" /> Figma 디자인
          </a>
          <Link
            to="/schedule"
            className="px-3 py-1.5 rounded-lg bg-[#F4EFFE] border border-[#7D39EB]/30 hover:bg-[#7D39EB] hover:text-white text-xs font-semibold text-[#7D39EB] flex items-center gap-1.5 transition-colors"
          >
            <Calendar className="w-3.5 h-3.5" /> 팀 시간표 조율
          </Link>
        </div>
      </div>

      <PlaceholderCard
        title="팀 체크리스트 및 회의록 관리 화면"
        description="팀원들이 함께 완수해야 할 체크리스트 항목을 추가하고 담당자를 지정하여 실시간 진행 상황을 관리합니다."
        assignedRole="A (체크리스트 UI) + B (Supabase 실시간 연동)"
        plannedFeatures={[
          '체크리스트 항목 추가, 체크 및 마감일 지정',
          '팀원별 담당 역할 배정 및 프로필 카드 표시',
          '정기 회의 링크(Google Meet/Zoom) 등록 및 지난 회의록 저장',
        ]}
      />

      {/* 목업 체크리스트 섹션 */}
      <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 space-y-4 shadow-sm">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-[#111111] flex items-center gap-2">
            <CheckSquare className="w-4 h-4 text-[#7D39EB]" />
            프로젝트 체크리스트 (샘플 프리뷰)
          </h3>
          <button
            onClick={() => alert('체크리스트 항목 추가는 추후 연동됩니다.')}
            className="text-xs text-[#7D39EB] hover:underline flex items-center gap-1 font-semibold"
          >
            <Plus className="w-3.5 h-3.5" /> 항목 추가
          </button>
        </div>

        <div className="space-y-2 text-xs">
          {[
            { title: '학부 공모전 참가 신청서 제출', done: true, assignee: '김컴학' },
            { title: 'GitHub 저장소 초기 환경 설정 및 PR 템플릿 작성', done: true, assignee: '이알고' },
            { title: '핵심 기능 UI 와이어프레임 설계', done: false, assignee: '김컴학' },
            { title: 'Supabase DB 스키마 및 API 설계', done: false, assignee: '박데이터' },
          ].map((item, idx) => (
            <div
              key={idx}
              className="p-3 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  defaultChecked={item.done}
                  className="rounded border-[#CBD5E1] text-[#7D39EB] focus:ring-0"
                />
                <span className={item.done ? 'line-through text-[#94A3B8]' : 'text-[#111111]'}>
                  {item.title}
                </span>
              </div>
              <span className="text-[11px] px-2 py-0.5 rounded bg-white text-[#64748B] border border-[#E2E8F0]">
                담당: {item.assignee}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
