"use client"

import { ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"

interface SegmentTabsProps<T extends string> {
  tabs: { key: T; label: string }[]
  active: T
  onChange: (key: T) => void
  className?: string
}

export function SegmentTabs<T extends string>({
  tabs,
  active,
  onChange,
  className,
}: SegmentTabsProps<T>) {
  const showScrollHint = tabs.length > 3

  return (
    <div className={cn("relative mx-4 mt-3 mb-2 shrink-0 md:mx-3 md:mb-1", className)}>
      <div className="flex gap-1 overflow-x-auto rounded-2xl border border-border/80 bg-card p-1 pr-9 shadow-sm scrollbar-none md:pr-1">
        {tabs.map((tab) => {
          const selected = active === tab.key
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => onChange(tab.key)}
              className={cn(
                "min-w-fit flex-1 shrink-0 rounded-xl px-3 py-2 text-[13px] font-extrabold transition-colors",
                selected
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
              )}
            >
              {tab.label}
            </button>
          )
        })}
      </div>
      {showScrollHint ? (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute bottom-1 right-0 top-1 flex w-10 items-center justify-end rounded-r-2xl bg-gradient-to-l from-card via-card/95 to-transparent pr-2 md:hidden"
        >
          <span className="flex size-6 items-center justify-center rounded-full border border-border/70 bg-background text-primary shadow-sm">
            <ChevronRight className="size-4 animate-pulse" />
          </span>
        </div>
      ) : null}
    </div>
  )
}
