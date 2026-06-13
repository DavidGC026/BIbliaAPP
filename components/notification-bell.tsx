"use client"

import * as React from "react"
import { useState, useEffect, useRef } from "react"
import useSWR from "swr"
import { fetcher } from "@/lib/fetcher"
import { Bell, Heart, MessageSquare, Reply, UserPlus, Loader2, CheckCheck, HeartHandshake } from "lucide-react"
import { cn } from "@/lib/utils"

interface Notification {
  id: number
  type: "comment" | "reply" | "like" | "follow" | "prayer_intercession"
  post_id: number | null
  comment_id: number | null
  read_at: string | null
  created_at: string
  actor_name: string
  actor_username: string
  post_preview: string | null
}

const TYPE_CONFIG = {
  comment: { icon: MessageSquare, label: "comentó tu publicación", color: "text-primary" },
  reply: { icon: Reply, label: "respondió a tu comentario", color: "text-sky-500" },
  like: { icon: Heart, label: "le gustó tu publicación", color: "text-rose-500" },
  follow: { icon: UserPlus, label: "comenzó a seguirte", color: "text-emerald-500" },
  prayer_intercession: { icon: HeartHandshake, label: "se unió a orar por tu petición", color: "text-amber-600" },
} as const

/**
 * SSE como acelerador + SWR como red de seguridad: si la conexión en tiempo
 * real se cae (proxy, red móvil), el polling de 60s sigue funcionando.
 * La fuente de verdad siempre es la tabla feed_notifications.
 */
function useNotificationStream(onEvent: () => void) {
  const onEventRef = useRef(onEvent)
  onEventRef.current = onEvent

  useEffect(() => {
    let es: EventSource | null = null
    let retryTimer: ReturnType<typeof setTimeout> | null = null
    let cancelled = false

    const connect = () => {
      if (cancelled) return
      es = new EventSource("/api/notifications/stream")
      es.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data)
          if (data.type !== "connected") onEventRef.current()
        } catch {}
      }
      es.onerror = () => {
        es?.close()
        // Reintentar en 30s; mientras tanto SWR cubre con polling
        retryTimer = setTimeout(connect, 30000)
      }
    }

    connect()
    return () => {
      cancelled = true
      es?.close()
      if (retryTimer) clearTimeout(retryTimer)
    }
  }, [])
}

export function NotificationBell({
  onNavigateToFeed,
  onNavigateToPrayers,
  dropDirection = "down",
}: {
  onNavigateToFeed?: () => void
  onNavigateToPrayers?: () => void
  dropDirection?: "down" | "up"
}) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const { data, mutate } = useSWR<{ notifications: Notification[]; unreadCount: number }>(
    "/api/notifications",
    fetcher,
    { refreshInterval: 60000 }
  )

  useNotificationStream(() => mutate())

  const notifications = data?.notifications ?? []
  const unreadCount = data?.unreadCount ?? 0

  // Cerrar al hacer clic fuera
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [open])

  const markAllRead = async () => {
    // Optimista
    mutate(
      (prev) =>
        prev && {
          notifications: prev.notifications.map((n) => ({
            ...n,
            read_at: n.read_at ?? new Date().toISOString(),
          })),
          unreadCount: 0,
        },
      false
    )
    try {
      await fetch("/api/notifications/read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ all: true }),
      })
    } finally {
      mutate()
    }
  }

  const handleNotificationClick = async (notification: Notification) => {
    setOpen(false)
    if (!notification.read_at) {
      fetch("/api/notifications/read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [notification.id] }),
      }).then(() => mutate())
    }
    if (notification.type === "prayer_intercession") {
      onNavigateToPrayers?.()
    } else if (notification.post_id != null) {
      onNavigateToFeed?.()
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          "relative p-2 rounded transition-colors",
          open ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground"
        )}
        title="Notificaciones"
      >
        <Bell className="size-4.5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 flex items-center justify-center rounded-full bg-rose-500 text-white text-[9px] font-bold">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          className={cn(
            "absolute right-0 w-80 max-w-[90vw] rounded-xl border border-border bg-card shadow-xl z-50 overflow-hidden animate-fade-in",
            dropDirection === "down" ? "top-full mt-1" : "bottom-full mb-1"
          )}
        >
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-border/50">
            <span className="text-sm font-bold text-foreground">Notificaciones</span>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline"
              >
                <CheckCheck className="size-3.5" />
                Marcar leídas
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {!data ? (
              <div className="flex justify-center py-8">
                <Loader2 className="size-5 animate-spin text-primary" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="text-center py-8 px-4">
                <Bell className="size-8 mx-auto text-muted-foreground/30 mb-2" />
                <p className="text-xs text-muted-foreground">No tienes notificaciones todavía.</p>
              </div>
            ) : (
              notifications.map((n) => {
                const config = TYPE_CONFIG[n.type]
                const Icon = config.icon
                return (
                  <button
                    key={n.id}
                    onClick={() => handleNotificationClick(n)}
                    className={cn(
                      "w-full flex items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-accent/40 border-b border-border/30 last:border-b-0",
                      !n.read_at && "bg-primary/5"
                    )}
                  >
                    <span className={cn("mt-0.5 shrink-0", config.color)}>
                      <Icon className="size-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-xs text-foreground">
                        <strong>{n.actor_name}</strong> {config.label}
                      </span>
                      {n.post_preview && (
                        <span className="block text-[11px] text-muted-foreground truncate mt-0.5">
                          “{n.post_preview}”
                        </span>
                      )}
                      <span className="block text-[10px] text-muted-foreground/60 mt-0.5">
                        {new Date(n.created_at).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </span>
                    {!n.read_at && (
                      <span className="size-2 rounded-full bg-primary shrink-0 mt-1.5" />
                    )}
                  </button>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}
