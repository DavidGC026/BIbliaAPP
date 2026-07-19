import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { AuthedImage } from "@/components/AuthedImage";
import { FeedContent } from "@/components/FeedContent";
import * as api from "@/lib/api";
import type {
  GroupEvent,
  GroupPost,
  GroupPrayer,
  GroupSummary,
} from "@/lib/types";

type GroupTab = "prayers" | "events" | "activity";

type Props = {
  groupId: number;
  initialTab?: GroupTab;
  onBack: () => void;
};

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleString("es", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function GroupHeader({ group }: { group: GroupSummary }) {
  return (
    <div className="border-b border-border bg-card">
      <div className="relative">
        {group.cover_image ? (
          <AuthedImage
            uri={group.cover_image}
            className="h-36 w-full object-cover"
          />
        ) : (
          <div className="h-36 w-full bg-primary/10" />
        )}
        <div className="absolute -bottom-9 left-4">
          {group.avatar_image ? (
            <AuthedImage
              uri={group.avatar_image}
              className="h-[4.5rem] w-[4.5rem] rounded-2xl border-4 border-card object-cover"
            />
          ) : (
            <div className="flex h-[4.5rem] w-[4.5rem] items-center justify-center rounded-2xl border-4 border-card bg-primary/15 text-2xl font-bold text-primary">
              {group.name.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
      </div>
      <div className="space-y-1 px-4 pb-4 pt-12">
        <h1 className="text-2xl font-bold text-foreground">{group.name}</h1>
        {group.description ? (
          <p className="text-sm text-muted-foreground">{group.description}</p>
        ) : null}
        <p className="text-xs font-semibold text-primary">
          {group.member_count} miembros · {group.role}
        </p>
      </div>
    </div>
  );
}

export function GroupDetailPage({ groupId, initialTab = "prayers", onBack }: Props) {
  const [group, setGroup] = useState<GroupSummary | null>(null);
  const [tab, setTab] = useState<GroupTab>(initialTab);
  const [prayers, setPrayers] = useState<GroupPrayer[]>([]);
  const [events, setEvents] = useState<GroupEvent[]>([]);
  const [posts, setPosts] = useState<GroupPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyPrayer, setBusyPrayer] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadTab = useCallback(async () => {
    if (tab === "prayers") {
      const { prayers: list } = await api.getGroupPrayers(groupId);
      setPrayers(list);
    } else if (tab === "events") {
      const { events: list } = await api.getGroupEvents(groupId);
      setEvents(list);
    } else {
      const { posts: list } = await api.getGroupPosts(groupId);
      setPosts(list);
    }
  }, [groupId, tab]);

  useEffect(() => {
    setLoading(true);
    setError(null);
    api
      .getGroup(groupId)
      .then(({ group: g }) => setGroup(g))
      .then(() => loadTab())
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Error al cargar"),
      )
      .finally(() => setLoading(false));
  }, [groupId, loadTab]);

  useEffect(() => {
    if (!loading) loadTab().catch(() => {});
  }, [tab, loadTab, loading]);

  async function intercede(prayerId: number) {
    setBusyPrayer(prayerId);
    try {
      await api.joinPrayerIntercession(groupId, prayerId);
      await loadTab();
    } finally {
      setBusyPrayer(null);
    }
  }

  const tabs: { key: GroupTab; label: string }[] = [
    { key: "prayers", label: "Oración" },
    { key: "events", label: "Calendario" },
    { key: "activity", label: "Actividad" },
  ];

  return (
    <div className="desktop-page">
      <div className="sticky top-0 z-10 border-b border-border bg-background/95 px-4 py-3 backdrop-blur">
        <Button variant="ghost" onClick={onBack}>
          ← Grupos
        </Button>
      </div>

      {loading ? (
        <p className="p-6 text-muted-foreground">Cargando grupo…</p>
      ) : error ? (
        <p className="p-6 text-destructive">{error}</p>
      ) : (
        <>
          {group ? <GroupHeader group={group} /> : null}

          <div className="flex border-b border-border">
            {tabs.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setTab(t.key)}
                className={`flex-1 px-4 py-3 text-sm font-semibold ${
                  tab === t.key
                    ? "border-b-2 border-primary text-primary"
                    : "text-muted-foreground"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="space-y-4 p-4">
            {tab === "prayers" &&
              (prayers.length === 0 ? (
                <p className="text-center text-muted-foreground">
                  No hay peticiones de oración.
                </p>
              ) : (
                prayers.map((p) => (
                  <Card key={p.id} className="space-y-2">
                    <p className="font-bold text-foreground">{p.title}</p>
                    {p.description ? (
                      <p className="text-sm text-muted-foreground">{p.description}</p>
                    ) : null}
                    <p className="text-xs text-muted-foreground">
                      {p.user_name} · {p.intercessor_count} intercesores
                    </p>
                    {p.is_interceding ? (
                      <p className="text-sm font-semibold text-primary">
                        Estás intercediendo
                      </p>
                    ) : (
                      <Button
                        onClick={() => intercede(p.id)}
                        loading={busyPrayer === p.id}
                      >
                        Orar por esto
                      </Button>
                    )}
                  </Card>
                ))
              ))}

            {tab === "events" &&
              (events.length === 0 ? (
                <p className="text-center text-muted-foreground">
                  No hay eventos próximos.
                </p>
              ) : (
                events.map((e) => (
                  <Card key={e.id} className="space-y-2">
                    <p className="font-bold text-foreground">{e.title}</p>
                    <p className="text-sm font-semibold text-primary">
                      {formatDate(e.start_time)}
                    </p>
                    {e.location ? (
                      <p className="text-sm text-muted-foreground">📍 {e.location}</p>
                    ) : null}
                    {e.description ? (
                      <p className="text-sm text-muted-foreground">{e.description}</p>
                    ) : null}
                    <p className="text-xs text-muted-foreground">Por {e.creator_name}</p>
                  </Card>
                ))
              ))}

            {tab === "activity" &&
              (posts.length === 0 ? (
                <p className="text-center text-muted-foreground">
                  Sin publicaciones en el grupo.
                </p>
              ) : (
                posts.map((post) => (
                  <Card key={post.id} className="space-y-2">
                    <p className="font-semibold text-foreground">{post.user_name}</p>
                    <FeedContent content={post.content} />
                    <p className="text-xs text-muted-foreground">
                      {formatDate(post.created_at)}
                    </p>
                  </Card>
                ))
              ))}
          </div>
        </>
      )}
    </div>
  );
}
