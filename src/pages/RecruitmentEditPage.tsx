import React, { useCallback, useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Trash2, AlertCircle, Users } from 'lucide-react';
import { Button, EmptyState, LoadingState, Modal } from '../components/ui';
import { useAuth } from '../hooks/useAuth';
import { useMyProfile } from '../contexts/MyProfileContext';
import {
  validateRecruitmentForm,
  type RecruitmentSource,
  type UpdateRecruitmentPayload,
} from '../features/recruitments/recruitmentModel';
import type { ActivityType, Recruitment } from '../types';

export const RecruitmentEditPage: React.FC<{ source?: RecruitmentSource | null }> = ({
  source = null,
}) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { userId } = useMyProfile();

  const currentUserId = user?.id || userId;

  const [recruitment, setRecruitment] = useState<Recruitment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [targetMemberCount, setTargetMemberCount] = useState<number>(4);
  const [activityType, setActivityType] = useState<ActivityType>('hybrid');
  const [expectedDuration, setExpectedDuration] = useState('');
  const [deadline, setDeadline] = useState('');
  const [rolesInput, setRolesInput] = useState('');
  const [techStacksInput, setTechStacksInput] = useState('');
  const [opportunityType, setOpportunityType] = useState<'free' | 'custom'>('free');
  const [customOpportunityTitle, setCustomOpportunityTitle] = useState('');
  const [customOpportunityUrl, setCustomOpportunityUrl] = useState('');

  const [saving, setSaving] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);

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
      setTitle(rec.title);
      setContent(rec.content);
      setTargetMemberCount(rec.targetMemberCount);
      setActivityType(rec.activityType);
      setExpectedDuration(rec.expectedDuration);
      setDeadline(rec.deadline ? rec.deadline.split('T')[0] : '');
      setRolesInput(rec.roles?.join(', ') || '');
      setTechStacksInput(rec.requiredTechStacks?.join(', ') || '');
      if (rec.customOpportunityTitle || rec.customOpportunityUrl) {
        setOpportunityType('custom');
        setCustomOpportunityTitle(rec.customOpportunityTitle || '');
        setCustomOpportunityUrl(rec.customOpportunityUrl || '');
      } else {
        setOpportunityType('free');
      }
    } catch {
      setError('모집글을 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  }, [source, id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const isAuthor = Boolean(currentUserId && recruitment && currentUserId === recruitment.authorId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!source || !recruitment) return;

    const roles = rolesInput
      .split(',')
      .map((r) => r.trim())
      .filter(Boolean);
    const requiredTechStacks = techStacksInput
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    const validation = validateRecruitmentForm({
      title,
      content,
      targetMemberCount,
      expectedDuration,
      roles,
      requiredTechStacks,
      activityType,
      deadline: deadline ? `${deadline}T23:59:59+09:00` : null,
      customOpportunityUrl: opportunityType === 'custom' ? customOpportunityUrl : null,
    });

    if (!validation.isValid) {
      setFormErrors(validation.errors);
      return;
    }
    setFormErrors({});
    setSubmitError(null);
    setSaving(true);

    try {
      const updates: UpdateRecruitmentPayload = {
        title: title.trim(),
        content: content.trim(),
        targetMemberCount,
        expectedDuration: expectedDuration.trim(),
        roles,
        requiredTechStacks,
        activityType,
        deadline: deadline ? `${deadline}T23:59:59+09:00` : null,
        customOpportunityTitle:
          opportunityType === 'custom' && customOpportunityTitle.trim()
            ? customOpportunityTitle.trim()
            : null,
        customOpportunityUrl:
          opportunityType === 'custom' && customOpportunityUrl.trim()
            ? customOpportunityUrl.trim()
            : null,
      };

      await source.updateRecruitment(recruitment.id, updates);
      navigate(`/recruitments/${recruitment.id}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '모집글 수정 중 오류가 발생했습니다.';
      setSubmitError(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
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
      <div className="max-w-3xl mx-auto space-y-6">
        <Link
          to={`/recruitments/${id}`}
          className="inline-flex items-center gap-1.5 text-xs text-[#64748B] hover:text-[#111111] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          게시글 상세로 돌아가기
        </Link>
        <EmptyState
          icon={<Users size={24} />}
          title="팀원 모집 서비스 연결 준비 중"
          description="서비스 연결이 완료되면 모집글을 수정할 수 있어요."
        />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <Link
          to={`/recruitments/${id}`}
          className="inline-flex items-center gap-1.5 text-xs text-[#64748B] hover:text-[#111111] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          게시글 상세로 돌아가기
        </Link>
        <div role="status">
          <LoadingState text="모집글 정보를 불러오는 중입니다..." />
        </div>
      </div>
    );
  }

  if (error || !recruitment) {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
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
            description={error || '존재하지 않거나 삭제된 모집글입니다.'}
            action={{ label: '다시 시도', onClick: loadData }}
          />
        </div>
      </div>
    );
  }

  if (!isAuthor) {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <Link
          to={`/recruitments/${id}`}
          className="inline-flex items-center gap-1.5 text-xs text-[#64748B] hover:text-[#111111] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          게시글 상세로 돌아가기
        </Link>
        <EmptyState
          title="수정 권한이 없습니다"
          description="본인이 작성한 모집글만 수정하거나 삭제할 수 있습니다."
        />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Link
        to={`/recruitments/${id}`}
        className="inline-flex items-center gap-1.5 text-xs text-[#64748B] hover:text-[#111111] transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        게시글 상세로 돌아가기
      </Link>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-[#111111] tracking-tight">팀원 모집 게시글 수정</h1>
          <p className="text-xs text-[#64748B] mt-1">
            게시글 정보 및 모집 조건을 변경할 수 있습니다.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowDeleteModal(true)}
          className="px-3 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-xs font-semibold text-rose-600 flex items-center gap-1.5 transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" />
          모집글 삭제
        </button>
      </div>

      {submitError && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{submitError}</span>
        </div>
      )}

      <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 sm:p-8 shadow-sm">
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* 공모전 연결 여부 */}
          <div>
            <label className="block text-xs font-semibold text-[#111111] mb-1.5">
              공모전 / 대외활동 연결
            </label>
            <div className="flex gap-4 mb-2">
              <label className="flex items-center gap-1.5 text-xs text-[#334155] cursor-pointer">
                <input
                  type="radio"
                  name="oppType"
                  value="free"
                  checked={opportunityType === 'free'}
                  onChange={() => setOpportunityType('free')}
                  className="accent-[#7D39EB]"
                />
                자유 프로젝트 (공모전 연결 안 함)
              </label>
              <label className="flex items-center gap-1.5 text-xs text-[#334155] cursor-pointer">
                <input
                  type="radio"
                  name="oppType"
                  value="custom"
                  checked={opportunityType === 'custom'}
                  onChange={() => setOpportunityType('custom')}
                  className="accent-[#7D39EB]"
                />
                직접 공모전 정보 입력
              </label>
            </div>

            {opportunityType === 'custom' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <input
                    type="text"
                    placeholder="공모전 / 행사 명칭"
                    value={customOpportunityTitle}
                    onChange={(e) => setCustomOpportunityTitle(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] focus:border-[#7D39EB] focus:outline-none focus:bg-white text-xs text-[#111111]"
                  />
                </div>
                <div>
                  <input
                    type="url"
                    placeholder="공모전 안내 웹사이트 URL (https://...)"
                    value={customOpportunityUrl}
                    onChange={(e) => setCustomOpportunityUrl(e.target.value)}
                    className={`w-full px-3.5 py-2.5 rounded-lg bg-[#F8FAFC] border ${
                      formErrors.customOpportunityUrl ? 'border-rose-500' : 'border-[#E2E8F0]'
                    } focus:border-[#7D39EB] focus:outline-none focus:bg-white text-xs text-[#111111]`}
                  />
                  {formErrors.customOpportunityUrl && (
                    <span className="text-[11px] text-rose-500 mt-1 block">
                      {formErrors.customOpportunityUrl}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* 제목 */}
          <div>
            <label className="block text-xs font-semibold text-[#111111] mb-1.5">
              모집글 제목 <span className="text-[#7D39EB]">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={`w-full px-3.5 py-2.5 rounded-lg bg-[#F8FAFC] border ${
                formErrors.title ? 'border-rose-500' : 'border-[#E2E8F0]'
              } focus:border-[#7D39EB] focus:outline-none focus:bg-white text-xs text-[#111111]`}
            />
            {formErrors.title && (
              <span className="text-[11px] text-rose-500 mt-1 block">{formErrors.title}</span>
            )}
          </div>

          {/* 인원, 활동 방식, 마감일 */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#111111] mb-1.5">
                추가 모집 인원 (작성자 제외, 명) <span className="text-[#7D39EB]">*</span>
              </label>
              <input
                type="number"
                min={1}
                max={20}
                value={targetMemberCount}
                onChange={(e) => setTargetMemberCount(parseInt(e.target.value, 10) || 1)}
                className={`w-full px-3.5 py-2.5 rounded-lg bg-[#F8FAFC] border ${
                  formErrors.targetMemberCount ? 'border-rose-500' : 'border-[#E2E8F0]'
                } focus:border-[#7D39EB] focus:outline-none focus:bg-white text-xs text-[#111111]`}
              />
              <span className="text-[10px] text-[#64748B] mt-1 block">
                팀장 1명 + 추가 모집 {targetMemberCount}명 = 총 {targetMemberCount + 1}명 규모
              </span>
              {formErrors.targetMemberCount && (
                <span className="text-[11px] text-rose-500 mt-1 block">
                  {formErrors.targetMemberCount}
                </span>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#111111] mb-1.5">
                활동 방식 <span className="text-[#7D39EB]">*</span>
              </label>
              <select
                value={activityType}
                onChange={(e) => setActivityType(e.target.value as ActivityType)}
                className="w-full px-3.5 py-2.5 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] focus:border-[#7D39EB] focus:outline-none focus:bg-white text-xs text-[#111111]"
              >
                <option value="hybrid">대면 / 비대면 혼합</option>
                <option value="online">온라인 (비대면 중심)</option>
                <option value="offline">오프라인 (대면 중심)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#111111] mb-1.5">
                모집 마감일 <span className="text-[#94A3B8]">(선택)</span>
              </label>
              <input
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className={`w-full px-3.5 py-2.5 rounded-lg bg-[#F8FAFC] border ${
                  formErrors.deadline ? 'border-rose-500' : 'border-[#E2E8F0]'
                } focus:border-[#7D39EB] focus:outline-none focus:bg-white text-xs text-[#111111]`}
              />
              {formErrors.deadline && (
                <span className="text-[11px] text-rose-500 mt-1 block">{formErrors.deadline}</span>
              )}
            </div>
          </div>

          {/* 예상 활동 기간 */}
          <div>
            <label className="block text-xs font-semibold text-[#111111] mb-1.5">
              예상 활동 기간 <span className="text-[#7D39EB]">*</span>
            </label>
            <input
              type="text"
              value={expectedDuration}
              onChange={(e) => setExpectedDuration(e.target.value)}
              className={`w-full px-3.5 py-2.5 rounded-lg bg-[#F8FAFC] border ${
                formErrors.expectedDuration ? 'border-rose-500' : 'border-[#E2E8F0]'
              } focus:border-[#7D39EB] focus:outline-none focus:bg-white text-xs text-[#111111]`}
            />
            {formErrors.expectedDuration && (
              <span className="text-[11px] text-rose-500 mt-1 block">
                {formErrors.expectedDuration}
              </span>
            )}
          </div>

          {/* 모집 역할 */}
          <div>
            <label className="block text-xs font-semibold text-[#111111] mb-1.5">
              모집할 역할 (쉼표로 구분) <span className="text-[#7D39EB]">*</span>
            </label>
            <input
              type="text"
              value={rolesInput}
              onChange={(e) => setRolesInput(e.target.value)}
              className={`w-full px-3.5 py-2.5 rounded-lg bg-[#F8FAFC] border ${
                formErrors.roles ? 'border-rose-500' : 'border-[#E2E8F0]'
              } focus:border-[#7D39EB] focus:outline-none focus:bg-white text-xs text-[#111111]`}
            />
            {formErrors.roles && (
              <span className="text-[11px] text-rose-500 mt-1 block">{formErrors.roles}</span>
            )}
          </div>

          {/* 필요 기술 스택 */}
          <div>
            <label className="block text-xs font-semibold text-[#111111] mb-1.5">
              필요 기술 스택 (쉼표로 구분) <span className="text-[#7D39EB]">*</span>
            </label>
            <input
              type="text"
              value={techStacksInput}
              onChange={(e) => setTechStacksInput(e.target.value)}
              className={`w-full px-3.5 py-2.5 rounded-lg bg-[#F8FAFC] border ${
                formErrors.requiredTechStacks ? 'border-rose-500' : 'border-[#E2E8F0]'
              } focus:border-[#7D39EB] focus:outline-none focus:bg-white text-xs text-[#111111]`}
            />
            {formErrors.requiredTechStacks && (
              <span className="text-[11px] text-rose-500 mt-1 block">
                {formErrors.requiredTechStacks}
              </span>
            )}
          </div>

          {/* 상세 모집 내용 */}
          <div>
            <label className="block text-xs font-semibold text-[#111111] mb-1.5">
              상세 모집 내용 &amp; 활동 목표 <span className="text-[#7D39EB]">*</span>
            </label>
            <textarea
              rows={6}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className={`w-full px-3.5 py-2.5 rounded-lg bg-[#F8FAFC] border ${
                formErrors.content ? 'border-rose-500' : 'border-[#E2E8F0]'
              } focus:border-[#7D39EB] focus:outline-none focus:bg-white text-xs text-[#111111]`}
            />
            {formErrors.content && (
              <span className="text-[11px] text-rose-500 mt-1 block">{formErrors.content}</span>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-3">
            <Link
              to={`/recruitments/${recruitment.id}`}
              className="px-4 py-2.5 rounded-lg bg-[#F1F5F9] text-[#64748B] text-xs font-semibold hover:text-[#111111] transition-colors"
            >
              취소
            </Link>
            <Button type="submit" disabled={saving} leftIcon={<Save className="w-4 h-4" />}>
              {saving ? '수정 사항 저장 중...' : '수정 사항 저장하기'}
            </Button>
          </div>
        </form>
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
            <Button variant="danger" size="sm" disabled={deleting} onClick={handleDelete}>
              {deleting ? '삭제 중...' : '삭제 확인'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
