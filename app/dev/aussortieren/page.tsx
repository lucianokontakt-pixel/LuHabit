import { notFound } from "next/navigation";
import { Aussortieren } from "./aussortieren";

/** Nur lokal erreichbar — dasselbe Muster wie app/dev/luecken. */
export default function Page() {
  if (process.env.NODE_ENV !== "development") notFound();
  return <Aussortieren />;
}
