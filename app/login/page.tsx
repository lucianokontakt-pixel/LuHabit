import { Suspense } from "react";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  // Ob überhaupt ein Login angeboten wird, entscheidet die Server-
  // Konfiguration — der Client soll darüber nicht raten müssen.
  const googleEnabled = Boolean(process.env.GOOGLE_CLIENT_ID);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <Suspense>
        <LoginForm googleEnabled={googleEnabled} />
      </Suspense>
    </div>
  );
}
