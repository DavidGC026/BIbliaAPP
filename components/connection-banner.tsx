"use client"

import useSWR from "swr"
import type { HealthStatus } from "@/lib/types"
import { fetcher } from "@/lib/fetcher"

export function ConnectionBanner() {
  const { data } = useSWR<HealthStatus>("/api/health", fetcher, {
    refreshInterval: 30000,
  })

  if (!data) return null
  if (data.mysql.ok && data.joplin.ok) return null

  return (
    <div className="border-b border-destructive/30 bg-destructive/10 px-4 py-3 text-sm">
      <div className="mx-auto flex max-w-6xl flex-col gap-1">
        <p className="font-medium text-destructive">Configuración incompleta</p>
        {!data.mysql.ok && (
          <p className="text-foreground/80">
            <span className="font-medium">MySQL:</span> {data.mysql.message}
          </p>
        )}
        {!data.joplin.ok && (
          <p className="text-foreground/80">
            <span className="font-medium">Joplin:</span> {data.joplin.message}
          </p>
        )}
      </div>
    </div>
  )
}
