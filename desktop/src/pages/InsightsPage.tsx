import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import * as api from "@/lib/api";
import * as repo from "@/lib/repo";
import type {
  BookStat,
  HeatmapDay,
  HighlightItem,
  ProgressBook,
} from "@/lib/types";

export function InsightsPage({
  mode = "statistics",
}: {
  mode?: "statistics" | "activity" | "highlights";
}) {
  const [stats, setStats] = useState<BookStat[]>([]);
  const [heatmap, setHeatmap] = useState<HeatmapDay[]>([]);
  const [recent, setRecent] = useState<ProgressBook[]>([]);
  const [highlights, setHighlights] = useState<HighlightItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    const task =
      mode === "statistics"
        ? api.getStatistics().then((r) => setStats(r.statistics))
        : mode === "activity"
          ? api.getActivity().then((r) => {
              setHeatmap(r.heatmap);
              setRecent(r.recentProgress);
            })
          : repo
              .repoListRecentHighlights(Number.MAX_SAFE_INTEGER)
              .then((r) => setHighlights(r.highlights));
    task
      .catch((e) => setError(e instanceof Error ? e.message : "Error"))
      .finally(() => setLoading(false));
  }, [mode]);
  if (loading)
    return <div className="p-6 text-muted-foreground">Cargando…</div>;
  if (error)
    return (
      <div className="p-6">
        <EmptyState icon="!" title="No se pudo cargar" description={error} />
      </div>
    );
  return (
    <div className="desktop-page space-y-5 p-6">
      <h1 className="text-2xl font-bold text-foreground">
        {mode === "statistics"
          ? "Estadísticas"
          : mode === "activity"
            ? "Actividad"
            : "Subrayados"}
      </h1>
      {mode === "statistics" &&
        (stats.length ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {stats.map((item) => (
              <Card key={item.book_id}>
                <b className="text-foreground">{item.book_name}</b>
                <p className="text-2xl font-bold text-primary">
                  {item.total_chapters}
                </p>
                <p className="text-xs text-muted-foreground">
                  capítulos registrados
                </p>
              </Card>
            ))}
          </div>
        ) : (
          <EmptyState
            title="Sin estadísticas todavía"
            description="Lee capítulos para comenzar a registrar tu progreso."
          />
        ))}
      {mode === "activity" && (
        <>
          {heatmap.length ? (
            <Card>
              <h2 className="mb-3 font-bold text-foreground">Últimos días</h2>
              <div className="flex flex-wrap gap-1">
                {heatmap.slice(-120).map((day) => (
                  <span
                    key={day.date}
                    title={`${day.date}: ${day.total_chapters}`}
                    className="h-4 w-4 rounded-sm bg-primary"
                    style={{
                      opacity: Math.min(
                        1,
                        0.2 + Number(day.total_chapters) * 0.2,
                      ),
                    }}
                  />
                ))}
              </div>
            </Card>
          ) : (
            <EmptyState title="Sin actividad reciente" />
          )}
          {recent.map((item) => (
            <Card key={item.book_id} className="flex justify-between">
              <b>{item.book_name}</b>
              <span className="text-primary">
                {item.total_chapters} capítulos
              </span>
            </Card>
          ))}
        </>
      )}
      {mode === "highlights" &&
        (highlights.length ? (
          highlights.map((item) => (
            <Card
              key={item.id}
              style={{ borderLeft: `4px solid ${item.color}` }}
            >
              <b className="text-primary">
                {item.book_name} {item.chapter}:{item.verse}
              </b>
              <p className="mt-1 text-foreground">{item.text}</p>
            </Card>
          ))
        ) : (
          <EmptyState
            title="Sin subrayados"
            description="Selecciona versículos en el lector y elige un color."
          />
        ))}
    </div>
  );
}
