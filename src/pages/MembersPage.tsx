import { MAJOR_TRACKS } from '../constants/majors';
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Filter, Sparkles, Send, ArrowRight } from 'lucide-react';
import { PlaceholderCard } from '../components/PlaceholderCard';

const SAMPLE_MEMBERS = [
  {
    id: 'user-1',
    name: '김프론트',
    track: '플랫폼소프트웨어',
    grade: '3학년',
    desiredRole: 'Frontend Developer',
    techStacks: ['React', 'TypeScript', 'TailwindCSS'],
    matchScore: 96,
    matchReason: '보유 기술 태그 3개 완전 일치 & 주간 활동 가능 시간 12시간 확인',
  },
  {
    id: 'user-2',
    name: '이알고리즘',
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
    matchReason: '희망 역할 일치 & 주간 활동 가능 확인',
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
            <h1 className="text-2xl font-black text-[#111111] tracking-tight">팀원 탐색 &amp; 검색</h1>
            <span className="px-2 py-0.5 text-xs font-semibold rounded bg-[#F4EFFE] text-[#7D39EB] border border-[#7D39EB]/20">
              NETWORK
            </span>
          </div>
          <p className="text-xs text-[#64748B] mt-1">
            경북대학교 컴퓨터학부 학우들의 기술 스택, 희망역할, 주간 활동 가능 시간을 한눈에 파악해 보세요.
          </p>
        </div>
      </div>

      <PlaceholderCard
        title="이름·닉네임 검색 & 프로젝트 팀원 탐색 시스템"
        description="프로젝트 역할에 맞는 최적의 동료를 보유 기술 스택, 희망 역할, 주간 활동 가능 시간을 종합하여 매칭 점수 기반으로 추천합니다."
        assignedRole="A (검색/필터 UI) + C (매칭 점수 & 추천 알고리즘)"
        plannedFeatures={[
          '이름/닉네임 기반 실시간 검색',
          'BRIDGE 세부전공 5종 필터',
          '보유 기술 스택 및 희망 역할 태그 복합 조건 필터',
          '내 프로젝트 멤버로 초대 전송 기능',
        ]}
      />

      {/* 검색 & 필터 */}
      <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 text-[#94A3B8] absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="팀원 이름, 기술 스택, 희망역할 검색..."
            value={searchName}
            onChange={(e) => setSearchName(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] focus:border-[#7D39EB] focus:outline-none focus:ring-1 focus:ring-[#7D39EB] text-xs text-[#111111] placeholder-[#94A3B8]"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto pb-1 md:pb-0">
          <Filter className="w-4 h-4 text-[#94A3B8] shrink-0" />
          {['all', ...MAJOR_TRACKS].map((track) => (
            <button
              key={track}
              onClick={() => setSelectedTrack(track)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                selectedTrack === track
                  ? 'bg-[#7D39EB] text-white'
                  : 'bg-[#F1F5F9] text-[#64748B] hover:text-[#111111]'
              }`}
            >
              {track === 'all' ? '전체 전공' : track}
            </button>
          ))}
        </div>
      </div>

      {/* 팀원 카드 목록 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {SAMPLE_MEMBERS.map((member) => (
          <div
            key={member.id}
            className="bg-white border border-[#E2E8F0] hover:border-[#7D39EB] hover:shadow-md rounded-xl p-5 flex flex-col justify-between transition-all group"
          >
            <div>
              <div className="flex items-center justify-between gap-2 mb-3">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#F4EFFE] text-[#7D39EB] border border-[#7D39EB]/20">
                  {member.track} · {member.grade}
                </span>
                <span className="text-xs text-[#5a7a00] font-bold flex items-center gap-1 bg-[#F7FEDF] px-1.5 py-0.5 rounded">
                  <Sparkles className="w-3 h-3" />
                  {member.matchScore}%
                </span>
              </div>

              <Link
                to={`/members/${member.id}`}
                className="text-lg font-bold text-[#111111] group-hover:text-[#7D39EB] transition-colors"
              >
                {member.name}
              </Link>
              <p className="text-xs text-[#64748B] mt-0.5">희망: {member.desiredRole}</p>

              <div className="mt-3 p-2.5 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0]">
                <p className="text-[11px] text-[#64748B] leading-snug">
                  ✦ <strong className="text-[#111111]">매칭 이유:</strong> {member.matchReason}
                </p>
              </div>

              <div className="flex flex-wrap gap-1.5 mt-3">
                {member.techStacks.map((tech) => (
                  <span
                    key={tech}
                    className="text-[10px] px-2 py-0.5 rounded bg-[#F1F5F9] text-[#64748B] border border-[#E2E8F0]"
                  >
                    {tech}
                  </span>
                ))}
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-[#F1F5F9] flex items-center justify-between text-xs">
              <button
                onClick={() => alert(`${member.name} 학우에게 팀 초대장을 보냈습니다 (예시).`)}
                className="px-3 py-1.5 rounded-lg bg-[#F1F5F9] hover:bg-[#7D39EB] text-[#64748B] hover:text-white transition-colors flex items-center gap-1 text-xs font-semibold"
              >
                <Send className="w-3 h-3" />
                초대하기
              </button>
              <Link
                to={`/members/${member.id}`}
                className="text-[#7D39EB] hover:text-[#6025C5] font-semibold flex items-center gap-1"
              >
                자세히 보기<ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
