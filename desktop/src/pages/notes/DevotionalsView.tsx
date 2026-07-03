import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import * as api from "@/lib/api";
import { DEVOTIONAL_EMOTIONS, parseDevotionalContent } from "@/lib/devotional";
import type { Devotional, DevotionalContent } from "@/lib/types";

type Props = {
  onEdit: (id: number) => void;
  onNew: () => void;
};

export function DevotionalsView({ onEdit, onNew }: Props) {
  const [items, setItems] = useState<Devotional[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    const { devotionals } = await api.listDevotionals();
    setItems(devotionals);
  }

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, []);

  async function remove(dev: Devotional) {
    if (!confirm("¿Eliminar esta entrada del diario?")) return;
    await api.deleteDevotional(dev.id);
    await load();
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between gap-3">
        <p className="text-sm text-muted-foreground">Tu diario espiritual personal.</p>
        <Button onClick={onNew}>Nueva entrada</Button>
      </div>
      {loading ? (
        <p className="text-muted-foreground">Cargando…</p>
      ) : items.length === 0 ? (
        <Card className="text-center text-muted-foreground">
          Aún no hay entradas en tu diario.
        </Card>
      ) : (
        <div className="space-y-3">
          {items.map((d) => {
            const c = parseDevotionalContent(d);
            return (
              <Card key={d.id} className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <button type="button" className="text-left" onClick={() => onEdit(d.id)}>
                    <p className="font-semibold text-foreground">{d.title}</p>
                    {d.emotion ? (
                      <p className="text-xs text-primary">{d.emotion}</p>
                    ) : null}
                    {d.verseRef ? (
                      <p className="text-xs text-muted-foreground">{d.verseRef}</p>
                    ) : null}
                  </button>
                  <button
                    type="button"
                    className="text-xs text-destructive"
                    onClick={() => remove(d)}
                  >
                    Eliminar
                  </button>
                </div>
                {c.reflection ? (
                  <p className="line-clamp-3 text-sm text-muted-foreground">{c.reflection}</p>
                ) : null}
                <p className="text-xs text-muted-foreground/70">
                  {new Date(d.createdAt).toLocaleDateString("es")}
                </p>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

type EditorProps = {
  devotionalId: number | null;
  onBack: () => void;
  onSaved: () => void;
};

export function DevotionalEditorView({ devotionalId, onBack, onSaved }: EditorProps) {
  const isNew = devotionalId === null;
  const [title, setTitle] = useState("");
  const [emotion, setEmotion] = useState("");
  const [verseRef, setVerseRef] = useState("");
  const [reflection, setReflection] = useState("");
  const [application, setApplication] = useState("");
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isNew || !devotionalId) return;
    setLoading(true);
    api
      .listDevotionals()
      .then(({ devotionals }) => {
        const d = devotionals.find((x) => x.id === devotionalId);
        if (!d) return;
        setTitle(d.title);
        setEmotion(d.emotion ?? "");
        setVerseRef(d.verseRef ?? "");
        const c = parseDevotionalContent(d);
        setReflection(c.reflection);
        setApplication(c.application);
      })
      .finally(() => setLoading(false));
  }, [isNew, devotionalId]);

  async function save() {
    const content: DevotionalContent = { reflection, application };
    setSaving(true);
    try {
      const payload = {
        title: title.trim() || "Entrada",
        emotion: emotion || null,
        verseRef: verseRef.trim() || null,
        content,
      };
      if (isNew) await api.createDevotional(payload);
      else if (devotionalId) await api.updateDevotional(devotionalId, payload);
      onSaved();
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="text-muted-foreground">Cargando…</p>;

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <Button variant="ghost" onClick={onBack}>
        ← Diario
      </Button>
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Título"
        className="w-full rounded-lg border border-input bg-background px-3 py-2 text-lg font-bold"
      />
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm">
          <span className="text-muted-foreground">Emoción</span>
          <select
            value={emotion}
            onChange={(e) => setEmotion(e.target.value)}
            className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2"
          >
            <option value="">—</option>
            {DEVOTIONAL_EMOTIONS.map((e) => (
              <option key={e.name} value={e.name}>
                {e.emoji} {e.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="text-muted-foreground">Versículo</span>
          <input
            value={verseRef}
            onChange={(e) => setVerseRef(e.target.value)}
            placeholder="Salmo 23:1"
            className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2"
          />
        </label>
      </div>
      <label className="block text-sm">
        <span className="text-muted-foreground">Reflexión</span>
        <textarea
          value={reflection}
          onChange={(e) => setReflection(e.target.value)}
          rows={6}
          className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2"
        />
      </label>
      <label className="block text-sm">
        <span className="text-muted-foreground">Aplicación</span>
        <textarea
          value={application}
          onChange={(e) => setApplication(e.target.value)}
          rows={4}
          className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2"
        />
      </label>
      <Button onClick={save} loading={saving}>
        Guardar
      </Button>
    </div>
  );
}
