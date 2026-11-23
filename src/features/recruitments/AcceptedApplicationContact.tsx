import { useState } from 'react';
import { Button } from '../../components/ui';
import { getAcceptedApplicationContact } from '../../services/recruitmentContactService';

export function AcceptedApplicationContact({ applicationId }: { applicationId: string }) {
  const [kakaoId, setKakaoId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  const load = async () => {
    setKakaoId(null);
    setNotice('');
    setError('');
    setLoading(true);
    try {
      const contact = await getAcceptedApplicationContact(applicationId);
      setKakaoId(contact);
      if (contact === null) setNotice('두 사람 모두 카카오톡 ID를 등록하고 공유에 동의하면 확인할 수 있어요.');
    } catch {
      setError('상대방 연락처를 불러오지 못했어요.');
    } finally {
      setLoading(false);
    }
  };

  const copy = async () => {
    if (!kakaoId) return;
    setError('');
    setNotice('');
    try {
      await navigator.clipboard.writeText(kakaoId);
      setNotice('카카오톡 ID를 복사했어요.');
    } catch {
      setError('복사하지 못했어요. 표시된 ID를 직접 복사해 주세요.');
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" size="sm" variant="secondary" onClick={load} disabled={loading}>
          {loading ? '연락처 확인 중…' : '연락처 확인'}
        </Button>
        {kakaoId !== null && (
          <>
            <span className="break-all text-xs text-[#334155]">카카오톡 ID {kakaoId}</span>
            <Button type="button" size="sm" variant="secondary" onClick={copy}>카카오톡 ID 복사</Button>
          </>
        )}
      </div>
      {notice && <p role="status" className="text-xs text-[#64748B]">{notice}</p>}
      {error && <p role="alert" className="text-xs text-rose-700">{error}</p>}
    </div>
  );
}
