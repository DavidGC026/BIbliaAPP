import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { AuthedImage } from "@/components/AuthedImage";
import { Icon } from "@/components/ui/Icon";
import * as api from "@/lib/api";
import type { BookLog, ExternalBook } from "@/lib/types";

type Props = {
  onOpenBook: (id: number) => void;
};

export function StudyBooksView({ onOpenBook }: Props) {
  const [books, setBooks] = useState<ExternalBook[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    const { books: list } = await api.listExternalBooks();
    setBooks(list);
  }

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, []);

  async function addBook() {
    if (!title.trim()) return;
    setSaving(true);
    try {
      await api.createExternalBook(title.trim(), author.trim() || "Autor desconocido");
      setTitle("");
      setAuthor("");
      setShowForm(false);
      await load();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Libros físicos o externos con bitácora de lectura.
        </p>
        <Button onClick={() => setShowForm(true)}>Añadir libro</Button>
      </div>

      {showForm ? (
        <Card className="space-y-3">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Título del libro"
            className="w-full rounded-lg border border-input px-3 py-2"
          />
          <input
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            placeholder="Autor"
            className="w-full rounded-lg border border-input px-3 py-2"
          />
          <div className="flex gap-2">
            <Button onClick={addBook} loading={saving} disabled={!title.trim()}>
              Guardar
            </Button>
            <Button variant="ghost" onClick={() => setShowForm(false)}>
              Cancelar
            </Button>
          </div>
        </Card>
      ) : null}

      {loading ? (
        <p className="text-muted-foreground">Cargando…</p>
      ) : books.length === 0 ? (
        <Card className="text-center text-muted-foreground">Biblioteca vacía.</Card>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {books.map((b) => (
            <button
              key={b.id}
              type="button"
              onClick={() => onOpenBook(b.id)}
              className="rounded-xl border border-border bg-card p-3 text-left hover:bg-accent/30"
            >
              {b.coverImage ? (
                <AuthedImage uri={b.coverImage} className="mb-2 h-28 w-full rounded-lg object-cover" />
              ) : (
                <div className="mb-2 flex h-28 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon name="book" size={34} />
                </div>
              )}
              <p className="font-semibold text-foreground line-clamp-2">{b.title}</p>
              <p className="text-xs text-muted-foreground">{b.author}</p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

type DetailProps = {
  bookId: number;
  onBack: () => void;
};

export function StudyBookDetailView({ bookId, onBack }: DetailProps) {
  const [book, setBook] = useState<ExternalBook | null>(null);
  const [logs, setLogs] = useState<BookLog[]>([]);
  const [reflection, setReflection] = useState("");
  const [chapter, setChapter] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  async function load() {
    const res = await api.getExternalBook(bookId);
    setBook(res.book);
    setLogs(res.logs);
  }

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [bookId]);

  async function addLog() {
    if (!reflection.trim()) return;
    setSaving(true);
    try {
      await api.addExternalBookLog(bookId, {
        reflection: reflection.trim(),
        chapter: chapter.trim() || undefined,
      });
      setReflection("");
      setChapter("");
      await load();
    } finally {
      setSaving(false);
    }
  }

  async function removeBook() {
    if (!book || !confirm(`¿Eliminar "${book.title}"?`)) return;
    await api.deleteExternalBook(bookId);
    onBack();
  }

  if (loading) return <p className="text-muted-foreground">Cargando…</p>;

  return (
    <div className="space-y-4">
      <Button variant="ghost" onClick={onBack}>
        ← Libros
      </Button>
      {book ? (
        <>
          <h2 className="text-xl font-bold">{book.title}</h2>
          <p className="text-muted-foreground">{book.author}</p>
          <Button variant="ghost" onClick={removeBook}>
            Eliminar libro
          </Button>
        </>
      ) : null}
      <Card className="space-y-3">
        <p className="text-sm font-medium">Nueva entrada de lectura</p>
        <input
          value={chapter}
          onChange={(e) => setChapter(e.target.value)}
          placeholder="Capítulo / páginas (opcional)"
          className="w-full rounded-lg border border-input px-3 py-2 text-sm"
        />
        <textarea
          value={reflection}
          onChange={(e) => setReflection(e.target.value)}
          placeholder="Reflexión…"
          rows={4}
          className="w-full rounded-lg border border-input px-3 py-2 text-sm"
        />
        <Button onClick={addLog} loading={saving} disabled={!reflection.trim()}>
          Guardar entrada
        </Button>
      </Card>
      <div className="space-y-2">
        {logs.map((log) => (
          <Card key={log.id} className="text-sm">
            {log.chapter ? (
              <p className="font-semibold text-primary">{log.chapter}</p>
            ) : null}
            <p className="text-foreground">{log.reflection}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {new Date(log.createdAt).toLocaleDateString("es")}
            </p>
          </Card>
        ))}
      </div>
    </div>
  );
}
