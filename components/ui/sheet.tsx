"use client";

import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";

import { cn } from "@/lib/utils";

/**
 * Blatt, das von unten hochfährt. Für kurze Eingaben unterwegs: es steht dort,
 * wo der Daumen ohnehin liegt, und lässt die Zeile darüber sichtbar — anders
 * als ein Dialog, der sich in die Mitte des Bildschirms setzt.
 */
function Sheet({ ...props }: DialogPrimitive.Root.Props) {
  return <DialogPrimitive.Root data-slot="sheet" {...props} />;
}

function SheetTrigger({ ...props }: DialogPrimitive.Trigger.Props) {
  return <DialogPrimitive.Trigger data-slot="sheet-trigger" {...props} />;
}

function SheetClose({ ...props }: DialogPrimitive.Close.Props) {
  return <DialogPrimitive.Close data-slot="sheet-close" {...props} />;
}

function SheetContent({ className, children, ...props }: DialogPrimitive.Popup.Props) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Backdrop
        data-slot="sheet-overlay"
        className="fixed inset-0 z-50 bg-black/10 duration-100 supports-backdrop-filter:backdrop-blur-xs data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0"
      />
      <DialogPrimitive.Popup
        data-slot="sheet-content"
        className={cn(
          "fixed inset-x-0 bottom-0 z-50 mx-auto flex w-full max-w-md flex-col gap-4 rounded-t-card bg-popover px-4 pt-2.5 text-popover-foreground shadow-overlay duration-150 outline-none",
          // Der Rand unten hält den Inhalt über der Gestenleiste des Handys.
          "pb-[calc(env(safe-area-inset-bottom)+1rem)]",
          "data-open:animate-in data-open:slide-in-from-bottom data-closed:animate-out data-closed:slide-out-to-bottom",
          className
        )}
        {...props}
      >
        {/* Griff: sagt ohne Worte, dass das Blatt zum Wegwischen ist. */}
        <div aria-hidden className="mx-auto h-1 w-9 shrink-0 rounded-pill bg-foreground/15" />
        {children}
      </DialogPrimitive.Popup>
    </DialogPrimitive.Portal>
  );
}

function SheetTitle({ className, ...props }: DialogPrimitive.Title.Props) {
  return (
    <DialogPrimitive.Title
      data-slot="sheet-title"
      className={cn("text-caption text-muted-foreground", className)}
      {...props}
    />
  );
}

export { Sheet, SheetClose, SheetContent, SheetTitle, SheetTrigger };
