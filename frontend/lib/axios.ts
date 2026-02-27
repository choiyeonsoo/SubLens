import axios from "axios";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const { code } = error.response?.data ?? {};

    if (code === "TOKEN_EXPIRED") {
      console.log("토큰 만료됨 → refresh 시도");
      // refresh API 호출
    }

    if (code === "INVALID_SIGNATURE") {
      console.log("위조 토큰");
    }

    return Promise.reject(error);
  }
);

export default api;
