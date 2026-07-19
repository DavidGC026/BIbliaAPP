import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { InsertDictionaryModal } from "@/components/InsertDictionaryModal";
import { InsertVerseModal } from "@/components/InsertVerseModal";
import * as api from "@/lib/api";
import { formatDictionaryHtml } from "@/lib/dictionary";
import {
  buildDictBlockHtml,
  buildImageBlockHtml,
  buildTableBlockHtml,
  initNoteEditorBlocks,
  serializeNoteHtml,
  setImageBackgroundSelection,
  wrapAllContentBlocks,
} from "@/lib/noteEditorBlocks";
import {
  deleteNoteFont,
  ensureNoteFontLoaded,
  getFavoriteNoteColors,
  getNoteFont,
  getNoteFontFamily,
  NOTE_FONTS,
  saveFavoriteNoteColors,
  saveNoteFont,
} from "@/lib/notePreferences";
import * as repo from "@/lib/repo";
import { plainToHtml } from "@/lib/notebookCovers";
import type { CSSProperties } from "react";
import type { StrongEntry } from "@/lib/types";

type Props = {
  notebookId: number;
  noteId: number | null;
  onBack: () => void;
  onSaved: () => void;
};

type ToolbarButton = {
  cmd: string;
  label: string;
  title: string;
  style?: CSSProperties;
};

const FORMAT_BUTTONS: ToolbarButton[] = [
  { cmd: "bold", label: "B", title: "Negrita", style: { fontWeight: 900 } },
  {
    cmd: "italic",
    label: "I",
    title: "Cursiva",
    style: { fontStyle: "italic" },
  },
  {
    cmd: "underline",
    label: "U",
    title: "Subrayado",
    style: { textDecoration: "underline" },
  },
  {
    cmd: "strikeThrough",
    label: "S",
    title: "Tachado",
    style: { textDecoration: "line-through" },
  },
  { cmd: "insertUnorderedList", label: "•≡", title: "Lista" },
  { cmd: "insertOrderedList", label: "1.", title: "Lista numerada" },
  { cmd: "outdent", label: "⇤", title: "Reducir sangría" },
  { cmd: "indent", label: "⇥", title: "Aumentar sangría" },
];

const FONT_SIZES = [
  { px: "14px", label: "14" },
  { px: "16px", label: "16" },
  { px: "20px", label: "20" },
  { px: "28px", label: "28" },
];

