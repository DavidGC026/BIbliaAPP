import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import * as api from "@/lib/api";
import type { BlockedUser } from "@/lib/types";

export interface BlockedUsersDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function BlockedUsersDialog({
  isOpen,
  onClose,
}: BlockedUsersDialogProps) {
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [unblockingId, setUnblockingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadBlocked = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getBlockedUsers();
      setBlockedUsers(data.blockedUsers || []);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Error al cargar usuarios bloqueados.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadBlocked();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleUnblock = async (userId: number) => {
    setUnblockingId(userId);
    try {
      await api.unblockUser(userId);
      setBlockedUsers((prev) => prev.filter((u) => u.id !== userId));
    } catch (err) {
      alert(
        err instanceof Error ? err.message : "Error al desbloquear usuario",
      );
    } finally {
      setUnblockingId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
      <div className="relative w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-4">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1.5 text-muted-foreground hover:bg-muted transition-colors"
          aria-label="Cerrar"
        >
          <Icon name="close" size={16} />
        </button>

        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
            <Icon name="alert" size={20} />
          </div>
          <div>
            <h2 className="font-bold text-lg text-foreground">
              Usuarios bloqueados
            </h2>
            <p className="text-xs text-muted-foreground">
              Las personas bloqueadas no pueden ver tus publicaciones ni
              interactuar contigo.
            </p>
          </div>
        </div>

        {error && (
          <div className="rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-xs text-destructive">
            {error}
          </div>
        )}

        <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
          {loading ? (
            <div className="py-8 text-center text-sm text-muted-foreground animate-pulse">
              Cargando lista…
            </div>
          ) : blockedUsers.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground space-y-2">
              <p className="text-sm font-medium">
                No tienes usuarios bloqueados.
              </p>
              <p className="text-xs text-muted-foreground">
                Cuando bloquees a alguien desde la comunidad, aparecerá aquí.
              </p>
            </div>
          ) : (
            blockedUsers.map((u) => (
              <div
                key={u.id}
                className="flex items-center justify-between gap-3 p-3 rounded-xl border border-border/60 bg-background/50 hover:border-border transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                    {u.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-sm text-foreground truncate">
                      {u.name}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      @{u.username}
                    </p>
                  </div>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleUnblock(u.id)}
                  loading={unblockingId === u.id}
                  className="shrink-0 text-xs"
                >
                  Desbloquear
                </Button>
              </div>
            ))
          )}
        </div>

        <div className="flex justify-end pt-2">
          <Button variant="outline" onClick={onClose}>
            Cerrar
          </Button>
        </div>
      </div>
    </div>
  );
}
