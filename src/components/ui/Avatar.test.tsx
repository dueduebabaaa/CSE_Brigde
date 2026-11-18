// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { Avatar } from './Avatar';
afterEach(cleanup);
describe('공통 Avatar 이미지 오류', () => {
  it('이미지 실패 시 깨진 img를 제거하고 기존 크기의 기본 아바타를 표시한다', () => {
    render(<Avatar src="https://example.test/broken.jpg" name="김학생" size="sm" />);
    const image = screen.getByRole('img', { name: '김학생' });
    expect(image.getAttribute('alt')).toBe('');
    expect(image.getAttribute('referrerpolicy')).toBe('no-referrer');
    fireEvent.error(image);
    expect(document.querySelector('img')).toBeNull();
    const fallback = screen.getByLabelText('김학생');
    expect(fallback.textContent).toBe('김');
    expect(fallback.classList.contains('w-8')).toBe(true);
  });
  it.each([null, '', '   '])('URL %j는 이미지 없이 기본 아바타를 표시한다', src => {
    render(<Avatar src={src} name="김학생" />);
    expect(document.querySelector('img')).toBeNull();
    expect(screen.getByLabelText('김학생').textContent).toBe('김');
  });
  it('실패 후 새 URL이 들어오면 이미지를 다시 표시한다', () => {
    const view = render(<Avatar src="https://example.test/old.jpg" name="김학생" />);
    fireEvent.error(screen.getByRole('img'));
    view.rerender(<Avatar src="https://example.test/new.jpg" name="박학생" />);
    expect(screen.getByRole('img', { name: '박학생' }).getAttribute('src')).toBe('https://example.test/new.jpg');
    fireEvent.load(screen.getByRole('img'));
    expect(screen.getByRole('img')).toBeTruthy();
  });
});