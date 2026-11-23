import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FolderKanban,
  Users,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';
import { useMyProfile } from '../contexts/MyProfileContext';
import { applicationStatusLabels, recruitmentStatusLabels } from '../features/recruitments/recruitmentModel';
import {
  getMyRecruitmentApplications,
  getRecruitments,
  type MyRecruitmentApplication,
  type RecruitmentServiceResponse,
} from '../services/recruitmentService';
import type { Recruitment } from '../types';

const applicationDateFormat = new Intl.DateTimeFormat('ko-KR', {
  dateStyle: 'medium',
  timeZone: 'Asia/Seoul',
});

export const ProjectsPage: React.FC = () => {
  const { userId, status } = useMyProfile();

  const [recruitments, setRecruitments] = useState<Recruitment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  const [applicationQuery, setApplicationQuery] = useState<{
    userId: string;
    response: RecruitmentServiceResponse<MyRecruitmentApplication[]>;
  } | null>(null);

  const canViewRecruitments = status === 'ready' && Boolean(userId);

  useEffect(() => {
    setApplicationQuery(null);
    if (!canViewRecruitments || !userId) return;

    let active = true;
    void getMyRecruitmentApplications().then((response) => {
      if (active) setApplicationQuery({ userId, response });
    }).catch(() => {
      if (active) {
        setApplicationQuery({
          userId,
          response: { data: null, error: { code: 'UNKNOWN_ERROR', message: '지원 내역을 불러오지 못했어요.' } },
        });
      }
    });

    return () => {
      active = false;
    };
  }, [canViewRecruitments, userId]);

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

  const isLoading = status === 'loading' || loading;
  const applicationResponse = applicationQuery?.userId === userId ? applicationQuery?.response : null;
  const isApplicationLoading = status === 'loading' || (canViewRecruitments && !applicationResponse);
  const acceptedApplications = applicationResponse?.data?.filter(({ applicationStatus }) => applicationStatus === 'accepted') ?? [];
  const count = !isLoading && canViewRecruitments && error === null
    ? `${recruitments.length}개`
    : '—';

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
            {count}
          </span>
        </div>

        {isLoading ? (
          <div className="p-10 text-center rounded-2xl bg-white border border-[#E2E8F0] text-[#64748B]">
            모집글을 불러오는 중입니다.
          </div>
        ) : !canViewRecruitments ? (
          <div className="p-10 text-center rounded-2xl bg-white border border-[#E2E8F0]">
            <p className="text-[#64748B]">
              로그인과 프로필 설정을 완료하면 내 모집글을 확인할 수 있어요.
            </p>
          </div>
        ) : error !== null ? (
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
          {isApplicationLoading ? (
            <p role="status" className="text-sm text-[#64748B]">지원 내역을 불러오는 중입니다.</p>
          ) : !canViewRecruitments ? (
            <p className="text-sm text-[#64748B]">로그인과 프로필 설정을 완료하면 지원 내역을 확인할 수 있어요.</p>
          ) : applicationResponse?.error || !applicationResponse?.data ? (
            <p role="alert" className="text-sm text-rose-700">지원 내역을 불러오지 못했어요.</p>
          ) : applicationResponse.data.length === 0 ? (
            <p className="text-sm text-[#64748B]">아직 지원한 모집글이 없습니다.</p>
          ) : (
            <ul className="divide-y divide-[#E2E8F0]">
              {applicationResponse.data.map((application) => {
                const recruitmentStatus = recruitmentStatusLabels[application.recruitmentStatus];
                const applicationStatus = applicationStatusLabels[application.applicationStatus];
                return (
                  <li key={application.applicationId}>
                    <Link
                      to={`/recruitments/${encodeURIComponent(application.recruitmentId)}`}
                      className="block space-y-2 py-3"
                    >
                      <h3 className="break-words text-sm font-bold text-[#111111] hover:text-[#7D39EB]">
                        {application.recruitmentTitle}
                      </h3>
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span className={`rounded-md px-2 py-1 ${recruitmentStatus.badgeClass}`}>
                          모집 상태 · {recruitmentStatus.label}
                        </span>
                        <span className={`rounded-md px-2 py-1 ${applicationStatus.badgeClass}`}>
                          지원 상태 · {applicationStatus.label}
                        </span>
                        <time dateTime={application.appliedAt} className="text-[#64748B]">
                          지원일 {applicationDateFormat.format(new Date(application.appliedAt))}
                        </time>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <section aria-label="참여 확정된 프로젝트" className="p-6 rounded-2xl bg-white border border-[#E2E8F0] space-y-2">
          <h2 className="font-bold text-[#111111]">참여 확정된 프로젝트</h2>
          <p className="text-sm text-[#64748B]">지원이 수락된 모집글을 표시합니다.</p>
          {isApplicationLoading ? (
            <p role="status" className="text-sm text-[#64748B]">참여 내역을 불러오는 중입니다.</p>
          ) : !canViewRecruitments ? (
            <p className="text-sm text-[#64748B]">로그인과 프로필 설정을 완료하면 참여 내역을 확인할 수 있어요.</p>
          ) : applicationResponse?.error || !applicationResponse?.data ? (
            <p role="alert" className="text-sm text-rose-700">참여 내역을 불러오지 못했어요.</p>
          ) : acceptedApplications.length === 0 ? (
            <p className="text-sm text-[#64748B]">아직 지원이 수락된 모집글이 없습니다.</p>
          ) : (
            <ul className="space-y-2">
              {acceptedApplications.map(({ applicationId, recruitmentId, recruitmentTitle }) => (
                <li key={applicationId} className="space-y-2 rounded-xl border border-[#E2E8F0] p-3">
                  <h3 className="break-words text-sm font-bold text-[#111111]">{recruitmentTitle}</h3>
                  <Link to={'/recruitments/' + encodeURIComponent(recruitmentId)}
                    aria-label={recruitmentTitle + ' 모집글 상세보기'}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-[#7D39EB] hover:underline">
                    모집글 상세보기 <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </section>
    </div>
  );
};

