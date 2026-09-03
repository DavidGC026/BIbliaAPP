import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { parseMarkdownBlocks, type InlineToken } from "@/lib/commentaryMarkdown";
import type {
  Verse,
  VerseCommentaryEntry,
  VerseNoteLink,
} from "@/lib/types";

interface StudyPanelProps {
  bookName: string;
  chapter: number;
  currentVerse: number;
  selectedVerse: number | null;
  verses: Verse[];
  noteLinks: VerseNoteLink[];
  commentaries: VerseCommentaryEntry[];
  canAnnotate: boolean;
  onSaveNote: (verse: number, text: string) => Promise<void>;
  onDeleteNote: (linkId: number) => Promise<void>;
  onSelectVerse: (verse: number) => void;
  onClose: () => void;
}

type StudyTab = "notes" | "commentaries" | "crossrefs";

export function StudyPanel({
  bookName,
  chapter,
  currentVerse,
  selectedVerse,
  verses,
  noteLinks,
  commentaries,
  canAnnotate,
  onSaveNote,
  onDeleteNote,
  onSelectVerse,
  onClose,
}: StudyPanelProps) {
  const [activeTab, setActiveTab] = useState<StudyTab>("notes");
  const targetVerse = selectedVerse ?? currentVerse;

  // Note editing state
  const [editingVerse, setEditingVerse] = useState<number | null>(null);
  const [noteContent, setNoteContent] = useState("");
  const [savingNote, setSavingNote] = useState(false);

  // Selected commentary author
  const [selectedAuthor, setSelectedAuthor] = useState<string | null>(null);

  // Filter commentaries for the current/selected verse
  const verseCommentaries = commentaries.filter((c) => {
    const start = Number(c.verseStart);
    const end = Number(c.verseEnd || c.verseStart);
    return targetVerse >= start && targetVerse <= end;
  });
  const authors = Array.from(new Set(verseCommentaries.map((c) => c.author)));
  const currentAuthor =
    selectedAuthor && authors.includes(selectedAuthor)
      ? selectedAuthor
      : authors[0] ?? null;
  const activeCommentary = verseCommentaries.find(
    (c) => c.author === currentAuthor,
  );

  const startEditNote = (vNum: number, existingText = "") => {
    setEditingVerse(vNum);
    setNoteContent(existingText);
  };

  const cancelEditNote = () => {
    setEditingVerse(null);
    setNoteContent("");
  };

  const handleSave = async (vNum: number) => {
    setSavingNote(true);
    try {
      await onSaveNote(vNum, noteContent);
      cancelEditNote();
    } finally {
      setSavingNote(false);
    }
  };

  return (
    <div className="flex h-full w-full flex-col overflow-hidden rounded-2xl border border-border/80 bg-card/90 shadow-lg backdrop-blur-md">
      {/* Panel Top Header */}
      <div className="flex items-center justify-between border-b border-border/60 bg-card px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Icon name="notes" size={15} />
          </div>
          <div>
            <h3 className="text-xs font-bold text-foreground">
              Panel de Estudio
            </h3>
            <p className="text-[11px] text-muted-foreground">
              {bookName} {chapter}:{targetVerse}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          title="Cerrar panel de estudio"
        >
          <Icon name="close" size={15} />
        </button>
      </div>

      {/* Tabs Switcher */}
      <div className="grid grid-cols-3 border-b border-border/40 bg-muted/40 p-1 text-xs">
        <button
          type="button"
          onClick={() => setActiveTab("notes")}
          className={`flex items-center justify-center gap-1.5 rounded-lg py-1.5 font-semibold transition-colors ${
            activeTab === "notes"
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Icon name="edit" size={13} />
          <span>Notas ({noteLinks.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("commentaries")}
          className={`flex items-center justify-center gap-1.5 rounded-lg py-1.5 font-semibold transition-colors ${
            activeTab === "commentaries"
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Icon name="book" size={13} />
          <span>Comentarios</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("crossrefs")}
          className={`flex items-center justify-center gap-1.5 rounded-lg py-1.5 font-semibold transition-colors ${
            activeTab === "crossrefs"
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Icon name="sparkles" size={13} />
          <span>Referencias</span>
        </button>
      </div>

      {/* Panel Content Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* ================= TAB 1: NOTAS ================= */}
        {activeTab === "notes" && (
          <div className="space-y-4">
            {/* Quick add note button for current verse */}
            {canAnnotate && editingVerse !== targetVerse && (
              <Button
                variant="outline"
                fullWidth
                size="sm"
                onClick={() => {
                  const existing = noteLinks.find(
                    (n) => n.verse === targetVerse,
                  );
                  startEditNote(targetVerse, existing?.noteContent ?? "");
                }}
                className="justify-center gap-2 text-xs border-dashed border-primary/40 hover:border-primary text-primary"
              >
                <Icon name="add" size={14} />
                <span>Escribir nota para versículo {targetVerse}</span>
              </Button>
            )}

            {/* Inline Note Editor */}
            {editingVerse != null && (
              <Card className="border-primary/40 p-3.5 space-y-3 bg-primary/[0.02]">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-primary">
                    Nota para {bookName} {chapter}:{editingVerse}
                  </span>
                  <button
                    type="button"
                    onClick={cancelEditNote}
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    Cancelar
                  </button>
                </div>
                <textarea
                  autoFocus
                  rows={4}
                  value={noteContent}
                  onChange={(e) => setNoteContent(e.target.value)}
                  placeholder="Escribe tus reflexiones, apuntes devocionales o revelaciones…"
                  className="w-full rounded-xl border border-input bg-background p-2.5 text-xs text-foreground outline-none focus:ring-2 focus:ring-primary"
                />
                <div className="flex justify-end gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={cancelEditNote}
                    disabled={savingNote}
                    className="h-8 text-xs"
                  >
                    Cancelar
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleSave(editingVerse)}
                    loading={savingNote}
                    className="h-8 text-xs font-bold"
                  >
                    Guardar nota
                  </Button>
                </div>
              </Card>
            )}

            {/* Chapter Notes List */}
            {noteLinks.length === 0 && editingVerse == null ? (
              <div className="py-8 text-center text-xs text-muted-foreground space-y-2">
                <p>No hay notas guardadas en {bookName} {chapter}.</p>
                <p className="text-[11px] opacity-80">
                  Selecciona un versículo para añadir tu primer apunte.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Notas de este capítulo ({noteLinks.length})
                </p>
                {noteLinks.map((link) => (
                  <Card
                    key={link.id}
                    className={`p-3 space-y-2 border-border/80 transition-all ${
                      link.verse === targetVerse
                        ? "border-primary/60 bg-primary/[0.04] ring-1 ring-primary/30"
                        : "hover:bg-accent/40"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => onSelectVerse(link.verse)}
                        className="text-xs font-bold text-primary hover:underline text-left"
                      >
                        Versículo {link.verse}
                      </button>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() =>
                            startEditNote(
                              link.verse,
                              link.noteContent ?? "",
                            )
                          }
                          className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
                          title="Editar nota"
                        >
                          <Icon name="edit" size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteNote(link.id)}
                          className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                          title="Eliminar nota"
                        >
                          <Icon name="delete" size={13} />
                        </button>
                      </div>
                    </div>

                    <p className="text-xs text-foreground whitespace-pre-wrap leading-relaxed">
                      {link.noteContent}
                    </p>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ================= TAB 2: COMENTARIOS ================= */}
        {activeTab === "commentaries" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-foreground">
                Versículo {targetVerse}
              </span>
              {authors.length > 1 && (
                <select
                  value={currentAuthor ?? ""}
                  onChange={(e) => setSelectedAuthor(e.target.value)}
                  className="rounded-lg border border-border bg-card px-2.5 py-1 text-xs text-foreground outline-none"
                >
                  {authors.map((a) => (
                    <option key={a} value={a}>
                      {a}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {activeCommentary ? (
              <Card className="p-4 space-y-3 bg-card border-border/80">
                <div className="border-b border-border/40 pb-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
                    Comentario Bíblico
                  </span>
                  <h4 className="text-sm font-bold text-foreground">
                    {activeCommentary.author}
                  </h4>
                </div>
                <div className="text-xs text-muted-foreground leading-relaxed space-y-2">
                  {parseMarkdownBlocks(activeCommentary.contentMd).map((block, i) =>
                    renderBlock(block, i),
                  )}
                </div>
              </Card>
            ) : (
              <div className="py-8 text-center text-xs text-muted-foreground space-y-1">
                <p>No hay comentarios disponibles para el versículo {targetVerse}.</p>
                <p className="text-[11px] opacity-75">
                  Haz clic en otro versículo para consultar sus notas expositivas.
                </p>
              </div>
            )}
          </div>
        )}

        {/* ================= TAB 3: REFERENCIAS ================= */}
        {activeTab === "crossrefs" && (
          <div className="space-y-3">
            <p className="text-xs font-bold text-foreground">
              Referencias para {bookName} {chapter}:{targetVerse}
            </p>
            {verses.find((v) => Number(v.verse) === targetVerse) ? (
              <div className="rounded-xl border border-border/60 bg-muted/20 p-3 text-xs italic text-foreground">
                «{verses.find((v) => Number(v.verse) === targetVerse)?.text}»
              </div>
            ) : null}

            <p className="text-xs text-muted-foreground leading-relaxed">
              Las referencias cruzadas te permiten comparar pasajes paralelos en el Antiguo y Nuevo Testamento con temas coincidentes.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function renderBlock(block: any, key: number) {
  if (block.type === "list") {
    return block.ordered ? (
      <ol key={key} className="list-decimal pl-4 my-2 space-y-1 text-xs">
        {block.items.map((item: InlineToken[], idx: number) => (
          <li key={idx}>{renderInline(item)}</li>
        ))}
      </ol>
    ) : (
      <ul key={key} className="list-disc pl-4 my-2 space-y-1 text-xs">
        {block.items.map((item: InlineToken[], idx: number) => (
          <li key={idx}>{renderInline(item)}</li>
        ))}
      </ul>
    );
  }
  if (block.type === "quote") {
    return (
      <blockquote key={key} className="border-l-2 border-primary/60 pl-2.5 my-2 italic text-muted-foreground">
        {renderInline(block.inline)}
      </blockquote>
    );
  }
  if (block.type === "heading") {
    return (
      <h5 key={key} className="font-bold text-foreground mt-2 mb-1 text-xs">
        {renderInline(block.inline)}
      </h5>
    );
  }
  return (
    <p key={key} className="my-1.5 leading-relaxed text-xs">
      {renderInline(block.inline)}
    </p>
  );
}

function renderInline(tokens: InlineToken[]) {

  return tokens.map((t, idx) => {
    let node: React.ReactNode = t.text;
    if (t.bold) node = <strong key={idx}>{node}</strong>;
    if (t.italic) node = <em key={idx}>{node}</em>;
    return <span key={idx}>{node}</span>;
  });
}
