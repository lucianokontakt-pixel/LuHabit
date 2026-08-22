import type { EmomStep, EmomTemplate } from "@/lib/emom";

async function json<T>(res: Response, fallback: string): Promise<T> {
  if (!res.ok) {
    const data = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(data?.error || fallback);
  }
  return (await res.json()) as T;
}

export type EmomInput = {
  name: string;
  prepareSeconds: number;
  rounds: number;
  steps: EmomStep[];
  restSeconds: number;
};

export async function fetchEmomTemplates(): Promise<EmomTemplate[]> {
  const res = await fetch("/api/training/emom");
  return (await json<{ templates: EmomTemplate[] }>(res, "Konnte Vorlagen nicht laden")).templates;
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