export function NoteEditorView({ notebookId, noteId, onBack, onSaved }: Props) {
  const isNew = noteId === null;
  const editorRef = useRef<HTMLDivElement | null>(null);
  const savedRangeRef = useRef<Range | null>(null);
  const pendingHtmlRef = useRef<string>("");
  const appliedRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const autosaveTimerRef = useRef<number | null>(null);
  const savePromiseRef = useRef<Promise<boolean> | null>(null);
  const persistRef = useRef<(navigateAfter: boolean, silent: boolean) => Promise<boolean>>(
    async () => true,
  );
  const mountedRef = useRef(true);
  const deletedRef = useRef(false);
  const createdIdRef = useRef<number | null>(null);
  const initialHtmlRef = useRef("");
  const initialTitleRef = useRef("");
  const latestHtmlRef = useRef("");
  const titleRef = useRef("");
  const activeFontRef = useRef(getNoteFont(noteId));
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dictOpen, setDictOpen] = useState(false);
  const [verseOpen, setVerseOpen] = useState(false);
  const [preview, setPreview] = useState(false);
  const [previewHtml, setPreviewHtml] = useState("");
  const [activeFont, setActiveFont] = useState(() => getNoteFont(noteId));
  const [favoriteColors, setFavoriteColors] = useState(getFavoriteNoteColors);
  const [wordCount, setWordCount] = useState(0);
  const [saveStatus, setSaveStatus] = useState<"saved" | "pending" | "saving">(
    "saved",
  );
  const [uploadingImage, setUploadingImage] = useState(false);
  const [selectedImage, setSelectedImage] = useState<HTMLElement | null>(null);
  const [, setImageRevision] = useState(0);
  const [backgroundSelection, setBackgroundSelection] = useState(false);

  useEffect(() => {
    if (isNew || !noteId) return;
    appliedRef.current = false;
    setLoading(true);
    repo
      .repoGetNotebookNote(noteId)
      .then(({ note }) => {
        setTitle(note.title);
        titleRef.current = note.title;
        pendingHtmlRef.current = plainToHtml(note.content);
        latestHtmlRef.current = pendingHtmlRef.current;
        initialTitleRef.current = note.title;
        initialHtmlRef.current = pendingHtmlRef.current;
        const plain = document.createElement("div");
        plain.innerHTML = pendingHtmlRef.current;
        setWordCount(countWords(plain.textContent ?? ""));
        const font = getNoteFont(noteId);
        setActiveFont(font);
        activeFontRef.current = font;
        ensureNoteFontLoaded(font);
        if (editorRef.current && !appliedRef.current) {
          editorRef.current.innerHTML = pendingHtmlRef.current;
          wrapAllContentBlocks(editorRef.current);
          latestHtmlRef.current = serializeNoteHtml(editorRef.current);
          appliedRef.current = true;
        }
      })
      .catch((err) =>
        setError(err instanceof Error ? err.message : "No se pudo cargar"),
      )
      .finally(() => setLoading(false));
  }, [isNew, noteId]);

  useEffect(() => {
    mountedRef.current = true;
    const flush = () => void persistRef.current(false, true);
    const flushWhenHidden = () => {
      if (document.visibilityState === "hidden") flush();
    };
    window.addEventListener("blur", flush);
    document.addEventListener("visibilitychange", flushWhenHidden);
    return () => {
      mountedRef.current = false;
      if (autosaveTimerRef.current)
        window.clearTimeout(autosaveTimerRef.current);
      window.removeEventListener("blur", flush);
      document.removeEventListener("visibilitychange", flushWhenHidden);
      flush();
    };
  }, []);

  // ponytail: el div es contentEditable, no controlado por React; aplicamos el
  // HTML cargado una sola vez cuando el nodo se monta. useCallback estabiliza el
  // ref para que React no lo re-ejecute en cada render (perdería ediciones).
  const attachEditor = useCallback((node: HTMLDivElement | null) => {
    editorRef.current = node;
    if (node && !appliedRef.current) {
      node.innerHTML = pendingHtmlRef.current;
      wrapAllContentBlocks(node);
      latestHtmlRef.current = serializeNoteHtml(node);
      appliedRef.current = true;
    }
  }, []);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor || preview || loading) return;
    wrapAllContentBlocks(editor);
    latestHtmlRef.current = serializeNoteHtml(editor);
    return initNoteEditorBlocks(editor, (block) => {
      if (mountedRef.current) setSelectedImage(block);
    });
  }, [loading, preview]);

  useEffect(() => {
    setImageBackgroundSelection(editorRef.current, backgroundSelection);
  }, [backgroundSelection, loading, preview]);

  function saveSelection() {
    const sel = window.getSelection();
    if (
      sel &&
      sel.rangeCount > 0 &&
      editorRef.current?.contains(sel.anchorNode)
    ) {
      savedRangeRef.current = sel.getRangeAt(0).cloneRange();
    }
  }

  function restoreSelection() {
    const range = savedRangeRef.current;
    const sel = window.getSelection();
    if (range && sel) {
      sel.removeAllRanges();
      sel.addRange(range);
    }
  }

  // ponytail: execCommand está deprecado pero funciona en WebKitGTK y es la
  // forma más simple de editar HTML enriquecido; sin libs de RTE.
  function exec(cmd: string, value?: string) {
    editorRef.current?.focus();
    restoreSelection();
    document.execCommand(cmd, false, value);
    saveSelection();
    markChanged();
  }

  function selectAllContent() {
    const editor = editorRef.current;
    const selection = window.getSelection();
    if (!editor || !selection) return;
    editor.focus();
    const range = document.createRange();
    range.selectNodeContents(editor);
    selection.removeAllRanges();
    selection.addRange(range);
    savedRangeRef.current = range.cloneRange();
  }

  function toggleHeading(tag: "h1" | "h2") {
    let current = "";
    try {
      current = String(document.queryCommandValue("formatBlock")).toLowerCase();
    } catch {
      // WebKitGTK puede no devolver un bloque cuando el editor está vacío.
    }
    exec("formatBlock", current === tag ? "p" : tag);
  }

  function insertHtml(html: string) {
    editorRef.current?.focus();
    restoreSelection();
    document.execCommand("insertHTML", false, html);
    if (editorRef.current) wrapAllContentBlocks(editorRef.current);
    saveSelection();
    markChanged();
  }

  /** Envuelve la selección en un <span> con el estilo dado (color, tamaño…). */
  function wrapStyle(prop: "color" | "fontSize", value: string) {
    editorRef.current?.focus();
    restoreSelection();
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    const range = sel.getRangeAt(0);
    const span = document.createElement("span");
    span.style[prop] = value;
    if (range.collapsed) {
      span.appendChild(document.createTextNode("\u200B"));
      range.insertNode(span);
      range.setStart(span.firstChild!, 1);
      range.setEnd(span.firstChild!, 1);
    } else {
      try {
        range.surroundContents(span);
      } catch {
        const frag = range.extractContents();
        span.appendChild(frag);
        range.insertNode(span);
      }
      range.selectNodeContents(span);
      range.collapse(false);
    }
    sel.removeAllRanges();
    sel.addRange(range);
    saveSelection();
    markChanged();
  }

  function applyAutoColor() {
    editorRef.current?.focus();
    restoreSelection();
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    const range = sel.getRangeAt(0);
    const span = document.createElement("span");
    span.className = "note-color-auto";
    if (range.collapsed) {
      span.appendChild(document.createTextNode("\u200B"));
      range.insertNode(span);
      range.setStart(span.firstChild!, 1);
      range.setEnd(span.firstChild!, 1);
    } else {
      try {
        range.surroundContents(span);
      } catch {
        const fragment = range.extractContents();
        span.appendChild(fragment);
        range.insertNode(span);
      }
      span.querySelectorAll<HTMLElement>("[style]").forEach((node) => {
        node.style.removeProperty("color");
        if (!node.getAttribute("style")) node.removeAttribute("style");
      });
      span.querySelectorAll("font[color]").forEach((node) =>
        node.removeAttribute("color"),
      );
      range.selectNodeContents(span);
      range.collapse(false);
    }
    sel.removeAllRanges();
    sel.addRange(range);
    saveSelection();
    markChanged();
  }

  function togglePreview() {
    // El editor queda montado (oculto), así que conserva su contenido al volver.
    if (!preview) {
      const html = currentHtml();
      latestHtmlRef.current = html;
      setPreviewHtml(html);
    }
    setPreview((p) => !p);
  }

  function markChanged() {
    const html = currentHtml();
    latestHtmlRef.current = html;
    const node = document.createElement("div");
    node.innerHTML = html;
    setWordCount(countWords(node.textContent ?? ""));
    setSaveStatus("pending");
    scheduleAutosave();
  }

  function scheduleAutosave(delay = 4000) {
    if (autosaveTimerRef.current) window.clearTimeout(autosaveTimerRef.current);
    autosaveTimerRef.current = window.setTimeout(() => {
      autosaveTimerRef.current = null;
      void persist(false, true);
    }, delay);
  }

  async function persist(navigateAfter: boolean, silent: boolean) {
    if (deletedRef.current) return true;
    if (savePromiseRef.current) await savePromiseRef.current;
    if (deletedRef.current) return true;
    const html = latestHtmlRef.current || currentHtml();
    const currentTitle = titleRef.current;
    const finalTitle = currentTitle.trim() || "Sin título";
    if (!silent && !currentTitle.trim()) {
      if (mountedRef.current) setError("Escribe un título para la nota.");
      return false;
    }
    const hasContent = /<img\b/i.test(html) || countWords(stripHtml(html)) > 0;
    if (
      silent &&
      isNew &&
      !createdIdRef.current &&
      !currentTitle.trim() &&
      !hasContent
    )
      return true;
    if (
      html === initialHtmlRef.current &&
      currentTitle.trim() === initialTitleRef.current.trim()
    ) {
      if (navigateAfter) onSaved();
      if (mountedRef.current) setSaveStatus("saved");
      return true;
    }
    if (mountedRef.current) {
      setSaving(!silent);
      setSaveStatus("saving");
      if (!silent) setError(null);
    }
    const operation = (async () => {
      try {
        let realId = noteId ?? createdIdRef.current;
        if (realId == null) {
          const created = await repo.repoCreateNotebookNote(
            notebookId,
            finalTitle,
            html,
          );
          realId = created.id;
          createdIdRef.current = realId;
        } else {
          await repo.repoUpdateNotebookNote(realId, finalTitle, html);
        }
        saveNoteFont(realId, activeFontRef.current);
        initialHtmlRef.current = html;
        initialTitleRef.current = currentTitle.trim();
        const stillCurrent =
          latestHtmlRef.current === html &&
          titleRef.current.trim() === currentTitle.trim();
        if (mountedRef.current)
          setSaveStatus(stillCurrent ? "saved" : "pending");
        return true;
      } catch (err) {
        if (mountedRef.current) {
          setSaveStatus("pending");
          if (silent) scheduleAutosave();
          if (!silent)
            setError(err instanceof Error ? err.message : "Error al guardar");
        }
        return false;
      } finally {
        if (mountedRef.current && !silent) setSaving(false);
      }
    })();
    savePromiseRef.current = operation;
    const saved = await operation;
    if (savePromiseRef.current === operation) savePromiseRef.current = null;
    if (!saved) return false;
    const changedWhileSaving =
      latestHtmlRef.current !== initialHtmlRef.current ||
      titleRef.current.trim() !== initialTitleRef.current.trim();
    if (navigateAfter && changedWhileSaving) return persist(true, silent);
    if (navigateAfter) onSaved();
    return true;
  }

  persistRef.current = persist;

  function save() {
    void persist(true, false);
  }

  async function back() {
    if (autosaveTimerRef.current) window.clearTimeout(autosaveTimerRef.current);
    const saved = await persist(false, true);
    if (saved) onBack();
  }

  async function remove() {
    const realId = noteId ?? createdIdRef.current;
    if (!realId || !confirm("¿Eliminar esta nota?")) return;
    if (autosaveTimerRef.current) {
      window.clearTimeout(autosaveTimerRef.current);
      autosaveTimerRef.current = null;
    }
    setSaving(true);
    try {
      if (savePromiseRef.current) await savePromiseRef.current;
      deletedRef.current = true;
      await repo.repoDeleteNotebookNote(realId);
      deleteNoteFont(realId);
      onSaved();
    } catch (err) {
      deletedRef.current = false;
      setError(err instanceof Error ? err.message : "No se pudo eliminar");
    } finally {
      setSaving(false);
    }
  }

  function insertDictionary(entry: StrongEntry) {
    insertHtml(buildDictBlockHtml(formatDictionaryHtml(entry)));
  }

  function changeFont(fontId: string) {
    setActiveFont(fontId);
    activeFontRef.current = fontId;
    ensureNoteFontLoaded(fontId);
    const realId = noteId ?? createdIdRef.current;
    if (realId) saveNoteFont(realId, fontId);
    setSaveStatus("saved");
  }

  function addFavoriteColor(color: string) {
    const normalized = color.toUpperCase();
    const next = [
      normalized,
      ...favoriteColors.filter((item) => item.toUpperCase() !== normalized),
    ].slice(0, 16);
    setFavoriteColors(next);
    saveFavoriteNoteColors(next);
    wrapStyle("color", normalized);
  }

  async function insertImage(file: File) {
    if (!file.type.startsWith("image/")) {
      setError("Selecciona un archivo de imagen.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("La imagen supera el máximo de 10 MB.");
      return;
    }
    setUploadingImage(true);
    setError(null);
    try {
      let src = "";
      if (navigator.onLine) {
        try {
          const uploaded = await api.uploadImage(file);
          if (uploaded.filename)
            src = api.getPublicUploadUrl(uploaded.filename);
        } catch {
          // Conserva la nota operativa offline mediante data URL.
        }
      }
      if (!src) src = await fileToDataUrl(file);
      insertHtml(buildImageBlockHtml(src, file.name || "Imagen de la nota"));
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "No se pudo insertar la imagen",
      );
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function commitImageChange() {
    setImageRevision((value) => value + 1);
    editorRef.current?.dispatchEvent(new Event("input", { bubbles: true }));
  }

  function closeImageEditor() {
    selectedImage?.classList.remove("is-selected", "is-dragging");
    setSelectedImage(null);
  }

  function setImageMode(mode: "normal" | "background") {
    if (!selectedImage || !editorRef.current) return;
    if (mode === "background") {
      const blockRect = selectedImage.getBoundingClientRect();
      const editorRect = editorRef.current.getBoundingClientRect();
      const left = blockRect.left - editorRect.left + editorRef.current.scrollLeft;
      const top = blockRect.top - editorRect.top + editorRef.current.scrollTop;
      selectedImage.classList.add("is-background");
      selectedImage.style.position = "absolute";
      selectedImage.style.left = `${Math.max(0, left)}px`;
      selectedImage.style.top = `${Math.max(0, top)}px`;
      selectedImage.style.zIndex = "-1";
      selectedImage.style.margin = "0";
      selectedImage.style.float = "none";
      setBackgroundSelection(true);
    } else {
      selectedImage.classList.remove("is-background");
      selectedImage.style.removeProperty("position");
      selectedImage.style.removeProperty("left");
      selectedImage.style.removeProperty("top");
      selectedImage.style.removeProperty("z-index");
      selectedImage.style.display = "block";
      selectedImage.style.float = "none";
      selectedImage.style.margin = "12px auto";
      selectedImage.style.textAlign = "center";
    }
    commitImageChange();
  }

  function setImageWidth(width: number) {
    if (!selectedImage) return;
    selectedImage.style.width = `${width}%`;
    commitImageChange();
  }

  function setImageAlign(align: "left" | "center" | "right" | "full") {
    if (!selectedImage || selectedImage.classList.contains("is-background"))
      return;
    selectedImage.style.display = "block";
    selectedImage.style.float = "none";
    selectedImage.style.margin = "12px auto";
    selectedImage.style.textAlign = "center";
    if (align === "left") {
      selectedImage.style.display = "inline-block";
      selectedImage.style.float = "left";
      selectedImage.style.margin = "8px 16px 8px 0";
      selectedImage.style.textAlign = "left";
    } else if (align === "right") {
      selectedImage.style.display = "inline-block";
      selectedImage.style.float = "right";
      selectedImage.style.margin = "8px 0 8px 16px";
      selectedImage.style.textAlign = "right";
    } else if (align === "full") {
      selectedImage.style.width = "100%";
      selectedImage.style.margin = "12px 0";
    }
    commitImageChange();
  }

  function moveImage(direction: "up" | "down") {
    if (!selectedImage || selectedImage.classList.contains("is-background"))
      return;
    const parent = selectedImage.parentNode;
    if (!parent) return;
    const sibling =
      direction === "up"
        ? selectedImage.previousElementSibling
        : selectedImage.nextElementSibling;
    if (!sibling) return;
    if (direction === "up") parent.insertBefore(selectedImage, sibling);
    else parent.insertBefore(sibling, selectedImage);
    commitImageChange();
  }

  function deleteImage() {
    if (!selectedImage) return;
    selectedImage.remove();
    setSelectedImage(null);
    commitImageChange();
  }

  function currentHtml() {
    if (preview) return previewHtml;
    return editorRef.current
      ? serializeNoteHtml(editorRef.current)
      : latestHtmlRef.current;
  }

  function safeExportHtml() {
    const container = document.createElement("div");
    container.innerHTML = currentHtml();
    container
      .querySelectorAll("script, iframe, object, embed, link, style")
      .forEach((node) => node.remove());
    container.querySelectorAll("*").forEach((node) => {
      for (const attribute of Array.from(node.attributes)) {
        const name = attribute.name.toLowerCase();
        const value = attribute.value.trim().toLowerCase();
        if (name.startsWith("on") || value.startsWith("javascript:")) {
          node.removeAttribute(attribute.name);
        }
      }
    });
    return container.innerHTML;
  }

  async function shareNote() {
    const html = currentHtml();
    const node = document.createElement("div");
    node.innerHTML = html;
    const message = `${title.trim() || "Nota"}\n\n${node.textContent?.trim() ?? ""}\n\nCompartido desde BibliaAPP`;
    if (navigator.share)
      await navigator
        .share({ title: title.trim() || "Nota", text: message })
        .catch(() => {});
    else await navigator.clipboard.writeText(message);
  }

  function exportPdf() {
    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.width = "1px";
    iframe.style.height = "1px";
    iframe.style.opacity = "0";
    document.body.appendChild(iframe);
    const doc = iframe.contentDocument;
    if (!doc) {
      iframe.remove();
      return;
    }
    const safeTitle = (title.trim() || "Nota").replace(/[<>&]/g, "");
    doc.open();
    doc.write(
      `<!doctype html><html lang="es"><head><title>${safeTitle}</title><style>@page{margin:48px}body{font-family:Georgia,serif;color:#1f2937;line-height:1.65;font-size:14px}h1{font-size:24px;margin:0 0 4px}.meta{font:11px system-ui;color:#6b7280;border-bottom:1px solid #e5e7eb;padding-bottom:12px;margin-bottom:24px}img{max-width:100%}blockquote{border-left:3px solid #92700c;padding:8px 16px;margin:12px 0}footer{margin-top:32px;border-top:1px solid #e5e7eb;padding-top:12px;font:10px system-ui;color:#9ca3af}</style></head><body><h1>${safeTitle}</h1><p class="meta">${new Date().toLocaleDateString("es", { dateStyle: "long" })}</p>${safeExportHtml()}<footer>Exportado desde BibliaAPP</footer></body></html>`,
    );
    doc.close();
    window.setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      window.setTimeout(() => iframe.remove(), 1000);
    }, 150);
  }

  if (loading) {
    return <p className="text-muted-foreground">Cargando nota…</p>;
  }

  const toolBtn =
    "flex h-9 min-w-9 items-center justify-center rounded-md px-2 text-sm text-foreground hover:bg-accent";
  const imageIsBackground = selectedImage?.classList.contains("is-background") ?? false;
  const selectedImageWidth = Math.max(
    20,
    Math.min(100, Number.parseInt(selectedImage?.style.width || "60", 10) || 60),
  );
  const selectedImageAlign = selectedImage?.style.float === "left"
    ? "left"
    : selectedImage?.style.float === "right"
      ? "right"
      : selectedImage?.style.width === "100%"
        ? "full"
        : "center";

  return (
    <div className="desktop-page space-y-4">
      <Button variant="ghost" onClick={() => void back()}>
        ← Volver
      </Button>
      <div>
        <input
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            titleRef.current = e.target.value;
            setSaveStatus("pending");
            scheduleAutosave();
          }}
          placeholder="Título"
          className="w-full border-0 bg-transparent text-2xl font-bold text-foreground outline-none"
        />
        <p className="mt-1 text-xs text-muted-foreground">
          {saveStatus === "saving"
            ? "Guardando…"
            : saveStatus === "pending"
              ? "Cambios pendientes"
              : "Guardado"}
          {` · ${wordCount} ${wordCount === 1 ? "palabra" : "palabras"}`}
        </p>
      </div>

      {!preview ? (
        <div className="space-y-2 rounded-lg border border-border bg-card p-2">
          <div className="flex flex-wrap items-center gap-1">
            <button
              type="button"
              title="Deshacer"
              onMouseDown={(e) => {
                e.preventDefault();
                exec("undo");
              }}
              className={toolBtn}
            >
              ↶
            </button>
            <button
              type="button"
              title="Rehacer"
              onMouseDown={(e) => {
                e.preventDefault();
                exec("redo");
              }}
              className={toolBtn}
            >
              ↷
            </button>
            <div className="mx-1 h-6 w-px bg-border" />
            <button
              type="button"
              title="Encabezado 1"
              onMouseDown={(e) => {
                e.preventDefault();
                toggleHeading("h1");
              }}
              className={`${toolBtn} font-extrabold`}
            >
              H1
            </button>
            <button
              type="button"
              title="Encabezado 2"
              onMouseDown={(e) => {
                e.preventDefault();
                toggleHeading("h2");
              }}
              className={`${toolBtn} font-bold`}
            >
              H2
            </button>
            {FORMAT_BUTTONS.map((b) => (
              <button
                key={b.cmd}
                type="button"
                title={b.title}
                onMouseDown={(e) => {
                  e.preventDefault();
                  exec(b.cmd);
                }}
                className={toolBtn}
                style={b.style}
              >
                {b.label}
              </button>
            ))}
            <div className="mx-1 h-6 w-px bg-border" />
            {FONT_SIZES.map((s) => (
              <button
                key={s.px}
                type="button"
                title={`Tamaño ${s.label}`}
                onMouseDown={(e) => {
                  e.preventDefault();
                  wrapStyle("fontSize", s.px);
                }}
                className={toolBtn}
              >
                {s.label}
              </button>
            ))}
            <div className="mx-1 h-6 w-px bg-border" />
            <select
              aria-label="Tipografía de la nota"
              value={activeFont}
              onChange={(e) => changeFont(e.target.value)}
              className="h-9 max-w-44 rounded-md border border-border bg-background px-2 text-xs"
            >
              {NOTE_FONTS.map((font) => (
                <option key={font.id} value={font.id}>
                  {font.label}
                </option>
              ))}
            </select>
            <div className="mx-1 h-6 w-px bg-border" />
            <button
              type="button"
              title="Insertar tabla"
              onMouseDown={(e) => {
                e.preventDefault();
                insertHtml(buildTableBlockHtml());
              }}
              className={toolBtn}
            >
              ⊞
            </button>
            <button
              type="button"
              title="Seleccionar toda la nota"
              onMouseDown={(e) => {
                e.preventDefault();
                selectAllContent();
              }}
              className={toolBtn}
            >
              Todo
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              title="Color automático: sigue el tema claro, oscuro o sepia"
              aria-label="Color automático"
              onMouseDown={(e) => {
                e.preventDefault();
                applyAutoColor();
              }}
              className="flex h-7 w-7 items-center justify-center rounded-full border border-border bg-muted text-xs font-extrabold text-foreground"
            >
              A
            </button>
            {favoriteColors.map((c) => (
              <button
                key={c}
                type="button"
                title="Color de texto"
                onMouseDown={(e) => {
                  e.preventDefault();
                  wrapStyle("color", c);
                }}
                className="h-6 w-6 rounded-full border border-border"
                style={{ backgroundColor: c }}
              />
            ))}
            <label
              title="Añadir color personalizado"
              className="relative flex h-7 w-7 cursor-pointer items-center justify-center rounded-full border border-dashed border-border text-xs text-muted-foreground"
            >
              +
              <input
                type="color"
                className="absolute inset-0 cursor-pointer opacity-0"
                onChange={(e) => addFavoriteColor(e.target.value)}
              />
            </label>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <button
              type="button"
              aria-pressed={backgroundSelection}
              onClick={() => setBackgroundSelection((active) => !active)}
              className={`flex h-9 items-center gap-1 rounded-md border px-3 text-sm font-semibold ${
                backgroundSelection
                  ? "border-sky-600 bg-sky-600 text-white"
                  : "border-sky-500/40 bg-sky-500/10 text-sky-600 dark:text-sky-300"
              }`}
            >
              Fondos 🖼️
            </button>
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                saveSelection();
                setVerseOpen(true);
              }}
              className="flex h-9 items-center gap-1 rounded-md border border-primary/40 bg-primary/10 px-3 text-sm font-semibold text-primary hover:opacity-90"
            >
              📖 Versículo
            </button>
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                saveSelection();
                setDictOpen(true);
              }}
              className="flex h-9 items-center gap-1 rounded-md border border-[#7c3aed]/40 bg-[#7c3aed]/10 px-3 text-sm font-semibold text-[#7c3aed] hover:opacity-90"
            >
              📚 Diccionario
            </button>
            <button
              type="button"
              disabled={uploadingImage}
              onMouseDown={(e) => {
                e.preventDefault();
                saveSelection();
                fileInputRef.current?.click();
              }}
              className="flex h-9 items-center gap-1 rounded-md border border-sky-500/40 bg-sky-500/10 px-3 text-sm font-semibold text-sky-600 hover:opacity-90 disabled:opacity-50 dark:text-sky-300"
            >
              🖼️ {uploadingImage ? "Insertando…" : "Imagen"}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void insertImage(file);
              }}
            />
          </div>

          {selectedImage ? (
            <div className="space-y-3 rounded-lg border border-primary/30 bg-background p-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-extrabold uppercase tracking-wide text-muted-foreground">
                    Imagen seleccionada
                  </p>
                  <p className="text-sm font-bold text-foreground">
                    {imageIsBackground
                      ? "Fondo libre"
                      : "Imagen dentro de la nota"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={closeImageEditor}
                  className={toolBtn}
                  aria-label="Cerrar edición de imagen"
                >
                  ×
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold text-muted-foreground">Modo</span>
                <Button
                  variant={imageIsBackground ? "outline" : "primary"}
                  className="px-3 py-1.5 text-xs"
                  onClick={() => setImageMode("normal")}
                >
                  Normal
                </Button>
                <Button
                  variant={imageIsBackground ? "primary" : "outline"}
                  className="px-3 py-1.5 text-xs"
                  onClick={() => setImageMode("background")}
                >
                  Fondo
                </Button>
              </div>

              <label className="flex items-center gap-3 text-xs font-bold text-muted-foreground">
                Tamaño
                <input
                  type="range"
                  min="20"
                  max="100"
                  step="5"
                  value={selectedImageWidth}
                  onChange={(event) => setImageWidth(Number(event.target.value))}
                  className="min-w-40 flex-1 accent-primary"
                />
                <span className="min-w-10 text-right text-primary">
                  {selectedImageWidth}%
                </span>
              </label>

              {imageIsBackground ? (
                <p className="text-xs text-muted-foreground">
                  Arrastra la imagen sobre la nota para colocar el fondo. Activa
                  “Fondos” para volver a seleccionar fondos ocultos bajo el texto.
                </p>
              ) : (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-bold text-muted-foreground">
                    Alineación
                  </span>
                  {(
                    [
                      ["left", "Izq."],
                      ["center", "Centro"],
                      ["right", "Der."],
                      ["full", "100%"],
                    ] as const
                  ).map(([align, label]) => (
                    <Button
                      key={align}
                      variant={selectedImageAlign === align ? "primary" : "outline"}
                      className="px-3 py-1.5 text-xs"
                      onClick={() => setImageAlign(align)}
                    >
                      {label}
                    </Button>
                  ))}
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                {!imageIsBackground ? (
                  <>
                    <Button className="px-3 py-1.5 text-xs" variant="outline" onClick={() => moveImage("up")}>
                      Subir
                    </Button>
                    <Button className="px-3 py-1.5 text-xs" variant="outline" onClick={() => moveImage("down")}>
                      Bajar
                    </Button>
                  </>
                ) : null}
                <Button
                  variant="outline"
                  className="border-red-500/50 px-3 py-1.5 text-xs text-red-600 dark:text-red-300"
                  onClick={deleteImage}
                >
                  Borrar
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="flex justify-end">
        <button
          type="button"
          onClick={togglePreview}
          className="text-sm font-semibold text-primary hover:underline"
        >
          {preview ? "✏️ Modo edición" : "👁️ Vista previa"}
        </button>
      </div>

      <div hidden={preview}>
        <div
          ref={attachEditor}
          contentEditable
          suppressContentEditableWarning
          data-placeholder="Escribe tu nota…"
          onKeyUp={saveSelection}
          onMouseUp={saveSelection}
          onInput={markChanged}
          className="note-rich min-h-[55vh] w-full rounded-xl border border-border bg-card px-4 py-3 text-base text-foreground outline-none focus:ring-2 focus:ring-ring"
          style={{ fontFamily: getNoteFontFamily(activeFont) }}
        />
      </div>

      {preview ? (
        <div
          className="note-rich note-rich-readonly min-h-[55vh] w-full rounded-xl border border-border bg-card px-4 py-3 text-base text-foreground"
          style={{ fontFamily: getNoteFontFamily(activeFont) }}
          dangerouslySetInnerHTML={{
            __html: previewHtml || "<p>Sin contenido</p>",
          }}
        />
      ) : null}

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <div className="flex flex-wrap gap-2">
        <Button onClick={save} loading={saving}>
          Guardar
        </Button>
        {!isNew || createdIdRef.current ? (
          <Button variant="ghost" onClick={remove} loading={saving}>
            Eliminar
          </Button>
        ) : null}
        <Button variant="outline" onClick={shareNote}>
          Compartir
        </Button>
        <Button variant="outline" onClick={exportPdf}>
          Exportar PDF
        </Button>
      </div>

      <InsertVerseModal
        open={verseOpen}
        onClose={() => setVerseOpen(false)}
        onInsert={insertHtml}
      />
      <InsertDictionaryModal
        open={dictOpen}
        onClose={() => setDictOpen(false)}
        onInsert={insertDictionary}
      />
    </div>
  );
}

function stripHtml(html: string) {
  const node = document.createElement("div");
  node.innerHTML = html;
  return node.textContent ?? "";
}

function countWords(value: string) {
  const clean = value.replace(/\s+/g, " ").trim();
  return clean ? clean.split(" ").length : 0;
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () =>
      typeof reader.result === "string"
        ? resolve(reader.result)
        : reject(new Error("No se pudo leer la imagen."));
    reader.onerror = () => reject(new Error("No se pudo leer la imagen."));
    reader.readAsDataURL(file);
  });
}
