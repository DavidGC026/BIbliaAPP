import { useEffect, useRef, useState } from "react";
import * as api from "@/lib/api";
import { subscribeNotificationStream } from "@/lib/notificationStream";
import type { AppNotification } from "@/lib/types";
import { Icon } from "@/components/ui/Icon";

const TYPE_LABELS: Record<string, string> = {
  comment: "comentó tu publicación",
  reply: "respondió a tu comentario",
  like: "le gustó tu publicación",
  follow: "comenzó a seguirte",
  prayer_intercession: "se unió a orar por tu petición",
  friend_request: "te envió una solicitud de amistad",
  friend_accepted: "aceptó tu solicitud de amistad",
};

function eventReminderLabel(n: AppNotification): string {
  const title = n.event_title || "Evento del grupo";
  if (n.reminder_kind === "2hours") return `En 2 horas: ${title}`;
  return `Mañana: ${title}`;
}

type Props = {
  onNavigateToFeed?: () => void;
  onNavigateToGroups?: () => void;
  onNavigateToGroup?: (groupId: number, tab?: "prayers" | "events") => void;
};

export function NotificationBell({ onNavigateToFeed, onNavigateToGroups, onNavigateToGroup }: Props) {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  async function loadNotifications() {
    setLoading(true);
    try {
      const data = await api.getNotifications();
      setNotifications(data.notifications);
      setUnreadCount(data.unreadCount);
    } catch {
      // ignorar
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadNotifications();
    const unsub = subscribeNotificationStream(() => loadNotifications());
    const poll = setInterval(loadNotifications, 60000);
    return () => {
      unsub();
      clearInterval(poll);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  async function markAllRead() {
    setNotifications((prev) =>
      prev.map((n) => ({
        ...n,
        read_at: n.read_at ?? new Date().toISOString(),
      })),
    );
    setUnreadCount(0);
    try {
      await api.markNotificationsRead("all");
    } finally {
      loadNotifications();
    }
  }

  async function handleClick(n: AppNotification) {
    setOpen(false);
    if (!n.read_at) {
      api.markNotificationsRead([n.id]).then(() => loadNotifications());
    }
    if (n.type === "group_event_reminder" && n.event_group_id) {
      onNavigateToGroup?.(n.event_group_id, "events");
    } else if (n.type === "prayer_intercession") {
      onNavigateToGroups?.();
    } else if (n.post_id != null) {
      onNavigateToFeed?.();
    }
  }

  return (
    <div ref={containerRef} className="relative px-3">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`relative rounded-lg p-2 text-sm transition-colors ${
          open ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground"
        }`}
        title="Notificaciones"
      >
        <Icon name="bell" size={19} />
        {unreadCount > 0 ? (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-bold text-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute bottom-full left-3 z-50 mb-2 w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-border bg-card shadow-xl">
          <div className="flex items-center justify-between border-b border-border/50 px-4 py-2.5">
            <span className="text-sm font-bold text-foreground">Notificaciones</span>
            {unreadCount > 0 ? (
              <button
                type="button"
                onClick={markAllRead}
                className="text-xs font-semibold text-primary hover:underline"
              >
                Marcar leídas
              </button>
            ) : null}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {loading && notifications.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">Cargando…</p>
            ) : notifications.length === 0 ? (
              <p className="py-8 text-center text-xs text-muted-foreground">
                No tienes notificaciones todavía.
              </p>
            ) : (
              notifications.map((n) => (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => handleClick(n)}
                  className={`w-full border-b border-border/30 px-4 py-3 text-left last:border-b-0 hover:bg-accent/40 ${
                    !n.read_at ? "bg-primary/5" : ""
                  }`}
                >
                  <p className="text-xs text-foreground">
                    {n.type === "group_event_reminder" ? (
                      <strong>{eventReminderLabel(n)}</strong>
                    ) : (
                      <>
                        <strong>{n.actor_name}</strong>{" "}
                        {TYPE_LABELS[n.type] ?? n.type}
                      </>
                    )}
                  </p>
                  {n.post_preview ? (
                    <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                      “{n.post_preview}”
                    </p>
                  ) : null}
                  <p className="mt-0.5 text-[10px] text-muted-foreground/70">
                    {new Date(n.created_at).toLocaleString("es", {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </button>
              ))
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
