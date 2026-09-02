import { cn } from "@/lib/utils";

/**
 * Die Überschrift einer Seite, mit der Zeile darüber.
 *
 * Der Klassensatz stand zehnmal im Code — und war schon dreimal
 * auseinandergelaufen: sechs Seiten mit `sm:text-heading`, drei ohne, eine als
 * Eingabefeld. Genau so verliert eine App ihre Form, ohne dass jemand eine
 * Entscheidung getroffen hätte.
 *
 * Die kleine Zeile darüber ist kein Untertitel, sondern eine Einordnung: sie
 * steht VOR dem Namen, weil man beim Aufschlagen wissen will, wo man gelandet
 * ist, bevor man liest, wie es heißt.
 */
export function PageTitle({
  eyebrow,
  children,
  className,
}: {
  eyebrow?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      {eyebrow && <p className="text-sm text-muted-foreground">{eyebrow}</p>}
      <h1 className={cn(TITLE_CLASS, "sm:text-heading")}>{children}</h1>
    </div>
  );
}

/**
 * Derselbe Satz für die Stellen, die kein <h1> setzen können — der Plan-Editor
 * schreibt seinen Titel in ein Eingabefeld.
 */
export const TITLE_CLASS = "font-display text-4xl leading-tight tracking-tight";
