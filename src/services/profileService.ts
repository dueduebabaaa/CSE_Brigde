import { supabase } from '../lib/supabase';
import type { GradeOption, MajorTrack } from '../constants/majors';

export type ProfileVisibility = 'public' | 'team_only' | 'private';

export interface ProfileUpsert {
  id: string;
  email: string;
  name: string;
  nickname: string;
  grade: GradeOption;
  track: MajorTrack;
  bio: string;
  long_bio: string;
  interests: string[];
  tech_stacks: string[];
  wanted_tech_stacks: string[];
  desired_roles: string[];
  experiences?: string[];
  github_url: string | null;
  portfolio_url: string | null;
  visibility: ProfileVisibility;
  is_public: boolean;
  updated_at: string;
}

export const fetchMyProfile = async (userId: string) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    throw new Error(`프로필 조회 실패: ${error.message}`);
  }

  return data;
};

export const saveMyProfile = async (profile: ProfileUpsert) => {
  const { data, error } = await supabase
    .from('profiles')
    .upsert(profile, { onConflict: 'id' })
    .select()
    .single();

  if (error) {
    throw new Error(`프로필 저장 실패: ${error.message}`);
  }

  return data;
};
