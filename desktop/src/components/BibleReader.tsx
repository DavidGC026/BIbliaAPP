import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { OfflineBanner } from "@/components/OfflineBanner";
import { VerseImageCreatorModal } from "@/components/VerseImageCreatorModal";
import { CrossReferencesModal } from "@/components/CrossReferencesModal";
import { useAuth } from "@/context/AuthContext";
import * as api from "@/lib/api";
import { DEFAULT_BIBLE_ID } from "@/lib/config";
import {
  getReaderPreferences,
  saveLastPassage,
  saveReaderPreferences,
  type ReaderPreferences,
} from "@/lib/preferences";
import * as repo from "@/lib/repo";
import type {
  BibleTarget,
  BibleVersion,
  Book,
  InterlinearWordView,
  Verse,
  VerseCommentaryEntry,
  VerseHighlight,
  VerseNoteLink,
} from "@/lib/types";

import { VersionSelector } from "./bible-reader/version-selector";
import { ReaderToolbar } from "./bible-reader/reader-toolbar";
import { ReaderSettings } from "./bible-reader/reader-settings";
import { BibleAudioPlayer } from "./bible-reader/audio-player";
import { VerseText } from "./bible-reader/verse-text";
import { InterlinearSuperscription } from "./bible-reader/interlinear-panel";
import { StudyPanel } from "./bible-reader/study-panel";
import { VerseCompareModal } from "./bible-reader/verse-compare-modal";

type Props = {
  target?: BibleTarget;
};

