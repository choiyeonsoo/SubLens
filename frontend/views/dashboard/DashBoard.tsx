"use client";
import api from "@/lib/axios";
import { useAuthStore } from "@/store/useAuthStore";

export default function DashBoard() {
  const { user, isLoading, setUser } = useAuthStore();

  if (isLoading) return <div>로딩 중...</div>;
  const handleLogout = async () => {
    await api.post("/api/auth/logout");
    setUser(null);
  };
  return (
    <div>
      <h1>Dashboard</h1>
      <p>{user?.email}</p>

      <button onClick={handleLogout}>로그아웃</button>
    </div>
  );
}
