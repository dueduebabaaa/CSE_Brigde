import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Lock, Mail, ArrowRight } from 'lucide-react';
import { PlaceholderCard } from '../components/PlaceholderCard';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    alert('현재 프로토타입 단계입니다. 추후 담당자(B)에 의해 Supabase Auth 이메일 로그인이 연동될 예정입니다.');
  };

  return (
    <div className="w-full max-w-md space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-black text-white tracking-tight">BRIDGE 로그인</h2>
        <p className="text-xs text-slate-400 mt-1.5">
          경북대학교 컴퓨터학부 이메일 또는 계정으로 로그인하세요.
        </p>
      </div>

      <div className="bg-[#13141C] border border-[#242634] rounded-2xl p-6 sm:p-8 space-y-5">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              이메일 주소
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
              <input
                type="email"
                placeholder="knu_cse@knu.ac.kr"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-3.5 py-2.5 rounded-lg bg-[#0B0C10] border border-[#242634] focus:border-[#7D39EB] focus:outline-none text-xs text-white placeholder-slate-600 transition-colors"
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-xs font-semibold text-slate-300">비밀번호</label>
              <button
                type="button"
                onClick={() => alert('비밀번호 재설정 기능은 추후 제공될 예정입니다.')}
                className="text-[11px] text-[#7D39EB] hover:underline"
              >
                비밀번호 찾기
              </button>
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-3.5 py-2.5 rounded-lg bg-[#0B0C10] border border-[#242634] focus:border-[#7D39EB] focus:outline-none text-xs text-white placeholder-slate-600 transition-colors"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-2.5 rounded-lg bg-[#7D39EB] hover:bg-[#6025C5] text-white text-xs font-bold flex items-center justify-center gap-2 transition-colors shadow-lg shadow-[#7D39EB]/30 mt-2"
          >
            로그인하기
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </form>

        <div className="pt-4 border-t border-[#242634] text-center text-xs text-slate-400">
          계정이 없으신가요?{' '}
          <Link to="/signup" className="text-[#C6FF33] font-semibold hover:underline">
            회원가입하기
          </Link>
        </div>
      </div>

      <PlaceholderCard
        title="인증 시스템 연동 안내"
        description="이 화면은 초기 레이아웃 프리뷰입니다. 추후 Supabase Auth 기반 이메일/비밀번호 인증 및 경북대 웹메일(@knu.ac.kr) 도메인 인증이 탑재됩니다."
        assignedRole="B (백엔드 & 인증)"
      />
    </div>
  );
};
