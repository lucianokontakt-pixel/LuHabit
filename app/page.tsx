import { redirect } from "next/navigation";

/**
 * Übergangsweise: das Dashboard bestand fast nur aus Habits und ist mit ihnen
 * weggefallen. In der nächsten Phase zieht die Trainings-Übersicht hierher, dann
 * verschwindet diese Weiterleitung wieder.
 */
export default function Home() {
  redirect("/training");
}
