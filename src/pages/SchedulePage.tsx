import React, { useState } from 'react';
import { Sparkles, Save } from 'lucide-react';
import { PlaceholderCard } from '../components/PlaceholderCard';

const DAYS = ['월', '화', '수', '목', '금', '토', '일'];
const SAMPLE_TIMES = ['09:00', '11:00', '13:00', '15:00', '17:00', '19:00', '21:00'];

export const SchedulePage: React.FC = () => {
  const [selectedMode, setSelectedMode] = useState<'my' | 'team'>('team');

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-[#111111] tracking-tight">주간 시간표 &amp; 회의 조율</h1>
            <span className="px-2 py-0.5 text-xs font-semibold rounded bg-[#F4EFFE] text-[#7D39EB] border border-[#7D39EB]/20">
              TIME SYNC
            </span>
          </div>
          <p className="text-xs text-[#64748B] mt-1">
            한국 시간(Asia/Seoul) 기준, 30분 단위 슬롯으로 팀원 간 공통 가능 시간을 계산하고 최적의 회의 시간을 찾습니다.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="p-1 rounded-lg bg-white border border-[#E2E8F0] flex items-center text-xs shadow-sm">
            <button
              onClick={() => setSelectedMode('team')}
              className={`px-3 py-1.5 rounded-md font-semibold transition-colors ${
                selectedMode === 'team'
                  ? 'bg-[#7D39EB] text-white shadow-sm'
                  : 'text-[#64748B] hover:text-[#111111]'
              }`}
            >
              팀 전체 히트맵
            </button>
            <button
              onClick={() => setSelectedMode('my')}
              className={`px-3 py-1.5 rounded-md font-semibold transition-colors ${
                selectedMode === 'my'
                  ? 'bg-[#7D39EB] text-white shadow-sm'
                  : 'text-[#64748B] hover:text-[#111111]'
              }`}
            >
              내 가능 시간 등록
            </button>
          </div>

          <button
            onClick={() => alert('시간표 저장이 완료되었습니다 (예시).')}
            className="px-3.5 py-2 rounded-lg bg-[#C6FF33] text-black text-xs font-bold hover:bg-[#B8F224] flex items-center gap-1.5 transition-colors"
          >
            <Save className="w-3.5 h-3.5" />
            저장
          </button>
        </div>
      </div>

      <PlaceholderCard
        title="30분 슬롯 주간 히트맵 및 회의 시간 추천 엔진"
        description="월~일 주간 48개 슬롯(30분 단위)을 바탕으로 팀원 전원 일치 시간 및 최대 인원 참여 가능 시간을 분석하여 1~2시간 연속 회의 슬롯을 자동 추천합니다."
        assignedRole="C (시간표 교차 계산 및 연속 회의 슬롯 추천 알고리즘) + A (드래그 인터랙션 UI)"
        plannedFeatures={[
          '마우스 드래그를 통한 30분 단위 개인 활동 가능 시간 간편 토글',
          '팀원 수에 따른 5단계 컬러 히트맵 (Dark → Violet → Lime 하이라이트)',
          '팀원 전원 가능 시간 우선 추천 & 미존재 시 최대 참여자 기준 차선 슬롯 추천',
          '추천된 시간을 프로젝트 회의 일정(Meeting)으로 원클릭 등록 연동',
        ]}
      />

      {/* 추천 회의 시간 배너 */}
      <div className="p-4 rounded-xl bg-white border border-[#7D39EB]/30 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-[#C6FF33] text-black font-black">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-bold text-[#111111] flex items-center gap-2">
              <span>최적 회의 추천 시간:</span>
              <span className="text-[#7D39EB] font-bold">매주 화요일 19:00 ~ 21:00 (2시간 연속)</span>
            </div>
            <p className="text-[11px] text-[#64748B]">
              현재 참여 팀원 3명 전원(100%) 참석 가능 슬롯입니다.
            </p>
          </div>
        </div>

        <button
          onClick={() => alert('화요일 19:00 정기 회의로 등록되었습니다 (예시).')}
          className="w-full sm:w-auto px-4 py-2 rounded-lg bg-[#7D39EB] hover:bg-[#6025C5] text-white text-xs font-bold transition-all shadow-sm shrink-0"
        >
          이 시간으로 회의 확정
        </button>
      </div>

      {/* 주간 시간표 그리드 프리뷰 */}
      <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 overflow-x-auto shadow-sm">
        <div className="min-w-[600px]">
          <div className="grid grid-cols-8 gap-2 text-center text-xs font-bold text-[#64748B] pb-3 border-b border-[#E2E8F0]">
            <div>시간</div>
            {DAYS.map((d) => (
              <div key={d} className="text-[#111111]">
                {d}요일
              </div>
            ))}
          </div>

          <div className="divide-y divide-[#E2E8F0] text-xs">
            {SAMPLE_TIMES.map((time, rowIdx) => (
              <div key={time} className="grid grid-cols-8 gap-2 py-2.5 items-center">
                <div className="text-[#64748B] font-mono text-[11px] text-center">{time}</div>
                {DAYS.map((_, colIdx) => {
                  const isFullMatch = (rowIdx === 5 && colIdx === 1) || (rowIdx === 6 && colIdx === 1);
                  const isPartial = (rowIdx + colIdx) % 3 === 0;

                  return (
                    <div
                      key={colIdx}
                      className={`h-9 rounded-md flex items-center justify-center text-[10px] font-semibold transition-all cursor-pointer ${
                        isFullMatch
                          ? 'bg-[#C6FF33] text-black font-bold shadow-sm border border-[#B8F224]'
                          : isPartial
                          ? 'bg-[#F4EFFE] text-[#7D39EB] border border-[#7D39EB]/30'
                          : 'bg-[#F8FAFC] text-[#94A3B8] border border-[#E2E8F0] hover:border-[#7D39EB]'
                      }`}
                      title={isFullMatch ? '전원 가능 (3/3명)' : isPartial ? '일부 가능 (2/3명)' : '가능 인원 없음'}
                    >
                      {isFullMatch ? '전원가능' : isPartial ? '2명' : ''}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-[#E2E8F0] flex items-center justify-end gap-4 text-xs text-[#64748B]">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-[#C6FF33] border border-[#B8F224]" />
            <span>전원 가능 (추천)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-[#F4EFFE] border border-[#7D39EB]/30" />
            <span>부분 가능</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-[#F8FAFC] border border-[#E2E8F0]" />
            <span>불가</span>
          </div>
        </div>
      </div>
    </div>
  );
};
