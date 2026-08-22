"use client"

import { Switch as SwitchPrimitive } from "@base-ui/react/switch"

import { cn } from "@/lib/utils"

/**
 * Ein/Aus als echter Schalter statt zwei Textknöpfen nebeneinander — sofort
 * als An/Aus erkennbar, ohne die Beschriftung "Ein"/"Aus" lesen zu müssen.
 */
function Switch({ className, ...props }: SwitchPrimitive.Root.Props) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        "peer inline-flex h-6 w-10 shrink-0 items-center rounded-pill bg-elevated ring-1 ring-foreground/8 transition-colors outline-none data-checked:bg-foreground focus-visible:ring-2 focus-visible:ring-ring/40 disabled:pointer-events-none disabled:opacity-40",
        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className="pointer-events-none block size-[18px] translate-x-1 rounded-full bg-card shadow-sm transition-transform data-checked:translate-x-[18px] data-checked:bg-background"
      />
    </SwitchPrimitive.Root>
  )
}

export { Switch }
