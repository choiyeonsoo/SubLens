"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import RequestStep from "./RequestStep";
import SentStep from "./SentStep";
import ResetStep from "./ResetStep";
import SuccessStep from "./SuccessStep";
import { useValidateToken } from "@/features/auth/hooks";
import InvalidStep from "./InvalidStep";
export default function ResetPasswordPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [step, setStep] = useState<"request" | "sent" | "reset" | "success" | "invalid">(
    token ? "reset" : "request"
  );

  const { data, isSuccess, isError, isLoading } = useValidateToken(token);

  useEffect(() => {
    if (isSuccess) setStep("reset");
    if (isError) setStep("invalid");
  }, [isSuccess, isError]);
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100">
      <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-md">
        {step === "request" && <RequestStep onNext={() => setStep("sent")} />}
        {step === "sent" && <SentStep />}
        {step === "reset" && <ResetStep token={token!} onSuccess={() => setStep("success")} />}
        {step === "invalid" && <InvalidStep />}
        {step === "success" && <SuccessStep />}
      </div>
    </div>
  );
}
