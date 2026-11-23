import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, AlertCircle, Users } from 'lucide-react';
import { Button, EmptyState } from '../components/ui';
import {
  validateRecruitmentForm,
  type CreateRecruitmentPayload,
  type RecruitmentSource,
} from '../features/recruitments/recruitmentModel';
import type { ActivityType } from '../types';

export const RecruitmentCreatePage: React.FC<{ source?: RecruitmentSource | null }> = ({
  source = null,
}) => {
  const navigate = useNavigate();

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [targetMemberCount, setTargetMemberCount] = useState<number>(4);
  const [activityType, setActivityType] = useState<ActivityType>('hybrid');
  const [expectedDuration, setExpectedDuration] = useState('약 2개월');
  const [deadline, setDeadline] = useState('');
  const [rolesInput, setRolesInput] = useState('Frontend, Backend');
  const [techStacksInput, setTechStacksInput] = useState('React, TypeScript, Node.js');
  const [opportunityType, setOpportunityType] = useState<'free' | 'custom'>('free');
  const [customOpportunityTitle, setCustomOpportunityTitle] = useState('');
  const [customOpportunityUrl, setCustomOpportunityUrl] = useState('');

  const [saving, setSaving] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!source) return;

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
      const payload: CreateRecruitmentPayload = {
        title: title.trim(),
        content: content.trim(),
        targetMemberCount,
        expectedDuration: expectedDuration.trim(),
        roles,
        requiredTechStacks,
        activityType,
        status: 'recruiting',
        deadline: deadline ? `${deadline}T23:59:59+09:00` : null,
        opportunityId: null,
        customOpportunityTitle:
          opportunityType === 'custom' && customOpportunityTitle.trim()
            ? customOpportunityTitle.trim()
            : null,
        customOpportunityUrl:
          opportunityType === 'custom' && customOpportunityUrl.trim()
            ? customOpportunityUrl.trim()
            : null,
        authorId: '', // 서비스/DB에서 auth.uid()로 설정
      };

      const created = await source.createRecruitment(payload);
      navigate(`/recruitments/${created.id}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '모집글 저장 중 오류가 발생했습니다.';
      setSubmitError(msg);
    } finally {
      setSaving(false);
    }
  };

  if (!source) {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
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
          description="서비스 연결이 완료되면 모집글을 작성할 수 있어요."
        />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Link
        to="/recruitments"
        className="inline-flex items-center gap-1.5 text-xs text-[#64748B] hover:text-[#111111] transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        모집 게시판으로 돌아가기
      </Link>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-[#111111] tracking-tight">팀원 모집 게시글 작성</h1>
          <p className="text-xs text-[#64748B] mt-1">
            프로젝트 정보와 함께 필요한 팀원의 역할, 기술 스택, 활동 방식을 작성해 주세요.
          </p>
        </div>
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
                    placeholder="공모전 / 행사 명칭 (예: 교내 해커톤)"
                    value={customOpportunityTitle}
                    onChange={(e) => setCustomOpportunityTitle(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] focus:border-[#7D39EB] focus:outline-none focus:bg-white text-xs text-[#111111]"
                  />
                </div>
                <div>
                  <input
                    type="url"
                    placeholder="공모전 안내 웹사이트 URL (선택, https://...)"
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

          {/* 모집글 제목 */}
          <div>
            <label className="block text-xs font-semibold text-[#111111] mb-1.5">
              모집글 제목 <span className="text-[#7D39EB]">*</span>
            </label>
            <input
              type="text"
              placeholder="예: [해커톤] 프론트엔드/백엔드 각 1분 모집합니다!"
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
              placeholder="예: 약 2개월, 방학 중, 1학기 등"
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
              placeholder="예: Frontend, Backend, Designer, PM"
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
              placeholder="예: React, TypeScript, Node.js, Figma"
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
              placeholder="프로젝트의 목표, 회의 주기, 찾고 있는 팀원상 등을 자세히 적어주세요."
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
              to="/recruitments"
              className="px-4 py-2.5 rounded-lg bg-[#F1F5F9] text-[#64748B] text-xs font-semibold hover:text-[#111111] transition-colors"
            >
              취소
            </Link>
            <Button type="submit" disabled={saving} leftIcon={<Save className="w-4 h-4" />}>
              {saving ? '모집글 저장 중...' : '모집글 등록하기'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
