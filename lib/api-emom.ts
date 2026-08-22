import type { EmomStep, EmomTemplate } from "@/lib/emom";
import { readAll } from "@/lib/local-db";
import { ensureLocalData, syncSoon } from "@/lib/sync";

/**
 * Antwort eines Schreibvorgangs auswerten. Seit die Lesepfade lokal laufen,
 * kommt hier nur noch Schreibendes durch — deshalb zieht ein Erfolg gleich den
 * lokalen Bestand nach.
 */
async function json<T>(res: Response, fallback: string): Promise<T> {
  if (!res.ok) {
    const data = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(data?.error || fallback);
  }
  const parsed = (await res.json()) as T;
  syncSoon();
  return parsed;
}

export type EmomInput = {
  name: string;
  prepareSeconds: number;
  rounds: number;
  steps: EmomStep[];
  restSeconds: number;
};

export async function fetchEmomTemplates(): Promise<EmomTemplate[]> {
  await ensureLocalData();
  return readAll<EmomTemplate>("emom");
}

export async function createEmomTemplate(params: EmomInput): Promise<EmomTemplate[]> {
  const res = await fetch("/api/training/emom", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  return (await json<{ templates: EmomTemplate[] }>(res, "Konnte Vorlage nicht anlegen")).templates;
}

export async function updateEmomTemplate(
  params: EmomInput & { id: string }
): Promise<EmomTemplate[]> {
  const res = await fetch("/api/training/emom", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  return (await json<{ templates: EmomTemplate[] }>(res, "Konnte Vorlage nicht speichern")).templates;
}

export async function deleteEmomTemplate(id: string): Promise<EmomTemplate[]> {
  const res = await fetch(`/api/training/emom?id=${encodeURIComponent(id)}`, { method: "DELETE" });
  return (await json<{ templates: EmomTemplate[] }>(res, "Konnte Vorlage nicht löschen")).templates;
}
