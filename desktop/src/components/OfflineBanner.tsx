import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { repoListBiblesWithStatus } from "@/lib/repo";

export function OfflineBanner({
  bibleId,
  autoHideMs,
}: { bibleId?: number; autoHideMs?: number } = {}) {
  const { isOffline } = useAuth();
  const [visible, setVisible] = useState(isOffline);
  useEffect(() => {
    setVisible(isOffline);
    if (!isOffline) return;
    if (bibleId)
      repoListBiblesWithStatus()
        .then((list) => {
          if (list.some((item) => item.bibleId === bibleId && item.downloaded))
            setVisible(false);
        })
        .catch(() => {});
    if (autoHideMs) {
      const timer = window.setTimeout(() => setVisible(false), autoHideMs);
      return () => window.clearTimeout(timer);
    }
  }, [isOffline, bibleId, autoHideMs]);
  if (!isOffline || !visible) return null;

  return (
    <div className="border-b border-primary/30 bg-primary/10 px-3 py-2 text-center text-xs font-bold text-primary">
      Sin conexión — usando contenido descargado
    </div>
  );
}
