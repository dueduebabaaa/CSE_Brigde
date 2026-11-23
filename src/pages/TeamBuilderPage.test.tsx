// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { classifyTag } from '../algorithms/tagClassification';
import { TeamBuilderPage } from './TeamBuilderPage';

beforeEach(() => {
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(() => new DOMRect(0, 0, 480, 224));
  vi.stubGlobal('ResizeObserver', class {
    observe() {}
    disconnect() {}
  });
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

it('recalculates role coverage and technical scores after adding, editing and removing members', () => {
  render(<TeamBuilderPage />);
  expect(screen.getByText('분석할 팀원을 추가하세요.')).toBeTruthy();
  fireEvent.change(screen.getByLabelText('프로젝트 필수 역할'), { target: { value: 'Frontend, Backend' } });
  fireEvent.click(screen.getByRole('button', { name: '팀원 추가' }));
  expect(screen.getByText('가능 역할이나 보유 기술을 입력하면 분석이 시작됩니다.')).toBeTruthy();
  const first = within(screen.getByRole('group', { name: '팀원 1' }));
  fireEvent.change(first.getByLabelText('이름 또는 별칭'), { target: { value: '테스트 팀원' } });
  fireEvent.change(first.getByLabelText('가능 역할'), { target: { value: 'Frontend, Backend' } });
  fireEvent.change(first.getByLabelText('보유 기술'), { target: { value: 'React, TypeScript' } });
  expect(screen.getByText('필수 역할 미충족')).toBeTruthy();
  expect(screen.getByText('65점')).toBeTruthy();

  fireEvent.click(screen.getByRole('button', { name: '팀원 추가' }));
  const second = within(screen.getByRole('group', { name: '팀원 2' }));
  fireEvent.change(second.getByLabelText('가능 역할'), { target: { value: 'Backend' } });
  expect(screen.getByText('필수 역할 충족')).toBeTruthy();

  fireEvent.change(first.getByLabelText('보유 기술'), { target: { value: 'React' } });
  expect(screen.queryByText('65점')).toBeNull();
  expect(screen.getAllByText('35점').length).toBeGreaterThan(0);
  fireEvent.click(second.getByRole('button', { name: '팀원 2 삭제' }));
  expect(screen.getByText('필수 역할 미충족')).toBeTruthy();
});

it('labels an incomplete role input and leaves unspecified requirements unevaluated', () => {
  render(<TeamBuilderPage />);
  fireEvent.click(screen.getByRole('button', { name: '팀원 추가' }));
  fireEvent.change(screen.getByLabelText('보유 기술'), { target: { value: 'React' } });
  expect(screen.getByText('역할 균형 미판정', { exact: true })).toBeTruthy();
  expect(screen.getByText(/일부 팀원의 가능 역할이 비어 있습니다/)).toBeTruthy();
  fireEvent.change(screen.getByLabelText('보유 기술'), { target: { value: 'constructor' } });
  expect(screen.getByRole('alert')).toBeTruthy();
});

it('renumbers visible members after removal while preserving stable input identities and values', () => {
  render(<TeamBuilderPage />);
  const add = () => fireEvent.click(screen.getByRole('button', { name: '팀원 추가' }));
  const row = (number: number) => within(screen.getByRole('group', { name: '팀원 ' + number }));
  const remove = (number: number) => fireEvent.click(row(number).getByRole('button', { name: '팀원 ' + number + ' 삭제' }));
  const name = (number: number) => row(number).getByLabelText<HTMLInputElement>('이름 또는 별칭');
  const skills = (number: number) => row(number).getByLabelText<HTMLInputElement>('보유 기술');

  add();
  add();
  const removedId = name(2).id;
  remove(2);
  add();
  expect(name(2).id).not.toBe(removedId);
  expect(screen.queryByRole('group', { name: '팀원 3' })).toBeNull();

  add();
  const retained = name(3);
  fireEvent.change(retained, { target: { value: '유지할 별칭' } });
  fireEvent.change(skills(3), { target: { value: 'React, TypeScript' } });
  remove(2);
  expect(name(2)).toBe(retained);
  expect(name(2).value).toBe('유지할 별칭');
  expect(skills(2).value).toBe('React, TypeScript');
  expect(screen.getByText('65점')).toBeTruthy();

  add();
  const currentIds = [name(1).id, name(2).id, name(3).id];
  expect(new Set(currentIds).size).toBe(3);
  expect(currentIds).not.toContain(removedId);
});

it('treats UI/UX as a category while recalculating design coverage from concrete skills', () => {
  expect(classifyTag('UI/UX')).toMatchObject({ category: 'field', canonical: 'UI/UX' });
  render(<TeamBuilderPage />);
  fireEvent.click(screen.getByRole('button', { name: '팀원 추가' }));
  const skills = screen.getByLabelText('보유 기술');
  const coverage = () => screen.getByText('UI/UX', { selector: 'dt' }).parentElement!;

  fireEvent.change(skills, { target: { value: 'UI/UX' } });
  expect(within(coverage()).getByText('0점')).toBeTruthy();
  fireEvent.change(skills, { target: { value: 'UI/UX, Figma' } });
  expect(within(coverage()).getByText('35점')).toBeTruthy();
  fireEvent.change(skills, { target: { value: 'Figma' } });
  expect(within(coverage()).getByText('35점')).toBeTruthy();
  fireEvent.change(skills, { target: { value: 'Figma, Adobe XD' } });
  expect(within(coverage()).getByText('65점')).toBeTruthy();
});
