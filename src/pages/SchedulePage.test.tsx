// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { SchedulePage } from './SchedulePage';

afterEach(cleanup);

function addMember(id: number, name: string) {
  fireEvent.click(screen.getByRole('button', { name: '팀원 추가' }));
  const row = within(screen.getByRole('group', { name: '팀원 ' + id }));
  fireEvent.change(row.getByLabelText('이름 또는 별칭'), { target: { value: name } });
  return row;
}

const editGrid = () => within(screen.getByRole('region', { name: '팀원별 가능 시간표' }));
const overview = () => within(screen.getByRole('region', { name: '전체 참여 현황' }));
const recommendations = () => within(screen.getByRole('region', { name: '회의 추천 결과' }));
const choose = (name: string) => fireEvent.click(editGrid().getByRole('button', { name: name + ', 미선택' }));
const register = () => fireEvent.click(screen.getByRole('button', { name: '등록하기' }));
const cell = (name: string) => overview().getByRole('button', { name });
const showOverview = () => fireEvent.click(screen.getByRole('button', { name: '참여 현황' }));

it('registers and replaces schedules, with overlap and recommendations based only on registered input', () => {
  render(<SchedulePage />);
  expect(screen.getByText('시간을 조율할 팀원을 추가하세요.')).toBeTruthy();
  addMember(1, '테스트 A');
  choose('월요일 10:00–10:30');
  choose('월요일 10:30–11:00');
  fireEvent.click(editGrid().getByRole('button', { name: '월요일 10:30–11:00, 가능' }));
  expect(screen.getByText('30분 구간 2개 선택')).toBeTruthy();

  showOverview();
  expect(overview().getByText('등록 완료 0/1명')).toBeTruthy();
  expect(cell('월요일 10:30–11:00, 0/1명 가능')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: '가능 시간 등록' }));
  register();

  addMember(2, '테스트 B');
  fireEvent.click(overview().getByRole('button', { name: '테스트 B 등록하기' }));
  choose('월요일 10:30–11:00');
  choose('월요일 11:00–11:30');
  register();

  addMember(3, '테스트 C');
  fireEvent.click(overview().getByRole('button', { name: '테스트 C 등록하기' }));
  choose('월요일 10:30–11:00');
  register();

  expect(overview().getByText('등록 완료 3/3명')).toBeTruthy();
  expect(cell('월요일 10:00–10:30, 1/3명 가능').textContent).toBe('1/3명');
  expect(cell('월요일 11:00–11:30, 1/3명 가능').textContent).toBe('1/3명');
  const full = cell('월요일 10:30–11:00, 3/3명 가능');
  const fullColor = full.style.backgroundColor;
  expect(fullColor).not.toBe(cell('월요일 10:00–10:30, 1/3명 가능').style.backgroundColor);
  expect(recommendations().getByText(/선택한 최소 회의 시간을 만족하는 공통 구간이 없습니다/)).toBeTruthy();
  fireEvent.change(recommendations().getByLabelText('최소 회의 시간'), { target: { value: '30' } });
  expect(recommendations().getByText('월요일 10:30 ~ 11:00')).toBeTruthy();
  expect(recommendations().getByText('30분 · 3/3명 참석 가능')).toBeTruthy();
  fireEvent.click(full);
  expect(overview().getByText('테스트 A, 테스트 B, 테스트 C')).toBeTruthy();

  const unregistered = addMember(4, '테스트 D');
  expect(overview().getByText('등록 완료 3/4명')).toBeTruthy();
  expect(overview().getByRole('progressbar').getAttribute('aria-valuenow')).toBe('75');
  const partialColor = cell('월요일 10:30–11:00, 3/4명 가능').style.backgroundColor;
  expect(partialColor).not.toBe(fullColor);
  expect(recommendations().getByText('30분 · 3/4명 참석 가능')).toBeTruthy();

  fireEvent.click(overview().getByRole('button', { name: '테스트 B 수정하기' }));
  fireEvent.click(screen.getByRole('button', { name: '안되는' }));
  fireEvent.click(editGrid().getByRole('button', { name: '월요일 10:30–11:00, 가능' }));
  showOverview();
  expect(cell('월요일 10:30–11:00, 3/4명 가능')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: '가능 시간 등록' }));
  register();
  expect(cell('월요일 10:30–11:00, 2/4명 가능').style.backgroundColor).not.toBe(partialColor);
  expect(recommendations().getByText('30분 · 2/4명 참석 가능')).toBeTruthy();
  expect(recommendations().queryByText('30분 · 3/4명 참석 가능')).toBeNull();

  fireEvent.click(unregistered.getByRole('button', { name: '팀원 4 삭제' }));
  expect(overview().getByText('등록 완료 3/3명')).toBeTruthy();
  expect(cell('월요일 10:30–11:00, 2/3명 가능')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: '팀원 3 삭제' }));
  expect(cell('월요일 10:30–11:00, 1/2명 가능')).toBeTruthy();
  expect(recommendations().getByText(/공통 구간이 없습니다/)).toBeTruthy();
});

