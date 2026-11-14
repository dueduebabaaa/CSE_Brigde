import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, Lock, User, ArrowRight } from 'lucide-react';
import { PlaceholderCard } from '../components/PlaceholderCard';

export const SignupPage: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    alert('현재 프로토타입 단계입니다. 추후 담당자(B)에 의해 회원가입 및 학부 인증 절차가 연동될 예정입니다.');
  };

  return (
    <div className="w-full max-w-md space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-black text-white tracking-tight">BRIDGE 회원가입</h2>
        <p className="text-xs text-slate-400 mt-1.5">
          경북대학교 컴퓨터학부 학생 커뮤니티에 합류하세요.
        </p>
      </div>

      <div className="bg-[#13141C] border border-[#242634] rounded-2xl p-6 sm:p-8 space-y-5">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              이름 / 닉네임
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
              <input
                type="text"
                placeholder="홍길동"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full pl-10 pr-3.5 py-2.5 rounded-lg bg-[#0B0C10] border border-[#242634] focus:border-[#7D39EB] focus:outline-none text-xs text-white placeholder-slate-600 transition-colors"
              />
            </div>
          </div>

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
            <p className="text-[11px] text-slate-500 mt-1">
              * 추후 경북대학교 공식 웹메일 인증이 지원될 예정입니다.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">비밀번호</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
              <input
                type="password"
                placeholder="8자 이상 영문, 숫자 조합"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-3.5 py-2.5 rounded-lg bg-[#0B0C10] border border-[#242634] focus:border-[#7D39EB] focus:outline-none text-xs text-white placeholder-slate-600 transition-colors"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-2.5 rounded-lg bg-[#C6FF33] hover:bg-[#B8F224] text-black text-xs font-bold flex items-center justify-center gap-2 transition-colors shadow-lg shadow-[#C6FF33]/20 mt-2"
          >
            가입 완료하기
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </form>

        <div className="pt-4 border-t border-[#242634] text-center text-xs text-slate-400">
          이미 계정이 있으신가요?{' '}
          <Link to="/login" className="text-[#7D39EB] font-semibold hover:underline">
            로그인하기
          </Link>
        </div>
      </div>

      <PlaceholderCard
        title="회원가입 프로세스 안내"
        description="가입 완료 시 개인 프로필(세부전공, 기술 스택, 주간 활동 가능 시간) 입력 단계로 연결됩니다."
        assignedRole="B (인증/DB) + A (온보딩 UI)"
      />
    </div>
  );
};
