import * as React from "react"

import { cn } from "@/lib/utils"
import { TINT_SURFACE, type Tint } from "@/lib/tints"

// Inhaltskarten sind flächig und randlos, 28px rund, ohne Rahmen und ohne
// Schatten. Erhöhung bekommt nur, was wirklich schwebt (variant=float).
//
// `tint` ist die farbige Karte: eine der fünf Tönungen als Fläche, darauf
// immer das dunkle Ink. Welche Tönung wofür steht, entscheidet lib/tints.ts.
function Card({
  className,
  size = "default",
  variant = "default",
  tint = "violet",
  ...props
}: React.ComponentProps<"div"> & {
  size?: "default" | "sm"
  variant?: "default" | "float" | "tint" | "plain"
  tint?: Tint
}) {
  return (
    <div
      data-slot="card"
      data-size={size}
      data-variant={variant}
      data-tint={variant === "tint" ? tint : undefined}
      className={cn(
        "group/card flex flex-col gap-(--card-spacing) rounded-card py-(--card-spacing) text-sm [--card-spacing:--spacing(4)] data-[size=sm]:[--card-spacing:--spacing(3)]",
        variant === "default" && "bg-card text-card-foreground",
        variant === "float" && "bg-elevated text-foreground shadow-float",
        variant === "tint" && TINT_SURFACE[tint],
        variant === "plain" && "bg-transparent text-foreground",
        className
      )}
      {...props}
    />
  )
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        "@container/card-header grid auto-rows-min items-start gap-1 px-(--card-spacing) has-data-[slot=card-action]:grid-cols-[1fr_auto] has-data-[slot=card-description]:grid-rows-[auto_auto]",
        className
      )}
      {...props}
    />
  )
}

function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-title"
      className={cn("text-body font-semibold leading-snug", className)}
      {...props}
    />
  )
}

function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-description"
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  )
}

function CardAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-action"
      className={cn(
        "col-start-2 row-span-2 row-start-1 self-start justify-self-end",
        className
      )}
      {...props}
    />
  )
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-content"
      className={cn("px-(--card-spacing)", className)}
      {...props}
    />
  )
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn(
        "flex items-center px-(--card-spacing) pt-(--card-spacing)",
        className
      )}
      {...props}
    />
  )
}

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
}