export function BibleReader({ target }: Props) {
  const { user } = useAuth();
  const canAnnotate = user != null;

  // --------------------------------------------------------------------------
  // ESTADOS PRINCIPALES
  // --------------------------------------------------------------------------
  const [bibles, setBibles] = useState<BibleVersion[]>([]);
  const [books, setBooks] = useState<Book[]>([]);
  const [bibleId, setBibleId] = useState<number>(target?.bibleId ?? DEFAULT_BIBLE_ID);
  const [bookId, setBookId] = useState<number | null>(target?.bookId ?? null);
  const [chapter, setChapter] = useState<number>(target?.chapter ?? 1);

  const [verses, setVerses] = useState<Verse[]>([]);
  const [highlights, setHighlights] = useState<VerseHighlight[]>([]);
  const [noteLinks, setNoteLinks] = useState<VerseNoteLink[]>([]);
  const [commentaries, setCommentaries] = useState<VerseCommentaryEntry[]>([]);
  const [interlinearWords, setInterlinearWords] = useState<InterlinearWordView[]>([]);

  const [loading, setLoading] = useState(true);
  const [loadingChapter, setLoadingChapter] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Selecciones y navegación
  const [selectedVerses, setSelectedVerses] = useState<number[]>([]);
  const [currentVerse, setCurrentVerse] = useState<number>(1);
  const lastSelectedRef = useRef<number | null>(null);

  // Paneles y herramientas
  const [preferences, setPreferences] = useState<ReaderPreferences>(getReaderPreferences);
  const [showSettings, setShowSettings] = useState(false);
  const [showAudioPlayer, setShowAudioPlayer] = useState(false);
  const [audioMode, setAudioMode] = useState<"chapter" | "selection">("chapter");
  const [speakingVerseNumber, setSpeakingVerseNumber] = useState<number | null>(null);

  // Modales
  const [refsModalOpen, setRefsModalOpen] = useState(false);
  const [selectedVerseForRefs, setSelectedVerseForRefs] = useState<Verse | null>(null);
  const [imageCreatorOpen, setImageCreatorOpen] = useState(false);

  // Panel de estudio lateral dividido (Split View) — Activo por defecto en escritorio
  const [showStudyPanel, setShowStudyPanel] = useState(true);


  // Modo Paralelo de lectura (2 Versiones lado a lado sincronizadas)
  const [isParallel, setIsParallel] = useState(false);
  const [parallelBibleId, setParallelBibleId] = useState<number>(DEFAULT_BIBLE_ID);
  const [parallelVerses, setParallelVerses] = useState<Verse[]>([]);
  const [loadingParallel, setLoadingParallel] = useState(false);

  // Modal de comparación de versículo en todas las versiones
  const [compareModalOpen, setCompareModalOpen] = useState(false);
  const [compareVerseNumber, setCompareVerseNumber] = useState<number>(1);

  // --------------------------------------------------------------------------
  // MEMOS Y DATOS DERIVADOS
  // --------------------------------------------------------------------------
  const selectedBook = useMemo(
    () => books.find((b) => b.bookId === bookId) ?? null,
    [books, bookId],
  );

  const currentBible = useMemo(
    () => bibles.find((b) => b.bibleId === bibleId) ?? null,
    [bibles, bibleId],
  );

  const parallelBible = useMemo(
    () => bibles.find((b) => b.bibleId === parallelBibleId) ?? null,
    [bibles, parallelBibleId],
  );

  const maxChapter = selectedBook?.chapters ?? 1;

  const highlightMap = useMemo(() => {
    const map = new Map<number, string>();
    for (const h of highlights) {
      if (h.color) map.set(h.verse, h.color);
    }
    return map;
  }, [highlights]);

  const noteMap = useMemo(
    () => new Map(noteLinks.map((n) => [n.verse, n])),
    [noteLinks],
  );

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

  const interlinearByVerse = useMemo(() => {
    const map = new Map<number, InterlinearWordView[]>();
    if (!preferences.showInterlinear || interlinearWords.length === 0) return map;
    for (const word of interlinearWords) {
      const list = map.get(word.verse) ?? [];
      list.push(word);
      map.set(word.verse, list);
    }
    return map;
  }, [interlinearWords, preferences.showInterlinear]);
  const superscriptionWords = interlinearByVerse.get(0);

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

  // --------------------------------------------------------------------------
  // CARGA INICIAL: Versiones y Libros
  // --------------------------------------------------------------------------
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

        // Inicializar versión secundaria para paralelo (segunda de la lista si hay)
        const secondBible =
          bibleList.find((b: BibleVersion) => b.bibleId !== validBible)?.bibleId ?? validBible;
        setParallelBibleId(secondBible);

        const { books: bookList } = await repo.repoListBooks(validBible);
        if (!mounted) return;
        setBooks(bookList);

        const initialBook =
          target?.bookId ?? (bookList.length > 0 ? bookList[0].bookId : 1);
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

  // Sincronizar catálogo de libros al cambiar de versión bíblica
  useEffect(() => {
    if (!bibleId || loading) return;
    let mounted = true;
    repo
      .repoListBooks(bibleId)
      .then(({ books: list }) => {
        if (!mounted) return;
        setBooks(list);
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, [bibleId, loading]);

  // Control de target externo
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


  // --------------------------------------------------------------------------
  // CARGA DE CAPÍTULO (Versículos, Subrayados, Notas, Comentarios)
  // --------------------------------------------------------------------------
  const loadChapter = useCallback(async () => {
    if (bookId == null) return;
    setLoadingChapter(true);
    setError(null);
    try {
      const [vResult, hResult, notesResult] = await Promise.all([
        repo.repoGetVerses(bibleId, bookId, chapter),
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

      // Cargar comentarios si están activos
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

  useEffect(() => {
    if (
      bookId == null ||
      !preferences.showInterlinear ||
      !currentBible?.hasInterlinear
    ) {
      setInterlinearWords([]);
      return;
    }
    let mounted = true;
    api
      .getInterlinear({ book: bookId, chapter })
      .then((res) => {
        if (mounted) setInterlinearWords(res.words || []);
      })
      .catch(() => {
        if (mounted) setInterlinearWords([]);
      });
    return () => {
      mounted = false;
    };
  }, [
    bookId,
    chapter,
    preferences.showInterlinear,
    currentBible?.hasInterlinear,
  ]);

  // Carga de versículos paralelos cuando el modo paralelo está activo
  useEffect(() => {
    if (!isParallel || bookId == null || parallelBibleId === bibleId) {
      setParallelVerses([]);
      return;
    }
    setLoadingParallel(true);
    repo
      .repoGetVerses(parallelBibleId, bookId, chapter)
      .then((res) => setParallelVerses(res.verses || []))
      .catch(() => setParallelVerses([]))
      .finally(() => setLoadingParallel(false));
  }, [isParallel, bookId, chapter, parallelBibleId, bibleId]);

  // Scroll-Spy: Seguimiento de versículo en pantalla
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
  }, [verses, preferences.layout, isParallel]);

  // --------------------------------------------------------------------------
  // ACCIONES Y MANEJADORES
  // --------------------------------------------------------------------------
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
    }
  };

  const handleCopySelection = async () => {
    if (selectedVerses.length === 0 || !selectedBook) return;
    const selectedList = verses.filter((v) =>
      selectedVerses.includes(Number(v.verse)),
    );
    const text = selectedList.map((v) => `(${v.verse}) ${v.text}`).join(" ");
    const label = selectionLabel(
      selectedBook.bookName,
      chapter,
      selectedVerses,
    );
    const shareText = `«${text}»\n— ${label} (${currentBible?.abbr ?? "Biblia"})`;
    await navigator.clipboard.writeText(shareText);
  };

  const handleShareSelection = async () => {
    if (selectedVerses.length === 0 || !selectedBook) return;
    const shareText = buildSelectionShareText({
      selectedVerses,
      verses,
      bookName: selectedBook.bookName,
      chapter,
      bibleAbbr: currentBible?.abbr ?? "Biblia",
    });

    if (navigator.share) {
      await navigator.share({
        title: selectionLabel(selectedBook.bookName, chapter, selectedVerses),
        text: shareText,
      }).catch(() => {});
    } else {
      await navigator.clipboard.writeText(shareText);
    }
  };

  const handleFavoriteSelection = async () => {
    if (!canAnnotate || selectedVerses.length === 0 || bookId == null || !selectedBook)
      return;
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
    }
  };

  // Guardado de notas en el panel de estudio lateral
  const handleSaveVerseNote = async (verseNum: number, text: string) => {
    if (bookId == null) return;
    try {
      const existing = noteMap.get(verseNum);
      if (!text.trim()) {
        if (existing?.id) {
          await repo.repoDeleteVerseNote(existing.id);
        }
      } else {
        await repo.repoSaveVerseNote(bookId, chapter, verseNum, text.trim());
      }
      const { links: updated } = await repo.repoGetChapterNotes(
        bookId,
        chapter,
      );
      setNoteLinks(updated);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al guardar la nota");
    }
  };

  const handleDeleteVerseNote = async (linkId: number) => {
    if (bookId == null) return;
    try {
      await repo.repoDeleteVerseNote(linkId);
      const { links: updated } = await repo.repoGetChapterNotes(
        bookId,
        chapter,
      );
      setNoteLinks(updated);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al eliminar la nota");
    }
  };

  const handleOpenCompareModal = (vNum?: number) => {
    const targetV = vNum ?? selectedVerses[0] ?? currentVerse;
    setCompareVerseNumber(targetV);
    setCompareModalOpen(true);
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
    <div className="desktop-page relative space-y-6 p-4 sm:p-6 lg:p-8 pb-28 w-full">
      <OfflineBanner bibleId={bibleId} autoHideMs={10000} />

      {/* Sticky top control panel */}
      <div className="sticky top-0 z-30 -mx-4 -mt-4 sm:-mx-6 sm:-mt-6 lg:-mx-8 lg:-mt-8 rounded-b-2xl border-b border-border/80 bg-background/95 p-3 sm:p-4 shadow-sm backdrop-blur-md transition-all">
        <div className="w-full flex flex-wrap items-center justify-between gap-3">
          {/* Selectors for version, book, chapter */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
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

            {/* Selector de 2ª versión para Modo Paralelo */}
            {isParallel && (
              <div className="flex items-center gap-1.5 animate-fade-in border-l border-border/60 pl-2">
                <span className="text-[11px] font-bold uppercase text-primary">
                  || Paralelo:
                </span>
                <select
                  value={parallelBibleId}
                  onChange={(e) => setParallelBibleId(Number(e.target.value))}
                  className="rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs font-semibold text-foreground"
                >
                  {bibles.map((b) => (
                    <option key={b.bibleId} value={b.bibleId}>
                      {b.abbr} — {b.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Right actions: Live verse reference & study tools */}
          <div className="flex items-center gap-2">
            {/* Live scroll-spy verse reference */}
            {selectedBook && verses.length > 0 && (
              <span className="hidden md:inline font-serif text-xs italic text-muted-foreground tabular-nums px-2">
                {selectedBook.bookName} {chapter}:{currentVerse}
              </span>
            )}

            {/* Botón MODO PARALELO / COMPARAR */}
            <Button
              variant={isParallel ? "primary" : "outline"}
              size="sm"
              onClick={() => setIsParallel((v) => !v)}
              className="h-9 gap-1.5 px-3 text-xs"
              title="Comparar 2 versiones bíblicas lado a lado"
            >
              <Icon name="compare" size={15} />
              <span className="hidden sm:inline">
                {isParallel ? "Paralelo activo" : "Comparar"}
              </span>
            </Button>

            {/* Botón PANEL DE ESTUDIO / NOTAS DIVIDIDO */}
            <Button
              variant={showStudyPanel ? "primary" : "outline"}
              size="sm"
              onClick={() => setShowStudyPanel((v) => !v)}
              className="h-9 gap-1.5 px-3 text-xs"
              title="Abrir panel dividido de notas y comentarios"
            >
              <Icon name="split" size={15} />
              <span className="hidden sm:inline">
                {showStudyPanel ? "Cerrar estudio" : "Notas & Estudio"}
              </span>
            </Button>

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
          <div className="w-full mt-3 pt-3 border-t border-border/60">
            <ReaderSettings
              preferences={preferences}
              onChange={updatePreferences}
              interlinearAvailable={Boolean(currentBible?.hasInterlinear)}
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
        <div className="w-full rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Editorial Chapter Header (versalitas, large display numeral, fleurón ❦) */}
      {selectedBook && !loadingChapter && verses.length > 0 && (
        <header className="w-full mb-6 flex flex-col items-center text-center pt-2 sm:pt-4 md:mb-8">
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
        <div className="w-full py-12 text-center text-sm text-muted-foreground animate-pulse">
          Cargando versículos de {selectedBook?.bookName} {chapter}…
        </div>
      )}

      {/* ========================================================================= */}
      {/* CUERPO PRINCIPAL DEL LECTOR: Dividido (Split Study) o Simple */}
      {/* ========================================================================= */}
      {!loadingChapter && verses.length > 0 && (
        <div className="flex flex-col lg:flex-row gap-6 items-start w-full">
          {/* COLUMNA DE LECTURA BÍBLICA */}
          <div
            className={`flex-1 min-w-0 w-full transition-all ${
              showStudyPanel ? "lg:max-w-[calc(100%-400px)] xl:max-w-[calc(100%-460px)]" : "max-w-4xl mx-auto"
            }`}
          >
            {/* MODO PARALELO: 2 Versiones lado a lado sincronizadas */}
            {isParallel ? (
              <div
                className="w-full rounded-2xl border border-border/80 bg-card/60 p-4 sm:p-6 shadow-sm space-y-3"
                style={
                  readerPalette
                    ? {
                        backgroundColor: readerPalette.background,
                        borderColor: readerPalette.border,
                      }
                    : undefined
                }
              >
                <div className="grid grid-cols-2 gap-6 border-b border-border/60 pb-3 text-xs font-bold text-primary uppercase tracking-wider">
                  <div>{currentBible?.abbr ?? "Versión 1"} ({currentBible?.name})</div>
                  <div>{parallelBible?.abbr ?? "Versión 2"} ({parallelBible?.name})</div>
                </div>

                {loadingParallel ? (
                  <div className="py-8 text-center text-sm text-muted-foreground animate-pulse">
                    Cargando traducción paralela…
                  </div>
                ) : (
                  <div className="space-y-1 divide-y divide-border/40">
                    {verses.map((v1) => {
                      const vNum = Number(v1.verse);
                      const v2 = parallelVerses.find(
                        (p) => Number(p.verse) === vNum,
                      );
                      const isSelected = selectedVerses.includes(vNum);

                      return (
                        <div
                          key={v1.id}
                          id={`verse-${vNum}`}
                          data-verse={vNum}
                          onClick={() => toggleVerseSelection(vNum, false)}
                          className={`grid grid-cols-2 gap-6 p-3 rounded-xl transition-colors cursor-pointer ${
                            isSelected
                              ? "bg-primary/10 ring-1 ring-primary"
                              : "hover:bg-accent/40"
                          }`}
                          style={{
                            fontSize: `${preferences.fontSize}px`,
                            lineHeight: readerLineHeight,
                          }}
                        >
                          <div className="leading-relaxed">
                            <span className="font-bold text-primary text-xs mr-2 select-none">
                              {vNum}
                            </span>
                            <span className="font-serif text-foreground">
                              {v1.text}
                            </span>
                          </div>

                          <div className="leading-relaxed border-l border-border/40 pl-4">
                            <span className="font-bold text-primary/70 text-xs mr-2 select-none">
                              {vNum}
                            </span>
                            <span className="font-serif text-foreground/90">
                              {v2?.text ?? (
                                <span className="text-muted-foreground italic">
                                  No disponible
                                </span>
                              )}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              /* MODO LECTURA NORMAL (Párrafos continuos o Versículos individuales) */
              <ol
                className={`w-full rounded-2xl transition-colors ${
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
                {superscriptionWords && superscriptionWords.length > 0 ? (
                  <InterlinearSuperscription
                    words={superscriptionWords}
                    fontSize={preferences.fontSize}
                    mutedColor={readerPalette?.muted}
                    accentColor={readerPalette?.accent}
                    borderColor={readerPalette?.border}
                  />
                ) : null}
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
                      interlinearWords={interlinearByVerse.get(vNum)}
                      onToggleSelect={toggleVerseSelection}
                      onSetCurrent={setCurrentVerse}
                      onNote={() => {
                        setSelectedVerses([vNum]);
                        setShowStudyPanel(true);
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
              <div className="w-full mt-8 flex items-center justify-between border-t border-border/60 pt-6 pb-4">
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
          </div>

          {/* PANEL LATERAL DIVIDIDO: Notas, Comentarios y Referencias */}
          {showStudyPanel && selectedBook && (
            <aside className="w-full lg:w-[380px] xl:w-[440px] shrink-0 sticky top-20 h-[calc(100vh-6.5rem)] animate-fade-in">
              <StudyPanel
                bookName={selectedBook.bookName}
                chapter={chapter}
                currentVerse={currentVerse}
                selectedVerse={selectedVerses[0] ?? null}
                verses={verses}
                noteLinks={noteLinks}
                commentaries={commentaries}
                canAnnotate={canAnnotate}
                onSaveNote={handleSaveVerseNote}
                onDeleteNote={handleDeleteVerseNote}
                onSelectVerse={(vNum) => {
                  setSelectedVerses([vNum]);
                  const el = document.getElementById(`verse-${vNum}`);
                  if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
                }}
                onClose={() => setShowStudyPanel(false)}
              />
            </aside>
          )}
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
          onFavorite={handleFavoriteSelection}
          onAddNote={() => setShowStudyPanel(true)}
          onCompare={() => handleOpenCompareModal(selectedVerses[0])}
          onOpenImageCreator={() => setImageCreatorOpen(true)}
          onCrossReferences={() => {
            const firstSelected = verses.find(
              (v) => Number(v.verse) === selectedVerses[0],
            );
            if (firstSelected) {
              setSelectedVerseForRefs(firstSelected);
              setRefsModalOpen(true);
            }
          }}
          onListen={() => {
            setAudioMode("selection");
            setShowAudioPlayer(true);
          }}
          onClearSelection={clearSelection}
        />
      )}

      {/* Audio Player */}
      {showAudioPlayer && (
        <BibleAudioPlayer
          verses={
            audioMode === "selection"
              ? verses
                  .filter((v) => selectedVerses.includes(Number(v.verse)))
                  .map((v) => ({ verse: Number(v.verse), text: v.text }))
              : verses.map((v) => ({ verse: Number(v.verse), text: v.text }))
          }
          chapterLabel={`${selectedBook?.bookName ?? ""} ${chapter}`}
          onActiveVerseChange={(vNum: number | null) => {
            setSpeakingVerseNumber(vNum);
            if (vNum) {
              const el = document.getElementById(`verse-${vNum}`);
              if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
            }
          }}
          onClose={() => {
            setShowAudioPlayer(false);
            setSpeakingVerseNumber(null);
          }}
        />
      )}

      {/* Verse Image Creator Modal */}
      {imageCreatorData && imageCreatorOpen && (
        <VerseImageCreatorModal
          open={imageCreatorOpen}
          onClose={() => setImageCreatorOpen(false)}
          text={imageCreatorData.text}
          reference={imageCreatorData.reference}
          abbr={imageCreatorData.abbr}
        />
      )}

      {/* Cross-References Modal */}
      {selectedVerseForRefs && selectedBook && refsModalOpen && (
        <CrossReferencesModal
          open={refsModalOpen}
          onClose={() => {
            setRefsModalOpen(false);
            setSelectedVerseForRefs(null);
          }}
          verse={selectedVerseForRefs.verse}
          reference={`${selectedBook.bookName} ${chapter}:${selectedVerseForRefs.verse}`}
          bookId={selectedBook.bookId}
          chapter={chapter}
          bibleId={bibleId}
          onOpenReference={(bId: number, chap: number) => {
            setBookId(bId);
            setChapter(chap);
            setRefsModalOpen(false);
          }}
        />
      )}

      {/* Multi-Version Compare Modal */}
      {selectedBook && compareModalOpen && (
        <VerseCompareModal
          isOpen={compareModalOpen}
          bookId={selectedBook.bookId}
          bookName={selectedBook.bookName}
          chapter={chapter}
          verseNumber={compareVerseNumber}
          bibles={bibles}
          onClose={() => setCompareModalOpen(false)}
        />
      )}
    </div>
  );
}

// --------------------------------------------------------------------------
// HELPERS AUXILIARES
// --------------------------------------------------------------------------
function selectionLabel(bookName: string, chapter: number, verses: number[]): string {
  if (verses.length === 0) return `${bookName} ${chapter}`;
  if (verses.length === 1) return `${bookName} ${chapter}:${verses[0]}`;
  const sorted = [...verses].sort((a, b) => a - b);
  return `${bookName} ${chapter}:${sorted[0]}-${sorted[sorted.length - 1]}`;
}

function buildSelectionShareText({
  selectedVerses,
  verses,
  bookName,
  chapter,
  bibleAbbr,
}: {
  selectedVerses: number[];
  verses: Verse[];
  bookName: string;
  chapter: number;
  bibleAbbr: string;
}): string {
  const selectedList = verses.filter((v) =>
    selectedVerses.includes(Number(v.verse)),
  );
  const text = selectedList.map((v) => `«${v.text}» (${v.verse})`).join(" ");
  const label = selectionLabel(bookName, chapter, selectedVerses);
  return `${text}\n— ${label} (${bibleAbbr})\n\nCompartido desde BibliaAPP`;
}

function buildImageCreatorData({
  selectedVerses,
  verses,
  bookName,
  chapter,
  bibleAbbr,
}: {
  selectedVerses: number[];
  verses: Verse[];
  bookName: string;
  chapter: number;
  bibleAbbr: string;
}) {
  const selectedList = verses.filter((v) =>
    selectedVerses.includes(Number(v.verse)),
  );
  if (selectedList.length === 0) return null;
  const text = selectedList.map((v) => v.text).join(" ");
  const reference = selectionLabel(bookName, chapter, selectedVerses);
  return { text, reference, abbr: bibleAbbr };
}

function getReaderPalette(theme?: string) {
  switch (theme) {
    case "light":
      return { background: "#FAF8F5", text: "#1F2937", muted: "#6B7280", accent: "#92700C", border: "#E5E7EB" };
    case "sepia":
      return { background: "#F4ECD8", text: "#433422", muted: "#8A5A2B", accent: "#8A5A2B", border: "#DCCBA4" };
    case "dark":
      return { background: "#1C1917", text: "#F5F5F4", muted: "#A8A29E", accent: "#E8B84A", border: "#292524" };
    default:
      return null;
  }
}
