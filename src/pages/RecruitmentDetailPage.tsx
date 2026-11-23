import React, { useCallback, useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Edit3,
  Trash2,
  Send,
  Calendar,
  MapPin,
  Clock,
  Users,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';
import { Button, EmptyState, LoadingState, Modal, SkillTag } from '../components/ui';
import { useAuth } from '../hooks/useAuth';
import { useMyProfile } from '../contexts/MyProfileContext';
import {
  activityTypeLabels,
  applicationStatusLabels,
  getRecruitmentHeadcount,
  isRecruitmentOpen,
  recruitmentStatusLabels,
  type RecruitmentSource,
} from '../features/recruitments/recruitmentModel';
import type { Application, Recruitment } from '../types';

export const RecruitmentDetailPage: React.FC<{ source?: RecruitmentSource | null }> = ({
  source = null,
}) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { userId } = useMyProfile();

  const currentUserId = user?.id || userId;

  const [recruitment, setRecruitment] = useState<Recruitment | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 지원 폼 상태
  const [selectedRole, setSelectedRole] = useState('');
  const [applyMessage, setApplyMessage] = useState('');
  const [applyLoading, setApplyLoading] = useState(false);
  const [applyError, setApplyError] = useState<string | null>(null);

  // 지원서 상태 변경 로딩 (승인/거절)
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // 삭제 모달 상태
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const loadData = useCallback(async () => {
    if (!source || !id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const rec = await source.getRecruitmentById(id);
      if (!rec) {
        setRecruitment(null);
        return;
      }
      setRecruitment(rec);
      if (rec.roles && rec.roles.length > 0) {
        setSelectedRole(rec.roles[0]);
      }

      // 지원서 목록 로드 (작성자 또는 본인 지원 확인용)
      try {
        const apps = await source.getApplicationsForRecruitment(id);
        setApplications(apps || []);
      } catch {
        setApplications([]);
      }
    } catch {
      setError('모집글 정보를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  }, [source, id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const isAuthor = Boolean(currentUserId && recruitment && currentUserId === recruitment.authorId);
  const myApplication = applications.find(
    (app) => currentUserId && app.applicantId === currentUserId
  );

  // 지원하기 제출
  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!source || !recruitment) return;
    if (!selectedRole) {
      setApplyError('희망 역할을 선택해 주세요.');
      return;
    }
    if (!applyMessage.trim()) {
      setApplyError('지원 동기를 입력해 주세요.');
      return;
    }

    setApplyLoading(true);
    setApplyError(null);
    try {
      const newApp = await source.applyToRecruitment(
        recruitment.id,
        selectedRole,
        applyMessage.trim()
      );
      setApplications((prev) => [...prev, newApp]);
      setApplyMessage('');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '지원 중 오류가 발생했습니다.';
      setApplyError(msg);
    } finally {
      setApplyLoading(false);
    }
  };

  // 지원서 승인 / 거절 처리
  const handleReviewApplication = async (applicationId: string, status: 'accepted' | 'rejected') => {
    if (!source || !recruitment) return;
    setActionLoadingId(applicationId);
    try {
      const updatedApp = await source.updateApplicationStatus(applicationId, status);
      setApplications((prev) =>
        prev.map((app) => (app.id === applicationId ? updatedApp : app))
      );

      // 승인 시 모집 인원과 상태 갱신
      if (status === 'accepted') {
        const updatedCount = recruitment.currentMemberCount + 1;
        const isFull = updatedCount >= recruitment.targetMemberCount;
        setRecruitment({
          ...recruitment,
          currentMemberCount: updatedCount,
          status: isFull ? 'completed' : recruitment.status,
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '지원 상태 변경에 실패했습니다.';
      alert(msg);
    } finally {
      setActionLoadingId(null);
    }
  };

  // 모집글 삭제 처리
  const handleDeleteRecruitment = async () => {
    if (!source || !recruitment) return;
    setDeleting(true);
    try {
      await source.deleteRecruitment(recruitment.id);
      navigate('/recruitments');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '모집글 삭제에 실패했습니다.';
      alert(msg);
      setDeleting(false);
    }
  };

  if (!source) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <Link
          to="/recruitments"
          className="inline-flex items-center gap-1.5 text-xs text-[#64748B] hover:text-[#111111] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          모집 게시판으로 돌아가기
        </Link>
        <EmptyState
          icon={<Users size={24} />}
          title="팀원 모집 서비스 연결 준비 중"
          description="서비스 연결이 완료되면 상세 정보 확인 및 지원이 가능해요."
        />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <Link
          to="/recruitments"
          className="inline-flex items-center gap-1.5 text-xs text-[#64748B] hover:text-[#111111] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          모집 게시판으로 돌아가기
        </Link>
        <div role="status">
          <LoadingState text="모집글 상세 정보를 불러오는 중입니다..." />
        </div>
      </div>
    );
  }

  if (error || !recruitment) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <Link
          to="/recruitments"
          className="inline-flex items-center gap-1.5 text-xs text-[#64748B] hover:text-[#111111] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          모집 게시판으로 돌아가기
        </Link>
        <div role="alert">
          <EmptyState
            title="모집글을 찾을 수 없어요"
            description={error || '삭제되었거나 존재하지 않는 모집글입니다.'}
            action={{ label: '다시 시도', onClick: loadData }}
          />
        </div>
      </div>
    );
  }

  const headcount = getRecruitmentHeadcount(recruitment);
  const statusMeta = recruitmentStatusLabels[recruitment.status] || {
    label: recruitment.status,
    badgeClass: 'bg-slate-100 text-slate-600',
  };
  const isOpen = isRecruitmentOpen(recruitment);
  const authorName =
    recruitment.authorProfile?.nickname?.trim() ||
    recruitment.authorProfile?.name?.trim() ||
    '작성자';
  const oppTitle = recruitment.customOpportunityTitle || '자유 프로젝트 팀원 모집';
  const deadlineText = recruitment.deadline ? recruitment.deadline.split('T')[0] : '상시 모집';

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* 상단 네비게이션 및 작성자 액션 */}
      <div className="flex items-center justify-between">
        <Link
          to="/recruitments"
          className="inline-flex items-center gap-1.5 text-xs text-[#64748B] hover:text-[#111111] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          모집 게시판으로 돌아가기
        </Link>

        {isAuthor && (
          <div className="flex items-center gap-2">
            <Link
              to={`/recruitments/${recruitment.id}/edit`}
              className="px-3 py-1.5 rounded-lg bg-[#F1F5F9] hover:bg-[#E2E8F0] text-xs font-semibold text-[#475569] hover:text-[#111111] flex items-center gap-1.5 transition-colors"
            >
              <Edit3 className="w-3.5 h-3.5" />
              수정
            </Link>
            <button
              type="button"
              onClick={() => setShowDeleteModal(true)}
              className="px-3 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-xs font-semibold text-rose-600 flex items-center gap-1.5 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              삭제
            </button>
          </div>
        )}
      </div>

      {/* 본문 카드 */}
      <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 sm:p-8 space-y-6 shadow-sm">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className="text-xs text-[#7D39EB] font-bold">
              {recruitment.customOpportunityUrl ? (
                <a
                  href={recruitment.customOpportunityUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 hover:underline"
                >
                  연결 공모전: {oppTitle}
                  <ExternalLink className="w-3 h-3" />
                </a>
              ) : (
                `연결 공모전: ${oppTitle}`
              )}
            </span>
            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${statusMeta.badgeClass}`}>
              {statusMeta.label}
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#F4EFFE] text-[#7D39EB] border border-[#7D39EB]/20">
              추가 모집 {headcount.current}/{headcount.target}명
              {headcount.remaining > 0 ? ` (${headcount.remaining}자리 남음)` : ' (마감)'}
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black text-[#111111] tracking-tight break-words">
            {recruitment.title}
          </h1>

          <div className="flex flex-wrap items-center gap-4 text-xs text-[#64748B] mt-2">
            <span>
              작성자: <strong className="text-[#111111]">{authorName}</strong>
            </span>
            <span>
              등록일: {recruitment.createdAt ? recruitment.createdAt.split('T')[0] : '-'}
            </span>
            {recruitment.updatedAt && recruitment.updatedAt !== recruitment.createdAt && (
              <span>(수정됨: {recruitment.updatedAt.split('T')[0]})</span>
            )}
          </div>
        </div>

        {/* 조건 메트릭스 */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="bg-[#F8FAFC] p-3.5 rounded-xl border border-[#E2E8F0]">
            <span className="text-[#64748B] block mb-1">활동 형태</span>
            <span className="text-[#111111] font-bold flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-[#7D39EB]" />
              {activityTypeLabels[recruitment.activityType] || recruitment.activityType}
            </span>
          </div>

          <div className="bg-[#F8FAFC] p-3.5 rounded-xl border border-[#E2E8F0]">
            <span className="text-[#64748B] block mb-1">모집 마감일</span>
            <span className="text-rose-600 font-bold flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              {deadlineText}
            </span>
          </div>

          <div className="bg-[#F8FAFC] p-3.5 rounded-xl border border-[#E2E8F0]">
            <span className="text-[#64748B] block mb-1">예상 활동 기간</span>
            <span className="text-[#111111] font-bold flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-[#64748B]" />
              {recruitment.expectedDuration}
            </span>
          </div>

          <div className="bg-[#F8FAFC] p-3.5 rounded-xl border border-[#E2E8F0]">
            <span className="text-[#64748B] block mb-1">모집 현황 (추가 모집)</span>
            <span className="text-[#7D39EB] font-bold block">
              {headcount.current}명 확정 / {headcount.target}명 정원
            </span>
            <span className="text-[10px] text-[#64748B] block mt-0.5">
              (팀장 1명 포함 총 {headcount.totalTeamCurrent}/{headcount.totalTeamTarget}명 규모)
            </span>
          </div>
        </div>

        {/* 모집 역할 및 기술 스택 */}
        <div className="space-y-4 pt-2">
          {recruitment.roles?.length > 0 && (
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-[#64748B] mb-2">
                모집 역할
              </h2>
              <div className="flex flex-wrap gap-2">
                {recruitment.roles.map((role) => (
                  <span
                    key={role}
                    className="px-3 py-1 rounded-lg bg-[#F1F5F9] text-xs font-semibold text-[#334155] border border-[#E2E8F0]"
                  >
                    {role}
                  </span>
                ))}
              </div>
            </div>
          )}

          {recruitment.requiredTechStacks?.length > 0 && (
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-[#64748B] mb-2">
                필요 기술 스택
              </h2>
              <div className="flex flex-wrap gap-1.5">
                {recruitment.requiredTechStacks.map((tech) => (
                  <SkillTag key={tech} skill={tech} />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 모집 상세 내용 */}
        <div className="pt-4 border-t border-[#E2E8F0] space-y-3 text-sm text-[#334155] leading-relaxed">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#64748B]">
            프로젝트 소개 &amp; 상세 모집 요강
          </h2>
          <div className="whitespace-pre-wrap break-words leading-relaxed bg-[#F8FAFC] p-5 rounded-xl border border-[#E2E8F0] text-xs sm:text-sm">
            {recruitment.content}
          </div>
        </div>

        {/* ─────────────────────────────────────────────────────────────
            지원 섹션 / 작성자 지원자 관리 섹션
        ───────────────────────────────────────────────────────────── */}
        {isAuthor ? (
          /* 작성자 지원자 관리 섹션 */
          <div className="pt-6 border-t border-[#E2E8F0] space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-[#111111] flex items-center gap-2">
                <Users className="w-4 h-4 text-[#7D39EB]" />
                지원서 목록 ({applications.length}건)
              </h2>
              <span className="text-xs text-[#64748B]">
                승인 시 모집 인원이 자동으로 반영됩니다.
              </span>
            </div>

            {applications.length === 0 ? (
              <div className="p-6 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] text-center text-xs text-[#64748B]">
                아직 접수된 지원서가 없습니다.
              </div>
            ) : (
              <div className="space-y-3">
                {applications.map((app) => {
                  const statusInfo = applicationStatusLabels[app.status] || {
                    label: app.status,
                    badgeClass: 'bg-slate-100 text-slate-600',
                  };
                  const applicantDisplayName =
                    app.applicantProfile?.nickname?.trim() ||
                    app.applicantProfile?.name?.trim() ||
                    `지원자 (${app.applicantId.slice(0, 8)})`;

                  return (
                    <div
                      key={app.id}
                      className="p-4 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] space-y-3"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <strong className="text-xs font-bold text-[#111111]">
                            {applicantDisplayName}
                          </strong>
                          <span className="text-[11px] px-2 py-0.5 rounded bg-[#F1F5F9] text-[#475569] font-medium border border-[#E2E8F0]">
                            희망 역할: {app.appliedRole}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${statusInfo.badgeClass}`}
                          >
                            {statusInfo.label}
                          </span>
                          <span className="text-[10px] text-[#94A3B8]">
                            {app.createdAt ? app.createdAt.split('T')[0] : ''}
                          </span>
                        </div>
                      </div>

                      <p className="text-xs text-[#475569] whitespace-pre-wrap bg-white p-3 rounded-lg border border-[#E2E8F0] break-words">
                        {app.message}
                      </p>

                      {app.status === 'pending' && (
                        <div className="flex justify-end gap-2 pt-1">
                          <Button
                            size="sm"
                            variant="secondary"
                            disabled={actionLoadingId === app.id}
                            onClick={() => handleReviewApplication(app.id, 'rejected')}
                          >
                            <XCircle className="w-3.5 h-3.5 mr-1 text-rose-500" />
                            거절
                          </Button>
                          <Button
                            size="sm"
                            disabled={actionLoadingId === app.id || headcount.isFull}
                            onClick={() => handleReviewApplication(app.id, 'accepted')}
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                            {headcount.isFull ? '정원 초과' : '승인'}
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          /* 일반 사용자 지원 섹션 */
          <div className="pt-6 border-t border-[#E2E8F0]">
            {myApplication ? (
              /* 이미 지원한 경우: 내 지원 현황 */
              <div className="p-5 rounded-xl bg-[#F8FAFC] border border-[#7D39EB]/30 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#7D39EB]" />
                    <h3 className="text-xs sm:text-sm font-bold text-[#111111]">
                      팀 가입 지원 완료
                    </h3>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      applicationStatusLabels[myApplication.status]?.badgeClass || ''
                    }`}
                  >
                    {applicationStatusLabels[myApplication.status]?.label || myApplication.status}
                  </span>
                </div>
                <div className="text-xs text-[#64748B] space-y-1">
                  <p>
                    희망 역할: <strong className="text-[#334155]">{myApplication.appliedRole}</strong>
                  </p>
                  <p className="bg-white p-3 rounded-lg border border-[#E2E8F0] text-[#334155] whitespace-pre-wrap">
                    {myApplication.message}
                  </p>
                  <p className="text-[11px] text-[#94A3B8]">
                    작성자가 지원서를 검토한 후 승인 여부를 결정합니다.
                  </p>
                </div>
              </div>
            ) : isOpen ? (
              /* 지원 가능 상태 */
              <div className="p-5 sm:p-6 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-4">
                <div>
                  <h3 className="text-sm font-bold text-[#111111]">이 팀에 지원하시겠습니까?</h3>
                  <p className="text-xs text-[#64748B] mt-0.5">
                    희망 역할과 지원 동기를 작성하여 팀장에게 전달해 보세요.
                  </p>
                </div>

                {applyError && (
                  <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{applyError}</span>
                  </div>
                )}

                <form onSubmit={handleApply} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#111111] mb-1.5">
                      희망 역할 선택 <span className="text-[#7D39EB]">*</span>
                    </label>
                    <select
                      value={selectedRole}
                      onChange={(e) => setSelectedRole(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-lg bg-white border border-[#E2E8F0] focus:border-[#7D39EB] focus:outline-none text-xs text-[#111111]"
                    >
                      {recruitment.roles?.map((role) => (
                        <option key={role} value={role}>
                          {role}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#111111] mb-1.5">
                      지원 동기 및 간단한 소개 <span className="text-[#7D39EB]">*</span>
                    </label>
                    <textarea
                      rows={4}
                      value={applyMessage}
                      onChange={(e) => setApplyMessage(e.target.value)}
                      placeholder="자신의 경험, 기술 숙련도, 활동 가능 시간 등을 자유롭게 적어주세요."
                      className="w-full px-3.5 py-2.5 rounded-lg bg-white border border-[#E2E8F0] focus:border-[#7D39EB] focus:outline-none text-xs text-[#111111] placeholder-[#94A3B8]"
                    />
                  </div>

                  <div className="flex justify-end">
                    <Button
                      type="submit"
                      disabled={applyLoading}
                      leftIcon={<Send className="w-3.5 h-3.5" />}
                    >
                      {applyLoading ? '지원서 제출 중...' : '팀 가입 지원하기'}
                    </Button>
                  </div>
                </form>
              </div>
            ) : (
              /* 모집 종료 상태 */
              <div className="p-5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] text-center text-xs text-[#64748B]">
                모집이 종료되었거나 마감일이 지난 공고입니다.
              </div>
            )}
          </div>
        )}
      </div>

      {/* 삭제 확인 모달 */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="모집글 삭제"
      >
        <div className="space-y-4 text-xs text-[#64748B]">
          <p>
            정말로 이 모집글을 삭제하시겠습니까? 등록된 지원서 목록도 함께 삭제되며, 이 작업은 되돌릴 수 없습니다.
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="secondary"
              size="sm"
              disabled={deleting}
              onClick={() => setShowDeleteModal(false)}
            >
              취소
            </Button>
            <Button
              variant="danger"
              size="sm"
              disabled={deleting}
              onClick={handleDeleteRecruitment}
            >
              {deleting ? '삭제 중...' : '삭제 확인'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
