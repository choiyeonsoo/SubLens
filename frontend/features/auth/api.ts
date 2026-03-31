import api from "@/lib/axios";

// 로그인
export const login = async (email: string, password: string) => {
  const response = await api.post("/api/auth/login", {
    email,
    password,
  });

  return response.data;
};

// 회원가입
export const signup = async (
  email: string,
  password: string,
  name: string,
  phoneNumber: string,
  mobileCarrier: string
) => {
  const response = await api.post("/api/auth/signup", {
    email,
    password,
    name,
    phoneNumber,
    mobileCarrier,
  });
  return response.data;
};

// 비밀번호 재설정
export const resetPassword = async (token: string, password: string) => {
  const response = await api.post("/api/auth/reset-password", {
    token,
    password,
  });
  return response.data;
};

// 비밀번호 재설정 토큰 유효성 검사
export const validateToken = async (token: string) => {
  const response = await api.get(`/api/auth/validate-token?token=${token}`);
  return response.data;
};

/** 비밀번호 재설정용 토큰 발행 요청 (이메일로 링크 발송) */
export const requestPasswordReset = async (email: string) => {
  const response = await api.post("/api/auth/request-reset", { email });
  return response.data;
};
