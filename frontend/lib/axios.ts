import axios from "axios";

// 🔹 일반 API 인스턴스 (인터셉터 있음)
const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

// 🔹 인터셉터 없는 인스턴스 (refresh / logout 전용)
const plainApi = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL,
  withCredentials: true,
});

let isRefreshing = false;

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // 🔒 이미 재시도한 요청이면 그냥 실패
    if (originalRequest?._retry) {
      return Promise.reject(error);
    }

    // 🔒 인증 관련 API는 인터셉터 개입 금지
    const excludedUrls = [
      "/api/auth/login",
      "/api/auth/signup",
      "/api/auth/reissue",
      "/api/auth/logout",
    ];

    if (excludedUrls.some((url) => originalRequest?.url?.includes(url))) {
      return Promise.reject(error);
    }

    // 🔥 401이면 Access 만료로 간주
    if (error.response?.status === 401 && !isRefreshing) {
      originalRequest._retry = true;
      isRefreshing = true;

      try {
        await plainApi.post("/api/auth/reissue");

        isRefreshing = false;

        return api(originalRequest);
      } catch (refreshError) {
        isRefreshing = false;

        await plainApi.post("/api/auth/logout").catch(() => {});

        // 이미 /login 이면 재이동 금지 (무한 루프 방지)
        if (window.location.pathname !== "/login") {
          window.location.href = "/login";
        }

        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export { plainApi };
export default api;
