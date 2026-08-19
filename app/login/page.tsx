import { Suspense } from "react";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  // Welche Wege angeboten werden, entscheidet die Server-Konfiguration —
  // der Client soll darüber nicht raten müssen.
  const googleEnabled = Boolean(process.env.GOOGLE_CLIENT_ID);
  const passcodeEnabled = Boolean(process.env.APP_PASSCODE);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <Suspense>
        <LoginForm googleEnabled={googleEnabled} passcodeEnabled={passcodeEnabled} />
      </Suspense>
    </div>
  );
}
