
import React, { useState } from 'react';
import { ArrowRight, Mail } from 'lucide-react';
import { supabase } from '../lib/supabase';

export const LoginPage: React.FC = () => {
  const [schoolId, setSchoolId] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedId = schoolId.trim();

    if (!trimmedId) {
      alert('학교 이메일 아이디를 입력해 주세요.');
      return;
    }

    // 이메일 주소 전체를 입력하지 않도록 검사
    if (trimmedId.includes('@') || /\s/.test(trimmedId)) {
      alert('이메일 아이디만 입력해 주세요.');
      return;
    }

    const email = `${trimmedId}@knu.ac.kr`;

    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          queryParams: {
            login_hint: email,
          },
        },
      });

      if (error) {
        alert(`Google 로그인 요청 실패: ${error.message}`);
        setLoading(false);
      }
    } catch (error) {
      console.error('Google 로그인 오류:', error);
      alert('로그인 중 오류가 발생했습니다.');
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-black text-white tracking-tight">
          BRIDGE 로그인
        </h2>
        <p className="text-xs text-slate-400 mt-1.5">
          경북대학교 컴퓨터학부 학교 계정으로 로그인하세요.
        </p>
      </div>

      <div className="bg-[#13141C] border border-[#242634] rounded-2xl p-6 sm:p-8 space-y-5">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              학교 이메일
            </label>

            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                <input
                  type="text"
                  placeholder="이메일 아이디"
                  value={schoolId}
                  onChange={(e) => setSchoolId(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-lg bg-[#0B0C10] border border-[#242634] focus:border-[#7D39EB] focus:outline-none text-xs text-white placeholder-slate-600 transition-colors"
                  required
                />
              </div>

              <span className="text-xs text-slate-300 whitespace-nowrap">
                @knu.ac.kr
              </span>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-lg bg-[#7D39EB] hover:bg-[#6025C5] disabled:opacity-50 text-white text-xs font-bold flex items-center justify-center gap-2 transition-colors shadow-lg shadow-[#7D39EB]/30 mt-2"
          >
            {loading ? 'Google 로그인으로 이동 중...' : '로그인하기'}
            {!loading && <ArrowRight className="w-3.5 h-3.5" />}
          </button>
        </form>

        <p className="pt-4 border-t border-[#242634] text-center text-xs text-slate-400">
          Google 공식 인증 화면에서 학교 계정 비밀번호를 입력합니다.
        </p>
      </div>
    </div>
  );
};
