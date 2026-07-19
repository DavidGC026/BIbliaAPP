import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { isSqliteAvailable } from "@/lib/offline/db";
import {
  initOffline,
  downloadBible,
  deleteDownloadedBible,
  repoListBiblesWithStatus,
} from "@/lib/repo";

type BibleRow = {
  bibleId: number;
  abbr: string;
  name: string;
  downloaded: boolean;
  downloadedAt?: string;
  verseCount: number;
  canDownload?: boolean;
};

export function DownloadsPage() {
  const [bibles, setBibles] = useState<BibleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [progress, setProgress] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setError(null);
      if (isSqliteAvailable()) await initOffline();
      const list = await repoListBiblesWithStatus();
      setBibles(list);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Error al cargar versiones",
      );
    }
  }, []);

  useEffect(() => {
    refresh().finally(() => setLoading(false));
  }, [refresh]);

  async function handleDownload(bibleId: number) {
    setActiveId(bibleId);
    setProgress("Iniciando…");
    setError(null);
    try {
      if (isSqliteAvailable()) await initOffline();
      await downloadBible(bibleId, (p) => {
        setProgress(`${p.phase} (${p.current}/${p.total})`);
      });
      localStorage.removeItem("bibliaapp_download_error");
      await refresh();
    } catch (err) {
      localStorage.setItem("bibliaapp_download_error", "1");
      setError(err instanceof Error ? err.message : "Error al descargar");
    } finally {
      setActiveId(null);
      setProgress(null);
    }
  }

  async function handleDelete(bibleId: number) {
    setActiveId(bibleId);
    setError(null);
    try {
      if (isSqliteAvailable()) await initOffline();
      await deleteDownloadedBible(bibleId);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al eliminar");
    } finally {
      setActiveId(null);
    }
  }

  if (!isSqliteAvailable()) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">
          Las descargas offline solo están disponibles en la app de escritorio
          (Tauri).
        </p>
      </div>
    );
  }

  return (
    <div className="desktop-page space-y-6 p-6">
      <header>
        <h1 className="text-2xl font-bold text-foreground">
          Descargas offline
        </h1>
        <p className="text-sm text-muted-foreground">
          Guarda una versión completa en SQLite para leer y buscar sin internet.
        </p>
      </header>

      {progress ? (
        <Card className="border-primary/30 bg-primary/5">
          <p className="text-sm text-foreground">Descargando: {progress}</p>
        </Card>
      ) : null}

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      {loading ? (
        <p className="text-muted-foreground">Cargando…</p>
      ) : (
        <div className="space-y-3">
          {bibles.map((b) => (
            <Card
              key={b.bibleId}
              className="flex flex-wrap items-center justify-between gap-3"
            >
              <div>
                <p className="font-semibold text-foreground">
                  {b.abbr} — {b.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {b.downloaded
                    ? `Descargada · ${b.verseCount.toLocaleString("es")} versículos`
                    : b.canDownload === true
                      ? "No descargada"
                      : "Disponible solo en línea"}
                  {b.downloadedAt
                    ? ` · ${new Date(b.downloadedAt).toLocaleDateString("es")}`
                    : null}
                </p>
              </div>
              <div className="flex gap-2">
                {b.downloaded ? (
                  <Button
                    variant="outline"
                    onClick={() => handleDelete(b.bibleId)}
                    loading={activeId === b.bibleId}
                  >
                    Eliminar
                  </Button>
                ) : b.canDownload === true ? (
                  <Button
                    onClick={() => handleDownload(b.bibleId)}
                    loading={activeId === b.bibleId}
                  >
                    Descargar
                  </Button>
                ) : (
                  <span className="text-xs font-semibold text-muted-foreground">
                    Sin descarga
                  </span>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
