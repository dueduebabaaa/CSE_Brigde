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
