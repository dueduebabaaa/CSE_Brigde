import { useId, useRef, useState } from 'react';
import { Plus } from 'lucide-react';
import { calculateOptimalMeetingSlots, slotToTimeString } from '../algorithms/scheduleOptimizer';
import { Button, Card, Input, PageHeader, Select } from '../components/ui';
import type { Availability, DayOfWeek } from '../types';

const DAYS = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];
const dayOptions = [1, 2, 3, 4, 5, 6, 0].map((day) => ({ value: String(day), label: DAYS[day] }));
const startOptions = Array.from({ length: 48 }, (_, slot) => ({ value: String(slot), label: slotToTimeString(slot) }));
const endOptions = Array.from({ length: 48 }, (_, slot) => ({ value: String(slot + 1), label: slotToTimeString(slot, true) }));
const durationOptions = [30, 60, 90, 120].map((minutes) => ({ value: String(minutes), label: minutes + '분' }));

interface TimeRange {
  id: number;
  day: string;
  start: string;
  end: string;
}

interface ScheduleMember {
  id: number;
  name: string;
  ranges: TimeRange[];
}

function isCompleteRange({ day, start, end }: TimeRange) {
  return day !== '' && start !== '' && end !== '' && Number(start) < Number(end);
}

function toAvailabilityMap(members: ScheduleMember[]): Record<string, Availability[]> {
  return Object.fromEntries(members.map((member) => {
    const userId = String(member.id);
    const slots = new Map<string, Availability>();
    for (const range of member.ranges) {
      for (let slot = Number(range.start); slot < Number(range.end); slot++) {
        const id = `${userId}-${range.day}-${slot}`;
        slots.set(id, { id, userId, dayOfWeek: Number(range.day) as DayOfWeek, slot, isAvailable: true, updatedAt: '' });
      }
    }
    return [userId, [...slots.values()]];
  }));
}

