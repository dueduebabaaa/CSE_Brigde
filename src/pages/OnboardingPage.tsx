import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Check,
  User,
  Layout,
  Server,
  Cpu,
  Database,
  Palette,
  ClipboardList,
  Smartphone,
  Terminal,
  Shield,
  TrendingUp,
  HelpCircle,
  Github,
  Globe,
  Lock,
  Eye,
  Users,
  Compass,
} from 'lucide-react';
import { MAJOR_TRACKS, GRADE_OPTIONS } from '../constants/majors';
import { TechnologyPicker } from '../components/TechnologyPicker';
import { useAuth } from '../hooks/useAuth';
import { fetchMyProfile, saveMyProfile } from '../services/profileService';
import type { ProfileUpsert } from '../services/profileService';
// ─── 표준 태그 및 옵션 상수 정의 (docs/PROFILE_SPEC.md 준수) ───

const INTEREST_OPTIONS = [
  '웹 개발',
  '앱 개발',
  '인공지능',
  '데이터 분석',
  '정보보안',
  '게임 개발',
  '임베디드 및 IoT',
  '클라우드',
  'UI/UX 디자인',
  '서비스 기획',
  '마케팅',
  '창업',
  '알고리즘',
  '오픈소스',
  '기타',
];

interface RoleOption {
  key: string;
  label: string;
  desc: string;
  icon: React.ComponentType<{ className?: string }>;
}

const DESIRED_ROLE_OPTIONS: RoleOption[] = [
  { key: 'Frontend', label: 'Frontend', desc: '웹 사용자 인터페이스 개발', icon: Layout },
  { key: 'Backend', label: 'Backend', desc: '서버 아키텍처 및 API 개발', icon: Server },
  { key: 'AI/ML', label: 'AI / ML', desc: '인공지능 모델링 및 학습', icon: Cpu },
  { key: 'Data', label: 'Data', desc: '데이터 수집, 전처리 및 분석', icon: Database },
  { key: 'UI/UX', label: 'UI/UX 디자인', desc: '화면 기획 및 디자인 시스템', icon: Palette },
  { key: 'PM/기획', label: 'PM / 서비스 기획', desc: '일정 관리 및 프로덕트 기획', icon: ClipboardList },
  { key: 'Mobile', label: 'Mobile (iOS/Android)', desc: '네이티브 & 크로스플랫폼 앱', icon: Smartphone },
  { key: 'DevOps', label: 'DevOps / 인프라', desc: 'CI/CD 배포 및 클라우드 운영', icon: Terminal },
  { key: 'Security', label: '정보보안', desc: '보안 취약점 점검 및 암호화', icon: Shield },
  { key: 'Marketing', label: '마케팅 / 홍보', desc: '사용자 유치 및 콘텐츠 제작', icon: TrendingUp },
  { key: '기타', label: '기타 역할', desc: '하드웨어, 비즈니스 등', icon: HelpCircle },
];

const ACTIVITY_TYPE_OPTIONS = ['공모전', '해커톤', '대외활동', '사이드 프로젝트', '스터디', '창업'];
const ACTIVITY_GOAL_OPTIONS = ['수상 목표', '실무 경험', '포트폴리오', '기술 학습', '네트워킹'];
const MEETING_WAY_OPTIONS = ['대면', '비대면', '혼합'];
const DURATION_OPTIONS = ['단기 (1개월 이내)', '장기 (3개월 이상)', '무관'];

const STATUS_OPTIONS = [
  { key: '팀 구하는 중', label: '팀 구하는 중', desc: '적극 매칭 추천 대상', color: 'bg-emerald-500' },
  { key: '제안 환영', label: '제안 환영', desc: '좋은 기회 시 참여', color: 'bg-amber-400' },
  { key: '활동 중', label: '활동 중', desc: '현재 프로젝트 진행 중', color: 'bg-blue-500' },
  { key: '참여 어려움', label: '참여 어려움', desc: '학업/개인 사정으로 제외', color: 'bg-slate-400' },
];

type Proficiency = '입문' | '활용 가능' | '숙련';

// ─── 온보딩 폼 데이터 인터페이스 ───
interface OnboardingFormState {
  // Step 1
  name: string;
  nickname: string;
  avatarColor: string;
  grade: string;
  department: string;
  track: string;

  // Step 2
  interests: string[];
  otherInterest: string;
  otherRole: string;
  desiredRoles: string[];

  // Step 3
  hasNoTech: boolean;
  techStacks: string[];
  techProficiencies: Record<string, Proficiency>;

  // Step 4
  wantedTechStacks: string[];
  activityTypes: string[];
  activityGoals: string[];
  meetingWay: string;
  activityDuration: string;
  participationStatus: string;

  // Step 5
  bio: string;
  longBio: string;
  githubUrl: string;
  portfolioUrl: string;
  visibility: '' | 'public' | 'team_only' | 'private';
}

