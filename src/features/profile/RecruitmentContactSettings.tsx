import { useEffect, useState, type FormEvent } from 'react';
import {
  deleteMyRecruitmentContact,
  getMyRecruitmentContact,
  revokeMyRecruitmentContactSharing,
  saveMyRecruitmentContact,
  type RecruitmentContact,
} from '../../services/recruitmentContactService';
import { Field, Section, fieldClass } from './ProfileFields';

export function RecruitmentContactSettings() {
  const [saved, setSaved] = useState<RecruitmentContact | null>(null);
  const [kakaoId, setKakaoId] = useState('');
  const [share, setShare] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [retry, setRetry] = useState(0);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    setLoadFailed(false);
    void getMyRecruitmentContact().then((contact) => {
      if (!active) return;
      setSaved(contact);
      setKakaoId(contact?.kakaoId ?? '');
      setShare(contact?.sharingEnabled ?? false);
    }).catch(() => {
      if (active) setLoadFailed(true);
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [retry]);

  const change = async (operation: 'save' | 'revoke' | 'delete') => {
    if (busy) return;
    setBusy(true);
    setNotice('');
    setError('');
    try {
      if (operation === 'save') {
        const contact = await saveMyRecruitmentContact(kakaoId.trim(), share);
        setSaved(contact);
        setKakaoId(contact.kakaoId);
        setShare(contact.sharingEnabled);
        setNotice('카카오톡 연락처를 저장했어요.');
      } else if (operation === 'revoke') {
        await revokeMyRecruitmentContactSharing();
        setSaved((contact) => contact && { ...contact, sharingEnabled: false });
        setShare(false);
        setNotice('공유 동의를 철회했어요.');
      } else {
        await deleteMyRecruitmentContact();
        setSaved(null);
        setKakaoId('');
        setShare(false);
        setNotice('카카오톡 연락처를 삭제했어요.');
      }
    } catch {
      setError('연락처 설정을 변경하지 못했어요. 다시 시도해 주세요.');
    } finally {
      setBusy(false);
    }
  };

  const cleanedId = kakaoId.trim();
  const validId = cleanedId.length > 0 && !/[\s\u0000-\u001f\u007f]/u.test(cleanedId);
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (validId) void change('save');
  };

  return (
    <Section title="카카오톡 연락처 (선택)">
      {loading ? (
        <p role="status" className="text-xs text-[#64748B]">연락처를 불러오는 중이에요.</p>
      ) : loadFailed ? (
        <div className="space-y-2">
          <p role="alert" className="text-xs text-rose-700">내 연락처를 불러오지 못했어요.</p>
          <button type="button" className="text-xs font-bold text-[#7D39EB]" onClick={() => setRetry((value) => value + 1)}>
            연락처 다시 불러오기
          </button>
        </div>
      ) : (
        <form aria-label="카카오톡 연락처 설정" onSubmit={submit}>
          <fieldset disabled={busy} className="space-y-3">
            <Field label="카카오톡 ID">
              <input className={fieldClass} maxLength={64} value={kakaoId} autoComplete="off" spellCheck={false}
                onChange={(event) => setKakaoId(event.target.value)} />
            </Field>
            <label className="flex items-start gap-2 text-sm text-[#334155]">
              <input type="checkbox" className="mt-0.5 accent-[#7D39EB]" checked={share}
                onChange={(event) => setShare(event.target.checked)} />
              기존 및 향후 수락된 지원 건에서 상대방과 카카오톡 ID를 공유하는 데 동의합니다.
            </label>
            <p className="text-xs text-[#64748B]">
              두 사람 모두 등록하고 동의해야 서로의 ID를 확인할 수 있어요. 동의를 철회해도 상대방이 이미 본 ID는 회수할 수 없어요.
            </p>
            <div className="flex flex-wrap gap-3">
              <button type="submit" disabled={!validId} className="rounded-lg bg-[#7D39EB] px-3 py-2 text-xs font-bold text-white disabled:opacity-50">
                연락처 저장
              </button>
              {saved?.sharingEnabled && <button type="button" className="text-xs font-bold text-[#7D39EB]" onClick={() => void change('revoke')}>공유 동의 철회</button>}
              {saved && <button type="button" className="text-xs font-bold text-rose-700" onClick={() => void change('delete')}>연락처 삭제</button>}
            </div>
          </fieldset>
        </form>
      )}
      {notice && <p role="status" className="text-xs text-[#64748B]">{notice}</p>}
      {error && <p role="alert" className="text-xs text-rose-700">{error}</p>}
    </Section>
  );
}
