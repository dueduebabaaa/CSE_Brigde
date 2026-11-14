import React from 'react';
import { Link } from 'react-router-dom';
import { Users, ArrowRight } from 'lucide-react';
import { PlaceholderCard } from '../components/PlaceholderCard';

const SAMPLE_PROJECTS = [
  {
    id: 'proj-1',
    name: 'KNU 오픈소스 프론트엔드 팀',
    opportunityTitle: '2026 대학생 오픈소스 SW 개발 챌린지',
    role: '팀장 / Frontend',
    membersCount: 4,
    deadline: '2026-12-31',
    dDay: 'D-45',
    progress: 35,
  },
];

export const ProjectsPage: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-white tracking-tight">내 프로젝트</h1>
            <span className="px-2 py-0.5 text-xs font-semibold rounded bg-[#7D39EB]/20 text-[#C6FF33] border border-[#7D39EB]/30">
              WORKSPACE
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            내가 결성하거나 소속된 팀의 공모전 진행 현황, 체크리스트, 협업 도구를 관리하세요.
          </p>
        </div>
      </div>

      <PlaceholderCard
        title="팀 워크스페이스 및 프로젝트 매니저"
        description="팀 빌딩이 완료된 팀을 위한 독립 워크스페이스로, 일정 관리, 회의 조율, 작업 체크리스트 및 GitHub/Figma 연동 기능을 제공합니다."
        assignedRole="A (워크스페이스 UI) + B (Team & ProjectTask 데이터 연동)"
        plannedFeatures={[
          '내가 속한 활성 팀 및 과거 완료 프로젝트 이력 조회',
          '공모전 제출 마감일 실시간 D-Day 계산 및 알림 배너',
          '팀 공동 체크리스트 (Task 완료 여부 및 담당자 지정)',
          'GitHub 레포지토리, Figma, Notion 링크 원클릭 연결',
        ]}
      />

      {/* 프로젝트 카드 목록 */}
      <div className="space-y-4">
        <div className="text-xs text-slate-400">
          * 레이아웃 확인용 프로토타입 샘플 카드입니다.
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {SAMPLE_PROJECTS.map((proj) => (
            <div
              key={proj.id}
              className="bg-[#13141C] border border-[#242634] hover:border-[#7D39EB] rounded-2xl p-6 transition-all group flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-xs text-[#7D39EB] font-bold">
                    🎯 {proj.opportunityTitle}
                  </span>
                  <span className="px-2 py-0.5 text-xs font-bold rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                    {proj.dDay}
                  </span>
                </div>

                <Link
                  to={`/projects/${proj.id}`}
                  className="text-lg font-black text-white group-hover:text-[#C6FF33] transition-colors"
                >
                  {proj.name}
                </Link>

                <p className="text-xs text-slate-400 mt-1">
                  내 역할: <strong className="text-slate-200">{proj.role}</strong>
                </p>

                {/* 진행도 바 */}
                <div className="mt-4">
                  <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                    <span>체크리스트 진행도</span>
                    <span className="text-[#C6FF33] font-bold">{proj.progress}%</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-[#0B0C10] overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-[#7D39EB] to-[#C6FF33] rounded-full"
                      style={{ width: `${proj.progress}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-[#242634] flex items-center justify-between text-xs text-slate-400">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-slate-500" />
                  <span>팀원 {proj.membersCount}명</span>
                </div>

                <Link
                  to={`/projects/${proj.id}`}
                  className="text-[#7D39EB] group-hover:text-[#9B65F1] font-semibold flex items-center gap-1"
                >
                  워크스페이스 열기 <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
