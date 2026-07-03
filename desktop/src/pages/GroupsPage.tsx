import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { AuthedImage } from "@/components/AuthedImage";
import { GroupDetailPage } from "@/pages/GroupDetailPage";
import * as api from "@/lib/api";
import type { GroupSummary } from "@/lib/types";

type OpenGroup = {
  id: number;
  tab?: "prayers" | "events" | "activity";
};

type Props = {
  openGroup?: OpenGroup | null;
  onOpenGroupConsumed?: () => void;
};

function GroupCard({
  group,
  onOpen,
}: {
  group: GroupSummary;
  onOpen: () => void;
}) {
  return (
    <button type="button" onClick={onOpen} className="w-full text-left">
      <Card className="overflow-hidden p-0 transition-colors hover:bg-accent/30">
        {group.cover_image ? (
          <AuthedImage
            uri={group.cover_image}
            className="h-28 w-full object-cover"
          />
        ) : null}
        <div className="flex gap-3 p-4">
          {group.avatar_image ? (
            <AuthedImage
              uri={group.avatar_image}
              className="h-12 w-12 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/15 text-lg font-bold text-primary">
              {group.name.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-foreground">{group.name}</p>
            {group.description ? (
              <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                {group.description}
              </p>
            ) : null}
            <p className="mt-2 text-xs font-medium text-primary">
              {group.member_count} miembros · {group.role}
            </p>
          </div>
        </div>
      </Card>
    </button>
  );
}

export function GroupsPage({ openGroup, onOpenGroupConsumed }: Props) {
  const [groups, setGroups] = useState<GroupSummary[]>([]);
  const [selected, setSelected] = useState<OpenGroup | null>(null);
  const [inviteCode, setInviteCode] = useState("");
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (openGroup) {
      setSelected(openGroup);
      onOpenGroupConsumed?.();
    }
  }, [openGroup, onOpenGroupConsumed]);

  async function loadGroups() {
    try {
      setError(null);
      const { groups: list } = await api.listGroups();
      setGroups(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar grupos");
    }
  }

  useEffect(() => {
    loadGroups().finally(() => setLoading(false));
  }, []);

  async function joinByCode() {
    const code = inviteCode.trim();
    if (!code) return;
    setJoining(true);
    setMessage(null);
    setError(null);
    try {
      const result = await api.joinGroupByCode(code);
      setInviteCode("");
      setMessage(
        result.alreadyMember
          ? "Ya eras miembro de ese grupo."
          : "Te uniste al grupo correctamente.",
      );
      await loadGroups();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo unir al grupo");
    } finally {
      setJoining(false);
    }
  }

  if (selected) {
    return (
      <GroupDetailPage
        groupId={selected.id}
        initialTab={selected.tab}
        onBack={() => setSelected(null)}
      />
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <header>
        <h1 className="text-2xl font-bold text-foreground">Grupos</h1>
        <p className="text-sm text-muted-foreground">
          Células y grupos de tu congregación.
        </p>
      </header>

      <Card className="space-y-3">
        <p className="text-sm font-medium text-foreground">Unirse con código</p>
        <div className="flex gap-2">
          <input
            value={inviteCode}
            onChange={(e) => setInviteCode(e.target.value)}
            placeholder="Código de invitación"
            className="min-w-0 flex-1 rounded-lg border border-input bg-background px-3 py-2 text-foreground"
          />
          <Button onClick={joinByCode} loading={joining} disabled={!inviteCode.trim()}>
            Unirse
          </Button>
        </div>
      </Card>

      {message ? <p className="text-sm text-primary">{message}</p> : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      {loading ? (
        <p className="text-muted-foreground">Cargando grupos…</p>
      ) : groups.length === 0 ? (
        <p className="text-muted-foreground">Aún no perteneces a ningún grupo.</p>
      ) : (
        <div className="space-y-4">
          {groups.map((g) => (
            <GroupCard
              key={g.id}
              group={g}
              onOpen={() => setSelected({ id: g.id })}
            />
          ))}
        </div>
      )}
    </div>
  );
}
