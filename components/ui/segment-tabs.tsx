"use client"

import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"

interface SegmentTabsProps<T extends string> {
  tabs: { key: T; label: string }[]
  active: T
  onChange: (key: T) => void
  className?: string
  ariaLabel?: string
}

export function SegmentTabs<T extends string>({
  tabs,
  active,
  onChange,
  className,
  ariaLabel = "Secciones",
}: SegmentTabsProps<T>) {
  const scrollerRef = useRef<HTMLDivElement>(null)
  const [canScrollBack, setCanScrollBack] = useState(false)
  const [canScrollForward, setCanScrollForward] = useState(false)

  const updateScrollState = useCallback(() => {
    const scroller = scrollerRef.current
    if (!scroller) return
    const maxScroll = scroller.scrollWidth - scroller.clientWidth
    setCanScrollBack(scroller.scrollLeft > 2)
    setCanScrollForward(scroller.scrollLeft < maxScroll - 2)
  }, [])

  useEffect(() => {
    const scroller = scrollerRef.current
    if (!scroller) return
    updateScrollState()
    const observer = new ResizeObserver(updateScrollState)
    observer.observe(scroller)
    return () => observer.disconnect()
  }, [tabs, updateScrollState])

  useEffect(() => {
    const selectedTab = scrollerRef.current?.querySelector<HTMLElement>("[aria-selected='true']")
    selectedTab?.scrollIntoView({ block: "nearest", inline: "nearest" })
    updateScrollState()
  }, [active, updateScrollState])

  const scroll = (direction: -1 | 1) => {
    const scroller = scrollerRef.current
    if (!scroller) return
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    scroller.scrollBy({
      left: direction * Math.max(160, scroller.clientWidth * 0.7),
      behavior: reduceMotion ? "auto" : "smooth",
    })
  }

  const handleTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    let nextIndex: number | null = null
    if (event.key === "ArrowRight") nextIndex = (index + 1) % tabs.length
    if (event.key === "ArrowLeft") nextIndex = (index - 1 + tabs.length) % tabs.length
    if (event.key === "Home") nextIndex = 0
    if (event.key === "End") nextIndex = tabs.length - 1
    if (nextIndex === null) return

    event.preventDefault()
    onChange(tabs[nextIndex].key)
    const tabButtons = scrollerRef.current?.querySelectorAll<HTMLButtonElement>("[role='tab']")
    tabButtons?.[nextIndex]?.focus()
  }

  return (
    <div className={cn("relative mx-4 mt-3 mb-2 shrink-0 md:mx-3 md:mb-1", className)}>
      <div
        ref={scrollerRef}
        role="tablist"
        aria-label={ariaLabel}
        onScroll={updateScrollState}
        className={cn(
          "flex gap-1 overflow-x-auto rounded-2xl border border-border/80 bg-card p-1 shadow-sm scrollbar-none",
          canScrollBack && "pl-10",
          canScrollForward && "pr-10",
        )}
      >
        {tabs.map((tab, index) => {
          const selected = active === tab.key
          return (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={selected}
              tabIndex={selected ? 0 : -1}
              onClick={() => onChange(tab.key)}
              onKeyDown={(event) => handleTabKeyDown(event, index)}
              className={cn(
                "min-w-fit flex-1 shrink-0 rounded-xl px-3 py-2 text-[13px] font-extrabold transition-colors",
                selected
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
              )}
            >
              {tab.label}
            </button>
          )
        })}
      </div>
      {canScrollBack ? (
        <button
          type="button"
          onClick={() => scroll(-1)}
          aria-label="Ver pestañas anteriores"
          className="absolute bottom-1 left-0 top-1 flex w-10 items-center justify-start rounded-l-2xl bg-gradient-to-r from-card via-card/95 to-transparent pl-2 text-primary"
        >
          <span className="flex size-6 items-center justify-center rounded-full border border-border/70 bg-background text-primary shadow-sm">
            <ChevronLeft className="size-4" />
          </span>
        </button>
      ) : null}
      {canScrollForward ? (
        <button
          type="button"
          onClick={() => scroll(1)}
          aria-label="Ver más pestañas"
          className="absolute bottom-1 right-0 top-1 flex w-10 items-center justify-end rounded-r-2xl bg-gradient-to-l from-card via-card/95 to-transparent pr-2 text-primary"
        >
          <span className="flex size-6 items-center justify-center rounded-full border border-border/70 bg-background text-primary shadow-sm">
            <ChevronRight className="size-4" />
          </span>
        </button>
      ) : null}
    </div>
  )
}
