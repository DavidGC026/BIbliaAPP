import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { VerseImageCreatorModal } from "@/components/VerseImageCreatorModal";
import { CrossReferencesModal } from "@/components/CrossReferencesModal";
import { OfflineBanner } from "@/components/OfflineBanner";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { useAuth } from "@/context/AuthContext";
import { DEFAULT_BIBLE_ID } from "@/lib/config";
import * as repo from "@/lib/repo";
import * as api from "@/lib/api";
import { buildImageCreatorData } from "@/lib/verseUtils";
import {
  getReaderPalette,
  getReaderPreferences,
  saveLastPassage,
  saveReaderPreferences,
  type ReaderPreferences,
} from "@/lib/preferences";
import type {
  BibleTarget,
  BibleVersion,
  Book,
  Verse,
  VerseCommentaryEntry,
  VerseHighlight,
  VerseNoteLink,
} from "@/lib/types";
import { VerseText } from "./bible-reader/verse-text";
import { VersionSelector } from "./bible-reader/version-selector";
import { ReaderSettings } from "./bible-reader/reader-settings";
import { ReaderToolbar } from "./bible-reader/reader-toolbar";
import { BibleAudioPlayer } from "./bible-reader/audio-player";

type Props = {
  target?: BibleTarget;
};

function selectionLabel(
  bookName: string,
  chapter: number,
  selected: number[],
): string {
  if (selected.length === 0) return "";
  const sorted = [...selected].sort((a, b) => a - b);
  return sorted.length === 1
    ? `${bookName} ${chapter}:${sorted[0]}`
    : `${bookName} ${chapter}:${sorted[0]}-${sorted[sorted.length - 1]}`;
}

