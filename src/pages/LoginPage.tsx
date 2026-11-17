import React, { useState } from 'react';
import {
  Mail,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  AlertCircle,
} from 'lucide-react';
import { supabase } from '../lib/supabase';

export const LoginPage: React.FC = () => {
  const [emailPrefix, setEmailPrefix] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 실제 Google OAuth 로그인 요청
  const handleGoogleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    const trimmed = emailPrefix.trim();

    if (!trimmed) {
      setErrorMessage('경북대학교 웹메일 아이디를 입력해 주세요.');
      return;
    }

    const idRegex = /^[a-zA-Z0-9._-]+$/;

    if (!idRegex.test(trimmed)) {
      setErrorMessage(
        '올바른 학교 이메일 아이디 형식이 아닙니다 (영문, 숫자, 특수기호 ._- 만 허용).'
      );
      return;
    }

    const fullEmail = `${trimmed}@knu.ac.kr`;
    setIsSubmitting(true);

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          queryParams: {
            login_hint: fullEmail,
          },
          redirectTo: `${window.location.origin}/`,
        },
      });

      if (error) {
        console.error('Google OAuth 요청 실패:', error);
        setErrorMessage('Google 로그인 요청에 실패했습니다. 다시 시도해 주세요.');
        setIsSubmitting(false);
      }
    } catch (error) {
      console.error('Google 로그인 오류:', error);
      setErrorMessage('로그인 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.');
      setIsSubmitting(false);
    }
  };


  return (
    <div className="min-h-screen bg-[#000000] text-white flex flex-col lg:flex-row font-sans selection:bg-[#7D39EB] selection:text-white max-w-full overflow-x-hidden">
      {/* ─────────────────────────────────────────────────────────
          왼쪽 영역: 브랜드 아이덴티티 & 독창적인 추상 연결 그래픽 (PC)
      ───────────────────────────────────────────────────────── */}
      <div className="lg:w-1/2 p-6 sm:p-10 lg:p-16 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-[#1E1E2A] relative bg-[#050508] overflow-hidden">
        {/* 상단 로고 (PREVIEW 배지 제거) */}
        <div className="flex items-center z-10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#7D39EB] flex items-center justify-center shrink-0 shadow-sm">
              <span className="text-white font-black text-lg leading-none">B</span>
            </div>
            <div>
              <span className="font-black text-xl tracking-tight text-white block leading-none">
                BRIDGE
              </span>
              <span className="text-[10px] text-[#C6FF33] font-bold tracking-widest uppercase mt-1 block">
                KNU CSE · PROJECT NETWORK
              </span>
            </div>
          </div>
        </div>

        {/* 중앙: 추상적인 네트워크 연결 SVG 아트워크 */}
        <div className="my-8 lg:my-auto py-4 flex flex-col items-center justify-center z-10">
          <div className="w-full max-w-md aspect-[5/3] relative flex items-center justify-center">
            <svg
              viewBox="0 0 500 300"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="w-full h-full"
            >
              {/* 배경 서브틀 그리드 */}
              <defs>
                <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#161822" strokeWidth="0.8" />
                </pattern>
              </defs>
              <rect width="500" height="300" fill="url(#grid)" opacity="0.8" />

              {/* 브릿지 메인 아크 (연결선) */}
              <path
                d="M 50 240 Q 250 40 450 240"
                stroke="#7D39EB"
                strokeWidth="2.5"
                strokeLinecap="round"
                fill="none"
              />
              <path
                d="M 70 250 Q 250 110 430 250"
                stroke="#C6FF33"
                strokeWidth="1.5"
                strokeDasharray="6 6"
                strokeLinecap="round"
                fill="none"
                opacity="0.9"
              />

              {/* 기하학적 교차 보조선 */}
              <line x1="50" y1="240" x2="250" y2="140" stroke="#242634" strokeWidth="1.2" />
              <line x1="450" y1="240" x2="250" y2="140" stroke="#242634" strokeWidth="1.2" />
              <line x1="160" y1="120" x2="340" y2="120" stroke="#7D39EB" strokeWidth="1" strokeDasharray="3 3" opacity="0.6" />
              <line x1="250" y1="40" x2="250" y2="260" stroke="#1E1E2A" strokeWidth="1" />

              {/* 노드 (포인트 & 교차점) */}
              {/* 왼쪽 기저 노드 */}
              <circle cx="50" cy="240" r="7" fill="#7D39EB" />
              <circle cx="50" cy="240" r="14" stroke="#7D39EB" strokeWidth="1" opacity="0.4" />

              {/* 오른쪽 기저 노드 */}
              <circle cx="450" cy="240" r="7" fill="#C6FF33" />
              <circle cx="450" cy="240" r="14" stroke="#C6FF33" strokeWidth="1" opacity="0.4" />

              {/* 중앙 정점 노드 (Bridge Peak) */}
              <circle cx="250" cy="90" r="8" fill="#FFFFFF" />
              <circle cx="250" cy="90" r="16" stroke="#FFFFFF" strokeWidth="1" opacity="0.3" />

              {/* 중간 연계 노드들 */}
              <circle cx="150" cy="140" r="5" fill="#7D39EB" />
              <circle cx="350" cy="140" r="5" fill="#C6FF33" />
              <circle cx="250" cy="190" r="4" fill="#94A3B8" />

              {/* 레이블 및 엔지니어링 마커 */}
              <text x="55" y="270" fill="#94A3B8" fontSize="10" fontFamily="Space Grotesk, sans-serif" fontWeight="600">
                CSE.STUDENT
              </text>
              <text x="220" y="70" fill="#FFFFFF" fontSize="10" fontFamily="Space Grotesk, sans-serif" fontWeight="700">
                CONNECTION
              </text>
              <text x="390" y="270" fill="#C6FF33" fontSize="10" fontFamily="Space Grotesk, sans-serif" fontWeight="600">
                PROJECT.HUB
              </text>
            </svg>
          </div>

          {/* 슬로건 및 서브타이틀 */}
          <div className="text-center mt-6">
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-widest text-white uppercase font-sans">
              BEYOND CONNECTION.
            </h2>
            <p className="text-xs sm:text-sm text-[#94A3B8] font-medium tracking-wide mt-1.5">
              KNU CSE · PROJECT NETWORK
            </p>
          </div>
        </div>

        {/* 하단 가치 텍스트 */}
        <div className="pt-6 border-t border-[#1E1E2A] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-[#64748B] z-10">
          <span>경북대학교 컴퓨터학부 전용 협업 플랫폼</span>
          <div className="flex items-center gap-2 text-[#94A3B8] font-semibold">
            <span>발견</span>
            <span>·</span>
            <span>연결</span>
            <span>·</span>
            <span>협업</span>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────
          오른쪽 영역: 메인 카피 & Google OAuth 로그인 폼 (PC / 모바일)
      ───────────────────────────────────────────────────────── */}
      <div className="lg:w-1/2 p-6 sm:p-10 lg:p-16 flex flex-col justify-between bg-[#000000]">
        <div className="max-w-md w-full mx-auto my-auto py-8">
          {/* 메인 카피: 모바일 & PC 모두 정확히 2줄 유지 및 두 줄 사이 12px 여백 */}
          <div className="mb-8">
            <h1 className="text-3xl sm:text-4xl lg:text-[42px] font-black text-white tracking-tight leading-[1.3] break-keep flex flex-col gap-3">
              <span className="block whitespace-nowrap">우리 사이,</span>
              <span className="block whitespace-nowrap">
                <span className="text-[#C6FF33]">가능성</span>을 잇다.
              </span>
            </h1>
            <p className="text-sm sm:text-base text-[#94A3B8] font-medium mt-3 leading-relaxed break-keep">
              새로운 도전과 함께할 사람을 만나보세요.
            </p>
          </div>

          {/* 이메일 입력 및 로그인 폼 */}
          <form onSubmit={handleGoogleLogin} className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label htmlFor="knu-email" className="text-xs font-bold text-[#E2E8F0]">
                  경북대학교 웹메일 아이디
                </label>
                <span className="text-[11px] text-[#7D39EB] font-semibold">
                  @knu.ac.kr 전용
                </span>
              </div>

              {/* 입력창 + @knu.ac.kr 고정 뱃지 */}
              <div className="flex items-center rounded-xl bg-[#0B0C10] border border-[#242634] focus-within:border-[#7D39EB] focus-within:ring-2 focus-within:ring-[#7D39EB]/20 transition-all overflow-hidden p-1">
                <div className="pl-3 pr-2 text-[#64748B]">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  id="knu-email"
                  type="text"
                  placeholder="웹메일 아이디 입력"
                  value={emailPrefix}
                  onChange={(e) => {
                    setEmailPrefix(e.target.value);
                    if (errorMessage) setErrorMessage('');
                  }}
                  autoComplete="username"
                  className="flex-1 bg-transparent py-2.5 px-1 text-sm text-white placeholder-[#4B5563] focus:outline-none font-medium min-w-0"
                />
                <span className="px-3 py-1.5 rounded-lg bg-[#181924] text-xs font-mono font-bold text-[#94A3B8] border border-[#242634] select-none shrink-0">
                  @knu.ac.kr
                </span>
              </div>

              {errorMessage && (
                <p className="text-xs text-rose-400 mt-2 flex items-center gap-1.5 font-medium">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  {errorMessage}
                </p>
              )}
            </div>

            {/* 라임색 로그인 버튼 (전체 너비, '로그인' 문구) */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 px-4 rounded-xl bg-[#C6FF33] hover:bg-[#B8F224] text-black font-extrabold text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.99] disabled:opacity-50 cursor-pointer shadow-sm mt-3"
            >
              {isSubmitting ? (
                <span className="inline-flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  로그인 준비 중...
                </span>
              ) : (
                <>
                  <span>로그인</span>
                  <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                </>
              )}
            </button>
          </form>

          {/* 간결한 텍스트 형태의 안내 문구 */}
          <div className="mt-5 space-y-2 text-xs text-[#94A3B8]">
            <p className="flex items-center gap-2 leading-relaxed">
              <ShieldCheck className="w-3.5 h-3.5 text-[#7D39EB] shrink-0" />
              <span>Google 공식 인증을 통해 안전하게 로그인합니다.</span>
            </p>
            <p className="flex items-center gap-2 leading-relaxed">
              <Sparkles className="w-3.5 h-3.5 text-[#C6FF33] shrink-0" />
              <span>처음 방문하시나요? 로그인 후 프로필을 설정해 주세요.</span>
            </p>
          </div>

          {/* OAuth 연동 준비 상태 피드백 모달/알림 */}

          {/* ─────────────────────────────────────────────────────
              개발 환경 전용: UI/UX 검토용 둘러보기 (실제 배포 환경에서는 비노출)
          ───────────────────────────────────────────────────── */}
        </div>

        {/* 하단 약관 & 카피라이트 */}
        <div className="pt-6 border-t border-[#1E1E2A] text-center lg:text-left text-xs text-[#64748B]">
          <p className="leading-relaxed">
            계속 진행함으로써 BRIDGE의{' '}
            <button
              type="button"
              onClick={() => alert('이용약관 전문은 추후 제공됩니다.')}
              className="text-[#94A3B8] hover:text-white underline underline-offset-2"
            >
              이용약관
            </button>
            {' '}및{' '}
            <button
              type="button"
              onClick={() => alert('개인정보 처리방침 전문은 추후 제공됩니다.')}
              className="text-[#94A3B8] hover:text-white underline underline-offset-2"
            >
              개인정보 처리방침
            </button>
            에 동의하게 됩니다.
          </p>
          <p className="text-[11px] text-[#4B5563] mt-2">
            © 2026 BRIDGE · 경북대학교 컴퓨터학부 협업 플랫폼 (KNU CSE)
          </p>
        </div>
      </div>
    </div>
  );
};
