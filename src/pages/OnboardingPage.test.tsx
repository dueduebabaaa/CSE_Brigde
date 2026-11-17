// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { OnboardingPage } from './OnboardingPage';

const click = (name: string) => fireEvent.click(screen.getByRole('button', { name }));
const change = (element: HTMLElement, value: string) => fireEvent.change(element, { target: { value } });
function start() {
  render(<MemoryRouter><OnboardingPage /></MemoryRouter>);
  change(screen.getByPlaceholderText('홍길동'), '테스트');
  fireEvent.click(screen.getByText('1학년', { selector: 'button' }));
  click('플랫폼소프트웨어전공');
  click('다음');
}
function reachTech() {
  start();
  click('웹 개발');
  click('Frontend 웹 사용자 인터페이스 개발');
  click('다음');
}

beforeEach(() => vi.stubGlobal('scrollTo', vi.fn()));
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe('온보딩 입력과 단계 검증', () => {
  it('빈 관심사와 기타 입력을 검증하고 이전 단계에서도 직접 입력을 유지한다', () => {
    start();
    click('다음');
    expect(screen.queryByText('관심 분야를 최소 1개 이상 선택해 주세요.')).not.toBeNull();
    click('기타');
    click('Frontend 웹 사용자 인터페이스 개발');
    click('다음');
    expect(screen.queryByText('기타로 선택한 항목을 직접 입력해 주세요.')).not.toBeNull();
    change(screen.getByLabelText('기타 관심 분야 (필수)'), '컴퓨터 그래픽스');
    click('기타');
    click('기타');
    expect((screen.getByLabelText('기타 관심 분야 (필수)') as HTMLInputElement).value).toBe('컴퓨터 그래픽스');
    click('다음');
    click('이전');
    expect((screen.getByLabelText('기타 관심 분야 (필수)') as HTMLInputElement).value).toBe('컴퓨터 그래픽스');
  });

  it('기술 필수 입력과 대소문자 중복을 차단하며 숙련도는 자동 지정하지 않는다', () => {
    reachTech();
    expect(screen.queryByRole('button', { name: '나중에 설정하기' })).toBeNull();
    click('다음');
    expect(screen.queryByText("보유 기술 스택을 선택하거나, '아직 보유 기술 없음'을 선택해 주세요.")).not.toBeNull();
    change(screen.getByLabelText('보유 기술 검색 또는 직접 추가'), ' react ');
    click('직접 추가');
    change(screen.getByLabelText('보유 기술 검색 또는 직접 추가'), 'REACT');
    click('직접 추가');
    expect(screen.queryByText('이미 선택한 기술입니다.')).not.toBeNull();
    expect(screen.getAllByRole('button', { name: 'React 삭제' })).toHaveLength(1);
    expect(screen.getByRole('button', { name: '활용 가능' }).className).toContain('bg-transparent');
    fireEvent.click(screen.getByText('🌱 아직 보유 기술 스택이 없어요 (초급자 환영)'));
    expect(screen.queryByRole('button', { name: 'React 삭제' })).toBeNull();
    click('다음');
    expect(screen.queryByRole('button', { name: '나중에 설정하기' })).not.toBeNull();
  });

  it('공개 범위와 URL을 검증하고 저장 전 확인 모달을 표시한다', () => {
    reachTech();
    click('React');
    click('다음');
    change(screen.getByLabelText('배우고 싶은 기술 검색 또는 직접 추가'), 'Rust');
    click('직접 추가');
    click('나중에 설정하기');
    click('BRIDGE 시작하기');
    expect(screen.queryByText('프로필 공개 범위를 선택해 주세요.')).not.toBeNull();
    click('BRIDGE 회원에게 공개 인증된 BRIDGE 회원만 열람 가능');
    change(screen.getByPlaceholderText('https://github.com/username'), 'javascript:alert(1)');
    click('BRIDGE 시작하기');
    expect(screen.queryByText(/GitHub URL을 확인/)).not.toBeNull();
    change(screen.getByPlaceholderText('https://github.com/username'), 'https://github.com/bridge');
    change(screen.getByPlaceholderText('https://my-portfolio.com'), 'invalid');
    click('BRIDGE 시작하기');
    expect(screen.queryByText(/포트폴리오 URL을 확인/)).not.toBeNull();
    change(screen.getByPlaceholderText('https://my-portfolio.com'), 'https://example.com');
    click('BRIDGE 시작하기');
    expect(screen.queryByText('프로필 입력 확인')).not.toBeNull();
    expect(screen.queryByText(/저장 후 BRIDGE를 시작합니다/)).not.toBeNull();
    expect(screen.getByRole('button', { name: '프로필 저장 후 BRIDGE 시작하기' })).not.toBeNull();
    click('입력 내용 계속 수정하기');
    click('이전');
    expect(within(screen.getByLabelText('배우고 싶은 기술 선택 목록')).queryByRole('button', { name: 'Rust 삭제' })).not.toBeNull();
  });
});
