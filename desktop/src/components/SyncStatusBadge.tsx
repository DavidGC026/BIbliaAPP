import { useEffect, useState } from "react";
import { isSqliteAvailable } from "@/lib/offline/db";
import { getDirtyNotebooks, getDirtyNotes } from "@/lib/offline/notesStore";
import { syncAll } from "@/lib/sync";
import { useAuth } from "@/context/AuthContext";

export function SyncStatusBadge() {
  const { isOffline } = useAuth();
  const [pending, setPending] = useState(0);
  const [syncing, setSyncing] = useState(false);
  useEffect(() => {
    if (!isSqliteAvailable()) return;
    let active = true;
    const check = () =>
      Promise.all([getDirtyNotes(), getDirtyNotebooks()])
        .then(
          ([notes, notebooks]) =>
            active && setPending(notes.length + notebooks.length),
        )
        .catch(() => {});
    check();
    const id = window.setInterval(check, 10000);
    return () => {
      active = false;
      window.clearInterval(id);
    };
  }, []);
  if (!pending) return null;
  return (
    <button
      type="button"
      disabled={isOffline || syncing}
      onClick={async () => {
        setSyncing(true);
        try {
          await syncAll();
          const [notes, notebooks] = await Promise.all([
            getDirtyNotes(),
            getDirtyNotebooks(),
          ]);
          setPending(notes.length + notebooks.length);
        } finally {
          setSyncing(false);
        }
      }}
      className="w-full rounded-lg bg-primary/10 px-3 py-2 text-left text-xs font-semibold text-primary disabled:opacity-60"
    >
      {syncing
        ? "Sincronizando…"
        : `${pending} ${pending === 1 ? "cambio pendiente" : "cambios pendientes"}`}
    </button>
  );
}
