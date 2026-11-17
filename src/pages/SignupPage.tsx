import React from 'react';
import { Navigate } from 'react-router-dom';

// 최신 기획: 별도의 이메일/비밀번호 회원가입은 제거되었으며 경북대학교 Google OAuth 간편 로그인으로 통합되었습니다.
export const SignupPage: React.FC = () => {
  return <Navigate to="/login" replace />;
};
