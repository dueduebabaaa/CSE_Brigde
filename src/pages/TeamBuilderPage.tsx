import React, { useState } from 'react';
import { Sparkles, Users, AlertCircle, Plus, Save } from 'lucide-react';
import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import { PlaceholderCard } from '../components/PlaceholderCard';

// 역량 시각화용 샘플 레이더 차트 데이터
const RADAR_DATA = [
  { subject: 'Frontend', A: 85, fullMark: 100 },
  { subject: 'Backend', A: 40, fullMark: 100 },
  { subject: 'Database', A: 45, fullMark: 100 },
  { subject: 'AI/Data', A: 30, fullMark: 100 },
  { subject: 'DevOps', A: 20, fullMark: 100 },
  { subject: 'UI/UX', A: 75, fullMark: 100 },
];

export const TeamBuilderPage: React.FC = () => {
  const [teamMembers] = useState([
    { name: '김컴학 (나)', role: 'Frontend / UI', ready: true },
    { name: '이알고', role: 'Algorithm / AI', ready: true },
  ]);

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-white tracking-tight">스마트 팀 빌더</h1>
            <span className="px-2 py-0.5 text-xs font-semibold rounded bg-[#C6FF33]/20 text-[#C6FF33] border border-[#C6FF33]/40">
              TEAM ANALYZER
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            팀원 구성에 따른 기술 역량 균형도, 필수 역할 충족 여부, 부족한 포지션을 실시간으로 분석합니다.
          </p>
        </div>

        <button
          onClick={() => alert('팀 구성이 저장되었습니다 (예시).')}
          className="self-start sm:self-auto px-4 py-2 rounded-lg bg-[#C6FF33] text-black text-xs font-bold hover:bg-[#B8F224] flex items-center gap-2 shadow-md shadow-[#C6FF33]/20"
        >
          <Save className="w-4 h-4" />
          현재 팀 구성 저장하기
        </button>
      </div>

      <PlaceholderCard
        title="팀 빌더 및 역량 시각화 엔진"
        description="팀원을 실시간으로 추가/제거하면서 팀의 전체 기술 역량 레이더 차트, 포지션 결손 경고, 그리고 공통 주간 가능 시간의 변화를 즉시 시뮬레이션합니다."
        assignedRole="C (팀 밸런스 분석 & 보완 인재 추천 알고리즘) + A (Recharts 시각화)"
        plannedFeatures={[
          '팀원 조합별 기술 역량 커버리지 다각형 레이더 차트 실시간 렌더링',
          '부족한 포지션(예: 백엔드/DevOps) 자동 감지 및 보완 팀원 1-Click 추천',
          '팀원 변동에 따른 주간 공통 가능 시간(회의 가능 슬롯) 실시간 재계산',
          '최종 확정 팀 구성 저장 및 프로젝트 워크스페이스 원클릭 연동',
        ]}
      />

      {/* 분석 대시보드 그리드 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 현재 팀원 목록 */}
        <div className="bg-[#13141C] border border-[#242634] rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Users className="w-4 h-4 text-[#7D39EB]" />
              현재 팀 구성 (2/4명)
            </h3>
            <button
              onClick={() => alert('팀원 추가 모달이 열립니다 (예시).')}
              className="text-xs text-[#C6FF33] hover:underline flex items-center gap-1 font-semibold"
            >
              <Plus className="w-3.5 h-3.5" /> 후보 추가
            </button>
          </div>

          <div className="space-y-2">
            {teamMembers.map((m, idx) => (
              <div
                key={idx}
                className="p-3 rounded-lg bg-[#0B0C10] border border-[#242634] flex items-center justify-between"
              >
                <div>
                  <div className="text-xs font-bold text-white">{m.name}</div>
                  <div className="text-[11px] text-slate-400">{m.role}</div>
                </div>
                <span className="w-2 h-2 rounded-full bg-[#C6FF33]" />
              </div>
            ))}
          </div>

          {/* 역량 경고 배너 */}
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <strong className="block font-semibold">부족한 역할 감지</strong>
              현재 Backend 및 DevOps 포지션이 비어있습니다. 해당 분야 팀원을 영입하는 것을 권장합니다.
            </div>
          </div>
        </div>

        {/* 팀 역량 시각화 레이더 차트 */}
        <div className="bg-[#13141C] border border-[#242634] rounded-2xl p-5 flex flex-col justify-between">
          <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-2">
            <Sparkles className="w-4 h-4 text-[#C6FF33]" />
            팀 기술 역량 균형도 (시각화 프리뷰)
          </h3>
          <div className="w-full h-60">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={RADAR_DATA}>
                <PolarGrid stroke="#242634" />
                <PolarAngleAxis dataKey="subject" stroke="#94a3b8" tick={{ fontSize: 11 }} />
                <PolarRadiusAxis stroke="#334155" />
                <Radar name="팀 역량" dataKey="A" stroke="#7D39EB" fill="#7D39EB" fillOpacity={0.4} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
          <p className="text-[11px] text-slate-500 text-center">
            * Recharts 라이브러리를 활용한 반응형 팀 역량 시각화 샘플
          </p>
        </div>

        {/* 추천 보완 팀원 */}
        <div className="bg-[#13141C] border border-[#242634] rounded-2xl p-5 space-y-3">
          <h3 className="text-sm font-bold text-white">결손 역량 보완 추천 인재</h3>
          <div className="p-3 rounded-lg bg-[#0B0C10] border border-[#242634] space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white">박데이터 (2학년)</span>
              <span className="text-[10px] text-[#C6FF33] font-bold">적합도 94%</span>
            </div>
            <p className="text-[11px] text-slate-400">
              추천 이유: 부족한 Backend/DB 역량을 100% 보완 가능하며 금요일/주말 회의 가능
            </p>
            <button
              onClick={() => alert('팀 후보에 추가했습니다 (예시).')}
              className="w-full py-1.5 rounded bg-[#7D39EB]/20 hover:bg-[#7D39EB]/30 text-[#C6FF33] text-xs font-semibold border border-[#7D39EB]/40 transition-colors"
            >
              + 후보 명단에 담기
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
