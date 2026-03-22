"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Layers } from "lucide-react";
import { useValidateToken } from "@/features/auth/hooks";
import RequestStep from "./RequestStep";
import SentStep from "./SentStep";
import ResetStep from "./ResetStep";
import SuccessStep from "./SuccessStep";
import InvalidStep from "./InvalidStep";

export default function ResetPasswordPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [step, setStep] = useState<"request" | "sent" | "reset" | "success" | "invalid">(
    token ? "reset" : "request"
  );

  const { isSuccess, isError } = useValidateToken(token);

  useEffect(() => {
    if (isSuccess) setStep("reset");
    if (isError) setStep("invalid");
  }, [isSuccess, isError]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 dark:bg-gray-950">
      <div className="w-full max-w-sm">
        {/* 로고 */}
        <div className="mb-8 flex flex-col items-center gap-2">
          <div className="flex items-center gap-2">
            <Layers className="h-6 w-6 text-violet-600" />
            <span className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">
              SubLens
            </span>
          </div>
        </div>

        {/* 카드 */}
        <div className="rounded-2xl border border-gray-100 bg-white p-8 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          {step === "request" && <RequestStep onNext={() => setStep("sent")} />}
          {step === "sent" && <SentStep />}
          {step === "reset" && <ResetStep token={token!} onSuccess={() => setStep("success")} />}
          {step === "invalid" && <InvalidStep />}
          {step === "success" && <SuccessStep />}
        </div>
      </div>
    </div>
  );
}
