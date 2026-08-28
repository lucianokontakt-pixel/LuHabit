"use client";

import { useMemo, useState } from "react";
import { ChevronDown, TrendingDown, TrendingUp, Minus, Search } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SectionTabs } from "@/components/section-tabs";
import { STATISTIK_TABS } from "@/lib/nav-links";
import { ExerciseTrendChart } from "@/components/training/exercise-trend-chart";
import { ExerciseProgress } from "@/components/training/exercise-progress";
import { ExerciseDetail, ExerciseThumb } from "@/components/training/exercise-media";
import { useTraining } from "@/lib/training-store";
import { summarizeProgress, type ProgressSummary } from "@/lib/progression";
import { MUSCLES, workingSets, type Exercise, type Muscle } from "@/lib/training";
import { formatNumber, formatSigned, formatDateLong } from "@/lib/format";
import { cn } from "@/lib/utils";

const WINDOWS = [
  { weeks: 4, label: "4 Wochen" },
  { weeks: 8, label: "8 Wochen" },
  { weeks: 12, label: "12 Wochen" },
];

function ChangeBadge({ change, unit }: { change: number | null; unit: string }) {
  if (change === null) {
    return <span className="text-xs text-muted-foreground/60">—</span>;
  }
  const flat = Math.abs(change) < 0.01;
  return (
    <span
      className={cn(
        "flex items-center gap-1 text-xs nums",
        flat ? "text-muted-foreground" : change > 0 ? "text-success" : "text-muted-foreground"
      )}
    >
      {flat ? (
        <Minus className="size-3 shrink-0" />
      ) : change > 0 ? (
        <TrendingUp className="size-3 shrink-0" />
      ) : (
        <TrendingDown className="size-3 shrink-0" />
      )}
      {flat ? "±0" : formatSigned(change, 1)} {unit}
    </span>
  );
}

function ProgressRow({
  summary,
  onDetail,
}: {
  summary: ProgressSummary;
  onDetail: (exercise: ProgressSummary["exercise"]) => void;
}) {
  const [open, setOpen] = useState(false);
  const unit = summary.repsBased ? "Wdh" : "kg";
  const currentLabel = summary.repsBased
    ? `${summary.currentReps} Wdh`
    : `${formatNumber(summary.current)} kg`;

  return (
    <div className="border-b border-border last:border-0">
      <div className="flex items-center gap-3 py-3">
        {/* Eigener Knopf: die Zeile klappt den Verlauf auf, das Bild zeigt die
            Übung — zwei Absichten, zwei Ziele. Wie im Plan-Editor. */}
        <button
          type="button"
          onClick={() => onDetail(summary.exercise)}
          aria-label={`${summary.exercise.name} ansehen`}
          className="shrink-0 rounded-md transition-opacity hover:opacity-80"
        >
          <ExerciseThumb exercise={summary.exercise} className="size-9" />
        </button>

        <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex min-w-0 flex-1 items-center gap-3 text-left"
      >
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            {/* Umbrechen statt abschneiden — sonst fällt das Gerät am Ende weg,
                und genau das unterscheidet die Übung von ihren Geschwistern. */}
            <span className="line-clamp-2 text-sm font-medium">{summary.exercise.name}</span>
            {summary.stagnating && (
              <span className="shrink-0 rounded-pill bg-blush px-2 py-0.5 text-[10px] font-medium text-blush-foreground">
                stagniert
              </span>
            )}
          </span>
          <span className="mt-0.5 block truncate text-xs text-muted-foreground">
            {currentLabel} · {summary.points.length}{" "}
            {summary.points.length === 1 ? "Einheit" : "Einheiten"}
            {summary.lastDate ? ` · zuletzt ${formatDateLong(summary.lastDate)}` : ""}
          </span>
        </span>

        <span className="hidden shrink-0 gap-4 sm:flex">
          {WINDOWS.map((w) => (
            <span key={w.weeks} className="w-20 text-right">
              <ChangeBadge change={summary.changeIn(w.weeks)} unit={unit} />
            </span>
          ))}
        </span>

        <span className="shrink-0 sm:hidden">
          <ChangeBadge change={summary.changeIn(4)} unit={unit} />
        </span>

          <ChevronDown
            className={cn(
              "size-4 shrink-0 text-muted-foreground transition-transform",
              open && "rotate-180"
            )}
          />
        </button>
      </div>

      {open && (
        <div className="pb-4">
          <div className="mb-3 flex flex-wrap gap-x-6 gap-y-2 sm:hidden">
            {WINDOWS.map((w) => (
              <span key={w.weeks} className="flex items-center gap-2">
                <span className="text-[11px] text-muted-foreground">{w.label}</span>
                <ChangeBadge change={summary.changeIn(w.weeks)} unit={unit} />
              </span>
            ))}
          </div>
          <ExerciseTrendChart points={summary.points} repsBased={summary.repsBased} />
        </div>
      )}
    </div>
  );
}

