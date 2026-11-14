import React from 'react';
import { ShieldAlert, Play, Plus, CheckCircle2, Clock } from 'lucide-react';
import { PlaceholderCard } from '../components/PlaceholderCard';

export const AdminOpportunitiesPage: React.FC = () => {

  return (
    <div className="space-y-6">
      {/* 관리자 권한 경고 배너 */}
      <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 shrink-0 text-amber-400" />
          <span>
            <strong>관리자 전용 페이지:</strong> 본 페이지는 학부 공고 자동 수집 모니터링 및 수동 공고 관리를 위한 관리자 구역입니다.
          </span>
        </div>
        <span className="px-2 py-0.5 rounded bg-amber-500/20 text-[10px] font-bold border border-amber-500/30">
          Admin Role Required
        </span>
      </div>

      {/* 헤더 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">공고 및 크롤러 수집 관리</h1>
          <p className="text-xs text-slate-400 mt-1">
            경북대학교 컴퓨터학부 공식 홈페이지 공고 수집 주기, 실행 로그 및 관리자 직접 등록을 관리합니다.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => alert('수동 수집 실행은 GitHub Actions workflow_dispatch 또는 서버리스 API로 트리거됩니다.')}
            className="px-4 py-2 rounded-lg bg-[#7D39EB] hover:bg-[#6025C5] text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-[#7D39EB]/30 transition-all"
          >
            <Play className="w-3.5 h-3.5" />
            공고 즉시 수집 실행 (수동)
          </button>
          <button
            onClick={() => alert('관리자 직접 공고 등록 모달은 추후 연동됩니다.')}
            className="px-4 py-2 rounded-lg bg-[#C6FF33] hover:bg-[#B8F224] text-black text-xs font-bold flex items-center gap-2 shadow-md shadow-[#C6FF33]/20 transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            공고 직접 등록
          </button>
        </div>
      </div>

      <PlaceholderCard
        title="학부 공고 자동 수집 및 수동 등록 관리"
        description="하루 1회 GitHub Actions 스케줄을 통해 KNU CSE 공개 공지 게시판을 수집하며, 수집 불가 시 관리자가 직접 공고를 등록하고 오류 로그를 열람할 수 있는 관제 화면입니다."
        assignedRole="B (Node.js 크롤러 + GitHub Actions 워크플로 + CrawlingLog DB)"
        plannedFeatures={[
          'GitHub Actions workflow_dispatch 연동 수동 크롤링 트리거',
          '최근 크롤링 성공/실패 상태 및 신규 수집 공고 건수(newItemsCount) 모니터링',
          '컴퓨터학부 홈페이지 개편 시 대체할 수 있는 관리자 직접 공고 등록(admin_manual)',
          '중복 공고(sourcePostId 기준) 검증 및 변경 내용 자동 업데이트 처리',
        ]}
      />

      {/* 수집 상태 통계 카드 */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs">
        <div className="bg-[#13141C] border border-[#242634] p-4 rounded-xl">
          <span className="text-slate-400 block mb-1">최근 자동 수집 실행</span>
          <span className="text-white font-bold text-sm">2026-11-15 00:00 KST (예시)</span>
        </div>
        <div className="bg-[#13141C] border border-[#242634] p-4 rounded-xl">
          <span className="text-slate-400 block mb-1">수집 상태</span>
          <span className="text-[#C6FF33] font-bold text-sm flex items-center gap-1">
            <CheckCircle2 className="w-4 h-4" /> 정상 (Success)
          </span>
        </div>
        <div className="bg-[#13141C] border border-[#242634] p-4 rounded-xl">
          <span className="text-slate-400 block mb-1">총 등록 공고 수</span>
          <span className="text-white font-bold text-sm">0건 (초기 대기)</span>
        </div>
        <div className="bg-[#13141C] border border-[#242634] p-4 rounded-xl">
          <span className="text-slate-400 block mb-1">수집 주기</span>
          <span className="text-[#7D39EB] font-bold text-sm">매일 1회 (GitHub Actions)</span>
        </div>
      </div>

      {/* 최근 수집 로그 테이블 목업 */}
      <div className="bg-[#13141C] border border-[#242634] rounded-2xl p-5 space-y-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Clock className="w-4 h-4 text-[#7D39EB]" />
          최근 크롤링 실행 기록 (CrawlingLog 샘플)
        </h3>

        <div className="overflow-x-auto text-xs">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-[#242634] text-slate-400">
                <th className="py-2 px-3">실행 일시</th>
                <th className="py-2 px-3">트리거 주체</th>
                <th className="py-2 px-3">상태</th>
                <th className="py-2 px-3">신규 수집</th>
                <th className="py-2 px-3">업데이트</th>
                <th className="py-2 px-3">메모 / 로그</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#242634] text-slate-300">
              <tr>
                <td className="py-2.5 px-3">2026-11-15 00:00:12</td>
                <td className="py-2.5 px-3">github_actions</td>
                <td className="py-2.5 px-3 text-[#C6FF33] font-semibold">SUCCESS</td>
                <td className="py-2.5 px-3">0건</td>
                <td className="py-2.5 px-3">0건</td>
                <td className="py-2.5 px-3 text-slate-500">초기 프로젝트 빌드 및 수집기 대기 중</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
