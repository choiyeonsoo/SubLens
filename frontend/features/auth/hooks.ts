import { useMutation, useQuery } from "@tanstack/react-query";
import { login, requestPasswordReset, resetPassword, signup, validateToken } from "./api";

export const useLogin = () => {
  return useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      login(email, password),
  });
};

export const useSignup = () => {
  return useMutation({
    mutationFn: ({
      email,
      password,
      name,
      phoneNumber,
      mobileCarrier,
    }: {
      email: string;
      password: string;
      name: string;
      phoneNumber: string;
      mobileCarrier: string;
    }) => signup(email, password, name, phoneNumber, mobileCarrier),
  });
};

export const useResetPassword = () => {
  return useMutation({
    mutationFn: ({ token, password }: { token: string; password: string }) =>
      resetPassword(token, password),
  });
};

export const useValidateToken = (token: string | null) => {
  return useQuery({
    queryKey: ["validateToken", token],
    queryFn: () => validateToken(token!),
    enabled: !!token,
    retry: false,
  });
};

export const useRequestPasswordReset = () => {
  return useMutation({
    mutationFn: (email: string) => requestPasswordReset(email),
  });
};