export default function ProgressionPage() {
  const { exercises, sessions, exerciseById, loading } = useTraining();
  const [query, setQuery] = useState("");
  const [muscle, setMuscle] = useState<Muscle | "all">("all");
  const [sort, setSort] = useState<"activity" | "stagnating" | "gain">("activity");

  const summaries = useMemo(() => {
    const trainedIds = new Set<string>();
    for (const session of sessions) {
      for (const set of workingSets(session.sets)) trainedIds.add(set.exerciseId);
    }
    return exercises
      .filter((e) => trainedIds.has(e.id))
      .map((e) => summarizeProgress(e, sessions));
  }, [exercises, sessions]);

  const [detail, setDetail] = useState<Exercise | null>(null);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = summaries
      .filter((s) => (muscle === "all" ? true : s.exercise.muscle === muscle))
      .filter((s) => (q ? s.exercise.name.toLowerCase().includes(q) : true));

    return [...filtered].sort((a, b) => {
      if (sort === "stagnating") {
        if (a.stagnating !== b.stagnating) return a.stagnating ? -1 : 1;
        return b.sessionsSinceGain - a.sessionsSinceGain;
      }
      if (sort === "gain") {
        return (b.changeIn(12) ?? -Infinity) - (a.changeIn(12) ?? -Infinity);
      }
      return (b.lastDate ?? "").localeCompare(a.lastDate ?? "");
    });
  }, [summaries, query, muscle, sort]);

  const grouped = useMemo(() => {
    const map = new Map<Muscle, ProgressSummary[]>();
    for (const s of visible) {
      const list = map.get(s.exercise.muscle) ?? [];
      list.push(s);
      map.set(s.exercise.muscle, list);
    }
    return MUSCLES.map((m) => ({ key: m.key, label: m.label, items: map.get(m.key) ?? [] })).filter(
      (g) => g.items.length > 0
    );
  }, [visible]);

  const stagnatingCount = summaries.filter((s) => s.stagnating).length;

  return (
    <div className="flex flex-col gap-5">
      <div>
        <p className="text-sm text-muted-foreground">Wo du wächst — und wo es klemmt</p>
        <h1 className="font-display text-4xl leading-tight tracking-tight sm:text-heading">
          Je Übung
        </h1>
      </div>

      <SectionTabs tabs={STATISTIK_TABS} />

      {loading ? (
        <div className="h-64 animate-pulse rounded-card bg-card" />
      ) : summaries.length === 0 ? (
        <Card className="gap-0">
          <p className="px-(--card-spacing) text-sm text-muted-foreground">
            Noch keine Übung protokolliert. Nach ein paar Einheiten steht hier, welche Übung
            steigt und welche stehen bleibt.
          </p>
        </Card>
      ) : (
        <>
          {stagnatingCount > 0 && (
            <Card variant="blush" className="gap-0">
              <p className="px-(--card-spacing) text-sm">
                {stagnatingCount === 1
                  ? "Eine Übung steht seit mindestens 3 Einheiten still."
                  : `${stagnatingCount} Übungen stehen seit mindestens 3 Einheiten still.`}{" "}
                Im Training bekommst du dort einen Deload vorgeschlagen.
              </p>
            </Card>
          )}

          <div className="flex flex-col gap-3">
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Übung filtern"
                className="pl-10"
              />
            </div>

            <Tabs value={sort} onValueChange={(v) => setSort(v as typeof sort)}>
              <TabsList>
                <TabsTrigger value="activity">Zuletzt</TabsTrigger>
                <TabsTrigger value="gain">Stärkster Zuwachs</TabsTrigger>
                <TabsTrigger value="stagnating">Stagniert</TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1">
              <button
                type="button"
                onClick={() => setMuscle("all")}
                className={cn(
                  "shrink-0 rounded-pill px-3 py-1.5 text-xs transition-colors",
                  muscle === "all"
                    ? "bg-primary text-primary-foreground"
                    : "bg-card text-muted-foreground hover:text-foreground"
                )}
              >
                Alle
              </button>
              {MUSCLES.filter((m) => summaries.some((s) => s.exercise.muscle === m.key)).map(
                (m) => (
                  <button
                    key={m.key}
                    type="button"
                    onClick={() => setMuscle(muscle === m.key ? "all" : m.key)}
                    className={cn(
                      "shrink-0 rounded-pill px-3 py-1.5 text-xs transition-colors",
                      muscle === m.key
                        ? "bg-primary text-primary-foreground"
                        : "bg-card text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {m.label}
                  </button>
                )
              )}
            </div>
          </div>

          {visible.length === 0 ? (
            <Card className="gap-0">
              <p className="px-(--card-spacing) text-sm text-muted-foreground">
                Keine Übung passt zu diesen Filtern.
              </p>
            </Card>
          ) : sort === "activity" ? (
            <div className="flex flex-col gap-4">
              {grouped.map((group) => (
                <Card key={group.key} className="gap-1">
                  <div className="flex items-baseline justify-between px-(--card-spacing)">
                    <h2 className="text-subheading font-display">{group.label}</h2>
                    <span className="hidden shrink-0 gap-4 text-[11px] text-muted-foreground sm:flex">
                      {WINDOWS.map((w) => (
                        <span key={w.weeks} className="w-20 text-right">
                          {w.label}
                        </span>
                      ))}
                      <span className="w-4" />
                    </span>
                  </div>
                  <div className="flex flex-col px-(--card-spacing)">
                    {group.items.map((summary) => (
                      <ProgressRow key={summary.exercise.id} summary={summary} onDetail={setDetail} />
                    ))}
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="gap-1">
              <div className="flex items-baseline justify-between px-(--card-spacing)">
                <h2 className="text-subheading font-display">
                  {sort === "gain" ? "Stärkster Zuwachs" : "Stagniert am längsten"}
                </h2>
                <span className="hidden shrink-0 gap-4 text-[11px] text-muted-foreground sm:flex">
                  {WINDOWS.map((w) => (
                    <span key={w.weeks} className="w-20 text-right">
                      {w.label}
                    </span>
                  ))}
                  <span className="w-4" />
                </span>
              </div>
              <div className="flex flex-col px-(--card-spacing)">
                {visible.map((summary) => (
                  <ProgressRow key={summary.exercise.id} summary={summary} onDetail={setDetail} />
                ))}
              </div>
            </Card>
          )}

          <p className="text-xs text-muted-foreground">
            Angezeigt wird das Arbeitsgewicht (der schwerste Satz einer Einheit). Übungen ohne
            Zusatzgewicht wie Klimmzüge werden in Wiederholungen gemessen.
          </p>

          {/* Eine Übung im Detail, mit dem geschätzten Maximum daneben. Steht
              hier statt in der Statistik, damit alles Übungsbezogene
              beieinander liegt. */}
          <ExerciseProgress sessions={sessions} exerciseById={exerciseById} />
        </>
      )}
      <ExerciseDetail exercise={detail} onOpenChange={(o) => !o && setDetail(null)} />
    </div>
  );
}
