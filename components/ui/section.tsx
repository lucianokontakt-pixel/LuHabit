import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/**
 * Eine Gruppe von Einstellungen: Titel, Inhalt, Fußnote.
 *
 * Die Fußnote ist ein eigener Platz und kein weiterer Absatz im Inhalt. Das
 * klingt nach einer Kleinigkeit, entscheidet aber darüber, ob Erklärtext überall
 * dieselbe Größe, denselben Abstand und denselben Ton hat — oder ob jede Gruppe
 * ihn ein bisschen anders schreibt. Sie darf entfallen, ohne dass das Layout
 * springt.
 */
export function Section({
  title,
  footer,
  children,
  className,
}: {
  title?: string;
  footer?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("flex flex-col gap-2", className)}>
      {title && <h2 className="px-1 text-sm font-medium text-muted-foreground">{title}</h2>}
      <Card className="gap-0 py-0">{children}</Card>
      {footer && <p className="px-1 text-[13px] text-muted-foreground">{footer}</p>}
    </section>
  );
}
