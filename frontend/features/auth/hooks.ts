import { useMutation } from "@tanstack/react-query";
import { login, signup } from "./api";

export const useLogin = () => {
  return useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      login(email, password),
  });
};

export const useSignup = () => {
  return useMutation({
    mutationFn: ({ email, password, name, phoneNumber }: { email: string; password: string; name: string; phoneNumber: string }) =>
      signup(email, password, name, phoneNumber),
  });
};