export function SchedulePage() {
  const pageId = useId();
  const nextMemberId = useRef(1);
  const nextRangeId = useRef(1);
  const [members, setMembers] = useState<ScheduleMember[]>([]);
  const [duration, setDuration] = useState('60');
  const hasInvalidRange = members.some((member) => member.ranges.some((range) => !isCompleteRange(range)));
  const hasTime = members.some((member) => member.ranges.length > 0);
  const results = hasTime && !hasInvalidRange ? calculateOptimalMeetingSlots(toAvailabilityMap(members), Number(duration)) : [];
  const names = new Map(members.map((member) => [String(member.id), member.name.trim() || `팀원 ${member.id}`]));

  function updateMember(id: number, update: (member: ScheduleMember) => ScheduleMember) {
    setMembers((previous) => previous.map((member) => member.id === id ? update(member) : member));
  }

  function addMember() {
    const id = nextMemberId.current++;
    setMembers((previous) => [...previous, { id, name: '', ranges: [] }]);
  }

  function addRange(memberId: number) {
    const id = nextRangeId.current++;
    updateMember(memberId, (member) => ({ ...member, ranges: [...member.ranges, { id, day: '', start: '', end: '' }] }));
  }

  function changeRange(memberId: number, rangeId: number, key: 'day' | 'start' | 'end', value: string) {
    updateMember(memberId, (member) => ({
      ...member, ranges: member.ranges.map((range) => range.id === rangeId ? { ...range, [key]: value } : range),
    }));
  }

  return (
    <div className="min-w-0 space-y-6">
      <PageHeader title="주간 시간표 & 회의 조율" subtitle="한국 시간 기준으로 가능한 요일과 시간을 입력하세요. 입력은 이 화면에서만 유지됩니다." />
      <div className="grid min-w-0 items-start gap-5 lg:grid-cols-2">
        <Card className="min-w-0 space-y-4">
          <Select id={pageId + '-duration'} label="최소 회의 시간" options={durationOptions} value={duration}
            onChange={(event) => setDuration(event.target.value)} />
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-bold text-[#0F172A]">팀원별 가능 시간 ({members.length}명)</h2>
            <Button type="button" variant="lime" size="sm" onClick={addMember} leftIcon={<Plus size={15} aria-hidden="true" />}>팀원 추가</Button>
          </div>
          <p className="text-xs text-[#64748B]">30분 단위로 여러 구간을 추가할 수 있습니다. 자정을 넘는 구간은 두 요일로 나눠 입력하세요.</p>
          {members.map((member) => (
            <fieldset key={member.id} className="min-w-0 space-y-3 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-3">
              <legend className="px-1 text-sm font-bold">팀원 {member.id}</legend>
              <div className="flex justify-end">
                <Button type="button" variant="ghost" size="sm" aria-label={`팀원 ${member.id} 삭제`}
                  onClick={() => setMembers((previous) => previous.filter(({ id }) => id !== member.id))}>삭제</Button>
              </div>
              <Input id={`${pageId}-member-${member.id}`} label="이름 또는 별칭" value={member.name}
                onChange={(event) => updateMember(member.id, (current) => ({ ...current, name: event.target.value }))} />
              {member.ranges.map((range, index) => {
                const prefix = `${pageId}-range-${range.id}`;
                const reversed = range.start !== '' && range.end !== '' && Number(range.start) >= Number(range.end);
                return (
                  <fieldset key={range.id} className="min-w-0 space-y-2 rounded-lg border border-[#E2E8F0] bg-white p-3">
                    <legend className="px-1 text-xs font-semibold">가능 시간 {index + 1}</legend>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                      <Select id={prefix + '-day'} label="요일" placeholder="선택" options={dayOptions} value={range.day}
                        onChange={(event) => changeRange(member.id, range.id, 'day', event.target.value)} />
                      <Select id={prefix + '-start'} label="시작" placeholder="선택" options={startOptions} value={range.start}
                        onChange={(event) => changeRange(member.id, range.id, 'start', event.target.value)} />
                      <Select id={prefix + '-end'} label="종료" placeholder="선택" options={endOptions} value={range.end}
                        aria-invalid={reversed} aria-describedby={reversed ? prefix + '-error' : undefined}
                        onChange={(event) => changeRange(member.id, range.id, 'end', event.target.value)} />
                    </div>
                    {reversed && <p id={prefix + '-error'} className="text-xs text-red-700">종료 시간은 시작 시간보다 늦어야 합니다.</p>}
                    <Button type="button" size="xs" variant="ghost" aria-label={`가능 시간 ${index + 1} 삭제`}
                      onClick={() => updateMember(member.id, (current) => ({
                        ...current, ranges: current.ranges.filter(({ id }) => id !== range.id),
                      }))}>구간 삭제</Button>
                  </fieldset>
                );
              })}
              <Button type="button" size="sm" variant="outline" onClick={() => addRange(member.id)}>가능 시간 추가</Button>
            </fieldset>
          ))}
        </Card>

        <section aria-label="회의 추천 결과" className="min-w-0">
          <Card className="space-y-3">
            <h2 className="text-sm font-bold text-[#0F172A]">추천 회의 시간</h2>
            {hasInvalidRange ? <p role="status" className="text-sm text-[#64748B]">추가한 모든 구간의 요일과 시작·종료 시간을 확인하세요.</p>
              : !members.length ? <p className="text-sm text-[#64748B]">시간을 조율할 팀원을 추가하세요.</p>
              : !hasTime ? <p className="text-sm text-[#64748B]">팀원의 가능 시간을 입력하세요.</p>
              : <>
                {members.some((member) => !member.ranges.length) && <p className="text-sm text-[#64748B]">가능 시간을 입력하지 않은 팀원도 전체 인원에 포함됩니다.</p>}
                {!results.length ? <p className="text-sm text-[#64748B]">선택한 최소 회의 시간을 만족하는 공통 구간이 없습니다.</p>
                  : <>
                    <p className="text-sm text-[#64748B]">{results[0].missingMemberIds.length === 0 ? '전원이 참석 가능한 구간입니다.' : '전원이 참석할 수 없어 부분 참석 대안을 표시합니다.'}</p>
                    <ol className="space-y-2">
                      {results.map((result) => (
                        <li key={`${result.dayOfWeek}-${result.startSlot}-${result.endSlot}-${result.availableMemberIds.join(',')}`}
                          className="rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-3 text-sm">
                          <div className="flex flex-wrap items-center gap-2">
                            <strong>{DAYS[result.dayOfWeek]} {slotToTimeString(result.startSlot)} ~ {slotToTimeString(result.endSlot, true)}</strong>
                            {result.isOptimal && <span className="rounded bg-[#C6FF33] px-2 py-0.5 text-xs font-semibold">최적</span>}
                          </div>
                          <p className="mt-1 text-[#475569]">{result.durationMinutes}분 · {result.availableMemberIds.length}/{members.length}명 참석 가능</p>
                          {result.missingMemberIds.length > 0 && <p className="mt-1 break-words text-xs text-[#64748B]">참석 불가 또는 미입력: {result.missingMemberIds.map((id) => names.get(id)).join(', ')}</p>}
                        </li>
                      ))}
                    </ol>
                  </>}
              </>}
          </Card>
        </section>
      </div>
    </div>
  );
}
