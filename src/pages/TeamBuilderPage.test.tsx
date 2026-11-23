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

function toggleRole(container: ReturnType<typeof within>, role: string) {
  fireEvent.click(within(container.getByRole('group', { name: '가능 역할' })).getByRole('button', { name: role }));
}

function skillGroup(container: ReturnType<typeof within>, subject: string) {
  const skills = within(container.getByRole('group', { name: '보유 기술' }));
  const summary = skills.getByText(subject, { selector: 'summary' });
  const details = summary.closest('details')!;
  if (!details.open) fireEvent.click(summary);
  return within(details);
}

it('recalculates role coverage and technical scores after adding, editing and removing members', () => {
  render(<TeamBuilderPage />);
  expect(screen.getByText('분석할 팀원을 추가하세요.')).toBeTruthy();
  const required = within(screen.getByRole('group', { name: '프로젝트 필수 역할' }));
  const frontend = required.getByRole('button', { name: 'Frontend' });
  const backend = required.getByRole('button', { name: 'Backend' });
  fireEvent.click(frontend);
  fireEvent.click(backend);
  expect(frontend.getAttribute('aria-pressed')).toBe('true');
  expect(backend.getAttribute('aria-pressed')).toBe('true');
  fireEvent.click(screen.getByRole('button', { name: '팀원 추가' }));
  expect(screen.getByText('가능 역할이나 보유 기술을 선택하면 분석이 시작됩니다.')).toBeTruthy();
  const first = within(screen.getByRole('group', { name: '팀원 1' }));
  fireEvent.change(first.getByLabelText('이름 또는 별칭'), { target: { value: '테스트 팀원' } });
  toggleRole(first, 'Frontend');
  toggleRole(first, 'Backend');
  const skills = skillGroup(first, 'Frontend');
  fireEvent.click(skills.getByRole('button', { name: 'React' }));
  fireEvent.click(skills.getByRole('button', { name: 'TypeScript' }));
  expect(screen.getByText('필수 역할 미충족')).toBeTruthy();
  expect(screen.getByText('65점')).toBeTruthy();

  fireEvent.click(screen.getByRole('button', { name: '팀원 추가' }));
  const second = within(screen.getByRole('group', { name: '팀원 2' }));
  toggleRole(second, 'Backend');
  expect(screen.getByText('필수 역할 충족')).toBeTruthy();

  fireEvent.click(required.getByRole('button', { name: 'Backend 필요 인원 늘리기' }));
  expect(required.getByText('2명')).toBeTruthy();
  expect(screen.getByText('필수 역할 미충족')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: '팀원 추가' }));
  const third = within(screen.getByRole('group', { name: '팀원 3' }));
  toggleRole(third, 'Backend');
  expect(screen.getByText('필수 역할 충족')).toBeTruthy();
  fireEvent.click(third.getByRole('button', { name: '팀원 3 삭제' }));
  expect(screen.getByText('필수 역할 미충족')).toBeTruthy();
  fireEvent.click(required.getByRole('button', { name: 'Backend 필요 인원 줄이기' }));
  expect(screen.getByText('필수 역할 충족')).toBeTruthy();

  fireEvent.click(first.getByRole('button', { name: 'TypeScript 선택 해제' }));
  expect(screen.queryByText('65점')).toBeNull();
  expect(screen.getAllByText('35점').length).toBeGreaterThan(0);
  fireEvent.click(second.getByRole('button', { name: '팀원 2 삭제' }));
  expect(screen.getByText('필수 역할 미충족')).toBeTruthy();
  fireEvent.click(backend);
  expect(backend.getAttribute('aria-pressed')).toBe('false');
  expect(screen.getByText('필수 역할 충족')).toBeTruthy();
  toggleRole(first, 'Frontend');
  expect(screen.getByText('필수 역할 미충족')).toBeTruthy();
});

it('labels an incomplete role input and leaves unspecified requirements unevaluated', () => {
  render(<TeamBuilderPage />);
  fireEvent.click(screen.getByRole('button', { name: '팀원 추가' }));
  const first = within(screen.getByRole('group', { name: '팀원 1' }));
  fireEvent.click(skillGroup(first, 'Frontend').getByRole('button', { name: 'React' }));
  expect(screen.getByText('역할 균형 미판정', { exact: true })).toBeTruthy();
  expect(screen.getByText(/일부 팀원의 가능 역할이 비어 있습니다/)).toBeTruthy();
  expect(screen.getAllByRole('textbox')).toHaveLength(1);
});

it('renumbers visible members after removal while preserving stable input identities and values', () => {
  render(<TeamBuilderPage />);
  const add = () => fireEvent.click(screen.getByRole('button', { name: '팀원 추가' }));
  const row = (number: number) => within(screen.getByRole('group', { name: '팀원 ' + number }));
  const remove = (number: number) => fireEvent.click(row(number).getByRole('button', { name: '팀원 ' + number + ' 삭제' }));
  const name = (number: number) => row(number).getByLabelText<HTMLInputElement>('이름 또는 별칭');

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
  toggleRole(row(3), 'Frontend');
  const retainedSkills = skillGroup(row(3), 'Frontend');
  fireEvent.click(retainedSkills.getByRole('button', { name: 'React' }));
  fireEvent.click(retainedSkills.getByRole('button', { name: 'TypeScript' }));
  remove(2);
  expect(name(2)).toBe(retained);
  expect(name(2).value).toBe('유지할 별칭');
  expect(row(2).getByRole('button', { name: 'React 선택 해제' })).toBeTruthy();
  expect(row(2).getByRole('button', { name: 'TypeScript 선택 해제' })).toBeTruthy();
  expect(within(row(2).getByRole('group', { name: '가능 역할' })).getByRole('button', { name: 'Frontend', pressed: true })).toBeTruthy();
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
  const first = within(screen.getByRole('group', { name: '팀원 1' }));
  toggleRole(first, 'UI/UX');
  const skills = skillGroup(first, 'UI/UX');
  const coverage = () => screen.getByText('UI/UX', { selector: 'dt' }).parentElement!;

  expect(skills.queryByRole('button', { name: 'UI/UX' })).toBeNull();
  expect(within(coverage()).getByText('0점')).toBeTruthy();
  fireEvent.click(skills.getByRole('button', { name: 'Figma' }));
  expect(within(coverage()).getByText('35점')).toBeTruthy();
  fireEvent.click(skills.getByRole('button', { name: 'Adobe XD' }));
  expect(within(coverage()).getByText('65점')).toBeTruthy();
  fireEvent.click(first.getByRole('button', { name: 'Figma 선택 해제' }));
  expect(within(coverage()).getByText('35점')).toBeTruthy();
});
