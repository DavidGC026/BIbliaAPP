import { useCallback, useEffect, useRef, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { NoteEditorShell } from "@/components/notes/editor-shell/NoteEditorShell";
import { NoteHeaderBar } from "@/components/notes/editor-shell/NoteHeaderBar";
import { WordRibbon, type RibbonTabDef } from "@/components/notes/ribbon/WordRibbon";
import { RibbonGroup } from "@/components/notes/ribbon/RibbonGroup";
import {
  RibbonButton,
  RibbonSelect,
  RibbonSwatch,
} from "@/components/notes/ribbon/RibbonControls";
import {
  SpecialTabsPanel,
  type SpecialOption,
  type SpecialTab,
} from "@/components/notes/ribbon/SpecialTabsPanel";
import { InsertDictionaryModal } from "@/components/InsertDictionaryModal";
import { InsertVerseModal } from "@/components/InsertVerseModal";
import { TablePickerDialog } from "@/components/notes/TablePickerDialog";
import {
  TiptapNoteEditor,
  type TiptapEditorInstance,
} from "@/components/notes/tiptap/TiptapNoteEditor";
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

const AUTOSAVE_DELAY_MS = 1500;

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
  const [tablePickerOpen, setTablePickerOpen] = useState(false);
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
  // Interruptor del editor nuevo. Mientras no alcance al actual en funciones,
  // se entra a mano y se puede volver al de siempre en cualquier momento.
  const [useTiptap, setUseTiptap] = useState(false);
  const tiptapRef = useRef<TiptapEditorInstance | null>(null);
  // Pestaña abierta del panel de herramientas especiales; null = panel cerrado.
  const [activeSpecialTab, setActiveSpecialTab] = useState<string | null>(null);

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

  // Al seleccionar una imagen se abre su pestaña, que es donde viven ahora los
  // controles que antes estaban en el panel inferior.
  useEffect(() => {
    if (selectedImage) setActiveSpecialTab("imagen");
  }, [selectedImage]);

  // Ctrl/Cmd+S guarda, como en cualquier editor de documentos.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        void persistRef.current(false, false);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

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
    // El editor nuevo inserta por comando; el esquema se encarga de parsear el
    // HTML al nodo que corresponda.
    if (useTiptap) {
      const instance = tiptapRef.current;
      if (!instance) return;
      instance.chain().focus().insertContent(html).run();
      applyChange(instance.getHTML());
      return;
    }
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

  // useCallback: si cambiara en cada render, el efecto que la llama en
  // TiptapNoteEditor se reejecutaria sin parar.
  const handleTiptapReady = useCallback(
    (instance: TiptapEditorInstance | null) => {
      tiptapRef.current = instance;
    },
    [],
  );

  /** Registra HTML nuevo venga del editor que venga. */
  function applyChange(html: string) {
    latestHtmlRef.current = html;
    const node = document.createElement("div");
    node.innerHTML = html;
    setWordCount(countWords(node.textContent ?? ""));
    setSaveStatus("pending");
    scheduleAutosave();
  }

  // Se usa como onInput del contentEditable, asi que no puede recibir
  // argumentos: recibiria el evento.
  function markChanged() {
    applyChange(currentHtml());
  }

  function scheduleAutosave(delay = AUTOSAVE_DELAY_MS) {
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
    // Con Tiptap el HTML vive en el editor, no en un div del DOM: lo mantiene
    // al dia `applyChange` desde su onChange.
    if (useTiptap) return latestHtmlRef.current;
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

  const specialTabs: SpecialTab[] = [
    {
      id: "fondos",
      label: "Fondos",
      icon: "image",
      tone: "sky",
      options: [
        {
          id: "modo-fondos",
          title: backgroundSelection ? "Desactivar modo fondos" : "Activar modo fondos",
          description: "Eleva los fondos para poder moverlos",
          icon: "image",
          active: backgroundSelection,
          onSelect: () => setBackgroundSelection((active) => !active),
        },
        ...(selectedImage
          ? [
              {
                id: "a-fondo",
                title: imageIsBackground ? "Volver a normal" : "Convertir en fondo",
                description: imageIsBackground
                  ? "La imagen vuelve al flujo del texto"
                  : "La imagen pasa detrás del texto",
                icon: "image" as const,
                onSelect: () =>
                  setImageMode(imageIsBackground ? "normal" : "background"),
              },
            ]
          : []),
      ],
    },
    {
      id: "versiculo",
      label: "Versículos",
      icon: "bible",
      tone: "primary",
      options: [
        {
          id: "insertar-versiculo",
          title: "Insertar versículo",
          description: "Busca y cita un pasaje bíblico",
          icon: "bible",
          onSelect: () => {
            saveSelection();
            setVerseOpen(true);
          },
        },
      ],
    },
    {
      id: "diccionario",
      label: "Diccionario",
      icon: "dictionary",
      tone: "violet",
      options: [
        {
          id: "insertar-strong",
          title: "Insertar entrada Strong",
          description: "Añade la definición de una palabra original",
          icon: "dictionary",
          onSelect: () => {
            saveSelection();
            setDictOpen(true);
          },
        },
      ],
    },
    {
      id: "imagen",
      label: "Imagen",
      icon: "image",
      tone: "sky",
      options: [
        {
          id: "subir-imagen",
          title: uploadingImage ? "Insertando…" : "Subir imagen",
          description: "Desde tu equipo, máximo 10 MB",
          icon: "upload",
          disabled: uploadingImage,
          onSelect: () => {
            saveSelection();
            fileInputRef.current?.click();
          },
        },
        // Solo cuando hay una imagen seleccionada: son acciones sobre ella.
        ...(selectedImage
          ? ([
              {
                id: "ancho-50",
                title: "Ancho 50 %",
                description: "Media columna",
                icon: "sidebar-collapse" as const,
                active: selectedImageWidth === 50,
                onSelect: () => setImageWidth(50),
              },
              {
                id: "ancho-100",
                title: "Ancho completo",
                description: "Ocupa todo el ancho",
                icon: "sidebar-expand" as const,
                active: selectedImageWidth === 100,
                onSelect: () => setImageWidth(100),
              },
              {
                id: "alinear-izq",
                title: "Alinear izquierda",
                description: "El texto fluye a la derecha",
                icon: "arrow-left" as const,
                active: selectedImageAlign === "left",
                onSelect: () => setImageAlign("left"),
              },
              {
                id: "alinear-centro",
                title: "Centrar",
                description: "Imagen centrada en la nota",
                icon: "image" as const,
                active: selectedImageAlign === "center",
                onSelect: () => setImageAlign("center"),
              },
              {
                id: "alinear-der",
                title: "Alinear derecha",
                description: "El texto fluye a la izquierda",
                icon: "arrow-right" as const,
                active: selectedImageAlign === "right",
                onSelect: () => setImageAlign("right"),
              },
              {
                id: "subir-bloque",
                title: "Mover arriba",
                description: "Adelanta la imagen un bloque",
                icon: "chevron-up" as const,
                onSelect: () => moveImage("up"),
              },
              {
                id: "bajar-bloque",
                title: "Mover abajo",
                description: "Retrasa la imagen un bloque",
                icon: "chevron-down" as const,
                onSelect: () => moveImage("down"),
              },
              {
                id: "borrar-imagen",
                title: "Eliminar imagen",
                description: "Quita la imagen de la nota",
                icon: "delete" as const,
                onSelect: () => deleteImage(),
              },
              {
                id: "cerrar-seleccion",
                title: "Quitar selección",
                description: "Deja de editar esta imagen",
                icon: "close" as const,
                onSelect: () => closeImageEditor(),
              },
            ] as SpecialOption[])
          : []),
      ],
    },
  ];

  const ribbonTabs: RibbonTabDef[] = [
    {
      id: "inicio",
      label: "Inicio",
      render: () => (
        <>
          <RibbonGroup label="Deshacer">
            <RibbonButton label="Deshacer" onAction={() => exec("undo")}>
              ↶
            </RibbonButton>
            <RibbonButton label="Rehacer" onAction={() => exec("redo")}>
              ↷
            </RibbonButton>
          </RibbonGroup>

          <RibbonGroup label="Estilos">
            <RibbonButton label="Título 1" wide onAction={() => toggleHeading("h1")}>
              H1
            </RibbonButton>
            <RibbonButton label="Título 2" wide onAction={() => toggleHeading("h2")}>
              H2
            </RibbonButton>
            <RibbonButton
              label="Texto normal"
              wide
              onAction={() => exec("formatBlock", "p")}
            >
              Normal
            </RibbonButton>
          </RibbonGroup>

          <RibbonGroup label="Fuente">
            <RibbonSelect
              label="Tipografía de la nota"
              value={activeFont}
              onChange={changeFont}
              options={NOTE_FONTS.map((font) => ({
                value: font.id,
                label: font.label,
              }))}
              className="w-32"
            />
            <RibbonSelect
              label="Tamaño de letra"
              value=""
              onChange={(size) => size && wrapStyle("fontSize", size)}
              options={[
                { value: "", label: "Tamaño" },
                ...FONT_SIZES.map((size) => ({
                  value: size.px,
                  label: size.label,
                })),
              ]}
              className="w-20"
            />
          </RibbonGroup>

          <RibbonGroup label="Formato">
            {FORMAT_BUTTONS.slice(0, 4).map((button) => (
              <RibbonButton
                key={button.cmd}
                label={button.title}
                onAction={() => exec(button.cmd)}
              >
                <span style={button.style}>{button.label}</span>
              </RibbonButton>
            ))}
          </RibbonGroup>

          <RibbonGroup label="Párrafo">
            {FORMAT_BUTTONS.slice(4).map((button) => (
              <RibbonButton
                key={button.cmd}
                label={button.title}
                onAction={() => exec(button.cmd)}
              >
                <span style={button.style}>{button.label}</span>
              </RibbonButton>
            ))}
            <RibbonButton
              label="Alinear a la izquierda"
              onAction={() => exec("justifyLeft")}
            >
              ⇤
            </RibbonButton>
            <RibbonButton label="Centrar" onAction={() => exec("justifyCenter")}>
              ≡
            </RibbonButton>
            <RibbonButton
              label="Alinear a la derecha"
              onAction={() => exec("justifyRight")}
            >
              ⇥
            </RibbonButton>
          </RibbonGroup>

          <RibbonGroup label="Color">
            <RibbonButton
              label="Color automático, se adapta al tema"
              onAction={applyAutoColor}
            >
              A
            </RibbonButton>
            {favoriteColors.map((color) => (
              <RibbonSwatch
                key={color}
                color={color}
                label={`Aplicar color ${color}`}
                onAction={() => wrapStyle("color", color)}
              />
            ))}
            <label
              title="Añadir color personalizado"
              className="relative flex h-[1.15rem] w-[1.15rem] cursor-pointer items-center justify-center rounded-full border border-dashed border-border text-[0.6rem] text-muted-foreground"
            >
              +
              <input
                type="color"
                aria-label="Añadir color personalizado"
                className="absolute inset-0 cursor-pointer opacity-0"
                onChange={(event) => addFavoriteColor(event.target.value)}
              />
            </label>
          </RibbonGroup>
        </>
      ),
    },
    {
      id: "insertar",
      label: "Insertar",
      render: () => (
        <>
          <RibbonGroup label="Tabla">
            <RibbonButton
              label="Insertar tabla"
              wide
              onAction={() => {
                saveSelection();
                setTablePickerOpen(true);
              }}
            >
              <Icon name="table" size={16} />
              Tabla
            </RibbonButton>
          </RibbonGroup>

          <RibbonGroup label="Contenido">
            <RibbonButton
              label="Insertar versículo"
              wide
              onAction={() => {
                saveSelection();
                setVerseOpen(true);
              }}
            >
              <Icon name="bible" size={16} />
              Versículo
            </RibbonButton>
            <RibbonButton
              label="Insertar entrada de diccionario Strong"
              wide
              onAction={() => {
                saveSelection();
                setDictOpen(true);
              }}
            >
              <Icon name="dictionary" size={16} />
              Diccionario
            </RibbonButton>
            <RibbonButton
              label="Insertar imagen"
              wide
              disabled={uploadingImage}
              onAction={() => {
                saveSelection();
                fileInputRef.current?.click();
              }}
            >
              <Icon name="image" size={16} />
              {uploadingImage ? "Insertando…" : "Imagen"}
            </RibbonButton>
          </RibbonGroup>

          <RibbonGroup label="Selección" secondary>
            <RibbonButton label="Seleccionar todo" wide onAction={selectAllContent}>
              Todo
            </RibbonButton>
          </RibbonGroup>

          <RibbonGroup label="Vista" secondary>
            <RibbonButton
              label={preview ? "Volver al modo edición" : "Ver vista previa"}
              wide
              active={preview}
              onAction={togglePreview}
            >
              <Icon name={preview ? "edit" : "visibility"} size={16} />
              {preview ? "Editar" : "Vista previa"}
            </RibbonButton>
            <RibbonButton
              label="Probar el editor nuevo, con cinta contextual"
              wide
              active={useTiptap}
              onAction={() => setUseTiptap((value) => !value)}
            >
              <Icon name="sparkles" size={16} />
              Editor nuevo
            </RibbonButton>
          </RibbonGroup>
        </>
      ),
    },
  ];

  return (
    <NoteEditorShell
      header={
        <NoteHeaderBar
          title={title}
          onTitleChange={(value) => {
            setTitle(value);
            titleRef.current = value;
            setSaveStatus("pending");
            scheduleAutosave();
          }}
          saveState={error ? "error" : saveStatus}
          wordCount={wordCount}
          onBack={() => void back()}
          onSave={save}
          onShare={shareNote}
          onExportPdf={exportPdf}
          onDelete={remove}
          canDelete={!isNew || createdIdRef.current !== null}
          busy={saving}
        />
      }
      ribbon={
        !preview ? (
          <WordRibbon
            tabs={ribbonTabs}
            belowRibbon={
              <SpecialTabsPanel
                tabs={specialTabs}
                activeTabId={activeSpecialTab}
                onActiveTabChange={setActiveSpecialTab}
              />
            }
          />
        ) : null
      }
    >
      {error ? (
        <p className="border-b border-destructive/30 bg-destructive/10 px-4 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      {useTiptap && !preview ? (
        <div className="px-4 py-3">
          <TiptapNoteEditor
            // Remontar al cargar la nota o al entrar, para partir del HTML bueno.
            key={`tiptap-${noteId ?? "new"}-${loading ? "carga" : "listo"}`}
            initialHtml={latestHtmlRef.current}
            onChange={applyChange}
            onPickImage={() => fileInputRef.current?.click()}
            onPickTable={() => setTablePickerOpen(true)}
            fontFamily={getNoteFontFamily(activeFont)}
            onReady={handleTiptapReady}
          />
        </div>
      ) : null}

      <div hidden={preview || useTiptap} className="h-full">
        <div
          ref={attachEditor}
          contentEditable
          suppressContentEditableWarning
          data-placeholder="Escribe tu nota…"
          aria-label="Cuerpo de la nota"
          onKeyUp={saveSelection}
          onMouseUp={saveSelection}
          onInput={markChanged}
          className="note-rich note-editor-surface text-base"
          style={{ fontFamily: getNoteFontFamily(activeFont) }}
        />
      </div>

      {preview ? (
        <div
          className="note-rich note-rich-readonly note-editor-surface text-base"
          style={{ fontFamily: getNoteFontFamily(activeFont) }}
          dangerouslySetInnerHTML={{
            __html: previewHtml || "<p>Sin contenido</p>",
          }}
        />
      ) : null}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) void insertImage(file);
        }}
      />

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
      <TablePickerDialog
        open={tablePickerOpen}
        onClose={() => setTablePickerOpen(false)}
        onInsert={({ columns, rows, withHeader }) => {
          setTablePickerOpen(false);
          insertHtml(buildTableBlockHtml(columns, rows, withHeader));
        }}
      />
    </NoteEditorShell>
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
