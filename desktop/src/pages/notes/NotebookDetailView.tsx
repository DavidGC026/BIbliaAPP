import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { BookCover } from "@/components/notes/BookCover";
import * as repo from "@/lib/repo";
import { stripNotePreview } from "@/lib/notebookCovers";
import type { Notebook, NotebookNote } from "@/lib/types";

type Props = {
  notebookId: number;
  onBack: () => void;
  onEditNote: (noteId: number) => void;
  onNewNote: () => void;
};

export function NotebookDetailView({
  notebookId,
  onBack,
  onEditNote,
  onNewNote,
}: Props) {
  const [notebook, setNotebook] = useState<Notebook | null>(null);
  const [notes, setNotes] = useState<NotebookNote[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      setError(null);
      const [{ notebooks }, { notes: list }] = await Promise.all([
        repo.repoListNotebooks(),
        repo.repoListNotebookNotes(notebookId),
      ]);
      setNotebook(notebooks.find((n) => n.id === notebookId) ?? null);
      setNotes(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    }
  }

  useEffect(() => {
    setLoading(true);
    load().finally(() => setLoading(false));
  }, [notebookId]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return notes;
    return notes.filter(
      (n) =>
        n.title.toLowerCase().includes(q) ||
        stripNotePreview(n.content, 500).toLowerCase().includes(q),
    );
  }, [notes, search]);

  async function removeNote(note: NotebookNote) {
    if (!confirm(`¿Eliminar "${note.title || "Sin título"}"?`)) return;
    await repo.repoDeleteNotebookNote(note.id);
    await load();
  }

  return (
    <div className="space-y-4">
      <Button variant="ghost" onClick={onBack}>
        ← Libretas
      </Button>

      {loading ? (
        <p className="text-muted-foreground">Cargando…</p>
      ) : error ? (
        <p className="text-destructive">{error}</p>
      ) : (
        <>
          {notebook ? (
            <div className="flex gap-4">
              <BookCover title={notebook.name} coverImage={notebook.coverImage} className="max-w-[80px]" />
              <div>
                <h2 className="text-xl font-bold text-foreground">{notebook.name}</h2>
                <p className="text-sm text-muted-foreground">
                  {notes.length} {notes.length === 1 ? "nota" : "notas"}
                </p>
              </div>
            </div>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar notas…"
              className="min-w-0 flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm"
            />
            <Button onClick={onNewNote}>Nueva nota</Button>
          </div>

          {filtered.length === 0 ? (
            <Card className="text-center text-muted-foreground">
              {notes.length === 0 ? "Aún no hay notas en esta libreta." : "Sin resultados."}
            </Card>
          ) : (
            <div className="space-y-2">
              {filtered.map((n) => (
                <Card key={n.id} className="flex items-start justify-between gap-3">
                  <button
                    type="button"
                    className="min-w-0 flex-1 text-left"
                    onClick={() => onEditNote(n.id)}
                  >
                    <p className="font-semibold text-foreground">
                      {n.title || "Sin título"}
                    </p>
                    <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                      {stripNotePreview(n.content)}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground/70">
                      {new Date(n.updatedAt).toLocaleDateString("es")}
                    </p>
                  </button>
                  <button
                    type="button"
                    className="text-xs text-destructive"
                    onClick={() => removeNote(n)}
                  >
                    Eliminar
                  </button>
                </Card>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
