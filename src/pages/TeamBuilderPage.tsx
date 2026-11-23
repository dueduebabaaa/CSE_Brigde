import { useId, useRef, useState } from 'react';
import { Plus } from 'lucide-react';
import { PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart, ResponsiveContainer } from 'recharts';
import { analyzeTeamBalanceForRoles } from '../algorithms/teamAnalyzer';
import { Button, Card, Input, PageHeader } from '../components/ui';
import type { UserProfile } from '../types';

interface MemberInput {
  id: number;
  name: string;
  roles: string;
  skills: string;
}

const splitList = (value: string) => value.split(',').map((item) => item.trim()).filter(Boolean);
const isReserved = (value: string) => Object.prototype.hasOwnProperty.call(Object.prototype, value.normalize('NFKC').toLowerCase());

function toAnalysisProfile(member: MemberInput): UserProfile {
  // The analyzer reads ID, roles and skills from these temporary profiles.
  return {
    id: String(member.id), name: member.name.trim(), desiredRoles: splitList(member.roles),
    techStacks: splitList(member.skills), email: '', nickname: '', grade: '1학년',
    track: '플랫폼소프트웨어', bio: '', interests: [], wantedTechStacks: [], experiences: [],
    isPublic: false, createdAt: '', updatedAt: '',
  };
}

export function TeamBuilderPage() {
  const pageId = useId();
  const nextId = useRef(1);
  const [members, setMembers] = useState<MemberInput[]>([]);
  const [required, setRequired] = useState('');
  const roles = splitList(required);
  const profiles = members.map(toAnalysisProfile);
  const invalidTag = [...roles, ...profiles.flatMap((profile) => [...profile.desiredRoles, ...profile.techStacks])]
    .some(isReserved);
  const hasIncompleteMembers = profiles.some((profile) => profile.desiredRoles.length === 0);
  const ready = profiles.some((profile) => profile.desiredRoles.length || profile.techStacks.length);
  const analysis = ready && !invalidTag ? analyzeTeamBalanceForRoles(profiles, [], roles) : null;

  function addMember() {
    const id = nextId.current++;
    setMembers((previous) => [...previous, { id, name: '', roles: '', skills: '' }]);
  }

  function updateMember(id: number, field: 'name' | 'roles' | 'skills', value: string) {
    setMembers((previous) => previous.map((member) => member.id === id ? { ...member, [field]: value } : member));
  }

  return (
    <div className="min-w-0 space-y-6">
      <PageHeader title="스마트 팀 빌더" subtitle="팀원 역할과 보유 기술을 입력하면 팀 구성을 분석합니다. 입력은 이 화면에서만 유지됩니다." />
      <div className="grid min-w-0 items-start gap-5 lg:grid-cols-2">
        <Card className="min-w-0 space-y-4">
          <Input id={pageId + '-requirements'} label="프로젝트 필수 역할" value={required}
            onChange={(event) => setRequired(event.target.value)} placeholder="Frontend, Backend"
            hint="쉼표로 구분하세요. 같은 역할을 여러 명에게 맡기려면 반복해서 입력하세요." />
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-bold text-[#0F172A]">팀 구성 ({members.length}명)</h2>
            <Button type="button" variant="lime" size="sm" onClick={addMember} leftIcon={<Plus size={15} aria-hidden="true" />}>팀원 추가</Button>
          </div>
          {members.map((member) => (
            <fieldset key={member.id} className="min-w-0 space-y-3 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-3">
              <legend className="px-1 text-sm font-bold">팀원 {member.id}</legend>
              <div className="flex justify-end">
                <Button type="button" variant="ghost" size="sm" aria-label={`팀원 ${member.id} 삭제`}
                  onClick={() => setMembers((previous) => previous.filter(({ id }) => id !== member.id))}>삭제</Button>
              </div>
              <Input id={`${pageId}-${member.id}-name`} label="이름 또는 별칭" value={member.name} onChange={(event) => updateMember(member.id, 'name', event.target.value)} />
              <Input id={`${pageId}-${member.id}-roles`} label="가능 역할" value={member.roles} placeholder="Frontend, UI/UX" onChange={(event) => updateMember(member.id, 'roles', event.target.value)} />
              <Input id={`${pageId}-${member.id}-skills`} label="보유 기술" value={member.skills} placeholder="React, TypeScript" onChange={(event) => updateMember(member.id, 'skills', event.target.value)} />
            </fieldset>
          ))}
        </Card>
        <section aria-label="팀 분석 결과" className="min-w-0 space-y-4">
          <Card className="space-y-3">
            <h2 className="text-sm font-bold text-[#0F172A]">역할 구성</h2>
            {invalidTag ? <p role="alert" className="text-sm text-red-700">역할 또는 기술에 사용할 수 없는 이름이 있습니다.</p>
              : !analysis ? <p className="text-sm text-[#64748B]">{members.length ? '가능 역할이나 보유 기술을 입력하면 분석이 시작됩니다.' : '분석할 팀원을 추가하세요.'}</p>
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
