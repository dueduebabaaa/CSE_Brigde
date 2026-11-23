// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes, Link } from 'react-router-dom';
import { MyProfileProvider } from '../contexts/MyProfileProvider';
import { useMyProfile } from '../contexts/MyProfileContext';
import { ProfilePage } from './ProfilePage';
import { HomePage } from './HomePage';
import { OpportunitySourceLayout } from '../components/opportunities/OpportunitySourceLayout';
import { profileFixture } from '../features/profile/profileFixture';
import {
  deleteMyRecruitmentContact, enableMyRecruitmentContactSharing, getMyRecruitmentContact, RecruitmentContactConflict, revokeMyRecruitmentContactSharing, saveMyRecruitmentContact,
} from '../services/recruitmentContactService';
import type { UserProfile } from '../services/profileService';
const mocks = vi.hoisted(() => ({ auth: { user: { id: 'user-a' } as { id: string } | null, loading: false }, fetch: vi.fn(), update: vi.fn() }));
vi.mock('../hooks/useAuth', () => ({ useAuth: () => mocks.auth }));
vi.mock('../services/profileService', () => ({ fetchMyProfile: mocks.fetch, updateMyProfile: mocks.update }));
vi.mock('../services/opportunityService', () => ({ fetchOpportunities: async () => [] }));
vi.mock('../services/recruitmentContactService', async (importOriginal) => ({
  ...await importOriginal<typeof import('../services/recruitmentContactService')>(),
  deleteMyRecruitmentContact: vi.fn(),
  getMyRecruitmentContact: vi.fn(),
  enableMyRecruitmentContactSharing: vi.fn(),
  revokeMyRecruitmentContactSharing: vi.fn(),
  saveMyRecruitmentContact: vi.fn(),
}));
beforeEach(() => { vi.mocked(getMyRecruitmentContact).mockReset().mockResolvedValue({ kakaoId: null, sharingEnabled: false, revision: 'empty' }); });

