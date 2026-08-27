import { Suspense } from "react";
import { SessionClient } from "./session-client";

export default function SessionPage() {
  return (
    <Suspense fallback={<div className="h-72 animate-pulse rounded-card bg-card" />}>
      <SessionClient />
    </Suspense>
  );
}