export function BibleReader({ target }: Props) {
  const { token } = useAuth();
  const canAnnotate = !!token;

  const [bibles, setBibles] = useState<BibleVersion[]>([]);
  const [books, setBooks] = useState<Book[]>([]);
  const [verses, setVerses] = useState<Verse[]>([]);
  const [highlights, setHighlights] = useState<VerseHighlight[]>([]);
  const [noteLinks, setNoteLinks] = useState<VerseNoteLink[]>([]);
  const [commentaries, setCommentaries] = useState<VerseCommentaryEntry[]>([]);

  const [bibleId, setBibleId] = useState(DEFAULT_BIBLE_ID);
  const [bookId, setBookId] = useState<number | null>(null);
  const [chapter, setChapter] = useState(1);
  const [currentVerse, setCurrentVerse] = useState(1);

  const [selectedVerses, setSelectedVerses] = useState<number[]>([]);
  const [noteModalOpen, setNoteModalOpen] = useState(false);
  const [imageCreatorOpen, setImageCreatorOpen] = useState(false);
  const [refsModalOpen, setRefsModalOpen] = useState(false);
  const [selectedVerseForRefs, setSelectedVerseForRefs] =
    useState<Verse | null>(null);

  const [noteText, setNoteText] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingChapter, setLoadingChapter] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [preferences, setPreferences] = useState<ReaderPreferences>(() =>
    getReaderPreferences(),
  );
  const [showSettings, setShowSettings] = useState(false);

  // Audio / TTS state
  const [showAudioPlayer, setShowAudioPlayer] = useState(false);
  const [audioMode, setAudioMode] = useState<"chapter" | "selection">("chapter");
  const [speakingVerseNumber, setSpeakingVerseNumber] = useState<number | null>(
    null,
  );

  const lastSelectedRef = useRef<number | null>(null);
  const selectedBook = books.find((b) => b.bookId === bookId) ?? null;
  const maxChapter = selectedBook?.chapters ?? 1;
  const currentBible = bibles.find((b) => b.bibleId === bibleId);

  const highlightMap = useMemo(
    () => new Map(highlights.map((h) => [h.verse, h.color])),
    [highlights],
  );
  const noteMap = useMemo(
    () => new Map(noteLinks.map((n) => [n.verse, n])),
    [noteLinks],
  );

  // Group commentaries by verse number (since a commentary spans verseStart..verseEnd)
  const commentariesByVerse = useMemo(() => {
    const map = new Map<number, VerseCommentaryEntry[]>();
    if (!preferences.showCommentaries || commentaries.length === 0) return map;

    for (const c of commentaries) {
      const start = Number(c.verseStart);
      const end = Number(c.verseEnd || c.verseStart);
      for (let v = start; v <= end; v++) {
        const list = map.get(v) ?? [];
        list.push(c);
        map.set(v, list);
      }
    }
    return map;
  }, [commentaries, preferences.showCommentaries]);

  const readerPalette = useMemo(
    () => getReaderPalette(preferences.theme),
    [preferences.theme],
  );

  const readerLineHeight = preferences.density === "compact" ? 1.5 : 1.8;

  const imageCreatorData = useMemo(() => {
    if (!selectedBook || selectedVerses.length === 0) return null;
    return buildImageCreatorData({
      selectedVerses,
      verses,
      bookName: selectedBook.bookName,
      chapter,
      bibleAbbr: currentBible?.abbr ?? "RVR1960",
    });
  }, [selectedBook, selectedVerses, verses, chapter, currentBible?.abbr]);

  const clearSelection = useCallback(() => {
    setSelectedVerses([]);
    lastSelectedRef.current = null;
  }, []);

  const updatePreferences = (next: ReaderPreferences) => {
    setPreferences(next);
    saveReaderPreferences(next);
  };

  // 1. Initial Load: Bibles and Books
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const { bibles: bibleList } = await repo.repoListBibles();
        if (!mounted) return;

        setBibles(bibleList);

        const initialBible = target?.bibleId ?? bibleId;
        const validBible =
          bibleList.find((b: BibleVersion) => b.bibleId === initialBible)?.bibleId ??
          bibleList[0]?.bibleId ??
          DEFAULT_BIBLE_ID;
        setBibleId(validBible);

        const { books: bookList } = await repo.repoListBooks(validBible);
        if (!mounted) return;
        setBooks(bookList);

        const initialBook =
          target?.bookId ??
          (bookList.length > 0 ? bookList[0].bookId : 1);
        setBookId(initialBook);

        const initialChapter = target?.chapter ?? 1;
        setChapter(initialChapter);
      } catch (e) {
        if (!mounted) return;
        setError(e instanceof Error ? e.message : "Error al cargar la Biblia");
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  // 2. Handle external target updates
  useEffect(() => {
    if (!target) return;
    if (target.bibleId && target.bibleId !== bibleId) {
      setBibleId(target.bibleId);
    }
    if (target.bookId && target.bookId !== bookId) {
      setBookId(target.bookId);
    }
    if (target.chapter && target.chapter !== chapter) {
      setChapter(target.chapter);
    }
    clearSelection();
  }, [target]);

  // 3. Load Chapter Verses, Highlights, Notes, Commentaries
  const loadChapter = useCallback(async () => {
    if (bookId == null) return;
    setLoadingChapter(true);
    setError(null);
    try {
      const [vResult, hResult, notesResult] = await Promise.all([
        repo.repoGetVerses(bookId, chapter, bibleId),
        canAnnotate
          ? repo.repoGetHighlights(bookId, chapter, bibleId)
          : Promise.resolve({ highlights: [] }),
        canAnnotate
          ? repo.repoGetChapterNotes(bookId, chapter)
          : Promise.resolve({ links: [] }),
      ]);
      setVerses(vResult.verses || []);
      setHighlights(hResult.highlights || []);
      setNoteLinks(notesResult.links || []);
      setCurrentVerse(1);

      if (selectedBook && currentBible) {
        saveLastPassage({
          bibleId,
          bibleAbbr: currentBible.abbr,
          bookId,
          bookName: selectedBook.bookName,
          chapter,
        });
      }



      // Load commentaries if enabled
      if (preferences.showCommentaries) {
        api
          .getCommentaries({ book: bookId, chapter, bible: bibleId })
          .then((res) => setCommentaries(res.commentaries || []))
          .catch(() => setCommentaries([]));
      } else {
        setCommentaries([]);
      }
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Error al cargar el capítulo",
      );
    } finally {
      setLoadingChapter(false);
    }
  }, [
    bookId,
    chapter,
    bibleId,
    canAnnotate,
    selectedBook,
    currentBible,
    preferences.showCommentaries,
  ]);

  useEffect(() => {
    if (bookId != null && !loading) {
      loadChapter();
    }
  }, [bookId, chapter, bibleId, preferences.showCommentaries, loadChapter, loading]);

  // 4. Scroll-Spy: Track visible verse in viewport
  useEffect(() => {
    if (verses.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const verseNum = Number(entry.target.getAttribute("data-verse"));
            if (verseNum) {
              setCurrentVerse(verseNum);
            }
          }
        }
      },
      {
        root: null,
        rootMargin: "-20% 0px -60% 0px",
        threshold: 0,
      },
    );

    verses.forEach((v) => {
      const el = document.getElementById(`verse-${v.verse}`);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [verses, preferences.layout]);

  // Handlers for verse selection
  const toggleVerseSelection = useCallback((verseNum: number, shiftKey: boolean) => {
    setSelectedVerses((prev) => {
      if (shiftKey && lastSelectedRef.current != null) {
        const from = Math.min(lastSelectedRef.current, verseNum);
        const to = Math.max(lastSelectedRef.current, verseNum);
        const range: number[] = [];
        for (let i = from; i <= to; i++) range.push(i);
        return Array.from(new Set([...prev, ...range])).sort((a, b) => a - b);
      }
      lastSelectedRef.current = verseNum;
      if (prev.includes(verseNum)) {
        return prev.filter((v) => v !== verseNum);
      }
      return [...prev, verseNum].sort((a, b) => a - b);
    });
  }, []);

  const handleHighlightSelection = async (color: string | null) => {
    if (!canAnnotate || selectedVerses.length === 0 || bookId == null) return;
    setSaving(true);
    try {
      await repo.repoSetHighlights(
        bookId,
        chapter,
        selectedVerses,
        color,
        bibleId,
      );
      const { highlights: updated } = await repo.repoGetHighlights(
        bookId,
        chapter,
        bibleId,
      );
      setHighlights(updated);
      clearSelection();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Error al guardar el subrayado",
      );
    } finally {
      setSaving(false);
    }
  };


  const handleCopySelection = async () => {
    if (selectedVerses.length === 0 || !selectedBook) return;
    const selectedList = verses.filter((v) =>
      selectedVerses.includes(Number(v.verse)),
    );
    const text = selectedList
      .map((v) => `${v.verse}. ${v.text}`)
      .join("\n");
    const citation = `${selectedBook.bookName} ${chapter}:${selectedVerses.join(",")}`;
    const fullText = `${citation} (${currentBible?.abbr ?? "Biblia"})\n${text}`;

    await navigator.clipboard.writeText(fullText);
    clearSelection();
  };

  const handleShareSelection = async () => {
    if (selectedVerses.length === 0 || !selectedBook) return;
    const selectedList = verses.filter((v) =>
      selectedVerses.includes(Number(v.verse)),
    );
    const text = selectedList
      .map((v) => `${v.verse}. ${v.text}`)
      .join("\n");
    const citation = `${selectedBook.bookName} ${chapter}:${selectedVerses.join(",")}`;
    const shareText = `${citation}\n\n${text}`;

    if (navigator.share) {
      try {
        await navigator.share({ title: citation, text: shareText });
      } catch {
        await navigator.clipboard.writeText(shareText);
      }
    } else {
      await navigator.clipboard.writeText(shareText);
    }
  };

  const handleFavoriteSelection = async () => {
    if (!canAnnotate || selectedVerses.length === 0 || bookId == null || !selectedBook)
      return;
    setSaving(true);
    try {
      for (const vNum of selectedVerses) {
        const verseObj = verses.find((v) => Number(v.verse) === vNum);
        if (verseObj) {
          await repo.repoAddFavorite(
            bibleId,
            bookId,
            chapter,
            vNum,
            verseObj.text,
          );
        }
      }
      clearSelection();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al guardar favoritos");
    } finally {
      setSaving(false);
    }
  };

  const handleOpenNoteModal = (vNum?: number) => {
    const targetVerse = vNum ?? selectedVerses[0];
    if (!targetVerse) return;
    const existing = noteMap.get(targetVerse);
    setNoteText(existing?.noteContent ?? "");
    setNoteModalOpen(true);
  };

  const handleSaveNote = async () => {
    const targetVerse = selectedVerses[0];
    if (!targetVerse || bookId == null) return;
    setSaving(true);
    try {
      const existing = noteMap.get(targetVerse);
      if (!noteText.trim()) {
        if (existing?.id) {
          await repo.repoDeleteVerseNote(existing.id);
        }
      } else {
        await repo.repoSaveVerseNote(
          bookId,
          chapter,
          targetVerse,
          noteText.trim(),
        );
      }
      setNoteModalOpen(false);
      setNoteText("");
      const { links: updated } = await repo.repoGetChapterNotes(
        bookId,
        chapter,
      );
      setNoteLinks(updated);
      clearSelection();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al guardar la nota");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteNote = async () => {
    const targetVerse = selectedVerses[0];
    if (!targetVerse) return;
    const existing = noteMap.get(targetVerse);
    if (!existing?.id) return;
    setSaving(true);
    try {
      await repo.repoDeleteVerseNote(existing.id);
      setNoteModalOpen(false);
      setNoteText("");
      const { links: updated } = await repo.repoGetChapterNotes(
        bookId!,
        chapter,
      );
      setNoteLinks(updated);
      clearSelection();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al eliminar la nota");
    } finally {
      setSaving(false);
    }
  };



  const currentSelectionLabel = useMemo(() => {
    return selectionLabel(
      selectedBook?.bookName ?? "",
      chapter,
      selectedVerses,
    );
  }, [selectedBook?.bookName, chapter, selectedVerses]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <p className="text-muted-foreground animate-pulse">Cargando Biblia…</p>
      </div>
    );
  }

  return (
    <div className="desktop-page relative space-y-6 p-4 sm:p-6 pb-28">
      <OfflineBanner bibleId={bibleId} autoHideMs={10000} />

      {/* Sticky top control panel */}
      <div className="sticky top-0 z-30 -mx-4 -mt-4 sm:-mx-6 sm:-mt-6 rounded-b-2xl border-b border-border/80 bg-background/95 p-3 sm:p-4 shadow-sm backdrop-blur-md transition-all">
        <div className="max-w-5xl mx-auto flex flex-wrap items-center justify-between gap-3">
          {/* Selectors for version, book, chapter */}
          <VersionSelector
            bibles={bibles}
            selectedBibleId={bibleId}
            onBibleChange={(bId) => {
              clearSelection();
              setBibleId(bId);
            }}
            books={books}
            selectedBookId={bookId}
            onBookChange={(bId) => {
              clearSelection();
              setBookId(bId);
              setChapter(1);
            }}
            chapter={chapter}
            maxChapter={maxChapter}
            onChapterChange={(c) => {
              clearSelection();
              setChapter(c);
            }}
            disabled={loadingChapter}
          />

          {/* Right actions: Scroll-spy passage reference & tool buttons */}
          <div className="flex items-center gap-2">
            {/* Live scroll-spy verse reference */}
            {selectedBook && verses.length > 0 && (
              <span className="hidden md:inline font-serif text-xs italic text-muted-foreground tabular-nums px-2">
                {selectedBook.bookName} {chapter}:{currentVerse}
              </span>
            )}

            {/* TTS Audio button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setAudioMode("chapter");
                setShowAudioPlayer((v) => !v);
              }}
              className={`h-9 gap-1.5 px-3 ${
                showAudioPlayer
                  ? "border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold"
                  : ""
              }`}
              title="Escuchar capítulo en voz alta"
            >
              <Icon name="volume" size={15} />
              <span className="hidden sm:inline">Escuchar</span>
            </Button>

            {/* Reader settings button */}
            <Button
              variant={showSettings ? "primary" : "outline"}
              size="sm"
              onClick={() => setShowSettings((v) => !v)}
              className="h-9 gap-1.5 px-3"
              title="Ajustes de lectura (tipografía, párrafos, temas)"
            >
              <span className="font-serif font-bold text-xs">Aa</span>
              <span className="hidden sm:inline">Lectura</span>
            </Button>
          </div>
        </div>

        {/* Collapsible Reader Settings Panel */}
        {showSettings && (
          <div className="max-w-5xl mx-auto mt-3 pt-3 border-t border-border/60">
            <ReaderSettings
              preferences={preferences}
              onChange={updatePreferences}
            />
          </div>
        )}

        {/* Chapter progress bar (scroll-spy dynamic fill) */}
        {verses.length > 0 && (
          <div className="relative -mx-3 -mb-3 sm:-mx-4 sm:-mb-4 mt-3 h-[3px] overflow-hidden rounded-b-2xl bg-primary/10">
            <div
              className="h-full bg-primary/70 transition-[width] duration-300 ease-out"
              style={{
                width: `${Math.min(
                  100,
                  Math.max(2, (currentVerse / verses.length) * 100),
                )}%`,
              }}
            />
          </div>
        )}
      </div>

      {error && (
        <div className="mx-auto max-w-4xl xl:max-w-5xl rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Editorial Chapter Header (versalitas, large display numeral, fleurón ❦) */}
      {selectedBook && !loadingChapter && verses.length > 0 && (
        <header className="mx-auto mb-6 flex w-full max-w-4xl xl:max-w-5xl flex-col items-center text-center pt-2 sm:pt-4 md:mb-8">
          <p className="text-[11px] font-bold uppercase tracking-[0.32em] text-muted-foreground">
            {selectedBook.bookName}
          </p>
          <h1 className="mt-1 font-serif text-5xl font-semibold tracking-tight text-foreground md:text-6xl">
            {chapter}
          </h1>
          <div
            aria-hidden="true"
            className="mt-3 flex items-center gap-2.5 text-primary/70"
          >
            <span className="h-px w-10 bg-current opacity-40" />
            <span className="text-xs leading-none">❦</span>
            <span className="h-px w-10 bg-current opacity-40" />
          </div>
        </header>
      )}

      {loadingChapter && (
        <div className="mx-auto max-w-4xl xl:max-w-5xl py-12 text-center text-sm text-muted-foreground animate-pulse">
          Cargando versículos de {selectedBook?.bookName} {chapter}…
        </div>
      )}

      {/* Verses Container */}
      {!loadingChapter && verses.length > 0 && (
        <ol
          className={`mx-auto w-full max-w-4xl xl:max-w-5xl rounded-2xl transition-colors ${
            preferences.layout === "paragraphs"
              ? "reader-paragraphs leading-relaxed px-2 sm:px-4"
              : preferences.density === "compact"
                ? "space-y-0.5"
                : "space-y-1"
          } ${readerPalette ? "border p-4 sm:p-6" : ""}`}
          style={
            readerPalette
              ? {
                  backgroundColor: readerPalette.background,
                  borderColor: readerPalette.border,
                }
              : undefined
          }
        >
          {verses.map((v) => {
            const vNum = Number(v.verse);
            return (
              <VerseText
                key={v.id}
                verse={v}
                fontSize={preferences.fontSize}
                lineHeight={readerLineHeight}
                textAlign={preferences.align}
                layout={preferences.layout}
                textColor={readerPalette?.text}
                mutedColor={readerPalette?.muted}
                accentColor={readerPalette?.accent}
                borderColor={readerPalette?.border}
                hasNote={noteMap.has(vNum)}
                highlightColor={highlightMap.get(vNum)}
                isSelected={selectedVerses.includes(vNum)}
                isFlashed={false}
                isSpeaking={speakingVerseNumber === vNum}
                canAnnotate={canAnnotate}
                commentaries={commentariesByVerse.get(vNum)}
                onToggleSelect={toggleVerseSelection}
                onSetCurrent={setCurrentVerse}
                onNote={() => {
                  setSelectedVerses([vNum]);
                  handleOpenNoteModal(vNum);
                }}
                onCrossReferences={() => {
                  setSelectedVerseForRefs(v);
                  setRefsModalOpen(true);
                }}
              />
            );
          })}
        </ol>
      )}

      {/* Chapter Bottom Navigation */}
      {selectedBook && !loadingChapter && verses.length > 0 && (
        <div className="mx-auto mt-8 flex w-full max-w-4xl xl:max-w-5xl items-center justify-between border-t border-border/60 pt-6 pb-4">
          <Button
            variant="outline"
            onClick={() => {
              clearSelection();
              setChapter((c) => Math.max(1, c - 1));
            }}
            disabled={chapter <= 1}
            className="gap-2 cursor-pointer"
          >
            <span>‹ Capítulo anterior</span>
          </Button>

          <span className="font-serif text-sm italic text-muted-foreground tabular-nums">
            {selectedBook.bookName} {chapter}
          </span>

          <Button
            variant="outline"
            onClick={() => {
              clearSelection();
              setChapter((c) => Math.min(maxChapter, c + 1));
            }}
            disabled={chapter >= maxChapter}
            className="gap-2 cursor-pointer"
          >
            <span>Capítulo siguiente ›</span>
          </Button>
        </div>
      )}

      {/* Floating Selection Toolbar */}

      {selectedVerses.length > 0 && (
        <ReaderToolbar
          selectionLabel={currentSelectionLabel}
          canShare={currentBible?.canShare !== false}
          canCreateImage={
            !!imageCreatorData && currentBible?.canCreateImages !== false
          }
          onHighlight={handleHighlightSelection}
          onCopy={handleCopySelection}
          onShare={handleShareSelection}
          onFavorite={canAnnotate ? handleFavoriteSelection : undefined}
          onAddNote={
            canAnnotate && selectedVerses.length === 1
              ? () => handleOpenNoteModal()
              : undefined
          }
          onOpenImageCreator={() => setImageCreatorOpen(true)}
          onCrossReferences={
            selectedVerses.length === 1
              ? () => {
                  const vObj = verses.find(
                    (v) => Number(v.verse) === selectedVerses[0],
                  );
                  if (vObj) {
                    setSelectedVerseForRefs(vObj);
                    setRefsModalOpen(true);
                  }
                }
              : undefined
          }
          onListen={() => {
            setAudioMode("selection");
            setShowAudioPlayer(true);
          }}
          onClearSelection={clearSelection}
        />
      )}

      {/* Floating Audio Player */}
      {showAudioPlayer && (
        <BibleAudioPlayer
          verses={
            audioMode === "selection"
              ? verses
                  .filter((v) => selectedVerses.includes(Number(v.verse)))
                  .map((v) => ({ verse: Number(v.verse), text: v.text }))
              : verses.map((v) => ({ verse: Number(v.verse), text: v.text }))
          }
          chapterLabel={`${selectedBook?.bookName || ""} ${chapter}${
            audioMode === "selection" ? " (Selección)" : ""
          }`}
          onActiveVerseChange={setSpeakingVerseNumber}
          onClose={() => {
            setShowAudioPlayer(false);
            setSpeakingVerseNumber(null);
          }}
        />
      )}

      {/* Note Modal */}
      {noteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-serif text-lg font-bold text-foreground">
                Nota en {currentSelectionLabel}
              </h3>
              <button
                type="button"
                onClick={() => setNoteModalOpen(false)}
                className="rounded-lg p-1 text-muted-foreground hover:bg-muted"
              >
                ✕
              </button>
            </div>

            <textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Escribe tu reflexión o comentario personal sobre este versículo…"
              rows={6}
              className="w-full rounded-xl border border-border bg-background p-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />

            <div className="flex items-center justify-between gap-3 pt-2">
              {noteMap.has(selectedVerses[0]) ? (
                <Button
                  variant="outline"
                  onClick={handleDeleteNote}
                  loading={saving}
                  className="text-destructive hover:bg-destructive/10"
                >
                  Eliminar
                </Button>
              ) : (
                <div />
              )}
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={() => setNoteModalOpen(false)}
                >
                  Cancelar
                </Button>
                <Button onClick={handleSaveNote} loading={saving}>
                  Guardar
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Verse Image Creator Modal */}
      {imageCreatorData && (
        <VerseImageCreatorModal
          open={imageCreatorOpen}
          onClose={() => setImageCreatorOpen(false)}
          text={imageCreatorData.text}
          reference={imageCreatorData.reference}
          abbr={imageCreatorData.abbr}
        />
      )}

      {/* Cross References Modal */}
      {selectedVerseForRefs && selectedBook && (
        <CrossReferencesModal
          open={refsModalOpen}
          onClose={() => {
            setRefsModalOpen(false);
            setSelectedVerseForRefs(null);
          }}
          bibleId={bibleId}
          bookId={selectedBook.bookId}
          chapter={chapter}
          verse={Number(selectedVerseForRefs.verse)}
          reference={`${selectedBook.bookName} ${chapter}:${selectedVerseForRefs.verse}`}
          onOpenReference={(bId: number, c: number) => {
            setRefsModalOpen(false);
            setSelectedVerseForRefs(null);
            setBookId(bId);
            setChapter(c);
            clearSelection();
          }}
        />
      )}
    </div>
  );

}
