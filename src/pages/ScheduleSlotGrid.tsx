import { useLayoutEffect, useRef, useState } from 'react';
import type { KeyboardEvent, PointerEvent } from 'react';
import { slotToTimeString } from '../algorithms/scheduleOptimizer';
import type { DayOfWeek } from '../types';

export const SLOTS_PER_DAY = 48;
export const WEEKDAYS: DayOfWeek[] = [1, 2, 3, 4, 5, 6, 0];
const DAYS = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];
const HOURS = Array.from({ length: SLOTS_PER_DAY }, (_, slot) => slot);
const FIRST_VISIBLE_SLOT = 18;

export const slotKey = (day: DayOfWeek, slot: number) => day * SLOTS_PER_DAY + slot;
export const intervalLabel = (slot: number) => `${slotToTimeString(slot)}–${slotToTimeString(slot, true)}`;
export const dayLabel = (day: DayOfWeek) => DAYS[day];
export const slotLabel = (key: number) => `${DAYS[Math.floor(key / SLOTS_PER_DAY)]} ${intervalLabel(key % SLOTS_PER_DAY)}`;

interface SlotCell {
  label: string;
  text?: string;
  className: string;
  pressed: boolean;
  background?: string;
}

interface ScheduleSlotGridProps {
  label: string;
  cell: (key: number) => SlotCell;
  onSelect: (keys: number[]) => void;
  paint?: boolean;
}

function slotsBetween(from: number, to: number) {
  const fromDay = WEEKDAYS.indexOf(Math.floor(from / SLOTS_PER_DAY) as DayOfWeek);
  const toDay = WEEKDAYS.indexOf(Math.floor(to / SLOTS_PER_DAY) as DayOfWeek);
  const fromSlot = from % SLOTS_PER_DAY;
  const toSlot = to % SLOTS_PER_DAY;
  const steps = Math.max(Math.abs(toDay - fromDay), Math.abs(toSlot - fromSlot));
  return Array.from({ length: steps }, (_, index) => {
    const progress = (index + 1) / steps;
    return slotKey(WEEKDAYS[Math.round(fromDay + (toDay - fromDay) * progress)],
      Math.round(fromSlot + (toSlot - fromSlot) * progress));
  });
}

export function ScheduleSlotGrid({ label, cell, onSelect, paint = false }: ScheduleSlotGridProps) {
  const scroll = useRef<HTMLDivElement>(null);
  const morning = useRef<HTMLTableRowElement>(null);
  const header = useRef<HTMLTableSectionElement>(null);
  const gesture = useRef<{ pointerId: number; lastKey: number | null } | null>(null);
  const [focusKey, setFocusKey] = useState(slotKey(1, FIRST_VISIBLE_SLOT));

  useLayoutEffect(() => {
    if (scroll.current && morning.current) {
      scroll.current.scrollTop = morning.current.offsetTop - (header.current?.offsetHeight ?? 0);
    }
  }, []);

  function moveFocus(event: KeyboardEvent<HTMLButtonElement>, day: DayOfWeek, slot: number) {
    let nextDay = WEEKDAYS.indexOf(day);
    let nextSlot = slot;
    switch (event.key) {
      case 'ArrowLeft': nextDay--; break;
      case 'ArrowRight': nextDay++; break;
      case 'ArrowUp': nextSlot--; break;
      case 'ArrowDown': nextSlot++; break;
      case 'Home': nextSlot = 0; break;
      case 'End': nextSlot = SLOTS_PER_DAY - 1; break;
      default: return;
    }
    event.preventDefault();
    const key = slotKey(WEEKDAYS[Math.max(0, Math.min(6, nextDay))], Math.max(0, Math.min(SLOTS_PER_DAY - 1, nextSlot)));
    scroll.current?.querySelector<HTMLButtonElement>(`[data-slot-key="${key}"]`)?.focus();
  }

  function startPaint(event: PointerEvent<HTMLButtonElement>, key: number) {
    if (!paint || event.button !== 0 || gesture.current) return;
    event.preventDefault();
    event.currentTarget.focus({ preventScroll: true });
    gesture.current = { pointerId: event.pointerId, lastKey: key };
    scroll.current?.setPointerCapture?.(event.pointerId);
    onSelect([key]);
  }

  function continuePaint(event: PointerEvent<HTMLDivElement>) {
    const active = gesture.current;
    if (!active || active.pointerId !== event.pointerId) return;
    const hit = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLButtonElement>('[data-slot-key]');
    if (!hit || !event.currentTarget.contains(hit)) {
      active.lastKey = null;
      return;
    }
    const key = Number(hit.dataset.slotKey);
    if (key === active.lastKey) return;
    onSelect(active.lastKey === null ? [key] : slotsBetween(active.lastKey, key));
    active.lastKey = key;
  }

  function endPaint(event: PointerEvent<HTMLDivElement>) {
    if (gesture.current?.pointerId === event.pointerId) gesture.current = null;
  }

  return (
    <div ref={scroll} role="region" aria-label={label} tabIndex={0}
      onPointerMove={continuePaint} onPointerUp={endPaint} onPointerCancel={endPaint}
      onLostPointerCapture={(event) => { if (event.target === event.currentTarget) endPaint(event); }}
      className="relative max-h-96 overflow-auto overscroll-contain rounded-lg border border-[#E2E8F0] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#7D39EB]">
      <table className="w-full min-w-[42rem] table-fixed border-separate border-spacing-0 text-center text-xs">
        <caption className="sr-only">{label}</caption>
        <thead ref={header}>
          <tr>
            <th scope="col" className="sticky left-0 top-0 z-20 w-28 border-b border-r border-[#E2E8F0] bg-[#F8FAFC] px-2 py-2">시간</th>
            {WEEKDAYS.map((day) => (
              <th key={day} scope="col" className="sticky top-0 z-10 border-b border-[#E2E8F0] bg-[#F8FAFC] py-2">{dayLabel(day)}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {HOURS.map((slot) => (
            <tr key={slot} ref={slot === FIRST_VISIBLE_SLOT ? morning : undefined}>
              <th scope="row" className="sticky left-0 z-10 whitespace-nowrap border-b border-r border-[#E2E8F0] bg-[#F8FAFC] px-2 font-medium">{intervalLabel(slot)}</th>
              {WEEKDAYS.map((day) => {
                const key = slotKey(day, slot);
                const state = cell(key);
                return (
                  <td key={day} className="border-b border-r border-[#E2E8F0] p-0">
                    <button type="button" data-slot-key={key} tabIndex={key === focusKey ? 0 : -1}
                      aria-label={state.label} aria-pressed={state.pressed} title={state.label}
                      onFocus={() => setFocusKey(key)} onKeyDown={(event) => moveFocus(event, day, slot)}
                      onPointerDown={(event) => startPaint(event, key)}
                      onClick={(event) => { if (!paint || event.detail === 0) onSelect([key]); }}
                      style={{ backgroundColor: state.background }}
                      className={`block h-9 w-full select-none tabular-nums focus-visible:outline focus-visible:-outline-offset-2 focus-visible:outline-[#0F172A] ${paint ? 'touch-none' : ''} ${state.className}`}>
                      {state.text}
                    </button>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
