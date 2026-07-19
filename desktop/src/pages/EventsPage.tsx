import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { useAuth } from "@/context/AuthContext";
import * as api from "@/lib/api";
import type { ChurchEvent } from "@/lib/types";

const CATEGORIES = [
  ["culto", "Culto"],
  ["oracion", "Oración"],
  ["jovenes", "Jóvenes"],
  ["ministerio", "Ministerio"],
  ["otro", "Otro"],
] as const;

export function EventsPage() {
  const { user } = useAuth();
  const [events, setEvents] = useState<ChurchEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<number | null>(null);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    startTime: defaultDateTime(),
    endTime: "",
    location: "",
    category: "culto",
  });

  const load = useCallback(async () => {
    setError(null);
    try {
      const result = await api.listChurchEvents();
      setEvents(result.events);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudieron cargar los eventos",
      );
    }
  }, []);

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [load]);

  async function rsvp(eventId: number, status: "going" | "maybe" | "declined") {
    setBusy(eventId);
    try {
      await api.setEventRsvp(eventId, status);
      await load();
    } finally {
      setBusy(null);
    }
  }

  async function create() {
    if (!form.title.trim() || !form.startTime) {
      setError("El título y la fecha de inicio son obligatorios.");
      return;
    }
    const start = new Date(form.startTime);
    const end = form.endTime ? new Date(form.endTime) : null;
    if (Number.isNaN(start.getTime()) || (end && Number.isNaN(end.getTime()))) {
      setError("La fecha del evento no es válida.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await api.createChurchEvent({
        title: form.title.trim(),
        description: form.description.trim(),
        startTime: start.toISOString(),
        endTime: end?.toISOString() ?? null,
        location: form.location.trim(),
        category: form.category,
      });
      setCreating(false);
      setForm({
        title: "",
        description: "",
        startTime: defaultDateTime(),
        endTime: "",
        location: "",
        category: "culto",
      });
      await load();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "No se pudo crear el evento",
      );
    } finally {
      setSaving(false);
    }
  }

  async function remove(event: ChurchEvent) {
    if (!confirm(`¿Eliminar el evento “${event.title}”?`)) return;
    setBusy(event.id);
    try {
      await api.deleteChurchEvent(event.id);
      await load();
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="desktop-page space-y-5 p-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Calendario</h1>
          <p className="text-sm text-muted-foreground">
            Eventos de tu iglesia y de los grupos a los que perteneces.
          </p>
        </div>
        {user?.role === "admin" ? (
          <Button onClick={() => setCreating(true)}>Nuevo evento</Button>
        ) : null}
      </header>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {loading ? (
        <p className="text-muted-foreground">Cargando eventos…</p>
      ) : events.length === 0 ? (
        <EmptyState
          icon="calendar"
          title="Sin eventos próximos"
          description="Cuando tu iglesia o tus grupos publiquen eventos aparecerán aquí."
          action={
            user?.role === "admin" ? (
              <Button onClick={() => setCreating(true)}>Crear evento</Button>
            ) : undefined
          }
        />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {events.map((event) => {
            const isGroup = event.source === "group";
            return (
              <Card key={`${event.source}-${event.id}`} className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="font-bold text-foreground">{event.title}</h2>
                    <span className="mt-1 inline-flex rounded-full bg-primary/10 px-2 py-1 text-xs font-semibold text-primary">
                      {isGroup
                        ? `Grupo · ${event.group_name ?? ""}`
                        : categoryLabel(event.category)}
                    </span>
                  </div>
                  {user?.role === "admin" && !isGroup ? (
                    <button
                      className="text-xs font-semibold text-destructive"
                      disabled={busy === event.id}
                      onClick={() => void remove(event)}
                    >
                      Eliminar
                    </button>
                  ) : null}
                </div>
                <p className="text-sm font-semibold text-primary">
                  {new Date(event.start_time).toLocaleString("es", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </p>
                {event.location ? (
                  <p className="text-sm text-muted-foreground">
                    📍 {event.location}
                  </p>
                ) : null}
                {event.description ? (
                  <p className="text-sm leading-relaxed text-foreground">
                    {event.description}
                  </p>
                ) : null}
                <p className="text-xs text-muted-foreground">
                  Por {event.creator_name}
                  {event.going_count != null
                    ? ` · ${event.going_count} confirmados`
                    : ""}
                </p>
                {!isGroup ? (
                  <div className="grid grid-cols-3 gap-2">
                    {(
                      [
                        ["going", "Voy"],
                        ["maybe", "Tal vez"],
                        ["declined", "No puedo"],
                      ] as const
                    ).map(([status, label]) => (
                      <button
                        key={status}
                        disabled={busy === event.id}
                        onClick={() => void rsvp(event.id, status)}
                        className={`rounded-lg border px-2 py-2 text-xs font-semibold ${event.my_rsvp === status ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"}`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                ) : null}
              </Card>
            );
          })}
        </div>
      )}

      {creating ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 p-4">
          <Card className="max-h-[90vh] w-full max-w-xl overflow-y-auto">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-foreground">
                Nuevo evento
              </h2>
              <button onClick={() => setCreating(false)}>×</button>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <EventField label="Título" wide>
                <input
                  value={form.title}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      title: event.target.value,
                    }))
                  }
                  className={INPUT}
                />
              </EventField>
              <EventField label="Descripción" wide>
                <textarea
                  rows={3}
                  value={form.description}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      description: event.target.value,
                    }))
                  }
                  className={INPUT}
                />
              </EventField>
              <EventField label="Inicio">
                <input
                  type="datetime-local"
                  value={form.startTime}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      startTime: event.target.value,
                    }))
                  }
                  className={INPUT}
                />
              </EventField>
              <EventField label="Fin opcional">
                <input
                  type="datetime-local"
                  value={form.endTime}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      endTime: event.target.value,
                    }))
                  }
                  className={INPUT}
                />
              </EventField>
              <EventField label="Ubicación">
                <input
                  value={form.location}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      location: event.target.value,
                    }))
                  }
                  className={INPUT}
                />
              </EventField>
              <EventField label="Categoría">
                <select
                  value={form.category}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      category: event.target.value,
                    }))
                  }
                  className={INPUT}
                >
                  {CATEGORIES.map(([id, label]) => (
                    <option key={id} value={id}>
                      {label}
                    </option>
                  ))}
                </select>
              </EventField>
            </div>
            <div className="mt-5 flex gap-2">
              <Button loading={saving} onClick={() => void create()}>
                Publicar evento
              </Button>
              <Button variant="ghost" onClick={() => setCreating(false)}>
                Cancelar
              </Button>
            </div>
          </Card>
        </div>
      ) : null}
    </div>
  );
}

const INPUT =
  "mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground";

function EventField({
  label,
  wide,
  children,
}: {
  label: string;
  wide?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className={`text-sm ${wide ? "sm:col-span-2" : ""}`}>
      <span className="text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

function categoryLabel(category?: string) {
  return (
    CATEGORIES.find(([id]) => id === category)?.[1] ?? category ?? "Iglesia"
  );
}

function defaultDateTime() {
  const date = new Date(Date.now() + 60 * 60 * 1000);
  date.setMinutes(0, 0, 0);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}