it('distinguishes an explicitly empty registration and preserves Sunday midnight boundaries and keyboard navigation', () => {
  render(<SchedulePage />);
  addMember(1, '테스트 A');
  register();
  expect(overview().getByText('등록 완료 1/1명')).toBeTruthy();
  expect(overview().getByText('등록 완료 · 가능 시간 없음')).toBeTruthy();
  expect(recommendations().getByText('등록된 가능 시간이 없습니다.')).toBeTruthy();

  fireEvent.click(overview().getByRole('button', { name: '테스트 A 수정하기' }));
  const grid = editGrid();
  const table = within(grid.getByRole('table', { name: '팀원별 가능 시간표' }));
  expect(table.getAllByRole('columnheader').map((header) => header.textContent)).toEqual([
    '시간', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일', '일요일',
  ]);
  expect(table.getAllByRole('rowheader')).toHaveLength(48);
  const start = grid.getByRole('button', { name: '일요일 00:00–00:30, 미선택' });
  start.focus();
  fireEvent.keyDown(start, { key: 'End' });
  const end = grid.getByRole('button', { name: '일요일 23:30–24:00, 미선택' });
  expect(document.activeElement).toBe(end);
  fireEvent.click(end);
  fireEvent.keyDown(end, { key: 'Home' });
  expect(document.activeElement).toBe(start);
  fireEvent.click(start);
  register();
  expect(cell('일요일 23:30–24:00, 1/1명 가능')).toBeTruthy();
  expect(cell('일요일 00:00–00:30, 1/1명 가능')).toBeTruthy();
  expect(cell('월요일 00:00–00:30, 0/1명 가능')).toBeTruthy();
});

it('paints skipped slots on pointer drag and erases a touch drag without counting duplicates', () => {
  const pointDescriptor = Object.getOwnPropertyDescriptor(document, 'elementFromPoint');
  const hit = vi.fn<() => Element>();
  Object.defineProperty(document, 'elementFromPoint', { value: hit, configurable: true });
  const pointer = (target: Element, type: string, pointerType: 'mouse' | 'touch') => {
    const event = new MouseEvent(type, { bubbles: true, cancelable: true, button: 0 });
    Object.defineProperties(event, { pointerId: { value: 1 }, pointerType: { value: pointerType } });
    fireEvent(target, event);
  };
  try {
    render(<SchedulePage />);
    addMember(1, '테스트 A');
    const grid = editGrid();
    const first = grid.getByRole('button', { name: '월요일 09:00–09:30, 미선택' });
    const middle = grid.getByRole('button', { name: '월요일 09:30–10:00, 미선택' });
    const last = grid.getByRole('button', { name: '월요일 10:00–10:30, 미선택' });
    expect(first.className).toContain('touch-none');
    hit.mockReturnValue(last);
    pointer(first, 'pointerdown', 'mouse');
    pointer(first, 'pointermove', 'mouse');
    pointer(first, 'pointerup', 'mouse');
    expect(middle.getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByText('30분 구간 3개 선택')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: '안되는' }));
    hit.mockReturnValue(middle);
    pointer(last, 'pointerdown', 'touch');
    pointer(last, 'pointermove', 'touch');
    pointer(last, 'pointercancel', 'touch');
    expect(middle.getAttribute('aria-pressed')).toBe('false');
    expect(last.getAttribute('aria-pressed')).toBe('false');
    expect(first.getAttribute('aria-pressed')).toBe('true');
    register();
    expect(cell('월요일 09:00–09:30, 1/1명 가능')).toBeTruthy();
    expect(cell('월요일 09:30–10:00, 0/1명 가능')).toBeTruthy();
  } finally {
    if (pointDescriptor) Object.defineProperty(document, 'elementFromPoint', pointDescriptor);
    else Reflect.deleteProperty(document, 'elementFromPoint');
  }
});

it('keeps the existing longest common window and updates it when a member registers on another day', () => {
  render(<SchedulePage />);
  addMember(1, '테스트 A');
  for (const slot of ['19:30–20:00', '20:00–20:30', '20:30–21:00', '21:00–21:30', '21:30–22:00']) {
    choose('화요일 ' + slot);
  }
  register();
  addMember(2, '테스트 B');
  expect(recommendations().getByText(/공통 구간이 없습니다/)).toBeTruthy();
  fireEvent.click(overview().getByRole('button', { name: '테스트 B 등록하기' }));
  const slots = ['20:00–20:30', '20:30–21:00', '21:00–21:30', '21:30–22:00'];
  for (const slot of slots) choose('화요일 ' + slot);
  register();
  expect(recommendations().getByText('화요일 20:00 ~ 22:00')).toBeTruthy();
  expect(recommendations().getByText('120분 · 2/2명 참석 가능')).toBeTruthy();

  fireEvent.click(overview().getByRole('button', { name: '테스트 B 수정하기' }));
  fireEvent.click(screen.getByRole('button', { name: '안되는' }));
  for (const slot of slots) fireEvent.click(editGrid().getByRole('button', { name: '화요일 ' + slot + ', 가능' }));
  fireEvent.click(screen.getByRole('button', { name: '되는' }));
  for (const slot of slots) choose('수요일 ' + slot);
  register();
  expect(cell('화요일 20:00–20:30, 1/2명 가능')).toBeTruthy();
  expect(cell('수요일 20:00–20:30, 1/2명 가능')).toBeTruthy();
  expect(recommendations().getByText(/공통 구간이 없습니다/)).toBeTruthy();
});
