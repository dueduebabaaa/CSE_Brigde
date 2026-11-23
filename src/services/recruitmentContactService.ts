import { supabase } from '../lib/supabase';

export interface RecruitmentContact {
  kakaoId: string | null;
  sharingEnabled: boolean;
  revision: string;
}

export class RecruitmentContactConflict extends Error {}

export async function getMyRecruitmentContact(): Promise<RecruitmentContact> {
  const { data, error } = await supabase.rpc('bridge_get_my_recruitment_contact');
  if (error) throw new Error('내 연락처를 불러오지 못했어요.');
  if (
    typeof data !== 'object' || data === null ||
    !('kakaoId' in data) || (data.kakaoId !== null && typeof data.kakaoId !== 'string') ||
    !('sharingEnabled' in data) || typeof data.sharingEnabled !== 'boolean' ||
    !('revision' in data) || typeof data.revision !== 'string'
  ) {
    throw new Error('연락처 응답을 확인할 수 없어요.');
  }
  return { kakaoId: data.kakaoId, sharingEnabled: data.sharingEnabled, revision: data.revision };
}

export async function saveMyRecruitmentContact(kakaoId: string, revision: string): Promise<void> {
  const { error } = await supabase.rpc('bridge_save_my_recruitment_contact', {
    p_kakao_id: kakaoId,
    p_expected_revision: revision,
  });
  if (error?.code === 'PT409') throw new RecruitmentContactConflict();
  if (error) throw new Error('연락처를 저장하지 못했어요.');
}

export async function enableMyRecruitmentContactSharing(revision: string): Promise<void> {
  const { error } = await supabase.rpc('bridge_enable_my_recruitment_contact_sharing', {
    p_expected_revision: revision,
  });
  if (error?.code === 'PT409') throw new RecruitmentContactConflict();
  if (error) throw new Error('공유 동의를 저장하지 못했어요.');
}

export async function revokeMyRecruitmentContactSharing(): Promise<void> {
  const { error } = await supabase.rpc('bridge_revoke_my_recruitment_contact_sharing');
  if (error) throw new Error('공유 동의를 철회하지 못했어요.');
}

export async function deleteMyRecruitmentContact(): Promise<void> {
  const { error } = await supabase.rpc('bridge_delete_my_recruitment_contact');
  if (error) throw new Error('연락처를 삭제하지 못했어요.');
}

export async function getAcceptedApplicationContact(applicationId: string): Promise<string | null> {
  const { data, error } = await supabase.rpc('bridge_get_accepted_application_contact', {
    p_application_id: applicationId,
  });
  if (error || (data !== null && typeof data !== 'string')) {
    throw new Error('상대방 연락처를 불러오지 못했어요.');
  }
  return data;
}
