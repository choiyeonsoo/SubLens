"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSignup } from "@/features/auth/hooks";

export default function SignupView() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");

  const [passwordError, setPasswordError] = useState("");

  const passwordRef = useRef<HTMLInputElement>(null);
  const confirmPasswordRef = useRef<HTMLInputElement>(null);

  const { mutate, isPending, isError } = useSignup();

  const handleSignup = (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      setPasswordError("비밀번호가 일치하지 않습니다.");
      confirmPasswordRef.current?.focus(); // 🔥 에러 포커스 이동
      return;
    }
    setPasswordError("");
    mutate(
      { email, password, name, phoneNumber },
      {
        onSuccess: () => {
          router.push("/login");
        },
      }
    );
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100">
      <form
        onSubmit={handleSignup}
        className="w-full max-w-md rounded-lg bg-white p-8 shadow-md"
      >
        <h1 className="mb-6 text-2xl font-bold">회원가입</h1>

        <input
          type="email"
          placeholder="이메일"
          className="mb-4 w-full rounded border p-2"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <input
          ref={passwordRef}
          type="password"
          placeholder="비밀번호"
          className={`mb-2 w-full rounded border p-2 ${
            passwordError ? "border-red-500" : ""
          }`}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        <input
          ref={confirmPasswordRef}
          type="password"
          placeholder="비밀번호 확인"
          className={`mb-2 w-full rounded border p-2 ${
            passwordError ? "border-red-500" : ""
          }`}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
        />

        {passwordError && (
          <p className="mb-4 text-sm text-red-500">{passwordError}</p>
        )}

        <input
          type="text"
          placeholder="이름"
          className="mb-4 w-full rounded border p-2"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />

        <input
          type="text"
          placeholder="전화번호"
          className="mb-4 w-full rounded border p-2"
          value={phoneNumber}
          onChange={(e) => setPhoneNumber(e.target.value)}
          required
        />

        {isError && (
          <p className="mb-4 text-sm text-red-500">
            회원가입에 실패했습니다.
          </p>
        )}

        <button
          type="submit"
          disabled={isPending}
          className="w-full rounded bg-black py-2 text-white hover:bg-gray-800 disabled:opacity-50"
        >
          {isPending ? "가입 중..." : "회원가입"}
        </button>

        <div className="mt-4 text-center text-sm">
          이미 계정이 있으신가요?{" "}
          <span
            onClick={() => router.push("/login")}
            className="cursor-pointer font-semibold text-blue-600 hover:underline"
          >
            로그인
          </span>
        </div>
      </form>
    </div>
  );
}