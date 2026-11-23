import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FolderKanban,
  Users,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';
import { useMyProfile } from '../contexts/MyProfileContext';
import { getRecruitments } from '../services/recruitmentService';
import type { Recruitment } from '../types';

export const ProjectsPage: React.FC = () => {
  const { userId, status } = useMyProfile();

  const [recruitments, setRecruitments] = useState<Recruitment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let active = true;

    if (!userId || status !== 'ready') {
      setRecruitments([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    void getRecruitments().then((result) => {
      if (!active) return;

      if (result.error) {
        setRecruitments([]);
        setError(result.error.message);
      } else {
        const myRecruitments = (result.data ?? []).filter(
          (item) => item.authorId === userId
        );
        setRecruitments(myRecruitments);
      }

      setLoading(false);
    }).catch(() => {
      if (!active) return;
      setRecruitments([]);
      setError('모집글을 불러오는 중 오류가 발생했습니다.');
      setLoading(false);
    });

    return () => {
      active = false;
    };
  }, [userId, status, retry]);

  const statusLabel = (value: Recruitment['status']) => {
    if (value === 'recruiting') return '모집중';
    if (value === 'completed') return '모집완료';
    return '모집취소';
  };

  return (
    <div className="space-y-6">
      <div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-[#111111] tracking-tight">
              내 프로젝트
            </h1>
            <span className="px-2 py-0.5 text-xs font-semibold rounded bg-[#F4EFFE] text-[#7D39EB]">
              WORKSPACE
            </span>
          </div>
          <p className="text-sm text-[#64748B] mt-2">
            내가 작성한 모집글과 프로젝트 활동을 관리하세요.
          </p>
        </div>
      </div>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-[#111111]">
            내가 만든 모집글
          </h2>
          <span className="text-sm text-[#64748B]">
            {recruitments.length}개
          </span>
        </div>

        {status === 'loading' || loading ? (
          <div className="p-10 text-center rounded-2xl bg-white border border-[#E2E8F0] text-[#64748B]">
            모집글을 불러오는 중입니다.
          </div>
        ) : status !== 'ready' ? (
          <div className="p-10 text-center rounded-2xl bg-white border border-[#E2E8F0]">
            <p className="text-[#64748B]">
              로그인과 프로필 설정을 완료하면 내 모집글을 확인할 수 있어요.
            </p>
          </div>
        ) : error ? (
          <div className="p-10 text-center rounded-2xl bg-white border border-[#E2E8F0] space-y-3">
            <p className="font-bold text-[#111111]">
              모집글을 불러오지 못했어요.
            </p>
            <p className="text-sm text-[#64748B]">{error}</p>
            <button
              type="button"
              onClick={() => setRetry((value) => value + 1)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#7D39EB] text-white text-sm font-bold"
            >
              <RefreshCw className="w-4 h-4" />
              다시 시도
            </button>
          </div>
        ) : recruitments.length === 0 ? (
          <div className="p-12 text-center rounded-2xl bg-white border border-[#E2E8F0] space-y-3">
            <FolderKanban className="w-10 h-10 text-[#94A3B8] mx-auto" />
            <h3 className="font-bold text-[#111111]">
              아직 작성한 모집글이 없습니다
            </h3>
            <p className="text-sm text-[#64748B]">
              함께 활동할 팀원을 모집해 보세요.
            </p>
            <Link
              to="/recruitments"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#7D39EB] text-white text-sm font-bold"
            >
              팀원 모집 둘러보기
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {recruitments.map((item) => (
              <article
                key={item.id}
                className="bg-white border border-[#E2E8F0] rounded-2xl p-5 space-y-4 hover:border-[#7D39EB] transition-colors"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-[#7D39EB]">
                    내가 작성한 모집글
                  </span>
                  <span className="px-2 py-1 rounded-lg bg-[#F4EFFE] text-[#7D39EB] text-xs font-semibold">
                    {statusLabel(item.status)}
                  </span>
                </div>

                <h3 className="text-base font-bold text-[#111111]">
                  {item.title}
                </h3>

                <div className="flex items-center gap-2 text-sm text-[#64748B]">
                  <Users className="w-4 h-4" />
                  <span>
                    수락 {item.currentMemberCount}명 /
                    모집 목표 {item.targetMemberCount}명
                  </span>
                </div>

                <Link
                  to={`/recruitments/${encodeURIComponent(item.id)}`}
                  className="inline-flex items-center gap-1 text-sm font-bold text-[#7D39EB]"
                >
                  모집글 상세보기
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-6 rounded-2xl bg-white border border-[#E2E8F0] space-y-2">
          <h2 className="font-bold text-[#111111]">
            내가 지원한 모집글
          </h2>
          <p className="text-sm text-[#64748B]">
            지원 내역 조회 기능을 준비하고 있어요.
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-white border border-[#E2E8F0] space-y-2">
          <h2 className="font-bold text-[#111111]">
            참여 중인 프로젝트
          </h2>
          <p className="text-sm text-[#64748B]">
            승인된 프로젝트 참여 내역을 연결할 예정이에요.
          </p>
        </div>
      </section>
    </div>
  );
};

