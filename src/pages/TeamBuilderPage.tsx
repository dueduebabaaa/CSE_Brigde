import { useId, useRef, useState } from 'react';
import { Plus } from 'lucide-react';
import { PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart, ResponsiveContainer } from 'recharts';
import { STANDARD_ROLE_KEYS } from '../algorithms/memberMatching';
import { getCanonicalTag } from '../algorithms/tagClassification';
import { ALL_TECH_SUBJECTS, analyzeTeamBalanceForRoles, TECH_TO_SUBJECT_MAP } from '../algorithms/teamAnalyzer';
import { Button, Card, Input, PageHeader } from '../components/ui';
import type { UserProfile } from '../types';

interface MemberInput {
  id: number;
  name: string;
  roles: string[];
  skills: string[];
}

const requiredRoleOptions = [...STANDARD_ROLE_KEYS, 'Database', 'AI/Data'];
const memberRoleOptions = [...requiredRoleOptions, 'Fullstack'];
const skillGroups = ALL_TECH_SUBJECTS.map((subject) => ({
  subject,
  skills: [...new Set(Object.keys(TECH_TO_SUBJECT_MAP).map(getCanonicalTag)
    .filter((skill) => TECH_TO_SUBJECT_MAP[skill.toLowerCase()]?.includes(subject)))],
}));

