import { Suspense } from "react";
import ResetPasswordView from "@/views/reset-password/ResetPassword";

export default function LoginPage() {
  return (
    <Suspense>
      <ResetPasswordView />
    </Suspense>
  );
}
