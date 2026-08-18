"use client";

import { use } from "react";
import { useHabitRegistry } from "@/lib/habit-registry";
import { HabitDetail } from "@/components/habit-detail";

export default function CustomHabitPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { habits, loading } = useHabitRegistry();
  const config = habits[id];

  if (loading) {
    return <div className="h-40 animate-pulse rounded-xl bg-muted" />;
  }

  if (!config) {
    return <p className="text-sm text-muted-foreground">Dieses Ziel wurde nicht gefunden.</p>;
  }

  return <HabitDetail habit={id} config={config} />;
}
