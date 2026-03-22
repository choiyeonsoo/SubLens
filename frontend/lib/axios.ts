import axios from "axios";
import { toast } from "sonner";

export interface ApiError {
  success: false;
  code: string;
  message: string;
  data: null;
}

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

type QueueItem = { resolve: () => void; reject: (err: unknown) => void };

let isRefreshing = false;
let failedQueue: QueueItem[] = [];

const drainQueue = (error: unknown) => {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error);
    else resolve();
  });
  failedQueue = [];
};

const excludedUrls = [
  "/api/auth/login",
  "/api/auth/signup",
  "/api/auth/reissue",
  "/api/auth/logout",
];

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (originalRequest?._retry) {
      return Promise.reject(error);
    }

    if (excludedUrls.some((url) => originalRequest?.url?.includes(url))) {
      return Promise.reject(error);
    }

    if (error.response?.status === 401) {
      // reissue 진행 중이면 큐에 대기
      if (isRefreshing) {
        return new Promise<void>((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(() => api(originalRequest))
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        await plainApi.post("/api/auth/reissue");
        isRefreshing = false;
        drainQueue(null);
        return api(originalRequest);
      } catch (refreshError) {
        isRefreshing = false;
        drainQueue(refreshError);
        await plainApi.post("/api/auth/logout").catch(() => {});
        if (window.location.pathname !== "/login") {
          window.location.href = "/login";
        }
        return Promise.reject(refreshError);
      }
    }

    // 401이 아닌 에러: ApiError 파싱 후 Toast 표시
    if (error.response?.status !== 401) {
      const apiError = error.response?.data as ApiError | undefined;
      toast.error(apiError?.message ?? "요청 처리 중 오류가 발생했습니다.");
    }

    return Promise.reject(error);
  }
);

export { plainApi };
export default api;