const deferred = <T,>() => { let resolve!: (value: T) => void; let reject!: (value: unknown) => void; const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; };
function TestApp() {
  return <MemoryRouter><MyProfileProvider>
    <Link to="/">프로필 화면</Link><Link to="/home">홈 화면</Link>
    <Routes>
      <Route path="/" element={<ProfilePage />} />
      <Route element={<OpportunitySourceLayout />}><Route path="/home" element={<HomePage />} /></Route>
    </Routes>
  </MyProfileProvider></MemoryRouter>;
}
const save = () => fireEvent.click(screen.getByRole('button', { name: '프로필 저장' }));
const edit = (label: string, value: string) => fireEvent.change(screen.getByLabelText(label), { target: { value } });
const loaded = () => screen.findByRole('form', { name: '내 프로필 수정' });
beforeEach(() => { mocks.auth = { user: { id: 'user-a' }, loading: false }; mocks.fetch.mockReset().mockResolvedValue(profileFixture()); mocks.update.mockReset().mockImplementation(async patch => profileFixture(patch)); });
afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe('마이페이지 실제 서비스 연동', () => {
  it('ID 저장과 새 공유 동의를 분리하고 철회 및 삭제를 처리한다', async () => {
    const get = vi.mocked(getMyRecruitmentContact);
    get.mockResolvedValueOnce({ kakaoId: null, sharingEnabled: false, revision: 'initial' })
      .mockResolvedValueOnce({ kakaoId: 'fixture-contact', sharingEnabled: false, revision: 'registered' })
      .mockResolvedValueOnce({ kakaoId: 'fixture-contact', sharingEnabled: true, revision: 'enabled' })
      .mockResolvedValueOnce({ kakaoId: 'fixture-contact', sharingEnabled: false, revision: 'revoked' })
      .mockResolvedValueOnce({ kakaoId: null, sharingEnabled: false, revision: 'deleted' });
    render(<TestApp />);
    const settings = () => within(screen.getByRole('form', { name: '카카오톡 연락처 설정' }));
    await screen.findByLabelText('카카오톡 ID');
    expect(settings().queryByRole('checkbox')).toBeNull();
    fireEvent.change(settings().getByLabelText('카카오톡 ID'), { target: { value: 'fixture-contact' } });
    fireEvent.click(settings().getByRole('button', { name: '연락처 저장' }));
    expect(saveMyRecruitmentContact).toHaveBeenCalledWith('fixture-contact', 'initial');

    const consent = await screen.findByRole<HTMLInputElement>('checkbox', { name: /공유하는 데 동의/ });
    expect(consent.checked).toBe(false);
    fireEvent.click(consent);
    fireEvent.click(settings().getByRole('button', { name: '공유 동의 저장' }));
    expect(enableMyRecruitmentContactSharing).toHaveBeenCalledWith('registered');

    fireEvent.click(await screen.findByRole('button', { name: '공유 동의 철회' }));
    expect((await screen.findByRole<HTMLInputElement>('checkbox', { name: /공유하는 데 동의/ })).checked).toBe(false);
    expect(revokeMyRecruitmentContactSharing).toHaveBeenCalledTimes(1);
    fireEvent.click(settings().getByRole('button', { name: '연락처 삭제' }));
    await waitFor(() => expect(screen.getByLabelText<HTMLInputElement>('카카오톡 ID').value).toBe(''));
    expect(deleteMyRecruitmentContact).toHaveBeenCalledTimes(1);
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it.each([false, true])('다른 탭의 변경 후 오래된 ID 저장을 자동 재시도하지 않는다 (삭제=%s)', async (deleted) => {
    vi.mocked(getMyRecruitmentContact)
      .mockResolvedValueOnce({ kakaoId: 'fixture-contact', sharingEnabled: true, revision: 'stale' })
      .mockResolvedValueOnce({ kakaoId: deleted ? null : 'fixture-contact', sharingEnabled: false, revision: 'fresh' });
    vi.mocked(saveMyRecruitmentContact).mockRejectedValueOnce(new RecruitmentContactConflict());
    render(<TestApp />);
    const input = await screen.findByLabelText('카카오톡 ID');
    fireEvent.change(input, { target: { value: 'stale-edit' } });
    fireEvent.click(screen.getByRole('button', { name: '연락처 저장' }));
    await screen.findByText(/다른 화면에서 연락처 설정이 변경/);
    expect((await screen.findByLabelText<HTMLInputElement>('카카오톡 ID')).value).toBe(deleted ? '' : 'fixture-contact');
    expect(saveMyRecruitmentContact).toHaveBeenCalledTimes(1);
    expect(saveMyRecruitmentContact).toHaveBeenCalledWith('stale-edit', 'stale');
    expect(enableMyRecruitmentContactSharing).not.toHaveBeenCalled();
  });

  it.each(['', '   '])('닉네임 삭제·공백(%j)을 빈 문자열로 저장하고 홈에서 이름을 표시한다', async nickname => {
    render(<TestApp />); await loaded(); edit('닉네임', nickname); save();
    await screen.findByText('프로필 변경 사항을 저장했습니다.');
    expect(mocks.update).toHaveBeenCalledWith({ nickname: '' });
    expect(mocks.update).toHaveBeenCalledTimes(1);
    expect((screen.getByLabelText('닉네임') as HTMLInputElement).required).toBe(false);
    expect((screen.getByLabelText('닉네임') as HTMLInputElement).value).toBe('');
    expect(screen.queryByText(/삭제는 잠시 제한/)).toBeNull();
    fireEvent.click(screen.getByRole('link', { name: '홈 화면' }));
    await screen.findByText('테스트 학생님, 반가워요.');
  });
  it.each(['', '   '])('닉네임이 선택값이어도 이름(%j)은 비어 있으면 저장하지 않는다', async name => {
    render(<TestApp />); await loaded(); edit('이름', name); edit('닉네임', ''); save();
    expect(screen.getByRole('alert').textContent).toContain('이름을 입력해 주세요.');
    expect(mocks.update).not.toHaveBeenCalled();
  });
  it('기존 닉네임이 없어도 다른 정보 수정과 이름 대체 표시를 허용한다', async () => {
    mocks.fetch.mockResolvedValue(profileFixture({ nickname: '' }));
    mocks.update.mockResolvedValue(profileFixture({ nickname: '', bio: '수정 소개' }));
    render(<TestApp />); await loaded(); edit('한 줄 자기소개', '수정 소개'); save();
    await screen.findByText('프로필 변경 사항을 저장했습니다.');
    expect(mocks.update).toHaveBeenCalledWith({ bio: '수정 소개' });
    fireEvent.click(screen.getByRole('link', { name: '홈 화면' })); await screen.findByText('테스트 학생님, 반가워요.');
  });
  it('로그인 사용자 ID로 조회하고 샘플 대신 모든 저장값을 표시한다', async () => {
    render(<TestApp />); await loaded();
    expect(mocks.fetch).toHaveBeenCalledWith('user-a');
    expect((screen.getByLabelText('닉네임') as HTMLInputElement).value).toBe('별칭');
    expect((screen.getByLabelText('소속 학부') as HTMLInputElement).value).toBe('저장된 학부');
    expect(screen.getByLabelText('소속 학부').hasAttribute('readonly')).toBe(true);
    expect(screen.getByText('양자컴퓨팅')).toBeTruthy();
    expect(screen.getByText('기존 자유 역할')).toBeTruthy();
    expect((screen.getByLabelText('React 숙련도') as HTMLSelectElement).value).toBe('');
    expect(screen.queryByText('1건')).toBeNull(); expect(screen.queryByText('2건 (대기)')).toBeNull();
  });
  it('변경 없는 저장은 비활성화하고 취소하면 원본을 복원한다', async () => {
    render(<TestApp />); await loaded(); save(); expect(mocks.update).not.toHaveBeenCalled();
    edit('한 줄 자기소개', '수정'); fireEvent.click(screen.getByRole('button', { name: '수정 취소' }));
    expect((screen.getByLabelText('한 줄 자기소개') as HTMLInputElement).value).toBe('기존 소개');
    expect((screen.getByRole('button', { name: '프로필 저장' }) as HTMLButtonElement).disabled).toBe(true);
  });
  it('변경 필드만 부분 수정하고 실제 서버 반환값으로 갱신한다', async () => {
    mocks.update.mockResolvedValue(profileFixture({ bio: '서버 확정 소개' }));
    render(<TestApp />); await loaded(); edit('한 줄 자기소개', '요청 소개'); save();
    await screen.findByText('프로필 변경 사항을 저장했습니다.');
    expect(mocks.update).toHaveBeenCalledWith({ bio: '요청 소개' });
    expect((screen.getByLabelText('한 줄 자기소개') as HTMLInputElement).value).toBe('서버 확정 소개');
  });
  it('저장 실패 시 입력을 유지하고 재시도한다', async () => {
    mocks.update.mockRejectedValueOnce(new Error('테스트 저장 실패'));
    render(<TestApp />); await loaded(); edit('한 줄 자기소개', '유지할 입력'); save();
    await screen.findByText('테스트 저장 실패');
    expect((screen.getByLabelText('한 줄 자기소개') as HTMLInputElement).value).toBe('유지할 입력');
    expect(screen.queryByText('프로필 변경 사항을 저장했습니다.')).toBeNull();
    save(); await screen.findByText('프로필 변경 사항을 저장했습니다.');
  });
  it('저장 중 중복 클릭과 입력 변경을 차단한다', async () => {
    const pending = deferred<UserProfile>(); mocks.update.mockReturnValue(pending.promise);
    render(<TestApp />); await loaded(); edit('한 줄 자기소개', '수정'); save();
    fireEvent.click(screen.getByRole('button', { name: '저장 중...' }));
    expect(mocks.update).toHaveBeenCalledTimes(1);
    expect((screen.getByLabelText('한 줄 자기소개') as HTMLInputElement).disabled || !!screen.getByLabelText('한 줄 자기소개').closest('fieldset[disabled]')).toBe(true);
    await act(async () => pending.resolve(profileFixture({ bio: '수정' })));
  });
  it('필수값과 외부 URL 오류는 서버에 전송하지 않는다', async () => {
    render(<TestApp />); await loaded(); edit('이름', ' '); edit('GitHub 링크', 'https://evil.example/me'); save();
    expect(screen.getByRole('alert').textContent).toContain('이름을 입력'); expect(screen.getByRole('alert').textContent).toContain('GitHub URL');
    expect(mocks.update).not.toHaveBeenCalled();
  });
  it('공개 범위 변경 시에만 boolean을 전송하고 미선택 옵션은 보존한다', async () => {
    render(<TestApp />); await loaded(); edit('공개 범위', 'private'); save(); await screen.findByText('프로필 변경 사항을 저장했습니다.');
    expect(mocks.update).toHaveBeenCalledWith({ visibility: 'private', is_public: false });
  });
  it('공개 범위가 누락되어도 다른 필드 수정으로 공개하지 않는다', async () => {
    mocks.fetch.mockResolvedValue(profileFixture({ visibility: null, is_public: null }));
    render(<TestApp />); await loaded(); expect((screen.getByLabelText('공개 범위') as HTMLSelectElement).value).toBe('');
    edit('한 줄 자기소개', '수정'); save(); await waitFor(() => expect(mocks.update).toHaveBeenCalledWith({ bio: '수정' }));
  });
  it('보유 기술 제거 시 연결된 숙련도만 정리한다', async () => {
    render(<TestApp />); await loaded();
    fireEvent.click(within(screen.getByRole('group', { name: '보유 기술' })).getByRole('button', { name: 'React' })); save();
    await waitFor(() => expect(mocks.update).toHaveBeenCalledWith({ tech_stacks: [], tech_proficiency: {} }));
  });
  it('자유 입력을 배열에 추가하며 기존 비표준 값을 보존한다', async () => {
    render(<TestApp />); await loaded(); edit('관심 분야 및 기타 입력 직접 입력', '새 관심');
    fireEvent.click(screen.getByRole('button', { name: '관심 분야 및 기타 입력 추가' })); save();
    await waitFor(() => expect(mocks.update).toHaveBeenCalledWith({ interests: ['웹 개발', '양자컴퓨팅', '새 관심'] }));
  });
  it('이름·닉네임 저장 후 실제 홈 인사말에도 반영한다', async () => {
    render(<TestApp />); await loaded(); edit('닉네임', '새 별칭'); save(); await screen.findByText('프로필 변경 사항을 저장했습니다.');
    fireEvent.click(screen.getByRole('link', { name: '홈 화면' })); await screen.findByText('새 별칭님, 반가워요.');
    expect(mocks.update).toHaveBeenCalledWith({ nickname: '새 별칭' });
  });
  it('닉네임이 없으면 실제 이름을 사용한다', async () => {
    mocks.fetch.mockResolvedValue(profileFixture({ nickname: '' })); render(<TestApp />); await loaded();
    fireEvent.click(screen.getByRole('link', { name: '홈 화면' })); await screen.findByText('테스트 학생님, 반가워요.');
  });
  it('프로필이 없으면 빈 폼을 저장하지 않고 기존 온보딩 링크를 제공한다', async () => {
    mocks.fetch.mockResolvedValue(null); render(<TestApp />); await screen.findByText('등록된 프로필이 없습니다');
    expect(screen.getByRole('link', { name: '프로필 설정하기' }).getAttribute('href')).toBe('/onboarding');
    expect(screen.queryByRole('form')).toBeNull();
  });
  it('조회 실패 시 저장하지 않고 재시도로 복구한다', async () => {
    mocks.fetch.mockRejectedValueOnce(new Error('조회 실패')); render(<TestApp />); await screen.findByText('조회 실패');
    expect(screen.queryByRole('form')).toBeNull(); fireEvent.click(screen.getByRole('button', { name: '다시 시도' })); await loaded();
    expect(mocks.fetch).toHaveBeenCalledTimes(2);
  });
  it('재마운트(새로고침)하면 프로필을 다시 조회한다', async () => {
    const view = render(<TestApp />); await loaded(); view.unmount();
    mocks.fetch.mockResolvedValue(profileFixture({ nickname: '다시 읽은 별칭' })); render(<TestApp />); await loaded();
    expect(mocks.fetch).toHaveBeenCalledTimes(2); expect((screen.getByLabelText('닉네임') as HTMLInputElement).value).toBe('다시 읽은 별칭');
  });
});

function Consumer() {
  const { profile, status, saving, update } = useMyProfile();
  return <><span data-testid="state">{status}:{profile?.nickname ?? '없음'}:{String(saving)}</span><button onClick={() => { void update({ bio: '변경' }).catch(() => undefined); }}>수정</button></>;
}
const contextTree = () => <MyProfileProvider><Consumer /></MyProfileProvider>;
describe('공유 상태 계정 격리', () => {
  it('로그아웃 직후 이전 정보를 숨기고 재로그인에 재조회한다', async () => {
    const view = render(contextTree()); await screen.findByText('ready:별칭:false');
    mocks.auth.user = null; view.rerender(contextTree()); expect(screen.getByTestId('state').textContent).not.toContain('별칭');
    mocks.auth.user = { id: 'user-a' }; view.rerender(contextTree()); await screen.findByText('ready:별칭:false');
    expect(mocks.fetch).toHaveBeenCalledTimes(2);
  });
  it('계정 전환 후 이전 계정의 늦은 조회 응답을 무시한다', async () => {
    const old = deferred<UserProfile>(); const next = deferred<UserProfile>(); mocks.fetch.mockReturnValueOnce(old.promise).mockReturnValueOnce(next.promise);
    const view = render(contextTree()); mocks.auth.user = { id: 'user-b' }; view.rerender(contextTree());
    await act(async () => next.resolve(profileFixture({ id: 'user-b', nickname: 'B 계정' })));
    await act(async () => old.resolve(profileFixture()));
    expect(screen.getByTestId('state').textContent).toBe('ready:B 계정:false');
  });
  it('계정 전환 후 이전 계정의 늦은 저장 응답을 무시한다', async () => {
    const old = deferred<UserProfile>(); mocks.update.mockReturnValueOnce(old.promise);
    const view = render(contextTree()); await screen.findByText('ready:별칭:false'); fireEvent.click(screen.getByText('수정'));
    mocks.fetch.mockResolvedValue(profileFixture({ id: 'user-b', nickname: 'B 계정' })); mocks.auth.user = { id: 'user-b' }; view.rerender(contextTree());
    await screen.findByText('ready:B 계정:false'); await act(async () => old.resolve(profileFixture({ nickname: '늦은 A' })));
    expect(screen.getByTestId('state').textContent).toBe('ready:B 계정:false');
  });
  it('조회 행의 사용자 ID가 다르면 노출하지 않는다', async () => {
    mocks.fetch.mockResolvedValue(profileFixture({ id: 'other-user' })); render(contextTree()); await screen.findByText('error:없음:false');
  });
});
