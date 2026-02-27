import api from "@/lib/axios";

export const login = async (email: string, password: string) => {
  const response = await api.post("/api/auth/login", {
    email,
    password,
  });

  return response.data;
};
export const signup = async (email: string, password: string, name: string, phoneNumber: string) => {
  const response = await api.post("/api/auth/signup", {
    email,
    password,
    name,
    phoneNumber,
  });
  return response.data;
};