"use client";

import { useMemo } from "react";
import { Weight, Percent, Ruler } from "lucide-react";
import { Card } from "@/components/ui/card";
import { MetricSection } from "@/components/metric-section";
import { MuscleMap } from "@/components/koerper/muscle-map";
import { MuscleGrid } from "@/components/koerper/muscle-grid";
import { BodyProfileForm } from "@/components/koerper/body-profile-form";
import { StatValue } from "@/components/stat-value";
import { SectionTabs } from "@/components/section-tabs";
import { STATISTIK_TABS } from "@/lib/nav-links";
import { useMetricData } from "@/lib/use-metric-data";
import { useTraining } from "@/lib/training-store";
import { muscleProgress } from "@/lib/muscle-stats";
import { isoDateDaysAgo } from "@/lib/datum";
import {
  useBodyProfile,
  bodyMassIndex,
  bmiCategory,
  isPlausibleHeight,
} from "@/lib/body-profile";
import { formatNumber } from "@/lib/format";

export default function StatistikKoerperPage() {
  const { entries: weightEntries } = useMetricData("weight");
  const { entries: fatEntries } = useMetricData("bodyfat");
  const { profile } = useBodyProfile();
  const { sessions, exerciseById } = useTraining();

  // Die Karte und der Korridor zeigen die letzten 30 Tage — lang genug, dass
  // eine ausgefallene Woche nicht gleich wie ein Defizit aussieht, kurz genug,
  // dass eine Umstellung des Plans sichtbar wird.
  const recentSessions = useMemo(() => {
    const from = isoDateDaysAgo(29);
    return sessions.filter((s) => s.date >= from);
  }, [sessions]);

  const progress = useMemo(
    () => muscleProgress(sessions, exerciseById, 12, new Date(), weightEntries),
    [sessions, exerciseById, weightEntries]
  );

  const latestWeight = weightEntries[weightEntries.length - 1]?.value;
  const latestFat = fatEntries[fatEntries.length - 1]?.value;
  const height = Number(profile.height);
  const bmi = latestWeight ? bodyMassIndex(latestWeight, height) : null;

  // Fettmasse und fettfreie Masse ergeben sich aus Gewicht × KFA.
  const fatMass = latestWeight && latestFat ? (latestWeight * latestFat) / 100 : null;
  const leanMass = latestWeight && fatMass !== null ? latestWeight - fatMass : null;

  return (
    <div className="flex flex-col gap-5">
      <div>
        <p className="text-sm text-muted-foreground">Werte &amp; Muskelverteilung</p>
        <h1 className="font-display text-4xl leading-tight tracking-tight sm:text-heading">
          Körper
        </h1>
      </div>

      <SectionTabs tabs={STATISTIK_TABS} />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card size="sm" className="gap-0">
          <div className="px-(--card-spacing)">
            <StatValue
              label="Gewicht"
              value={latestWeight ? formatNumber(latestWeight) : "—"}
              unit={latestWeight ? "kg" : undefined}
            />
          </div>
        </Card>
        <Card size="sm" className="gap-0">
          <div className="px-(--card-spacing)">
            <StatValue
              label="Körperfett"
              value={latestFat ? formatNumber(latestFat) : "—"}
              unit={latestFat ? "%" : undefined}
            />
          </div>
        </Card>
        <Card size="sm" className="gap-0">
          <div className="px-(--card-spacing)">
            <StatValue
              label="Fettfreie Masse"
              value={leanMass !== null ? formatNumber(Math.round(leanMass * 10) / 10) : "—"}
              unit={leanMass !== null ? "kg" : undefined}
            />
          </div>
        </Card>
        <Card size="sm" className="gap-0">
          <div className="px-(--card-spacing)">
            <StatValue
              label="BMI"
              value={bmi !== null ? formatNumber(Math.round(bmi * 10) / 10) : "—"}
            />
            {bmi !== null ? (
              <p className="mt-1 text-[11px] text-muted-foreground">{bmiCategory(bmi)}</p>
            ) : (
              <p className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground">
                <Ruler className="size-3 shrink-0" />
                {height > 0 && !isPlausibleHeight(height)
                  ? "Größe prüfen"
                  : "Größe unten eintragen"}
              </p>
            )}
          </div>
        </Card>
      </div>

      <MetricSection
        metric="weight"
        label="Gewicht"
        unit="kg"
        icon={Weight}
        step={0.1}
        direction="down-good"
      />
      <MetricSection
        metric="bodyfat"
        label="Körperfettanteil"
        unit="%"
        icon={Percent}
        step={0.1}
        direction="down-good"
      />

      {/* Wo die Sätze hingingen — welche Gruppe bekommt Arbeit, nicht wie viel
          Gewicht insgesamt bewegt wurde. */}
      <MuscleMap
        sessions={recentSessions}
        exerciseById={exerciseById}
        caption="Letzte 30 Tage"
      />

      <div className="flex flex-col gap-2">
        <div>
          <h2 className="text-subheading font-display">Sätze pro Woche</h2>
          <p className="text-sm text-muted-foreground">
            Letzte 12 Wochen gegen den Korridor, in dem Muskelaufbau zuverlässig
            stattfindet.
          </p>
        </div>
        <MuscleGrid progress={progress} />
      </div>

      <BodyProfileForm />
    </div>
  );
}
