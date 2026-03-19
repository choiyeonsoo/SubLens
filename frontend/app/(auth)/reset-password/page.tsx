import { Suspense } from "react";
import ResetPasswordView from "@/views/login/ResetPassword";

export default function LoginPage() {
  return (
    <Suspense>
      <ResetPasswordView />
    </Suspense>
  );
}
