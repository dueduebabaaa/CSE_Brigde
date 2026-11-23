import { useId, useMemo, useRef, useState } from 'react';
import { Plus } from 'lucide-react';
import { calculateOptimalMeetingSlots, slotToTimeString } from '../algorithms/scheduleOptimizer';
import { Button, Card, Input, PageHeader, ProgressBar, Select } from '../components/ui';
import type { Availability, DayOfWeek } from '../types';
import { dayLabel, ScheduleSlotGrid, slotKey, slotLabel, SLOTS_PER_DAY } from './ScheduleSlotGrid';

const durationOptions = [30, 60, 90, 120].map((minutes) => ({ value: String(minutes), label: minutes + '분' }));

interface ScheduleMember {
  id: string;
  name: string;
  registered: ReadonlySet<number> | null;
}

function memberName(member: ScheduleMember) {
  return member.name.trim() || `팀원 ${member.id}`;
}

function toAvailabilityMap(members: ScheduleMember[]): Record<string, Availability[]> {
  return Object.fromEntries(members.map(({ id: userId, registered }) => [
    userId,
    Array.from(registered ?? [], (key): Availability => ({
      id: `${userId}-${key}`, userId, dayOfWeek: Math.floor(key / SLOTS_PER_DAY) as DayOfWeek,
      slot: key % SLOTS_PER_DAY, isAvailable: true, updatedAt: '',
    })),
  ]));
}

