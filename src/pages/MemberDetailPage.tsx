import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Send, Github, Globe } from 'lucide-react';
import { PlaceholderCard } from '../components/PlaceholderCard';

export const MemberDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Link
        to="/members"
        className="inline-flex items-center gap-1.5 text-xs text-[#64748B] hover:text-[#111111] transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        팀원 목록으로 돌아가기
      </Link>

      {/* 프로필 헤더 */}
      <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 sm:p-8 space-y-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-[#7D39EB] flex items-center justify-center text-white font-black text-2xl shadow-sm">
              김
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-black text-[#111111] tracking-tight">김컴학</h1>
                <span className="px-2 py-0.5 text-xs font-bold rounded bg-[#F4EFFE] text-[#7D39EB] border border-[#7D39EB]/20">
                  플랫폼소프트웨어 · 3학년
                </span>
              </div>
              <p className="text-xs text-[#64748B] mt-1">
                희망 역할: <strong className="text-[#111111]">Frontend Developer / FullStack</strong> (ID: {id})
              </p>
            </div>
          </div>

          <button
            onClick={() => alert('팀 초대장을 발송했습니다 (예시).')}
            className="px-5 py-2.5 rounded-lg bg-[#7D39EB] hover:bg-[#6025C5] text-white text-xs font-bold flex items-center gap-2 transition-all self-start sm:self-auto shadow-sm"
          >
            <Send className="w-4 h-4" />
            내 팀으로 초대하기
          </button>
        </div>

        {/* 자기소개 */}
        <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-4 text-xs text-[#334155] leading-relaxed">
          <h4 className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider mb-1">
            자기소개 &amp; 목표
          </h4>
          컴퓨터학부 3학년 재학 중이며, 사용자 경험 중심의 반응형 웹 프론트엔드 개발에 깊은 관심이 있습니다. 이번 학기 공모전에서 성실하고 책임감 있게 끝까지 프로젝트를 완성할 팀을 찾고 있습니다.
        </div>

        {/* 기술 스택 & 관심 분야 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="bg-[#F8FAFC] p-4 rounded-xl border border-[#E2E8F0]">
            <h4 className="font-bold text-[#111111] mb-2">보유 기술 스택</h4>
            <div className="flex flex-wrap gap-1.5">
              {['React', 'TypeScript', 'TailwindCSS', 'Next.js', 'Git'].map((s) => (
                <span key={s} className="px-2 py-1 rounded bg-white text-[#64748B] border border-[#E2E8F0]">
                  {s}
                </span>
              ))}
            </div>
          </div>

          <div className="bg-[#F8FAFC] p-4 rounded-xl border border-[#E2E8F0]">
            <h4 className="font-bold text-[#111111] mb-2">배우고 싶은 기술 &amp; 관심 분야</h4>
            <div className="flex flex-wrap gap-1.5">
              {['Supabase', 'Node.js', 'LLM Agent', '클라우드 배포'].map((s) => (
                <span key={s} className="px-2 py-1 rounded bg-[#F4EFFE] text-[#7D39EB] border border-[#7D39EB]/20">
                  {s}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* 협업 링크 */}
        <div className="flex items-center gap-4 text-xs text-[#64748B] pt-2 border-t border-[#E2E8F0]">
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 hover:text-[#111111] transition-colors"
          >
            <Github className="w-4 h-4" /> GitHub 프로필
          </a>
          <a
            href="https://portfolio.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 hover:text-[#111111] transition-colors"
          >
            <Globe className="w-4 h-4" /> 포트폴리오 웹사이트
          </a>
        </div>
      </div>

      <PlaceholderCard
        title="상세 프로필 및 시간표 일치 분석"
        description="상대방이 공개 설정한 주간 가능 시간표와 본인 시간표를 오버레이 비교하여 팀 빌딩 가능성을 즉시 검토할 수 있습니다."
        assignedRole="A (프로필 UI) + C (공통 가능 시간 매칭 알고리즘)"
      />
    </div>
  );
};
