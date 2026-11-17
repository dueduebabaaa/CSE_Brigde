import { useLayoutEffect, useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Clock, FileText, Mail, Save } from 'lucide-react';
import { useMyProfile } from '../contexts/MyProfileContext';
import { MAJOR_TRACKS, GRADE_OPTIONS } from '../constants/majors';
import { TECH_CATALOG } from '../constants/technologies';
import type { UserProfile } from '../services/profileService';
import { ACTIVITY_GOALS, ACTIVITY_TYPES, INTERESTS, ROLES, buildProfilePatch, toProfileDraft, validateProfileDraft, type ProfileDraft } from '../features/profile/profileForm';
import { Field, MultiChoice, Section, fieldClass } from '../features/profile/ProfileFields';

function ProfileEditor({ profile }: { profile: UserProfile }) {
  const { update, saving } = useMyProfile();
  const [draft, setDraft] = useState(() => toProfileDraft(profile));
  const [errors, setErrors] = useState<string[]>([]);
  const [notice, setNotice] = useState('');
  const submitting = useRef(false);
  const original = toProfileDraft(profile);
  const patch = buildProfilePatch(original, draft);
  const dirty = Object.keys(patch).length > 0;
  useLayoutEffect(() => { setDraft(toProfileDraft(profile)); }, [profile]);
  const change = <K extends keyof ProfileDraft>(key: K, value: ProfileDraft[K]) => {
    setDraft(current => ({ ...current, [key]: value }));
    setNotice('');
    setErrors([]);
  };
  const changeTechnologies = (values: string[]) => {
    change('tech_stacks', values);
    const levels = draft.tech_proficiency;
    if (levels && Object.keys(levels).some(key => !values.includes(key))) change('tech_proficiency', Object.fromEntries(Object.entries(levels).filter(([key]) => values.includes(key))));
  };
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (submitting.current || saving || !dirty) return;
    const issues = validateProfileDraft(draft);
    if (issues.length) { setErrors(issues); return; }
    submitting.current = true;
    setNotice(''); setErrors([]);
    try {
      await update(patch);
      setNotice('프로필 변경 사항을 저장했습니다.');
    } catch (error) {
      setErrors([error instanceof Error ? error.message : '저장하지 못했습니다. 다시 시도해 주세요.']);
    } finally { submitting.current = false; }
  };
  return <form onSubmit={submit} noValidate className="space-y-6" aria-label="내 프로필 수정">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-xs text-[#64748B]">{dirty ? '저장하지 않은 변경 사항이 있습니다.' : '저장된 프로필을 표시하고 있습니다.'}</p>
      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={saving || !dirty} onClick={() => { setDraft(toProfileDraft(profile)); setErrors([]); setNotice('변경 사항을 취소했습니다.'); }} className="min-h-11 rounded-lg border border-[#E2E8F0] px-4 py-2 text-xs font-bold text-[#64748B] disabled:opacity-50">수정 취소</button>
        <button type="submit" disabled={saving || !dirty} className="flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#C6FF33] px-4 py-2 text-xs font-bold text-black hover:bg-[#B8F224] disabled:opacity-50"><Save size={15} />{saving ? '저장 중...' : '프로필 저장'}</button>
      </div>
    </div>
    {notice && <p role="status" className="rounded-lg bg-[#F4EFFE] p-3 text-sm text-[#7D39EB]">{notice}</p>}
    {errors.length > 0 && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"><ul className="list-inside list-disc">{errors.map(error => <li key={error}>{error}</li>)}</ul></div>}
    <fieldset disabled={saving} className="min-w-0 space-y-6">
      <legend className="sr-only">프로필 입력 항목</legend>
      <Section title="학부 및 기본 정보">
        <div className="grid min-w-0 gap-5 sm:grid-cols-2">
          <Field label="이름"><input className={fieldClass} value={draft.name} onChange={event => change('name', event.target.value)} required /></Field>
          <Field label="닉네임"><input aria-label="닉네임" className={fieldClass} value={draft.nickname} onChange={event => change('nickname', event.target.value)} placeholder="미입력 시 이름으로 표시" /></Field>
          <Field label="학교 이메일"><input className={fieldClass} value={profile.email} readOnly /></Field>
          <Field label="학년"><select className={fieldClass} value={draft.grade} onChange={event => change('grade', event.target.value as ProfileDraft['grade'])}>{GRADE_OPTIONS.map(value => <option key={value}>{value}</option>)}</select></Field>
          <Field label="소속 학부"><input className={fieldClass} value={draft.department ?? ''} readOnly placeholder="미등록" /></Field>
          <Field label="세부전공"><select className={fieldClass} value={draft.track} onChange={event => change('track', event.target.value as ProfileDraft['track'])}>{MAJOR_TRACKS.map(value => <option key={value}>{value}</option>)}</select></Field>
        </div>
        <p className="text-xs text-[#94A3B8]">소속 학부(department)와 세부전공(track)은 저장된 값을 그대로 표시합니다. 소속 학부 변경은 수정 정책 확정 후 지원할 예정입니다.</p>
      </Section>
      <Section title="관심 분야 및 희망 역할">
        <MultiChoice label="관심 분야 및 기타 입력" options={INTERESTS} selected={draft.interests} onChange={values => change('interests', values)} custom />
        <MultiChoice label="희망 역할 및 기타 역할" options={ROLES} selected={draft.desired_roles} onChange={values => change('desired_roles', values)} custom />
        <p className="text-xs text-[#94A3B8]">기타 직접 입력은 현재 저장 계약에 따라 선택 목록에 함께 보관합니다.</p>
      </Section>
      <Section title="기술 역량">
        <MultiChoice label="보유 기술" options={Object.values(TECH_CATALOG).flat()} selected={draft.tech_stacks} onChange={changeTechnologies} custom />
        <button type="button" aria-pressed={Array.isArray(draft.tech_stacks) && !draft.tech_stacks.length} onClick={() => { change('tech_stacks', []); change('tech_proficiency', {}); }} className="min-h-11 rounded-lg border border-[#7D39EB]/30 bg-[#F4EFFE] px-3 py-2 text-xs font-bold text-[#7D39EB]">아직 보유 기술 없음</button>
        {!!draft.tech_stacks?.length && <div className="grid min-w-0 gap-4 sm:grid-cols-2">{draft.tech_stacks.map(tech => <Field key={tech} label={`${tech} 숙련도`}><select className={fieldClass} value={draft.tech_proficiency?.[tech] ?? ''} onChange={event => change('tech_proficiency', { ...(draft.tech_proficiency ?? {}), [tech]: (event.target.value || null) as '입문' | '활용 가능' | '숙련' | null })}><option value="">미입력</option>{['입문', '활용 가능', '숙련'].map(value => <option key={value}>{value}</option>)}</select></Field>)}</div>}
        {Object.keys(draft.tech_proficiency ?? {}).some(tech => !draft.tech_stacks?.includes(tech)) && <div className="space-y-2 text-xs text-[#64748B]"><p>보유 목록 밖의 기존 숙련도: {Object.entries(draft.tech_proficiency ?? {}).filter(([tech]) => !draft.tech_stacks?.includes(tech)).map(([tech, level]) => `${tech} (${level ?? '미입력'})`).join(', ')}</p><button type="button" className="underline" onClick={() => change('tech_proficiency', Object.fromEntries(Object.entries(draft.tech_proficiency ?? {}).filter(([tech]) => draft.tech_stacks?.includes(tech))))}>보유 목록 밖 숙련도 정리</button></div>}
        <MultiChoice label="배우고 싶은 기술" options={Object.values(TECH_CATALOG).flat()} selected={draft.wanted_tech_stacks} onChange={values => change('wanted_tech_stacks', values)} custom />
      </Section>
      <Section title="협업 프로필">
        <MultiChoice label="활동 유형" options={ACTIVITY_TYPES} selected={draft.activity_types} onChange={values => change('activity_types', values)} custom />
        <MultiChoice label="활동 목표" options={ACTIVITY_GOALS} selected={draft.activity_goals} onChange={values => change('activity_goals', values)} custom />
        <div className="grid min-w-0 gap-5 sm:grid-cols-2">
          <Field label="협업 방식"><select className={fieldClass} value={draft.activity_mode ?? ''} onChange={event => change('activity_mode', (event.target.value || null) as ProfileDraft['activity_mode'])}><option value="">미선택</option>{['대면', '비대면', '혼합'].map(value => <option key={value}>{value}</option>)}</select></Field>
          <Field label="희망 활동 기간"><select className={fieldClass} value={draft.activity_duration ?? ''} onChange={event => change('activity_duration', (event.target.value || null) as ProfileDraft['activity_duration'])}><option value="">미선택</option>{['단기 (1개월 이내)', '장기 (3개월 이상)', '무관'].map(value => <option key={value}>{value}</option>)}</select></Field>
          <Field label="참여 상태"><select className={fieldClass} value={draft.availability_status ?? ''} onChange={event => change('availability_status', (event.target.value || null) as ProfileDraft['availability_status'])}><option value="">미선택</option>{['팀 구하는 중', '제안 환영', '활동 중', '참여 어려움'].map(value => <option key={value}>{value}</option>)}</select></Field>
        </div>
      </Section>
      <Section title="자기소개 및 외부 링크">
        <Field label="한 줄 자기소개"><input className={fieldClass} maxLength={60} value={draft.bio ?? ''} onChange={event => change('bio', event.target.value)} placeholder="60자 이내" /></Field>
        <Field label="상세 자기소개"><textarea className={fieldClass + ' min-h-32'} maxLength={500} value={draft.long_bio ?? ''} onChange={event => change('long_bio', event.target.value)} placeholder="500자 이내" /></Field>
        <div className="grid min-w-0 gap-5 sm:grid-cols-2">
          <Field label="GitHub 링크"><input className={fieldClass} value={draft.github_url ?? ''} placeholder="https://github.com/사용자명" onChange={event => change('github_url', event.target.value.trim() || null)} /></Field>
          <Field label="포트폴리오 링크"><input className={fieldClass} value={draft.portfolio_url ?? ''} placeholder="https://example.com" onChange={event => change('portfolio_url', event.target.value.trim() || null)} /></Field>
        </div>
      </Section>
      <Section title="프로필 공개 범위">
        <Field label="공개 범위"><select className={fieldClass} value={draft.visibility ?? ''} onChange={event => change('visibility', (event.target.value || null) as ProfileDraft['visibility'])}><option value="" disabled>미설정 (기존 값 유지)</option><option value="public">회원 공개</option><option value="team_only">팀원 공개</option><option value="private">비공개</option></select></Field>
        <p className="text-xs text-[#64748B]">회원 공개는 인증된 BRIDGE 회원을 대상으로 합니다. 학교 이메일은 다른 회원에게 공개하지 않습니다.</p>
      </Section>
    </fieldset>
  </form>;
}

export function ProfilePage() {
  const { profile, status, error, refresh } = useMyProfile();
  return <div className="mx-auto max-w-4xl space-y-6">
    <div><div className="flex flex-wrap items-center gap-2"><h1 className="text-2xl font-black text-[#111111]">마이페이지 &amp; 프로필 설정</h1><span className="rounded border border-[#7D39EB]/20 bg-[#F4EFFE] px-2 py-0.5 text-xs font-semibold text-[#7D39EB]">MY PROFILE</span></div><p className="mt-1 text-xs text-[#64748B]">내 프로필 정보, 기술 스택, 세부전공 및 공개 범위를 관리합니다.</p></div>
    {status === 'loading' && <div role="status" className="rounded-2xl border border-[#E2E8F0] bg-white p-8 text-sm text-[#64748B]">프로필을 불러오는 중...</div>}
    {status === 'error' && <div role="alert" className="space-y-3 rounded-2xl border border-[#E2E8F0] bg-white p-6 text-sm"><p>프로필을 불러오지 못했습니다.</p><p className="break-words text-[#64748B]">{error}</p><button type="button" onClick={refresh} className="min-h-11 rounded-lg bg-[#7D39EB] px-4 text-white">다시 시도</button></div>}
    {status === 'missing' && <Section title="등록된 프로필이 없습니다"><p className="text-sm text-[#64748B]">프로필 설정을 완료해 주세요.</p><Link className="inline-flex min-h-11 items-center text-sm font-bold text-[#7D39EB]" to="/onboarding">프로필 설정하기</Link></Section>}
    {status === 'signed_out' && <p className="text-sm text-[#64748B]">로그인 후 내 프로필을 확인할 수 있습니다.</p>}
    {status === 'ready' && profile && <ProfileEditor key={profile.id} profile={profile} />}
    <div className="grid grid-cols-1 gap-4 text-xs sm:grid-cols-3">
      <Link to="/recruitments" className="rounded-xl border border-[#E2E8F0] bg-white p-4"><span className="flex items-center gap-2 text-[#64748B]"><FileText size={16} />내 모집글</span><span className="mt-2 block text-[#64748B]">현황 연동 준비 중</span></Link>
      <div className="rounded-xl border border-[#E2E8F0] bg-white p-4"><span className="flex items-center gap-2 text-[#64748B]"><Mail size={16} />받은 팀 초대장</span><span className="mt-2 block text-[#64748B]">현황 연동 준비 중</span></div>
      <Link to="/schedule" className="rounded-xl border border-[#E2E8F0] bg-white p-4"><span className="flex items-center gap-2 text-[#64748B]"><Clock size={16} />활동 가능 시간표</span><span className="mt-2 block font-bold text-[#7D39EB]">설정하러 가기 →</span></Link>
    </div>
  </div>;
}