export function SchedulePage() {
  const pageId = useId();
  const nextMemberId = useRef(1);
  const [members, setMembers] = useState<ScheduleMember[]>([]);
  const [view, setView] = useState<'edit' | 'overview'>('edit');
  const [selectedId, setSelectedId] = useState('');
  const [draft, setDraft] = useState<ReadonlySet<number>>(new Set());
  const [mode, setMode] = useState<'available' | 'unavailable'>('available');
  const [duration, setDuration] = useState('60');
  const [inspected, setInspected] = useState<number | null>(null);

  const selected = members.find(({ id }) => id === selectedId);
  const registeredCount = members.filter((member) => member.registered !== null).length;
  const availability = useMemo(() => toAvailabilityMap(members), [members]);
  const names = new Map(members.map((member) => [member.id, memberName(member)]));
  const attendees: string[][] = Array.from({ length: 7 * SLOTS_PER_DAY }, () => []);
  for (const [id, slots] of Object.entries(availability)) {
    for (const { dayOfWeek, slot } of slots) attendees[slotKey(dayOfWeek, slot)].push(id);
  }
  const peak = attendees.reduce((best, ids, index) => ids.length > attendees[best].length ? index : best, 0);
  const hasTime = attendees[peak].length > 0;
  const inspectedKey = inspected ?? (hasTime ? peak : null);
  const results = useMemo(() => hasTime ? calculateOptimalMeetingSlots(availability, Number(duration)) : [],
    [availability, duration, hasTime]);

  function selectMember(member: ScheduleMember) {
    setSelectedId(member.id);
    setDraft(new Set(member.registered ?? []));
    setMode('available');
    setView('edit');
  }

  function addMember() {
    const member = { id: String(nextMemberId.current++), name: '', registered: null };
    setMembers((previous) => [...previous, member]);
    if (!selected) selectMember(member);
  }

  function removeMember(id: string) {
    const remaining = members.filter((member) => member.id !== id);
    setMembers(remaining);
    if (selectedId !== id) return;
    if (remaining.length && view === 'edit') selectMember(remaining[0]);
    else {
      setSelectedId('');
      setDraft(new Set());
    }
  }

  function paintSlots(keys: number[]) {
    setDraft((previous) => {
      const updated = new Set(previous);
      for (const key of keys) {
        if (mode === 'available') updated.add(key);
        else updated.delete(key);
      }
      return updated;
    });
  }

  function register() {
    if (!selected) return;
    setMembers((previous) => previous.map((member) => member.id === selected.id ? { ...member, registered: new Set(draft) } : member));
    setInspected(null);
    setView('overview');
  }

  return (
    <div className="min-w-0 space-y-5">
      <PageHeader title="주간 시간표 & 회의 조율" subtitle="한국 시간 기준 30분 단위로 선택하세요. 입력은 이 페이지에만 유지되며 새로고침하면 초기화됩니다." />
      <Card className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-bold">팀원 ({members.length}명)</h2>
          <Button type="button" variant="lime" size="sm" onClick={addMember} leftIcon={<Plus size={15} aria-hidden="true" />}>팀원 추가</Button>
        </div>
        {members.length === 0 && <p className="text-sm text-[#64748B]">시간을 조율할 팀원을 추가하세요.</p>}
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {members.map((member) => (
            <fieldset key={member.id} className="min-w-0 space-y-2 rounded-lg border border-[#E2E8F0] px-3 pb-3">
              <legend className="px-1 text-xs font-semibold">팀원 {member.id}</legend>
              <Input id={`${pageId}-member-${member.id}`} label="이름 또는 별칭" value={member.name}
                onChange={(event) => {
                  const name = event.target.value;
                  setMembers((previous) => previous.map((item) => item.id === member.id ? { ...item, name } : item));
                }} />
              <div className="flex flex-wrap items-center justify-between gap-1">
                <span className="text-xs text-[#475569]">
                  {member.registered === null ? '미등록' : member.registered.size ? '등록 완료' : '등록 완료 · 가능 시간 없음'}
                </span>
                <Button type="button" size="xs" variant="ghost" aria-label={`팀원 ${member.id} 삭제`} onClick={() => removeMember(member.id)}>삭제</Button>
              </div>
            </fieldset>
          ))}
        </div>
      </Card>

      <div role="group" aria-label="시간표 화면" className="flex flex-wrap gap-2">
        <Button type="button" aria-pressed={view === 'edit'} variant={view === 'edit' ? 'primary' : 'secondary'}
          onClick={() => { if (!selected && members[0]) selectMember(members[0]); else setView('edit'); }}>가능 시간 등록</Button>
        <Button type="button" aria-pressed={view === 'overview'} variant={view === 'overview' ? 'primary' : 'secondary'}
          onClick={() => setView('overview')}>참여 현황</Button>
      </div>

      {view === 'edit' ? (
        <section aria-label="가능 시간 등록" className="min-w-0">
          <Card className="min-w-0 space-y-3">
            {selected ? <>
              <div className="flex flex-wrap items-end justify-between gap-3">
                <Select id={pageId + '-selected'} label="일정을 입력할 팀원" value={selected.id}
                  options={members.map((member) => ({ value: member.id, label: memberName(member) }))}
                  onChange={(event) => {
                    const member = members.find(({ id }) => id === event.target.value);
                    if (member) selectMember(member);
                  }} />
                <div role="group" aria-label="시간 편집 모드" className="flex flex-wrap gap-2">
                  <Button type="button" aria-pressed={mode === 'available'} variant={mode === 'available' ? 'primary' : 'secondary'}
                    onClick={() => setMode('available')}>되는</Button>
                  <Button type="button" aria-pressed={mode === 'unavailable'} variant={mode === 'unavailable' ? 'primary' : 'secondary'}
                    onClick={() => setMode('unavailable')}>안되는</Button>
                </div>
              </div>
              <h2 className="break-words text-sm font-bold">{memberName(selected)}님의 가능한 시간을 선택해 주세요.</h2>
              <p className="text-xs text-[#64748B]">칸을 누르거나 끌어 선택하세요. 키보드는 방향키로 이동하고 Enter 또는 Space로 선택합니다. 터치 화면에서는 요일·시간 머리글 쪽에서 스크롤할 수 있습니다.</p>
              <ScheduleSlotGrid label="팀원별 가능 시간표" paint onSelect={paintSlots} cell={(key) => ({
                label: `${slotLabel(key)}, ${draft.has(key) ? '가능' : '미선택'}`,
                pressed: draft.has(key),
                text: draft.has(key) ? '가능' : undefined,
                className: draft.has(key) ? 'bg-[#7D39EB] font-semibold text-white' : 'bg-white',
              })} />
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm text-[#475569]">{draft.size ? `30분 구간 ${draft.size}개 선택` : '선택 없이 등록하면 가능 시간 없음으로 표시됩니다.'}</p>
                <Button type="button" onClick={register}>등록하기</Button>
              </div>
            </> : <p className="text-sm text-[#64748B]">팀원을 추가한 뒤 가능한 시간을 선택하세요.</p>}
          </Card>
        </section>
      ) : (
        <section aria-label="전체 참여 현황" className="min-w-0 space-y-4">
          <Card className="space-y-3">
            <h2 className="text-sm font-bold">참여 현황</h2>
            <ProgressBar label={`등록 완료 ${registeredCount}/${members.length}명`}
              value={members.length ? 100 * registeredCount / members.length : 0} />
            {members.length > 0 && <ul className="divide-y divide-[#E2E8F0]">
              {members.map((member) => (
                <li key={member.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                  <span className="min-w-0 break-words font-semibold">{memberName(member)}</span>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs text-[#64748B]">
                      {member.registered === null ? '미등록' : member.registered.size ? '등록 완료' : '등록 완료 · 가능 시간 없음'}
                    </span>
                    <Button type="button" size="xs" variant="outline"
                      aria-label={`${memberName(member)} ${member.registered === null ? '등록하기' : '수정하기'}`}
                      onClick={() => selectMember(member)}>{member.registered === null ? '등록하기' : '수정하기'}</Button>
                  </div>
                </li>
              ))}
            </ul>}
          </Card>

          {members.length > 0 && <Card className="min-w-0 space-y-3">
            <h2 className="text-sm font-bold">주간 가능 시간표</h2>
            <p className="text-xs text-[#64748B]">가능 인원 없음은 회색, 전원이 가능한 시간은 가장 진한 보라색입니다. 미등록 팀원도 전체 인원에 포함됩니다.</p>
            <div aria-live="polite" className="text-sm text-[#475569]">
              {inspectedKey === null ? '등록된 가능 시간이 없습니다.' : <>
                {inspected === null && '가장 많이 겹치는 시간 · '}
                <strong>{slotLabel(inspectedKey)} — {attendees[inspectedKey].length}/{members.length}명 가능</strong>
                {attendees[inspectedKey].length > 0 && <p className="break-words text-xs">{attendees[inspectedKey].map((id) => names.get(id)).join(', ')}</p>}
              </>}
            </div>
            <ScheduleSlotGrid label="전체 주간 가능 시간표" onSelect={([key]) => setInspected(key)} cell={(key) => {
              const count = attendees[key].length;
              const ratio = count / members.length;
              return {
                label: `${slotLabel(key)}, ${count}/${members.length}명 가능`,
                text: `${count}/${members.length}명`,
                pressed: key === inspectedKey,
                background: count ? `hsl(263 78% ${96 - ratio * 58}%)` : '#F1F5F9',
                className: `${ratio > 0.58 ? 'text-white' : 'text-[#28134B]'} ${key === inspectedKey ? 'ring-2 ring-inset ring-[#0F172A]' : ''}`,
              };
            }} />
          </Card>}

          <section aria-label="회의 추천 결과">
            <Card className="space-y-3">
              <h2 className="text-sm font-bold">추천 회의 시간</h2>
              <Select id={pageId + '-duration'} label="최소 회의 시간" options={durationOptions} value={duration}
                onChange={(event) => setDuration(event.target.value)} />
              {!hasTime ? <p className="text-sm text-[#64748B]">등록된 가능 시간이 없습니다.</p>
                : !results.length ? <p className="text-sm text-[#64748B]">선택한 최소 회의 시간을 만족하는 공통 구간이 없습니다.</p>
                : <>
                  <p className="text-sm text-[#64748B]">{results[0].missingMemberIds.length === 0 ? '전원이 참석 가능한 구간입니다.' : '전원이 참석할 수 없어 부분 참석 대안을 표시합니다.'}</p>
                  <ol className="space-y-2">
                    {results.map((result) => (
                      <li key={`${result.dayOfWeek}-${result.startSlot}-${result.endSlot}-${result.availableMemberIds.join(',')}`}
                        className="rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-3 text-sm">
                        <div className="flex flex-wrap items-center gap-2">
                          <strong>{dayLabel(result.dayOfWeek)} {slotToTimeString(result.startSlot)} ~ {slotToTimeString(result.endSlot, true)}</strong>
                          {result.isOptimal && <span className="rounded bg-[#C6FF33] px-2 py-0.5 text-xs font-semibold">최적</span>}
                        </div>
                        <p className="mt-1 text-[#475569]">{result.durationMinutes}분 · {result.availableMemberIds.length}/{members.length}명 참석 가능</p>
                        {result.missingMemberIds.length > 0 && <p className="mt-1 break-words text-xs text-[#64748B]">참석 불가 또는 미입력: {result.missingMemberIds.map((id) => names.get(id)).join(', ')}</p>}
                      </li>
                    ))}
                  </ol>
                </>}
            </Card>
          </section>
        </section>
      )}
    </div>
  );
}
