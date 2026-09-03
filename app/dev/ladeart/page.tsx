import { notFound } from "next/navigation";
import { LadeartAbgleich } from "./ladeart-abgleich";

/**
 * Nur lokal erreichbar (siehe app/api/dev/ladeart/route.ts) — im Deploy
 * bricht schon diese Seite ab, bevor der Client überhaupt lädt.
 */
export default function Page() {
  if (process.env.NODE_ENV !== "development") notFound();
  return <LadeartAbgleich />;
}
