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
    <div className={cn("mx-3 mt-3 mb-1 shrink-0", className)}>
      <div className="flex overflow-x-auto rounded-xl border border-border bg-card p-1 gap-1 shadow-sm scrollbar-none">
        {tabs.map((tab) => {
          const selected = active === tab.key
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => onChange(tab.key)}
              className={cn(
                "shrink-0 rounded-lg px-3.5 py-2.5 text-[13px] font-bold transition-colors",
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
