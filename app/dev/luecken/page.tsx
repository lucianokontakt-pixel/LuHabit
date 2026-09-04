import { notFound } from "next/navigation";
import { LueckenSchliessen } from "./luecken-schliessen";

/** Nur lokal erreichbar (siehe app/api/dev/katalog/route.ts). */
export default function Page() {
  if (process.env.NODE_ENV !== "development") notFound();
  return <LueckenSchliessen />;
}