export const OnboardingPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  const googleName =
    typeof user?.user_metadata?.full_name === 'string'
      ? user.user_metadata.full_name
      : typeof user?.user_metadata?.name === 'string'
        ? user.user_metadata.name
        : '';

  const googleAvatarUrl =
    typeof user?.user_metadata?.avatar_url === 'string'
      ? user.user_metadata.avatar_url
      : null;
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [stepError, setStepError] = useState<string>('');
  const [showCompleteModal, setShowCompleteModal] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveError, setSaveError] = useState<string>('');

  // 초기 폼 상태 (신규 사용자 기본 미선택)
  const [form, setForm] = useState<OnboardingFormState>({
    name: '',
    nickname: '',
    avatarColor: 'bg-[#7D39EB]',
    grade: '',
    department: '경북대학교 컴퓨터학부',
    track: '',

    interests: [], otherInterest: '', otherRole: '',
    desiredRoles: [],

    hasNoTech: false,
    techStacks: [],
    techProficiencies: {},

    wantedTechStacks: [],
    activityTypes: [],
    activityGoals: [],
    meetingWay: '',
    activityDuration: '',
    participationStatus: '',

    bio: '',
    longBio: '',
    githubUrl: '',
    portfolioUrl: '',
    visibility: '',
  });

  // 로그인한 사용자의 기존 프로필 불러오기
  useEffect(() => {
    if (authLoading || !user) return;

    let cancelled = false;

    const loadProfile = async () => {
      try {
        const profile = await fetchMyProfile(user.id);

        if (!profile || cancelled) return;

        const interests = (profile.interests ?? []) as string[];
        const desiredRoles = (profile.desired_roles ?? []) as string[];

        const otherInterest = interests.find(
          (item) => !INTEREST_OPTIONS.includes(item)
        ) ?? '';

        const otherRole = desiredRoles.find(
          (item) => !DESIRED_ROLE_OPTIONS.some((role) => role.key === item)
        ) ?? '';

        const normalizedInterests = interests.map((item) =>
          item === otherInterest && otherInterest ? '기타' : item
        );

        const normalizedRoles = desiredRoles.map((item) =>
          item === otherRole && otherRole ? '기타' : item
        );

        const visibility = profile.visibility === 'team_only'
          ? 'team_only'
          : profile.visibility === 'private'
            ? 'private'
            : 'public';

        setForm((prev) => ({
          ...prev,
          name: profile.name ?? prev.name,
          nickname: profile.nickname ?? '',
          grade: profile.grade ?? '',
          track: profile.track ?? '',
          interests: normalizedInterests,
          otherInterest,
          desiredRoles: normalizedRoles,
          otherRole,
          techStacks: profile.tech_stacks ?? [],
          hasNoTech: (profile.tech_stacks ?? []).length === 0,
          wantedTechStacks: profile.wanted_tech_stacks ?? [],
          bio: profile.bio ?? '',
          longBio: profile.long_bio ?? '',
          githubUrl: profile.github_url ?? '',
          portfolioUrl: profile.portfolio_url ?? '',
          visibility,
        }));
      } catch (error) {
        console.error('기존 프로필 불러오기 실패:', error);
        if (!cancelled) {
          setStepError('기존 프로필을 불러오지 못했습니다. 새로고침 후 다시 시도해 주세요.');
        }
      }
    };

    void loadProfile();

    return () => {
      cancelled = true;
    };
  }, [authLoading, user]);
  // 배열 토글 헬퍼
  const toggleArrayItem = (key: keyof OnboardingFormState, item: string) => {
    setForm((prev) => {
      const currentList = (prev[key] as string[]) || [];
      const exists = currentList.includes(item);
      const updated = exists ? currentList.filter((x) => x !== item) : [...currentList, item];
      return { ...prev, [key]: updated };
    });
  };

  // 기술 스택 선택/해제 토글
  const toggleTechStack = (tech: string) => {
    setForm((prev) => {
      const exists = prev.techStacks.includes(tech);
      if (exists) {
        const nextStacks = prev.techStacks.filter((t) => t !== tech);
        const nextProf = { ...prev.techProficiencies };
        delete nextProf[tech];
        return { ...prev, techStacks: nextStacks, techProficiencies: nextProf };
      } else {
        return {
          ...prev,
          hasNoTech: false,
          techStacks: [...prev.techStacks, tech],
          techProficiencies: prev.techProficiencies,
        };
      }
    });
  };

  // 기술별 숙련도 변경
  const setTechLevel = (tech: string, level: Proficiency) => {
    setForm((prev) => {
      const levels = { ...prev.techProficiencies };
      if (levels[tech] === level) delete levels[tech];
      else levels[tech] = level;
      return { ...prev, techProficiencies: levels };
    });
  };

  // '아직 보유 기술 없음' 토글
  const toggleHasNoTech = () => {
    setForm((prev) => {
      const nextNoTech = !prev.hasNoTech;
      return {
        ...prev,
        hasNoTech: nextNoTech,
        techStacks: nextNoTech ? [] : prev.techStacks,
        techProficiencies: nextNoTech ? {} : prev.techProficiencies,
      };
    });
  };

  // 단계별 유효성 검사
  const validateStep = (step: number): boolean => {
    setStepError('');
    if (step === 1) {
      if (!form.name.trim()) {
        setStepError('이름(실명)을 입력해 주세요.');
        return false;
      }
      if (!form.grade) {
        setStepError('현재 학년을 선택해 주세요.');
        return false;
      }
      if (!form.track) {
        setStepError('세부전공을 선택해 주세요.');
        return false;
      }
      return true;
    }
    if (step === 2) {
      if (form.interests.length === 0) {
        setStepError('관심 분야를 최소 1개 이상 선택해 주세요.');
        return false;
      }
      if (form.desiredRoles.length === 0) {
        setStepError('희망 프로젝트 역할을 최소 1개 이상 선택해 주세요.');
        return false;
      }
    }
    if (step === 2 && ((form.interests.includes('기타') && !form.otherInterest.trim()) || (form.desiredRoles.includes('기타') && !form.otherRole.trim()))) {
      setStepError('기타로 선택한 항목을 직접 입력해 주세요.');
      return false;
    }
    if (step === 3) {
      if (!form.hasNoTech && form.techStacks.length === 0) {
        setStepError("보유 기술 스택을 선택하거나, '아직 보유 기술 없음'을 선택해 주세요.");
        return false;
      }
      return true;
    }
    if (step === 5) {
      if (!form.visibility) { setStepError('프로필 공개 범위를 선택해 주세요.'); return false; }
      for (const [label, value] of [['GitHub', form.githubUrl], ['포트폴리오', form.portfolioUrl]]) {
        if (!value.trim()) continue;
        try {
          const url = new URL(value.trim());
          if (!['https:', 'http:'].includes(url.protocol) || !url.hostname.includes('.') || url.username || url.password) throw new Error();
          if (label === 'GitHub' && (url.hostname !== 'github.com' || !/^\/[A-Za-z0-9-]+\/?$/.test(url.pathname) || url.search || url.hash)) throw new Error();
        } catch { setStepError(`${label} URL을 확인해 주세요. http:// 또는 https://로 시작하는 주소가 필요합니다.${label === 'GitHub' ? ' https://github.com/사용자명 형식으로 입력해 주세요.' : ''}`); return false; }
      }
    }
    return true;
  };

  // 다음 단계 이동
  const handleNext = () => {
    if (!validateStep(currentStep)) return;
    if (currentStep < 5) {
      setCurrentStep((prev) => prev + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // 이전 단계 이동
  const handlePrev = () => {
    setStepError('');
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      navigate('/login');
    }
  };

  // 선택 단계 건너뛰기
  const handleSkip = () => {
    if (currentStep !== 4) return;
    setStepError('');
    if (currentStep < 5) {
      setCurrentStep((prev) => prev + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // 최종 완료 제출
  const handleComplete = () => {
    for (const step of [1, 2, 3, 5]) {
      if (!validateStep(step)) { setCurrentStep(step); window.scrollTo({ top: 0, behavior: 'smooth' }); return; }
    }
    setShowCompleteModal(true);
  };

  // 프로필 저장 후 홈 대시보드로 이동
  const handleFinishOnboarding = async () => {
    if (isSaving) return;

    setSaveError('');

    if (authLoading || !user) {
      setSaveError('로그인 정보를 확인할 수 없습니다. 다시 로그인해 주세요.');
      return;
    }

    if (!user.email) {
      setSaveError('계정 이메일을 확인할 수 없습니다.');
      return;
    }

    if (!GRADE_OPTIONS.includes(form.grade as typeof GRADE_OPTIONS[number])) {
      setSaveError('올바른 학년을 선택해 주세요.');
      return;
    }

    if (!MAJOR_TRACKS.includes(form.track as typeof MAJOR_TRACKS[number])) {
      setSaveError('올바른 세부전공을 선택해 주세요.');
      return;
    }

    if (!form.visibility) {
      setSaveError('프로필 공개 범위를 선택해 주세요.');
      return;
    }

    const visibility = form.visibility as ProfileUpsert['visibility'];

    const profileData: ProfileUpsert = {
      id: user.id,
      email: user.email,
      name: form.name.trim(),
      nickname: form.nickname.trim() || form.name.trim(),
      grade: form.grade as ProfileUpsert['grade'],
      track: form.track as ProfileUpsert['track'],
      bio: form.bio.trim(),
      long_bio: form.longBio.trim(),
      interests: form.interests
        .map((item) => item === '기타' ? form.otherInterest.trim() : item)
        .filter(Boolean),
      tech_stacks: form.hasNoTech ? [] : form.techStacks,
      wanted_tech_stacks: form.wantedTechStacks,
      desired_roles: form.desiredRoles
        .map((item) => item === '기타' ? form.otherRole.trim() : item)
        .filter(Boolean),
      github_url: form.githubUrl.trim() || null,
      portfolio_url: form.portfolioUrl.trim() || null,
      visibility,
      is_public: visibility === 'public',
      updated_at: new Date().toISOString(),
    };

    try {
      setIsSaving(true);
      await saveMyProfile(profileData);

      if (import.meta.env.DEV) {
        localStorage.setItem('bridge_auth_preview', 'true');
      }

      navigate('/');
    } catch (error) {
      console.error('프로필 저장 실패:', error);
      setSaveError(
        error instanceof Error
          ? error.message
          : '프로필 저장 중 오류가 발생했습니다.'
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050508] text-white flex flex-col font-sans selection:bg-[#7D39EB] selection:text-white">
      {/* ─────────────────────────────────────────────────────────
          상단 온보딩 전용 헤더 (사이드바 및 일반 헤더 미표시)
      ───────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 bg-[#050508]/90 backdrop-blur-md border-b border-[#1E1E2A] px-4 sm:px-8 py-3.5 flex flex-wrap gap-3 items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#7D39EB] flex items-center justify-center shrink-0">
            <span className="text-white font-black text-base leading-none">B</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-black text-lg tracking-tight text-white leading-none">
                BRIDGE
              </span>
              <span className="px-1.5 py-0.5 rounded bg-[#C6FF33]/15 text-[#C6FF33] text-[10px] font-bold border border-[#C6FF33]/30">
                ONBOARDING
              </span>
            </div>
            <span className="text-[10px] text-[#94A3B8] tracking-wider uppercase hidden sm:block mt-0.5">
              KNU CSE PROJECT NETWORK
            </span>
          </div>
        </div>

        {/* 5단계 진행 상태 표시 */}
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono font-bold text-[#C6FF33]">
            STEP 0{currentStep} <span className="text-[#94A3B8]">/ 05</span>
          </span>
          <div className="w-24 sm:w-36 h-2 rounded-full bg-[#181924] overflow-hidden border border-[#242634]">
            <div
              className="h-full bg-gradient-to-r from-[#7D39EB] to-[#C6FF33] transition-all duration-300"
              style={{ width: `${(currentStep / 5) * 100}%` }}
            />
          </div>
        </div>
      </header>

      {/* ─────────────────────────────────────────────────────────
          본문 온보딩 컨테이너
      ───────────────────────────────────────────────────────── */}
      <main className="flex-1 max-w-3xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-12 flex flex-col justify-between">
        <div className="space-y-8">
          {/* 단계 표시 및 타이틀 */}
          <div className="space-y-1.5">
            <span className="text-xs font-mono font-bold text-[#7D39EB] tracking-wider uppercase">
              {currentStep === 1 && 'STEP 01 · 기본 정보'}
              {currentStep === 2 && 'STEP 02 · 관심사 & 희망 역할'}
              {currentStep === 3 && 'STEP 03 · 기술 역량 모델링'}
              {currentStep === 4 && 'STEP 04 · 협업 성향 & 목표 (선택)'}
              {currentStep === 5 && 'STEP 05 · 자기소개 & 공개 범위 (선택)'}
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              {currentStep === 1 && '당신을 소개해 주세요.'}
              {currentStep === 2 && '어떤 가능성에 관심이 있나요?'}
              {currentStep === 3 && '당신의 역량을 알려주세요.'}
              {currentStep === 4 && '어떤 도전을 꿈꾸나요?'}
              {currentStep === 5 && '당신을 조금 더 알려주세요.'}
            </h1>
            <p className="text-xs sm:text-sm text-[#94A3B8] leading-relaxed">
              {currentStep === 1 && '경북대 컴퓨터학부 학우들과 신뢰도 높은 팀을 결성하기 위한 기초 정보입니다.'}
              {currentStep === 2 && '관심 분야와 희망 역할을 바탕으로 딱 맞는 공모전과 팀원 모집글을 추천합니다.'}
              {currentStep === 3 && '보유 기술 스택과 숙련도를 설정하세요. 새내기를 위한 옵션도 준비되어 있습니다.'}
              {currentStep === 4 && '선호하는 활동 방식과 목표를 설정하면 성향이 일치하는 동료를 쉽게 찾을 수 있습니다.'}
              {currentStep === 5 && '한 줄 소개와 링크를 추가해 프로필의 완성도를 높여보세요. 마이페이지에서 언제든 수정 가능합니다.'}
            </p>
          </div>

          {/* 에러 메시지 배너 */}
          {stepError && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
              <span>{stepError}</span>
            </div>
          )}

          {/* ─────────────────────────────────────────────────────
              STEP 01: 기본 정보
          ───────────────────────────────────────────────────── */}
          {currentStep === 1 && (
            <div className="bg-[#0B0C10] border border-[#1E1E2A] rounded-2xl p-6 sm:p-8 space-y-6">
              {/* 프로필 아바타 & 색상 */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-4 pb-6 border-b border-[#1E1E2A]">
                {googleAvatarUrl ? (
                  <img
                    src={googleAvatarUrl}
                    alt={googleName || 'Google 프로필 사진'}
                    className="w-16 h-16 rounded-2xl object-cover shrink-0"
                  />
                ) : (
                  <div
                    className={`w-16 h-16 rounded-2xl ${form.avatarColor} flex items-center justify-center text-white font-black text-2xl shadow-sm shrink-0`}
                  >
                    {form.name.trim() ? (
                      form.name.trim().charAt(0)
                    ) : (
                      <User className="w-7 h-7" />
                    )}
                  </div>
                )}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#E2E8F0] block">
                    프로필 아바타 테마 색상
                  </label>
                  <div className="flex items-center gap-2">
                    {['bg-[#7D39EB]', 'bg-blue-600', 'bg-emerald-600', 'bg-rose-600', 'bg-amber-600', 'bg-indigo-600'].map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setForm((prev) => ({ ...prev, avatarColor: color }))}
                        className={`w-6 h-6 rounded-full ${color} transition-transform ${form.avatarColor === color ? 'ring-2 ring-white scale-110' : 'opacity-70 hover:opacity-100'
                          }`}
                      />
                    ))}
                  </div>
                  <span className="text-[11px] text-[#94A3B8] block">
                    * 상세 사진 업로드는 마이페이지에서 추후 지원됩니다.
                  </span>
                </div>
              </div>

              {/* 이름 & 닉네임 */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block text-[#E2E8F0] font-semibold mb-1.5">
                    이름 (실명) <span className="text-[#C6FF33]">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="홍길동"
                    value={form.name}
                    onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3.5 py-2.5 rounded-lg bg-[#14151F] border border-[#242634] text-white focus:border-[#7D39EB] focus:outline-none text-xs"
                  />
                  <span className="text-[11px] text-[#94A3B8] mt-1 block">
                    팀 빌딩 신뢰성 확보를 위해 실명 입력을 권장합니다.
                  </span>
                </div>
                <div>
                  <label className="block text-[#E2E8F0] font-semibold mb-1.5">
                    닉네임 <span className="text-[#94A3B8]">(선택)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="미입력 시 이름으로 표시됩니다"
                    value={form.nickname}
                    onChange={(e) => setForm((prev) => ({ ...prev, nickname: e.target.value }))}
                    className="w-full px-3.5 py-2.5 rounded-lg bg-[#14151F] border border-[#242634] text-white focus:border-[#7D39EB] focus:outline-none text-xs"
                  />
                </div>
              </div>

              {/* 학년 선택 */}
              <div>
                <label className="block text-xs font-semibold text-[#E2E8F0] mb-2">
                  학년 <span className="text-[#C6FF33]">*</span>
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                  {GRADE_OPTIONS.map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setForm((prev) => ({ ...prev, grade: g }))}
                      className={`py-2 px-3 rounded-lg text-xs font-bold transition-all border ${form.grade === g
                        ? 'bg-[#7D39EB] border-[#7D39EB] text-white shadow-sm'
                        : 'bg-[#14151F] border-[#242634] text-[#94A3B8] hover:text-white hover:border-[#383A4E]'
                        }`}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>

              {/* 소속 학부 & 세부 전공 */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-[#E2E8F0]">
                    소속 학부
                  </label>
                  <span className="text-xs font-bold text-white px-2.5 py-1 rounded bg-[#181926] border border-[#242634]">
                    경북대학교 컴퓨터학부
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#E2E8F0] mb-2">
                    세부전공 (트랙) <span className="text-[#C6FF33]">*</span>
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {MAJOR_TRACKS.map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setForm((prev) => ({ ...prev, track: t }))}
                        className={`p-3 rounded-xl text-left transition-all border flex items-center justify-between ${form.track === t
                          ? 'bg-[#7D39EB]/15 border-[#7D39EB] text-white'
                          : 'bg-[#14151F] border-[#242634] text-[#94A3B8] hover:text-white'
                          }`}
                      >
                        <span className="text-xs font-bold">{t}</span>
                        {form.track === t && <Check className="w-4 h-4 text-[#C6FF33]" />}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* 이메일 안내 */}
              <div className="pt-4 border-t border-[#1E1E2A] text-[11px] text-[#94A3B8] flex items-center gap-2">
                <Lock className="w-3.5 h-3.5 text-[#7D39EB] shrink-0" />
                <span>
                  학교 웹메일(@knu.ac.kr)은 Google 인증 세션과 연결되며 타 사용자에게 공개되지 않습니다.
                </span>
              </div>
            </div>
          )}

          {/* ─────────────────────────────────────────────────────
              STEP 02: 관심 분야 & 희망 역할
          ───────────────────────────────────────────────────── */}
          {currentStep === 2 && (
            <div className="space-y-6">
              {/* 관심 분야 (15종) */}
              <div className="bg-[#0B0C10] border border-[#1E1E2A] rounded-2xl p-6 sm:p-8 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white">
                    관심 분야 <span className="text-[#C6FF33]">*</span>
                  </h3>
                  <span className="text-[11px] text-[#94A3B8]">복수 선택 가능 ({form.interests.length}개 선택됨)</span>
                </div>
                <div className="flex flex-wrap gap-2 pt-1">
                  {INTEREST_OPTIONS.map((item) => {
                    const isSelected = form.interests.includes(item);
                    return (
                      <button
                        key={item}
                        type="button"
                        onClick={() => toggleArrayItem('interests', item)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${isSelected
                          ? 'bg-[#C6FF33] text-black border-[#C6FF33] font-bold shadow-sm'
                          : 'bg-[#14151F] text-[#94A3B8] border-[#242634] hover:text-white hover:border-[#383A4E]'
                          }`}
                      >
                        {item}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 희망 프로젝트 역할 (11종 카드) */}
              <div className="bg-[#0B0C10] border border-[#1E1E2A] rounded-2xl p-6 sm:p-8 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white">
                    희망 프로젝트 역할 <span className="text-[#C6FF33]">*</span>
                  </h3>
                  <span className="text-[11px] text-[#94A3B8]">복수 선택 가능 ({form.desiredRoles.length}개 선택됨)</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
                  {DESIRED_ROLE_OPTIONS.map((role) => {
                    const Icon = role.icon;
                    const isSelected = form.desiredRoles.includes(role.key);
                    return (
                      <button
                        key={role.key}
                        type="button"
                        onClick={() => toggleArrayItem('desiredRoles', role.key)}
                        className={`p-3.5 rounded-xl text-left transition-all border flex flex-col justify-between gap-2 ${isSelected
                          ? 'bg-[#7D39EB]/20 border-[#7D39EB] text-white shadow-sm ring-1 ring-[#7D39EB]'
                          : 'bg-[#14151F] border-[#242634] text-[#94A3B8] hover:text-white hover:border-[#383A4E]'
                          }`}
                      >
                        <div className="flex items-center justify-between">
                          <div
                            className={`p-2 rounded-lg ${isSelected ? 'bg-[#7D39EB] text-white' : 'bg-[#1D1E2C] text-[#94A3B8]'
                              }`}
                          >
                            <Icon className="w-4 h-4" />
                          </div>
                          {isSelected && <Check className="w-4 h-4 text-[#C6FF33]" />}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-white">{role.label}</p>
                          <p className="text-[11px] text-[#94A3B8] mt-0.5">{role.desc}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
              {(['interests', 'desiredRoles'] as const).map((key) => {
                const field = key === 'interests' ? 'otherInterest' : 'otherRole';
                return form[key].includes('기타') && <label key={key} className="block text-xs text-[#94A3B8]">
                  {key === 'interests' ? '기타 관심 분야 (필수)' : '기타 희망 역할 (필수)'}
                  <input value={form[field]} onChange={(e) => setForm((prev) => ({ ...prev, [field]: e.target.value }))}
                    className="mt-2 w-full px-3 py-2 rounded-lg bg-[#14151F] border border-[#242634] text-white focus:border-[#7D39EB] focus:outline-none" />
                </label>;
              })}
            </div>
          )}

          {/* ─────────────────────────────────────────────────────
              STEP 03: 기술 역량
          ───────────────────────────────────────────────────── */}
          {currentStep === 3 && (
            <div className="space-y-6">
              {/* 보유 기술 없음 토글 */}
              <button
                type="button"
                aria-pressed={form.hasNoTech}
                onClick={toggleHasNoTech}
                className={`w-full text-left p-4 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${form.hasNoTech
                  ? 'bg-[#C6FF33]/15 border-[#C6FF33] text-white'
                  : 'bg-[#0B0C10] border-[#1E1E2A] text-[#94A3B8] hover:border-[#383A4E]'
                  }`}
              >
                <div>
                  <span className="text-xs font-bold text-white block">
                    🌱 아직 보유 기술 스택이 없어요 (초급자 환영)
                  </span>
                  <span className="text-[11px] text-[#94A3B8]">
                    1~2학년 새내기 또는 기술 스택 탐색 중인 경우 선택하면 기초 학습 스터디 및 입문 프로젝트로 우선 연결됩니다.
                  </span>
                </div>
                <div
                  className={`w-5 h-5 rounded flex items-center justify-center border ${form.hasNoTech ? 'bg-[#C6FF33] border-[#C6FF33] text-black font-bold' : 'border-[#383A4E]'
                    }`}
                >
                  {form.hasNoTech && <Check className="w-3.5 h-3.5" />}
                </div>
              </button>

              {!form.hasNoTech && (
                <>
                  {/* 기술 검색 및 선택 */}
                  <div className="bg-[#0B0C10] border border-[#1E1E2A] rounded-2xl p-6 sm:p-8 space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold text-white">보유 기술 스택 선택</h3>
                      <span className="text-[11px] text-[#94A3B8]">
                        선택됨: <strong className="text-[#C6FF33]">{form.techStacks.length}</strong>개
                      </span>
                    </div>

                    <TechnologyPicker selected={form.techStacks} onToggle={toggleTechStack} label="보유 기술" />
                  </div>

                  {/* 선택한 기술별 숙련도 자가 평가 */}
                  {form.techStacks.length > 0 && (
                    <div className="bg-[#0B0C10] border border-[#1E1E2A] rounded-2xl p-6 sm:p-8 space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-sm font-bold text-white">기술별 숙련도 설정 (선택)</h3>
                          <p className="text-[11px] text-[#94A3B8]">
                            선택하지 않아도 진행할 수 있습니다. 선택한 단계를 다시 누르면 해제됩니다.
                          </p>
                        </div>
                      </div>

                      <p className="text-[11px] text-[#94A3B8] leading-relaxed">
                        입문: 기초 개념을 이해하고 학습 중<br />활용 가능: 자료를 참고해 프로젝트에 활용 가능<br />숙련: 독립적인 기능 구현 및 문제 해결 가능
                      </p>
                      <div className="space-y-2">
                        {form.techStacks.map((tech) => {
                          const currentLevel = form.techProficiencies[tech];
                          return (
                            <div
                              key={tech}
                              className="p-3 rounded-xl bg-[#14151F] border border-[#242634] flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                            >
                              <span className="text-xs font-bold text-white">{tech}</span>
                              <div className="flex items-center gap-1">
                                {(['입문', '활용 가능', '숙련'] as Proficiency[]).map((level) => (
                                  <button
                                    key={level}
                                    type="button"
                                    onClick={() => setTechLevel(tech, level)}
                                    className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-all border ${currentLevel === level
                                      ? level === '입문'
                                        ? 'bg-[#1E202E] text-slate-300 border-slate-500'
                                        : level === '활용 가능'
                                          ? 'bg-[#7D39EB] text-white border-[#7D39EB]'
                                          : 'bg-[#C6FF33] text-black border-[#C6FF33] font-bold'
                                      : 'bg-transparent text-[#94A3B8] border-transparent hover:text-white'
                                      }`}
                                  >
                                    {level}
                                  </button>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* ─────────────────────────────────────────────────────
              STEP 04: 협업 성향 & 목표 (선택)
          ───────────────────────────────────────────────────── */}
          {currentStep === 4 && (
            <div className="bg-[#0B0C10] border border-[#1E1E2A] rounded-2xl p-6 sm:p-8 space-y-6">
              {/* 배우고 싶은 기술 */}
              <div>
                <label className="block text-xs font-semibold text-[#E2E8F0] mb-2">
                  배우고 싶은 기술 스택 <span className="text-[#94A3B8]">(선택)</span>
                </label>
                <TechnologyPicker selected={form.wantedTechStacks} onToggle={(tech) => toggleArrayItem('wantedTechStacks', tech)} label="배우고 싶은 기술" />
              </div>

              {/* 희망 활동 유형 */}
              <div>
                <label className="block text-xs font-semibold text-[#E2E8F0] mb-2">
                  희망 활동 유형 <span className="text-[#94A3B8]">(다중 선택)</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {ACTIVITY_TYPE_OPTIONS.map((item) => {
                    const isSelected = form.activityTypes.includes(item);
                    return (
                      <button
                        key={item}
                        type="button"
                        onClick={() => toggleArrayItem('activityTypes', item)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${isSelected
                          ? 'bg-[#7D39EB] text-white border-[#7D39EB]'
                          : 'bg-[#14151F] text-[#94A3B8] border-[#242634] hover:text-white'
                          }`}
                      >
                        {item}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 활동 목표 */}
              <div>
                <label className="block text-xs font-semibold text-[#E2E8F0] mb-2">
                  활동 목표 <span className="text-[#94A3B8]">(다중 선택)</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {ACTIVITY_GOAL_OPTIONS.map((item) => {
                    const isSelected = form.activityGoals.includes(item);
                    return (
                      <button
                        key={item}
                        type="button"
                        onClick={() => toggleArrayItem('activityGoals', item)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${isSelected
                          ? 'bg-[#7D39EB] text-white border-[#7D39EB]'
                          : 'bg-[#14151F] text-[#94A3B8] border-[#242634] hover:text-white'
                          }`}
                      >
                        {item}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 활동 방식 & 희망 활동 기간 */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#E2E8F0] mb-2">
                    선호 활동 방식
                  </label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {MEETING_WAY_OPTIONS.map((way) => (
                      <button
                        key={way}
                        type="button"
                        onClick={() => setForm((prev) => ({ ...prev, meetingWay: way }))}
                        className={`py-2 px-2 rounded-lg text-xs font-semibold text-center transition-all border ${form.meetingWay === way
                          ? 'bg-[#7D39EB] text-white border-[#7D39EB]'
                          : 'bg-[#14151F] text-[#94A3B8] border-[#242634] hover:text-white'
                          }`}
                      >
                        {way}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#E2E8F0] mb-2">
                    희망 활동 기간
                  </label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {DURATION_OPTIONS.map((dur) => (
                      <button
                        key={dur}
                        type="button"
                        onClick={() => setForm((prev) => ({ ...prev, activityDuration: dur }))}
                        className={`py-2 px-2 rounded-lg text-xs font-semibold text-center transition-all border ${form.activityDuration === dur
                          ? 'bg-[#7D39EB] text-white border-[#7D39EB]'
                          : 'bg-[#14151F] text-[#94A3B8] border-[#242634] hover:text-white'
                          }`}
                      >
                        {dur.split(' ')[0]}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* 현재 참여 가능 상태 */}
              <div>
                <label className="block text-xs font-semibold text-[#E2E8F0] mb-2">
                  현재 프로젝트 참여 상태
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {STATUS_OPTIONS.map((st) => (
                    <button
                      key={st.key}
                      type="button"
                      onClick={() => setForm((prev) => ({ ...prev, participationStatus: st.key }))}
                      className={`p-3 rounded-xl text-left transition-all border ${form.participationStatus === st.key
                        ? 'bg-[#7D39EB]/15 border-[#7D39EB] text-white'
                        : 'bg-[#14151F] border-[#242634] text-[#94A3B8] hover:text-white'
                        }`}
                    >
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className={`w-2 h-2 rounded-full ${st.color}`} />
                        <span className="text-xs font-bold text-white">{st.label}</span>
                      </div>
                      <span className="text-[10px] text-[#94A3B8] block">{st.desc}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ─────────────────────────────────────────────────────
              STEP 05: 자기소개 & 공개 범위
          ───────────────────────────────────────────────────── */}
          {currentStep === 5 && (
            <div className="bg-[#0B0C10] border border-[#1E1E2A] rounded-2xl p-6 sm:p-8 space-y-6">
              {/* 한 줄 소개 */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-[#E2E8F0]">
                    한 줄 소개 <span className="text-[#94A3B8]">(프로필 카드 노출)</span>
                  </label>
                  <span className="text-[11px] text-[#94A3B8]">{form.bio.length} / 60자</span>
                </div>
                <input
                  type="text"
                  maxLength={60}
                  placeholder="예: 사용자 중심의 인터랙티브 웹을 구현하는 3학년 개발자입니다."
                  value={form.bio}
                  onChange={(e) => setForm((prev) => ({ ...prev, bio: e.target.value }))}
                  className="w-full px-3.5 py-2.5 rounded-lg bg-[#14151F] border border-[#242634] text-white focus:border-[#7D39EB] focus:outline-none text-xs"
                />
              </div>

              {/* 자기소개 */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-[#E2E8F0]">
                    상세 소개 & 협업 성향 <span className="text-[#94A3B8]">(선택)</span>
                  </label>
                  <span className="text-[11px] text-[#94A3B8]">{form.longBio.length} / 500자</span>
                </div>
                <textarea
                  rows={4}
                  maxLength={500}
                  placeholder="프로젝트 경험, 좋아하는 작업 방식, 동료들과 함께 이루고 싶은 목표 등을 자유롭게 적어주세요."
                  value={form.longBio}
                  onChange={(e) => setForm((prev) => ({ ...prev, longBio: e.target.value }))}
                  className="w-full px-3.5 py-2.5 rounded-lg bg-[#14151F] border border-[#242634] text-white focus:border-[#7D39EB] focus:outline-none text-xs leading-relaxed"
                />
              </div>

              {/* GitHub & 포트폴리오 링크 */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block text-[#E2E8F0] font-semibold mb-1.5 flex items-center gap-1.5">
                    <Github className="w-3.5 h-3.5 text-[#94A3B8]" /> GitHub 프로필 URL
                  </label>
                  <input
                    type="url"
                    placeholder="https://github.com/username"
                    value={form.githubUrl}
                    onChange={(e) => setForm((prev) => ({ ...prev, githubUrl: e.target.value }))}
                    className="w-full px-3.5 py-2 rounded-lg bg-[#14151F] border border-[#242634] text-white focus:border-[#7D39EB] focus:outline-none text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[#E2E8F0] font-semibold mb-1.5 flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5 text-[#94A3B8]" /> 포트폴리오 웹사이트
                  </label>
                  <input
                    type="url"
                    placeholder="https://my-portfolio.com"
                    value={form.portfolioUrl}
                    onChange={(e) => setForm((prev) => ({ ...prev, portfolioUrl: e.target.value }))}
                    className="w-full px-3.5 py-2 rounded-lg bg-[#14151F] border border-[#242634] text-white focus:border-[#7D39EB] focus:outline-none text-xs"
                  />
                </div>
              </div>

              {/* 프로필 공개 범위 설정 */}
              <div className="pt-4 border-t border-[#1E1E2A]">
                <label className="block text-xs font-semibold text-[#E2E8F0] mb-2">
                  프로필 공개 범위 설정 (필수)
                </label>
                <p className="text-xs text-[#94A3B8] mb-3">공개 범위를 직접 선택해 주세요. 학교 이메일은 공개 범위와 관계없이 일반 회원에게 공개하지 않습니다.</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {[
                    { key: 'public', label: 'BRIDGE 회원에게 공개', desc: '인증된 BRIDGE 회원만 열람 가능', icon: Eye },
                    { key: 'team_only', label: '팀원에게만 공개', desc: '합류한 프로젝트 팀원만 열람', icon: Users },
                    { key: 'private', label: '비공개', desc: '검색 및 추천에서 제외', icon: Lock },
                  ].map((v) => {
                    const Icon = v.icon;
                    const isSelected = form.visibility === v.key;
                    return (
                      <button
                        key={v.key}
                        type="button"
                        onClick={() => setForm((prev) => ({ ...prev, visibility: v.key as OnboardingFormState['visibility'] }))}
                        className={`p-3 rounded-xl text-left transition-all border flex flex-col justify-between ${isSelected
                          ? 'bg-[#7D39EB]/15 border-[#7D39EB] text-white'
                          : 'bg-[#14151F] border-[#242634] text-[#94A3B8] hover:text-white'
                          }`}
                      >
                        <div className="flex items-center gap-1.5 mb-1">
                          <Icon className={`w-3.5 h-3.5 ${isSelected ? 'text-[#C6FF33]' : 'text-[#94A3B8]'}`} />
                          <span className="text-xs font-bold text-white">{v.label}</span>
                        </div>
                        <span className="text-[10px] text-[#94A3B8]">{v.desc}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 마이페이지 추가 기능 안내 */}
              <div className="p-3.5 rounded-xl bg-[#141520] border border-[#242634] text-[11px] text-[#94A3B8] leading-relaxed flex items-start gap-2">
                <Sparkles className="w-4 h-4 text-[#C6FF33] shrink-0 mt-0.5" />
                <span>
                  프로젝트 상세 경험, 수상 이력 및 30분 단위 활동 가능 시간표는 서비스 시작 후 마이페이지에서 언제든지 추가 등록할 수 있습니다.
                </span>
              </div>
            </div>
          )}
        </div>

        {/* ─────────────────────────────────────────────────────
            하단 액션 네비게이션 바
        ───────────────────────────────────────────────────── */}
        <div className="pt-8 border-t border-[#1E1E2A] flex flex-wrap items-center justify-between gap-3 mt-8">
          <button
            type="button"
            onClick={handlePrev}
            className="py-2.5 px-4 rounded-xl bg-[#14151F] hover:bg-[#1E202E] text-xs font-semibold text-[#94A3B8] hover:text-white transition-colors flex items-center gap-1.5 border border-[#242634]"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            {currentStep === 1 ? '로그인으로' : '이전'}
          </button>

          <div className="flex flex-wrap items-center gap-2">
            {/* 선택 단계인 STEP 04만 건너뛰기 가능 */}
            {currentStep === 4 && (
              <button
                type="button"
                onClick={handleSkip}
                className="py-2.5 px-3.5 text-xs font-medium text-[#94A3B8] hover:text-[#94A3B8] transition-colors"
              >
                나중에 설정하기
              </button>
            )}

            {currentStep < 5 ? (
              <button
                type="button"
                onClick={handleNext}
                className="py-2.5 px-5 rounded-xl bg-[#7D39EB] hover:bg-[#6025C5] text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm"
              >
                다음
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleComplete}
                className="py-3 px-6 rounded-xl bg-[#C6FF33] hover:bg-[#B8F224] text-black text-xs sm:text-sm font-extrabold flex items-center gap-2 transition-all shadow-md active:scale-[0.99]"
              >
                <Sparkles className="w-4 h-4" />
                BRIDGE 시작하기
              </button>
            )}
          </div>
        </div>
      </main>

      {/* ─────────────────────────────────────────────────────
          완료 안내 모달 (프로필 저장)
      ───────────────────────────────────────────────────── */}
      {showCompleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="bg-[#0B0C10] border border-[#242634] rounded-2xl p-6 sm:p-8 max-w-md w-full max-h-[90dvh] overflow-y-auto shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-xl bg-[#C6FF33]/15 text-[#C6FF33] border border-[#C6FF33]/30 flex items-center justify-center mx-auto">
              <Check className="w-6 h-6 stroke-[3]" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-lg font-bold text-white">프로필 입력 확인</h3>
              <p className="text-xs text-[#94A3B8] leading-relaxed">
                <strong className="text-white">{form.name}</strong>님의 프로필 입력 내용을 확인했습니다. 저장 후 BRIDGE를 시작합니다.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-[#141520] border border-[#1E1E2A] text-xs text-[#94A3B8] space-y-1.5 leading-relaxed">
              <div className="flex flex-wrap justify-between gap-2 break-words">
                <span>학부 / 전공:</span>
                <span className="text-white font-medium">{form.track} ({form.grade})</span>
              </div>
              <div className="flex flex-wrap justify-between gap-2 break-words">
                <span>희망 역할:</span>
                <span className="text-[#C6FF33] font-semibold">{form.desiredRoles.map((role) => role === '기타' ? form.otherRole : role).join(', ')}</span>
              </div>
              <div className="flex flex-wrap justify-between gap-2 break-words">
                <span>보유 기술:</span>
                <span className="text-white">
                  {form.hasNoTech ? '아직 없음' : `${form.techStacks.length}개 기술`}
                </span>
              </div>
              <div className="pt-2 border-t border-[#1E1E2A] text-[11px] text-[#94A3B8]">
                * 프로필을 저장하면 입력한 기본 정보와 공개 범위가 계정에 연결됩니다.
              </div>
            </div>

            {saveError && (
              <p role="alert" className="text-xs text-red-400 text-center break-words">{saveError}</p>
            )}

               <button type="button" disabled={isSaving} onClick={() => setShowCompleteModal(false)} className="w-full py-2 text-xs text-[#94A3B8] disabled:opacity-50">입력 내용 계속 수정하기</button>
            <button
              type="button"
              onClick={handleFinishOnboarding}
              disabled={isSaving}
              className="w-full py-3 rounded-xl bg-[#C6FF33] hover:bg-[#B8F224] text-black font-extrabold text-xs flex items-center justify-center gap-1.5 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Compass className="w-4 h-4" />
              {isSaving ? "저장 중..." : "프로필 저장 후 BRIDGE 시작하기"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
