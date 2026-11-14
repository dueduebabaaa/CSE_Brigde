import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Filter, Sparkles, Send, ArrowRight } from 'lucide-react';
import { PlaceholderCard } from '../components/PlaceholderCard';

const SAMPLE_MEMBERS = [
  {
    id: 'user-1',
    name: '김컴학',
    track: '플랫폼소프트웨어',
    grade: '3학년',
    desiredRole: 'Frontend Developer',
    techStacks: ['React', 'TypeScript', 'TailwindCSS'],
    matchScore: 96,
    matchReason: '보유 기술 스택 3개 일치 & 주간 공통 가능 시간 12시간 확보',
  },
  {
    id: 'user-2',
    name: '이알고',
    track: '인공지능컴퓨팅',
    grade: '4학년',
    desiredRole: 'ML Engineer',
    techStacks: ['Python', 'PyTorch', 'FastAPI'],
    matchScore: 89,
    matchReason: '인공지능 프로젝트 경험 보유 & 희망 역할 일치',
  },
  {
    id: 'user-3',
    name: '박데이터',
    track: '데이터사이언스',
    grade: '2학년',
    desiredRole: 'Backend Developer',
    techStacks: ['Java', 'Spring Boot', 'PostgreSQL'],
    matchScore: 82,
    matchReason: '희망 역할 일치 & 주말 활동 가능',
  },
];

export const MembersPage: React.FC = () => {
  const [searchName, setSearchName] = useState('');
  const [selectedTrack, setSelectedTrack] = useState('all');

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-white tracking-tight">팀원 탐색 & 매칭</h1>
            <span className="px-2 py-0.5 text-xs font-semibold rounded bg-[#7D39EB]/20 text-[#C6FF33] border border-[#7D39EB]/30">
              NETWORK
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            경북대 컴퓨터학부 학우들의 기술 스택, 세부전공, 주간 가능 시간을 바탕으로 최적의 동료를 찾아보세요.
          </p>
        </div>
      </div>

      <PlaceholderCard
        title="스마트 팀원 매칭 & 프로필 탐색 시스템"
        description="프로필 공개에 동의한 학부생들의 보유 기술 스택, 희망 역할, 시간표 일치도를 종합 분석하여 팀 적합도 점수와 추천 이유를 함께 제공합니다."
        assignedRole="A (탐색/필터 UI) + C (매칭 적합도 & 추천 알고리즘)"
        plannedFeatures={[
          '이름/닉네임 부분 일치 실시간 검색',
          '컴퓨터학부 세부전공(플랫폼소프트웨어, 데이터사이언스, 인공지능 등) 필터',
          '보유 기술 스택 및 희망 역할 다중 선택 필터링',
          '팀 프로젝트 다이렉트 초대장 발송 기능',
        ]}
      />

      {/* 검색 & 필터 */}
      <div className="bg-[#13141C] border border-[#242634] rounded-xl p-4 flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="팀원 이름, 기술 스택, 관심사 검색..."
            value={searchName}
            onChange={(e) => setSearchName(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-lg bg-[#0B0C10] border border-[#242634] focus:border-[#7D39EB] focus:outline-none text-xs text-white placeholder-slate-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          <Filter className="w-4 h-4 text-slate-400 shrink-0" />
          {['all', '플랫폼소프트웨어', '데이터사이언스', '인공지능컴퓨팅'].map((track) => (
            <button
              key={track}
              onClick={() => setSelectedTrack(track)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                selectedTrack === track
                  ? 'bg-[#7D39EB] text-white'
                  : 'bg-[#181924] text-slate-400 hover:text-white'
              }`}
            >
              {track === 'all' ? '전체 트랙' : track}
            </button>
          ))}
        </div>
      </div>

      {/* 팀원 카드 목록 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {SAMPLE_MEMBERS.map((member) => (
          <div
            key={member.id}
            className="bg-[#13141C] border border-[#242634] hover:border-[#7D39EB] rounded-xl p-5 flex flex-col justify-between transition-all group"
          >
            <div>
              <div className="flex items-center justify-between gap-2 mb-3">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#7D39EB]/15 text-[#7D39EB] border border-[#7D39EB]/30">
                  {member.track} · {member.grade}
                </span>
                <span className="text-xs text-[#C6FF33] font-bold flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  {member.matchScore}%
                </span>
              </div>

              <Link
                to={`/members/${member.id}`}
                className="text-lg font-bold text-white group-hover:text-[#C6FF33] transition-colors"
              >
                {member.name}
              </Link>
              <p className="text-xs text-slate-400 mt-0.5">희망: {member.desiredRole}</p>

              <div className="mt-3 p-2.5 rounded-lg bg-[#0B0C10] border border-[#242634]">
                <p className="text-[11px] text-slate-400 leading-snug">
                  💡 <strong className="text-slate-300">추천 이유:</strong> {member.matchReason}
                </p>
              </div>

              <div className="flex flex-wrap gap-1.5 mt-3">
                {member.techStacks.map((tech) => (
                  <span
                    key={tech}
                    className="text-[10px] px-2 py-0.5 rounded bg-[#181924] text-slate-300"
                  >
                    {tech}
                  </span>
                ))}
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-[#242634] flex items-center justify-between text-xs">
              <button
                onClick={() => alert(`${member.name} 학우에게 팀 초대장을 발송했습니다 (예시).`)}
                className="px-3 py-1.5 rounded-lg bg-[#181924] hover:bg-[#7D39EB] text-slate-300 hover:text-white transition-colors flex items-center gap-1 text-xs font-semibold"
              >
                <Send className="w-3 h-3" />
                초대하기
              </button>
              <Link
                to={`/members/${member.id}`}
                className="text-[#7D39EB] group-hover:text-[#9B65F1] font-semibold flex items-center gap-1"
              >
                상세 프로필 <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
