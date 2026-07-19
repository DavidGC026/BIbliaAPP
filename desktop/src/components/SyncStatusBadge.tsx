import { useEffect, useState } from "react";
import { isSqliteAvailable } from "@/lib/offline/db";
import { getDirtyNotebooks, getDirtyNotes } from "@/lib/offline/notesStore";
import {
  getDirtyFavorites,
  getDirtyHighlights,
  getDirtyVerseNotes,
} from "@/lib/offline/readerStore";
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
      Promise.all([
        getDirtyNotes(),
        getDirtyNotebooks(),
        getDirtyHighlights(),
        getDirtyFavorites(),
        getDirtyVerseNotes(),
      ])
        .then((groups) => {
          if (active)
            setPending(groups.reduce((total, group) => total + group.length, 0));
        })
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
          const groups = await Promise.all([
            getDirtyNotes(),
            getDirtyNotebooks(),
            getDirtyHighlights(),
            getDirtyFavorites(),
            getDirtyVerseNotes(),
          ]);
          setPending(
            groups.reduce((total, group) => total + group.length, 0),
          );
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
