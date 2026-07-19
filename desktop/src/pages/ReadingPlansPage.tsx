import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import * as api from "@/lib/api";
import {
  formatPlanReadings,
  parsePlanDays,
  parsePlanProgress,
} from "@/lib/readingPlans";
import type { BibleTarget, ReadingPlan, UserReadingPlan } from "@/lib/types";

export function ReadingPlansPage({
  onOpenBible,
}: {
  onOpenBible?: (target: BibleTarget) => void;
}) {
  const [plans, setPlans] = useState<ReadingPlan[]>([]);
  const [userPlans, setUserPlans] = useState<UserReadingPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<number | null>(null);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const data = await api.getReadingPlans();
    setPlans(data.plans);
    setUserPlans(data.userPlans);
  }
  useEffect(() => {
    load()
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Error al cargar planes"),
      )
      .finally(() => setLoading(false));
  }, []);

  async function join(planId: number) {
    setBusy(planId);
    try {
      await api.joinReadingPlan(planId);
      await load();
    } finally {
      setBusy(null);
    }
  }
  async function toggleDay(plan: UserReadingPlan, day: number) {
    const done = parsePlanProgress(plan.progress);
    const next = done.includes(day)
      ? done.filter((item) => item !== day)
      : [...done, day].sort((a, b) => a - b);
    setBusy(plan.planId);
    try {
      await api.updatePlanProgress(plan.planId, next);
      await load();
    } finally {
      setBusy(null);
    }
  }

  if (loading) return <p className="text-muted-foreground">Cargando planes…</p>;
  if (error)
    return (
      <EmptyState
        icon="!"
        title="No se pudieron cargar los planes"
        description={error}
        action={
          <Button
            onClick={() => {
              setError(null);
              setLoading(true);
              load()
                .catch((e) => setError(String(e)))
                .finally(() => setLoading(false));
            }}
          >
            Reintentar
          </Button>
        }
      />
    );
  if (!plans.length && !userPlans.length)
    return (
      <EmptyState
        icon="☷"
        title="Aún no hay planes"
        description="Cuando haya planes disponibles podrás seguir las lecturas y registrar tu progreso aquí."
      />
    );

  return (
    <div className="space-y-6">
      <Card className="flex items-center gap-4">
        <span className="text-3xl">📚</span>
        <div className="flex-1">
          <h2 className="text-lg font-bold text-foreground">
            Planes de lectura
          </h2>
          <p className="text-sm text-muted-foreground">
            Avanza a tu ritmo y convierte cada lectura en un hábito.
          </p>
        </div>
        {userPlans.length ? (
          <span className="rounded-full bg-primary/15 px-3 py-1 text-sm font-bold text-primary">
            {userPlans.length} activos
          </span>
        ) : null}
      </Card>

      {userPlans.length ? (
        <section className="space-y-3">
          <h3 className="text-lg font-bold text-foreground">En curso</h3>
          {userPlans.map((plan) => {
            const days = parsePlanDays(plan.chaptersData);
            const done = parsePlanProgress(plan.progress);
            const next = days.find((day) => !done.includes(day.day));
            const percent = plan.durationDays
              ? Math.round((done.length / plan.durationDays) * 100)
              : 0;
            return (
              <Card key={plan.planId} className="space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h4 className="font-bold text-foreground">{plan.name}</h4>
                    <p className="text-sm text-muted-foreground">
                      {plan.description}
                    </p>
                  </div>
                  <strong className="text-xl text-primary">{percent}%</strong>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${Math.min(100, percent)}%` }}
                  />
                </div>
                {next ? (
                  <div className="rounded-xl border border-primary/25 bg-primary/10 p-4">
                    <p className="text-xs font-bold uppercase text-primary">
                      Siguiente lectura · Día {next.day}
                    </p>
                    <p className="mt-1 font-semibold text-foreground">
                      {formatPlanReadings(next.readings)}
                    </p>
                    <div className="mt-3 flex gap-2">
                      <Button
                        onClick={() => {
                          const first = next.readings[0];
                          if (first)
                            onOpenBible?.({
                              bookId: first.bookId,
                              chapter: first.chapters[0],
                            });
                        }}
                      >
                        Leer ahora
                      </Button>
                      <Button
                        variant="outline"
                        loading={busy === plan.planId}
                        onClick={() => toggleDay(plan, next.day)}
                      >
                        ✓ Completar
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="rounded-xl bg-primary/10 p-4 font-bold text-primary">
                    🏆 Plan completado
                  </p>
                )}
                <button
                  className="text-sm font-semibold text-primary"
                  onClick={() =>
                    setExpanded(expanded === plan.planId ? null : plan.planId)
                  }
                >
                  {expanded === plan.planId
                    ? "Ocultar calendario"
                    : "Ver calendario completo"}
                </button>
                {expanded === plan.planId ? (
                  <div className="divide-y divide-border border-t border-border">
                    {days.map((day) => (
                      <div
                        key={day.day}
                        className="flex items-center gap-3 py-3"
                      >
                        <button
                          type="button"
                          disabled={busy === plan.planId}
                          onClick={() => toggleDay(plan, day.day)}
                          className={`h-6 w-6 rounded-full border ${done.includes(day.day) ? "border-primary bg-primary text-primary-foreground" : "border-border"}`}
                        >
                          {done.includes(day.day) ? "✓" : ""}
                        </button>
                        <button
                          className="flex-1 text-left"
                          onClick={() => {
                            const first = day.readings[0];
                            if (first)
                              onOpenBible?.({
                                bookId: first.bookId,
                                chapter: first.chapters[0],
                              });
                          }}
                        >
                          <span className="block text-xs text-muted-foreground">
                            Día {day.day}
                          </span>
                          <span
                            className={
                              done.includes(day.day)
                                ? "text-muted-foreground line-through"
                                : "text-foreground"
                            }
                          >
                            {formatPlanReadings(day.readings)}
                          </span>
                        </button>
                      </div>
                    ))}
                  </div>
                ) : null}
              </Card>
            );
          })}
        </section>
      ) : null}

      <section className="space-y-3">
        <h3 className="text-lg font-bold text-foreground">
          Descubre nuevos planes
        </h3>
        <div className="grid gap-3 md:grid-cols-2">
          {plans.map((plan) => {
            const joined = userPlans.some(
              (item) => item.planId === plan.id || item.id === plan.id,
            );
            return (
              <Card key={plan.id} className="flex flex-col gap-2">
                <h4 className="font-bold text-foreground">{plan.name}</h4>
                <p className="flex-1 text-sm text-muted-foreground">
                  {plan.description}
                </p>
                <p className="text-xs font-semibold text-muted-foreground">
                  {plan.durationDays} días
                </p>
                {joined ? (
                  <span className="font-semibold text-primary">
                    ✓ Ya está en tus planes
                  </span>
                ) : (
                  <Button
                    loading={busy === plan.id}
                    onClick={() => join(plan.id)}
                  >
                    Comenzar plan
                  </Button>
                )}
              </Card>
            );
          })}
        </div>
      </section>
    </div>
  );
}
