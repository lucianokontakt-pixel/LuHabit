import { Suspense } from "react";
import { SessionClient } from "./session-client";
import { Skeleton } from "@/components/ui/skeleton";

export default function SessionPage() {
  return (
    <Suspense fallback={<Skeleton className="h-72" />}>
      <SessionClient />
    </Suspense>
  );
}
