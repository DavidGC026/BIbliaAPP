"use client"

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
  return (
    <div className={cn("mx-4 mt-3 mb-2 shrink-0 md:mx-3 md:mb-1", className)}>
      <div className="flex gap-1 overflow-x-auto rounded-2xl border border-border/80 bg-card p-1 shadow-sm scrollbar-none">
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
    </div>
  )
}
