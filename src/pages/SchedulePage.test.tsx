// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { SchedulePage } from './SchedulePage';

afterEach(cleanup);

function member(number: number) {
  fireEvent.click(screen.getByRole('button', { name: '팀원 추가' }));
  return within(screen.getByRole('group', { name: '팀원 ' + number }));
}

function addRange(person: ReturnType<typeof within>, day: string, start: string, end: string, number = 1) {
  fireEvent.click(person.getByRole('button', { name: '가능 시간 추가' }));
  const range = within(person.getByRole('group', { name: '가능 시간 ' + number }));
  fireEvent.change(range.getByLabelText('요일'), { target: { value: day } });
  fireEvent.change(range.getByLabelText('시작'), { target: { value: start } });
  fireEvent.change(range.getByLabelText('종료'), { target: { value: end } });
  return range;
}

it('updates common slots, partial attendance and empty results after editing the schedule and participants', () => {
  render(<SchedulePage />);
  expect(screen.getByText('시간을 조율할 팀원을 추가하세요.')).toBeTruthy();
  const first = member(1);
  expect(screen.getByText('팀원의 가능 시간을 입력하세요.')).toBeTruthy();
  addRange(first, '2', '38', '44');
  addRange(first, '2', '39', '42', 2);
  const second = member(2);
  const secondRange = addRange(second, '2', '40', '44');
  expect(screen.getByText('화요일 20:00 ~ 22:00')).toBeTruthy();
  expect(screen.getByText('120분 · 2/2명 참석 가능')).toBeTruthy();

  const third = member(3);
  fireEvent.change(third.getByLabelText('이름 또는 별칭'), { target: { value: '테스트 팀원' } });
  expect(screen.getByText('120분 · 2/3명 참석 가능')).toBeTruthy();
  expect(screen.getByText('참석 불가 또는 미입력: 테스트 팀원')).toBeTruthy();
  fireEvent.change(secondRange.getByLabelText('종료'), { target: { value: '41' } });
  expect(screen.getByText('선택한 최소 회의 시간을 만족하는 공통 구간이 없습니다.')).toBeTruthy();
  fireEvent.change(screen.getByLabelText('최소 회의 시간'), { target: { value: '30' } });
  expect(screen.getByText('화요일 20:00 ~ 20:30')).toBeTruthy();
  fireEvent.click(third.getByRole('button', { name: '팀원 3 삭제' }));
  expect(screen.getByText('30분 · 2/2명 참석 가능')).toBeTruthy();
  expect(screen.getByText('최적')).toBeTruthy();
});

it('validates reversed times and preserves a Sunday range ending at midnight', () => {
  render(<SchedulePage />);
  const first = member(1);
  const range = addRange(first, '0', '46', '45');
  expect(screen.getByText('종료 시간은 시작 시간보다 늦어야 합니다.')).toBeTruthy();
  expect(screen.queryByText(/일요일 23:00 ~/)).toBeNull();
  fireEvent.change(range.getByLabelText('종료'), { target: { value: '48' } });
  expect(screen.getByText('일요일 23:00 ~ 24:00')).toBeTruthy();
  fireEvent.click(range.getByRole('button', { name: '가능 시간 1 삭제' }));
  expect(screen.getByText('팀원의 가능 시간을 입력하세요.')).toBeTruthy();
});

it('shows the Monday example, deduplicates overlapping input and updates counts and recommendations', () => {
  render(<SchedulePage />);
  const grid = within(screen.getByRole('region', { name: '주간 가능 시간표' }));
  const recommendations = within(screen.getByRole('region', { name: '회의 추천 결과' }));
  const cell = (name: string) => grid.getByRole('cell', { name });
  expect(grid.queryByRole('table')).toBeNull();

  const first = member(1);
  expect(grid.getByText('입력된 가능 시간이 없습니다.')).toBeTruthy();
  addRange(first, '1', '18', '19'); // 월요일 09:00–09:30
  addRange(first, '1', '18', '19', 2);
  const second = member(2);
  const secondRange = addRange(second, '1', '16', '19'); // 월요일 08:00–09:30
  expect(cell('월요일 08:00–08:30, 1/2명, 일부 가능').textContent).toBe('1/2명');
  expect(cell('월요일 08:30–09:00, 1/2명, 일부 가능').className).toContain('bg-[#F4EFFE]');
  expect(cell('월요일 09:00–09:30, 2/2명, 전원 가능').className).toContain('bg-[#C6FF33]');
  expect(cell('월요일 09:30–10:00, 0/2명, 가능 인원 없음').className).toContain('bg-white');
  expect(recommendations.getByText(/선택한 최소 회의 시간을 만족하는 공통 구간이 없습니다/)).toBeTruthy();
  fireEvent.change(screen.getByLabelText('최소 회의 시간'), { target: { value: '30' } });
  expect(recommendations.getByText('월요일 09:00 ~ 09:30')).toBeTruthy();

  fireEvent.change(secondRange.getByLabelText('종료'), { target: { value: '18' } });
  expect(cell('월요일 09:00–09:30, 1/2명, 일부 가능')).toBeTruthy();
  expect(recommendations.getByText(/선택한 최소 회의 시간을 만족하는 공통 구간이 없습니다/)).toBeTruthy();
  fireEvent.change(secondRange.getByLabelText('요일'), { target: { value: '2' } });
  expect(cell('월요일 08:00–08:30, 0/2명, 가능 인원 없음')).toBeTruthy();
  expect(cell('화요일 08:00–08:30, 1/2명, 일부 가능')).toBeTruthy();

  const third = member(3);
  expect(cell('월요일 09:00–09:30, 1/3명, 일부 가능')).toBeTruthy();
  fireEvent.click(third.getByRole('button', { name: '팀원 3 삭제' }));
  fireEvent.click(second.getByRole('button', { name: '팀원 2 삭제' }));
  expect(cell('월요일 09:00–09:30, 1/1명, 전원 가능')).toBeTruthy();
  expect(cell('화요일 08:00–08:30, 0/1명, 가능 인원 없음')).toBeTruthy();
});

it('keeps Monday-to-Sunday headers and all 48 half-hour rows with the Sunday midnight boundary', () => {
  render(<SchedulePage />);
  const grid = within(screen.getByRole('region', { name: '주간 가능 시간표' }));
  const first = member(1);
  const range = addRange(first, '0', '47', '48');
  const table = within(grid.getByRole('table'));
  expect(table.getAllByRole('columnheader').map((header) => header.textContent)).toEqual([
    '시간', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일', '일요일',
  ]);
  expect(table.getAllByRole('rowheader')).toHaveLength(48);
  expect(table.getByRole('cell', { name: '일요일 23:30–24:00, 1/1명, 전원 가능' })).toBeTruthy();
  expect(table.getByRole('cell', { name: '월요일 00:00–00:30, 0/1명, 가능 인원 없음' })).toBeTruthy();
  const scroller = grid.getByRole('region', { name: '주간 시간표 스크롤 영역' });
  expect(scroller.tabIndex).toBe(0);
  expect(scroller.className).toContain('overflow-auto');

  fireEvent.change(range.getByLabelText('종료'), { target: { value: '47' } });
  expect(grid.queryByRole('table')).toBeNull();
  expect(grid.getByText('구간 입력을 완료하면 시간표를 표시합니다.')).toBeTruthy();
});