function ChoiceButton({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
  return (
    <Button type="button" size="xs" variant={selected ? 'primary' : 'secondary'} className="min-h-9"
      aria-pressed={selected} onClick={onClick}>{label}</Button>
  );
}

function toAnalysisProfile(member: MemberInput): UserProfile {
  // The analyzer reads ID, roles and skills from these temporary profiles.
  return {
    id: String(member.id), name: member.name.trim(), desiredRoles: member.roles,
    techStacks: member.skills, email: '', nickname: '', grade: '1학년',
    track: '플랫폼소프트웨어', bio: '', interests: [], wantedTechStacks: [], experiences: [],
    isPublic: false, createdAt: '', updatedAt: '',
  };
}

export function TeamBuilderPage() {
  const pageId = useId();
  const nextId = useRef(1);
  const [members, setMembers] = useState<MemberInput[]>([]);
  const [required, setRequired] = useState<Record<string, number>>({});
  const roles = requiredRoleOptions.flatMap((role) => Array<string>(required[role] ?? 0).fill(role));
  const profiles = members.map(toAnalysisProfile);
  const hasIncompleteMembers = profiles.some((profile) => profile.desiredRoles.length === 0);
  const ready = profiles.some((profile) => profile.desiredRoles.length || profile.techStacks.length);
  const analysis = ready ? analyzeTeamBalanceForRoles(profiles, [], roles) : null;

  function addMember() {
    const id = nextId.current++;
    setMembers((previous) => [...previous, { id, name: '', roles: [], skills: [] }]);
  }

  function updateMember(id: number, update: (member: MemberInput) => MemberInput) {
    setMembers((previous) => previous.map((member) => member.id === id ? update(member) : member));
  }

  function toggleMemberChoice(id: number, field: 'roles' | 'skills', value: string) {
    updateMember(id, (member) => ({
      ...member,
      [field]: member[field].includes(value) ? member[field].filter((choice) => choice !== value) : [...member[field], value],
    }));
  }

  return (
    <div className="min-w-0 space-y-6">
      <PageHeader title="스마트 팀 빌더" subtitle="팀원 역할과 보유 기술을 입력하면 팀 구성을 분석합니다. 입력은 이 화면에서만 유지됩니다." />
      <div className="grid min-w-0 items-start gap-5 lg:grid-cols-2">
        <Card className="min-w-0 space-y-4">
          <fieldset className="min-w-0 space-y-2">
            <legend className="mb-2 text-sm font-semibold text-[#0F172A]">프로젝트 필수 역할</legend>
            <div className="flex flex-wrap gap-1.5">
              {requiredRoleOptions.map((role) => (
                <ChoiceButton key={role} label={role} selected={Boolean(required[role])}
                  onClick={() => setRequired((previous) => ({ ...previous, [role]: previous[role] ? 0 : 1 }))} />
              ))}
            </div>
            {requiredRoleOptions.filter((role) => required[role] > 0).map((role) => (
              <div key={role} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-[#F8FAFC] px-3 py-1 text-sm">
                <span className="font-semibold">{role}</span>
                <div className="flex items-center gap-2">
                  <Button type="button" variant="secondary" size="sm" aria-label={`${role} 필요 인원 줄이기`}
                    onClick={() => setRequired((previous) => ({ ...previous, [role]: Math.max(0, previous[role] - 1) }))}>−</Button>
                  <span>{required[role]}명</span>
                  <Button type="button" variant="secondary" size="sm" aria-label={`${role} 필요 인원 늘리기`}
                    onClick={() => setRequired((previous) => ({ ...previous, [role]: previous[role] + 1 }))}>+</Button>
                </div>
              </div>
            ))}
          </fieldset>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-bold text-[#0F172A]">팀 구성 ({members.length}명)</h2>
            <Button type="button" variant="lime" size="sm" onClick={addMember} leftIcon={<Plus size={15} aria-hidden="true" />}>팀원 추가</Button>
          </div>
          {members.map((member, index) => (
            <fieldset key={member.id} className="min-w-0 space-y-3 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-3">
              <legend className="px-1 text-sm font-bold">팀원 {index + 1}</legend>
              <div className="flex justify-end">
                <Button type="button" variant="ghost" size="sm" aria-label={`팀원 ${index + 1} 삭제`}
                  onClick={() => setMembers((previous) => previous.filter(({ id }) => id !== member.id))}>삭제</Button>
              </div>
              <Input id={`${pageId}-${member.id}-name`} label="이름 또는 별칭" value={member.name}
                onChange={(event) => updateMember(member.id, (current) => ({ ...current, name: event.target.value }))} />
              <fieldset className="min-w-0">
                <legend className="mb-2 text-sm font-semibold">가능 역할</legend>
                <div className="flex flex-wrap gap-1.5">
                  {memberRoleOptions.map((role) => (
                    <ChoiceButton key={role} label={role} selected={member.roles.includes(role)}
                      onClick={() => toggleMemberChoice(member.id, 'roles', role)} />
                  ))}
                </div>
              </fieldset>
              <fieldset className="min-w-0 space-y-2">
                <legend className="mb-2 text-sm font-semibold">보유 기술</legend>
                {member.skills.length > 0 && <div className="flex flex-wrap gap-1.5" aria-label="선택한 보유 기술">
                  {member.skills.map((skill) => (
                    <Button key={skill} type="button" variant="outline" size="xs" aria-label={`${skill} 선택 해제`}
                      onClick={() => toggleMemberChoice(member.id, 'skills', skill)}>{skill} ×</Button>
                  ))}
                </div>}
                {skillGroups.map(({ subject, skills }) => (
                  <details key={subject} className="rounded-lg border border-[#E2E8F0] bg-white px-3 py-2">
                    <summary className="cursor-pointer text-sm font-semibold">{subject}</summary>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {skills.map((skill) => (
                        <ChoiceButton key={skill} label={skill} selected={member.skills.includes(skill)}
                          onClick={() => toggleMemberChoice(member.id, 'skills', skill)} />
                      ))}
                    </div>
                  </details>
                ))}
              </fieldset>
            </fieldset>
          ))}
        </Card>
        <section aria-label="팀 분석 결과" className="min-w-0 space-y-4">
          <Card className="space-y-3">
            <h2 className="text-sm font-bold text-[#0F172A]">역할 구성</h2>
            {!analysis ? <p className="text-sm text-[#64748B]">{members.length ? '가능 역할이나 보유 기술을 선택하면 분석이 시작됩니다.' : '분석할 팀원을 추가하세요.'}</p>
              : <>
                <p className="text-sm font-semibold text-[#7D39EB]">{roles.length ? (analysis.isBalanced ? '필수 역할 충족' : '필수 역할 미충족') : '역할 균형 미판정'}</p>
                {hasIncompleteMembers && <p className="text-sm text-[#64748B]">일부 팀원의 가능 역할이 비어 있습니다. 입력된 역할을 기준으로 분석했습니다.</p>}
                <dl className="grid grid-cols-2 gap-3 break-words text-sm">
                  <div><dt className="font-semibold">{roles.length ? '충족 역할' : '확인된 역할'}</dt><dd>{analysis.coveredRoles.join(', ') || '없음'}</dd></div>
                  <div><dt className="font-semibold">부족 역할</dt><dd>{roles.length ? analysis.missingRoles.join(', ') || '없음' : '미판정'}</dd></div>
                </dl>
                <ul className="space-y-1 text-xs text-[#64748B]">{analysis.warnings.map((warning, index) => <li key={index}>{warning}</li>)}</ul>
              </>}
          </Card>
          {analysis && <Card className="space-y-3">
            <h2 className="text-sm font-bold text-[#0F172A]">분야별 기술 커버리지</h2>
            <p className="text-xs text-[#64748B]">팀이 입력한 고유 기술의 분야별 범위를 나타냅니다.</p>
            <div className="h-56 min-w-0" aria-hidden="true">
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <RadarChart data={analysis.radarData}>
                  <PolarGrid stroke="#E2E8F0" />
                  <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10 }} />
                  <PolarRadiusAxis domain={[0, 100]} tick={false} />
                  <Radar dataKey="score" stroke="#7D39EB" fill="#7D39EB" fillOpacity={0.25} isAnimationActive={false} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
            <dl className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
              {analysis.radarData.map(({ subject, score }) => (
                <div key={subject} className="rounded-lg bg-[#F8FAFC] p-2"><dt>{subject}</dt><dd className="font-bold text-[#7D39EB]">{score}점</dd></div>
              ))}
            </dl>
          </Card>}
        </section>
      </div>
    </div>
  );
}
