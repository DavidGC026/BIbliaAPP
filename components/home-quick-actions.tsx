"use client"

import { useEffect, useMemo, useState } from "react"
import { ArrowRight } from "lucide-react"
import { AppIcon } from "@/components/ui/app-icon"
import { Button } from "@/components/ui/button"
import {
  DEFAULT_HOME_ACTIONS,
  HOME_ACTION_CATALOG,
  loadHomeActions,
  saveHomeActions,
  type HomeActionKey,
} from "@/lib/home-actions"

type HomeQuickActionsProps = {
  isGuest: boolean
  onNavigate: (section: string, requiresAuth: boolean) => void
}

export function HomeQuickActions({ isGuest, onNavigate }: HomeQuickActionsProps) {
  const [enabled, setEnabled] = useState<HomeActionKey[]>([...DEFAULT_HOME_ACTIONS])
  const [customizing, setCustomizing] = useState(false)

  useEffect(() => {
    setEnabled(loadHomeActions())
  }, [])

  const visibleActions = useMemo(
    () => HOME_ACTION_CATALOG.filter((action) => enabled.includes(action.key)),
    [enabled],
  )

  const toggle = (key: HomeActionKey) => {
    setEnabled((current) => {
      if (current.includes(key) && current.length === 1) return current
      const next = current.includes(key)
        ? current.filter((item) => item !== key)
        : [...current, key]
      return saveHomeActions(next)
    })
  }

  return (
    <section className="space-y-4" aria-labelledby="home-quick-actions-title">
      <div className="flex items-center justify-between gap-3">
        <h2 id="home-quick-actions-title" className="text-lg font-bold text-foreground">Acciones rápidas</h2>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setCustomizing((value) => !value)}
          aria-expanded={customizing}
          className="gap-1.5 text-primary"
        >
          <AppIcon name="settings" className="size-3.5" />
          {customizing ? "Terminar" : "Personalizar"}
        </Button>
      </div>

      {customizing && (
        <div className="rounded-xl border border-border bg-card p-3" aria-label="Personalizar accesos rápidos">
          <p className="mb-3 text-xs text-muted-foreground">Elige al menos un acceso. La preferencia se guarda en este navegador.</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {HOME_ACTION_CATALOG.map((action) => {
              const checked = enabled.includes(action.key)
              return (
                <label key={action.key} className="flex cursor-pointer items-center gap-3 rounded-lg border border-border/70 p-3 hover:bg-accent/30">
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={checked && enabled.length === 1}
                    onChange={() => toggle(action.key)}
                    className="size-4 accent-[var(--primary)]"
                  />
                  <AppIcon name={action.icon} className="size-4 text-primary" />
                  <span className="text-sm font-semibold text-foreground">{action.title}</span>
                </label>
              )
            })}
          </div>
        </div>
      )}

      <div className="flex flex-col gap-3">
        {visibleActions.map((action) => {
          const locked = isGuest && action.requiresAuth === true
          return (
            <button
              key={action.key}
              type="button"
              onClick={() => onNavigate(action.targetSection, action.requiresAuth === true)}
              className="group flex w-full items-center justify-between rounded-xl border border-border bg-card/40 p-4 text-left transition-all hover:bg-accent/40 active:scale-[0.99]"
            >
              <span className="flex min-w-0 items-center gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <AppIcon name={action.icon} className="size-5" />
                </span>
                <span className="min-w-0">
                  <span className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                    {action.title}
                    {locked && <AppIcon name="lock" className="size-3 text-muted-foreground" />}
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    {locked ? action.guestDescription : action.description}
                  </span>
                </span>
              </span>
              <ArrowRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-1" />
            </button>
          )
        })}
      </div>
    </section>
  )
}
