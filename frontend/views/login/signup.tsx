"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSignup } from "@/features/auth/hooks";
import { Layers } from "lucide-react";
import AuthInput from "@/components/ui/AuthInput";
import Select from "@/components/ui/Select";

export default function SignupView() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [mobileCarrier, setMobileCarrier] = useState("");
  const [passwordError, setPasswordError] = useState("");

  const confirmPasswordRef = useRef<HTMLInputElement>(null);
  const { mutate, isPending, isError } = useSignup();

  const handleSignup = (e: { preventDefault(): void }) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setPasswordError("비밀번호가 일치하지 않습니다.");
      confirmPasswordRef.current?.focus();
      return;
    }
    setPasswordError("");
    mutate(
      { email, password, name, phoneNumber, mobileCarrier },
      { onSuccess: () => router.push("/login") }
    );
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-10 dark:bg-gray-950">
      <div className="w-full max-w-sm">
        {/* 로고 */}
        <div className="mb-8 flex flex-col items-center gap-2">
          <div className="flex items-center gap-2">
            <Layers className="h-6 w-6 text-violet-600" />
            <span className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">
              SubLens
            </span>
          </div>
          <p className="text-sm text-gray-400 dark:text-gray-500">구독을 한눈에 관리하세요</p>
        </div>

        {/* 폼 카드 */}
        <form
          onSubmit={handleSignup}
          className="rounded-2xl border border-gray-100 bg-white p-8 shadow-sm dark:border-gray-800 dark:bg-gray-900"
        >
          <h1 className="mb-6 text-lg font-semibold text-gray-900 dark:text-white">회원가입</h1>

          <div className="flex flex-col gap-3">
            <AuthInput
              type="email"
              placeholder="이메일"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <AuthInput
              type="password"
              placeholder="비밀번호"
              className={passwordError ? "border-red-400 dark:border-red-500" : ""}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <AuthInput
              ref={confirmPasswordRef}
              type="password"
              placeholder="비밀번호 확인"
              className={passwordError ? "border-red-400 dark:border-red-500" : ""}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
            {passwordError && <p className="text-xs text-red-500">{passwordError}</p>}
            <AuthInput
              type="text"
              placeholder="이름"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
            <div className="flex gap-2">
              <div className="w-2/5">
                <Select
                  value={mobileCarrier}
                  onChange={setMobileCarrier}
                  placeholder="통신사"
                  options={[
                    { value: "SKT", label: "SKT" },
                    { value: "KT", label: "KT" },
                    { value: "LG U+", label: "LG U+" },
                    { value: "SKT 알뜰폰", label: "SKT 알뜰폰" },
                    { value: "KT 알뜰폰", label: "KT 알뜰폰" },
                    { value: "LG U+ 알뜰폰", label: "LG U+ 알뜰폰" },
                  ]}
                />
              </div>
              <div className="flex-1">
                <AuthInput
                  type="text"
                  placeholder="전화번호"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  required
                />
              </div>
            </div>
          </div>

          {isError && <p className="mt-3 text-sm text-red-500">회원가입에 실패했습니다.</p>}

          <button
            type="submit"
            disabled={isPending}
            className="mt-5 w-full cursor-pointer rounded-lg bg-violet-600 py-2.5 text-sm font-medium text-white transition-colors hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending ? "가입 중..." : "회원가입"}
          </button>

          <p className="mt-5 text-center text-sm text-gray-400 dark:text-gray-500">
            이미 계정이 있으신가요?{" "}
            <span
              onClick={() => router.push("/login")}
              className="cursor-pointer font-medium text-violet-600 hover:underline dark:text-violet-400"
            >
              로그인
            </span>
          </p>
        </form>
      </div>
    </div>
  );
}
