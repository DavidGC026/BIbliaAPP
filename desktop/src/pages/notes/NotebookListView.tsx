import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { BookCover } from "@/components/notes/BookCover";
import { NotebookFormModal } from "@/components/notes/NotebookFormModal";
import * as repo from "@/lib/repo";
import type { Notebook } from "@/lib/types";

type Props = {
  onOpenNotebook: (id: number) => void;
};

export function NotebookListView({ onOpenNotebook }: Props) {
  const [notebooks, setNotebooks] = useState<Notebook[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Notebook | null>(null);
  const [saving, setSaving] = useState(false);

  async function load() {
    try {
      setError(null);
      const { notebooks: list } = await repo.repoListNotebooks();
      setNotebooks(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar");
    }
  }

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, []);

  async function save(name: string, cover: string) {
    setSaving(true);
    try {
      if (editing) {
        await repo.repoUpdateNotebook(editing.id, name, cover);
      } else {
        await repo.repoCreateNotebook(name, cover);
      }
      setModalOpen(false);
      setEditing(null);
      await load();
    } finally {
      setSaving(false);
    }
  }

  async function remove(nb: Notebook) {
    if (!confirm(`¿Eliminar "${nb.name}" y todas sus notas?`)) return;
    await repo.repoDeleteNotebook(nb.id);
    await load();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Cuadernos para apuntes y estudio bíblico.
        </p>
        <Button
          onClick={() => {
            setEditing(null);
            setModalOpen(true);
          }}
        >
          Crear libreta
        </Button>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      {loading ? (
        <p className="text-muted-foreground">Cargando…</p>
      ) : notebooks.length === 0 ? (
        <Card className="text-center">
          <p className="text-muted-foreground">Sin libretas todavía.</p>
          <Button className="mt-3" onClick={() => setModalOpen(true)}>
            Crear libreta
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
          {notebooks.map((nb) => (
            <div key={nb.id} className="group relative">
              <BookCover
                title={nb.name}
                coverImage={nb.coverImage}
                onClick={() => onOpenNotebook(nb.id)}
              />
              <div className="mt-2 flex gap-1">
                <button
                  type="button"
                  className="text-xs text-primary hover:underline"
                  onClick={() => {
                    setEditing(nb);
                    setModalOpen(true);
                  }}
                >
                  Editar
                </button>
                <button
                  type="button"
                  className="text-xs text-destructive hover:underline"
                  onClick={() => remove(nb)}
                >
                  Eliminar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <NotebookFormModal
        open={modalOpen}
        mode={editing ? "edit" : "create"}
        initialName={editing?.name}
        initialCover={editing?.coverImage}
        saving={saving}
        onClose={() => {
          setModalOpen(false);
          setEditing(null);
        }}
        onSave={save}
      />
    </div>
  );
}
