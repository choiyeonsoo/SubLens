'use client';
import api from "@/lib/axios";
import { useQuery } from "@tanstack/react-query";

export default function DashBoard() {

  const { data: user, isLoading, refetch } = useQuery({
    queryKey: ["me"],
    queryFn: async () => {
      const res = await api.get("/api/auth/me");
      return res.data;
    },
    retry: false,
  });
  if (isLoading) return <div>로딩 중...</div>;

  const handleLogout = async () => {
    await api.post("/api/auth/logout");
    refetch();
  };
  return (
    <div>
      <h1>Dashboard</h1>
      <p>{user?.email}</p>

      <button onClick={handleLogout}>로그아웃</button>
    </div>
  );
}