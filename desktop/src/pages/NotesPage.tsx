import { useState } from "react";
import { OfflineBanner } from "@/components/OfflineBanner";
import { DevotionalEditorView, DevotionalsView } from "@/pages/notes/DevotionalsView";
import { NotebookDetailView } from "@/pages/notes/NotebookDetailView";
import { NotebookListView } from "@/pages/notes/NotebookListView";
import { NoteEditorView } from "@/pages/notes/NoteEditorView";
import { StudyBookDetailView, StudyBooksView } from "@/pages/notes/StudyBooksView";

type NotesSection = "libretas" | "diario" | "libros";

type View =
  | { kind: "hub" }
  | { kind: "notebook"; id: number }
  | { kind: "note-edit"; notebookId: number; noteId: number | null }
  | { kind: "devotional-edit"; id: number | null }
  | { kind: "book"; id: number };

const TABS: { key: NotesSection; label: string }[] = [
  { key: "libretas", label: "Libretas" },
  { key: "diario", label: "Diario" },
  { key: "libros", label: "Libros" },
];

export function NotesPage() {
  const [section, setSection] = useState<NotesSection>("libretas");
  const [view, setView] = useState<View>({ kind: "hub" });

  function goHub() {
    setView({ kind: "hub" });
  }

  if (view.kind === "note-edit") {
    return (
      <div className="p-6">
        <NoteEditorView
          notebookId={view.notebookId}
          noteId={view.noteId}
          onBack={() => setView({ kind: "notebook", id: view.notebookId })}
          onSaved={() => setView({ kind: "notebook", id: view.notebookId })}
        />
      </div>
    );
  }

  if (view.kind === "devotional-edit") {
    return (
      <div className="p-6">
        <DevotionalEditorView
          devotionalId={view.id}
          onBack={goHub}
          onSaved={goHub}
        />
      </div>
    );
  }

  if (view.kind === "notebook") {
    return (
      <div className="mx-auto max-w-5xl p-6">
        <NotebookDetailView
          notebookId={view.id}
          onBack={goHub}
          onEditNote={(noteId) =>
            setView({ kind: "note-edit", notebookId: view.id, noteId })
          }
          onNewNote={() =>
            setView({ kind: "note-edit", notebookId: view.id, noteId: null })
          }
        />
      </div>
    );
  }

  if (view.kind === "book") {
    return (
      <div className="mx-auto max-w-5xl p-6">
        <StudyBookDetailView bookId={view.id} onBack={goHub} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <OfflineBanner />
      <header>
        <h1 className="text-2xl font-bold text-foreground">Notas</h1>
        <p className="text-sm text-muted-foreground">
          Libretas, diario espiritual y biblioteca personal.
        </p>
      </header>

      <div className="flex rounded-lg border border-border p-1">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => {
              setSection(t.key);
              goHub();
            }}
            className={`flex-1 rounded-md px-3 py-2 text-sm font-semibold ${
              section === t.key
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {section === "libretas" ? (
        <NotebookListView
          onOpenNotebook={(id) => setView({ kind: "notebook", id })}
        />
      ) : null}
      {section === "diario" ? (
        <DevotionalsView
          onEdit={(id) => setView({ kind: "devotional-edit", id })}
          onNew={() => setView({ kind: "devotional-edit", id: null })}
        />
      ) : null}
      {section === "libros" ? (
        <StudyBooksView onOpenBook={(id) => setView({ kind: "book", id })} />
      ) : null}
    </div>
  );
}
