/** Bloques de versículo/diccionario/tabla con barra ↑↓ Copiar/Cortar/Eliminar (igual que móvil). */

function verseLabelFromBlockquote(bq: Element | null): string {
  if (!bq) return "Versículo";
  const strong = bq.querySelector("strong");
  if (strong?.textContent) return strong.textContent.trim().slice(0, 72);
  const t = (bq.textContent ?? "").trim().replace(/\s+/g, " ");
  return t.slice(0, 60) || "Versículo";
}

function dictLabelFromAside(aside: Element | null): string {
  if (!aside) return "Diccionario";
  const code = aside.getAttribute("data-strong") ?? "";
  const lemma =
    aside.querySelector(".biblia-dict-lemma")?.textContent?.trim() ?? "";
  return code ? `${code}${lemma ? ` · ${lemma}` : ""}` : "Diccionario Strong";
}

function tableBlockLabel(table: HTMLTableElement): string {
  const rows = table.rows.length;
  const cols = rows > 0 ? table.rows[0].cells.length : 0;
  return `Tabla ${cols}×${rows}`;
}

function buildBlockHandleHtml(icon: string, label: string): string {
  return (
    `<div class="biblia-block-handle" contenteditable="false">` +
    `<span class="biblia-block-label">${icon} ${label}</span>` +
    `<div class="biblia-block-actions">` +
    `<button type="button" class="biblia-block-btn" data-block-action="up" contenteditable="false">↑</button>` +
    `<button type="button" class="biblia-block-btn" data-block-action="down" contenteditable="false">↓</button>` +
    `<button type="button" class="biblia-block-btn" data-block-action="copy" contenteditable="false">Copiar</button>` +
    `<button type="button" class="biblia-block-btn" data-block-action="cut" contenteditable="false">Cortar</button>` +
    `<button type="button" class="biblia-block-btn" data-block-action="delete" contenteditable="false">Eliminar</button>` +
    `</div></div>`
  );
}

function plainHtmlLabel(html: string, fallback: string): string {
  const text = html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  return (text || fallback).slice(0, 72).replace(/[<>&"]/g, "");
}

export function buildVerseBlockHtml(innerHtml: string): string {
  const blockquote = `<blockquote class="biblia-verse-quote" contenteditable="false">${innerHtml}</blockquote>`;
  return (
    `<div class="biblia-content-block biblia-verse-block">` +
    buildBlockHandleHtml("📖", plainHtmlLabel(innerHtml, "Versículo")) +
    blockquote +
    `</div><p><br></p>`
  );
}

export function buildDictBlockHtml(asideHtml: string): string {
  if (typeof document === "undefined") {
    return `<div class="biblia-content-block biblia-dict-block">${buildBlockHandleHtml("📚", plainHtmlLabel(asideHtml, "Diccionario Strong"))}${asideHtml}</div><p><br></p>`;
  }
  const tmp = document.createElement("div");
  tmp.innerHTML = asideHtml;
  const aside =
    tmp.querySelector("aside.biblia-dict-entry") ?? tmp.firstElementChild;
  if (aside) {
    aside.classList.add("biblia-dict-entry");
    aside.setAttribute("contenteditable", "false");
  }
  return (
    `<div class="biblia-content-block biblia-dict-block">` +
    buildBlockHandleHtml("📚", dictLabelFromAside(aside)) +
    (aside?.outerHTML ?? asideHtml) +
    `</div><p><br></p>`
  );
}

export function buildTableBlockHtml(
  cols = 3,
  rows = 3,
  withHeader = false,
): string {
  let tableHtml = '<table class="biblia-note-table">';
  if (withHeader) {
    tableHtml += "<thead><tr>";
    for (let c = 0; c < cols; c++) tableHtml += `<th>Col ${c + 1}</th>`;
    tableHtml += "</tr></thead><tbody>";
    for (let r = 1; r < rows; r++) {
      tableHtml += "<tr>";
      for (let c = 0; c < cols; c++) tableHtml += "<td>&nbsp;</td>";
      tableHtml += "</tr>";
    }
    tableHtml += "</tbody>";
  } else {
    tableHtml += "<tbody>";
    for (let r = 0; r < rows; r++) {
      tableHtml += "<tr>";
      for (let c = 0; c < cols; c++) tableHtml += "<td>&nbsp;</td>";
      tableHtml += "</tr>";
    }
    tableHtml += "</tbody>";
  }
  tableHtml += "</table>";
  const label = `Tabla ${cols}×${rows}`;
  return (
    `<div class="biblia-content-block biblia-table-block">` +
    buildBlockHandleHtml("⊞", label) +
    tableHtml +
    `</div><p><br></p>`
  );
}

function escapeAttribute(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function buildImageBlockHtml(src: string, alt = "Imagen de la nota") {
  const safeSrc = escapeAttribute(src);
  const safeAlt = escapeAttribute(alt);
  return (
    `<div class="note-image-block" contenteditable="false" ` +
    `style="text-align: center; width: 60%; max-width: 100%; display: block; margin: 12px auto;">` +
    `<img src="${safeSrc}" alt="${safeAlt}" draggable="false" ` +
    `style="width: 100%; height: auto; border-radius: 8px;" />` +
    `</div><p><br></p>`
  );
}

function blockMainNode(block: Element): Element | null {
  return (
    block.querySelector("blockquote.biblia-verse-quote") ??
    block.querySelector("aside.biblia-dict-entry") ??
    block.querySelector("table.biblia-note-table") ??
    block.querySelector(".biblia-note-image-frame") ??
    block.querySelector("table")
  );
}

function wrapVerseElement(blockquote: Element) {
  if (blockquote.closest(".biblia-content-block")) return;
  blockquote.classList.add("biblia-verse-quote");
  blockquote.setAttribute("contenteditable", "false");
  const block = document.createElement("div");
  block.className = "biblia-content-block biblia-verse-block";
  block.innerHTML = buildBlockHandleHtml(
    "📖",
    verseLabelFromBlockquote(blockquote),
  );
  blockquote.parentNode?.insertBefore(block, blockquote);
  block.appendChild(blockquote);
}

function wrapDictElement(aside: Element) {
  if (aside.closest(".biblia-content-block")) return;
  aside.classList.add("biblia-dict-entry");
  aside.setAttribute("contenteditable", "false");
  const block = document.createElement("div");
  block.className = "biblia-content-block biblia-dict-block";
  block.innerHTML = buildBlockHandleHtml("📚", dictLabelFromAside(aside));
  aside.parentNode?.insertBefore(block, aside);
  block.appendChild(aside);
}

function wrapTableElement(table: HTMLTableElement) {
  if (table.closest(".biblia-content-block")) return;
  if (!table.classList.contains("biblia-note-table"))
    table.classList.add("biblia-note-table");
  const block = document.createElement("div");
  block.className = "biblia-content-block biblia-table-block";
  block.innerHTML = buildBlockHandleHtml("⊞", tableBlockLabel(table));
  table.parentNode?.insertBefore(block, table);
  block.appendChild(table);
}

function applyImageDefaults(block: HTMLElement, image: HTMLImageElement) {
  block.classList.add("note-image-block");
  block.setAttribute("contenteditable", "false");
  if (!block.style.width) block.style.width = "60%";
  if (!block.style.maxWidth) block.style.maxWidth = "100%";
  if (!block.style.display) block.style.display = "block";
  if (!block.style.margin && !block.classList.contains("is-background")) {
    block.style.margin = "12px auto";
  }
  if (!block.style.textAlign) block.style.textAlign = "center";
  image.setAttribute("draggable", "false");
  if (!image.style.width) image.style.width = "100%";
  if (!image.style.height) image.style.height = "auto";
  if (!image.style.borderRadius) image.style.borderRadius = "8px";
}

/** Migra el bloque de imagen usado por desktop <=0.3.1 al formato de mobile. */
function migrateDesktopImageBlock(block: HTMLElement) {
  const image = block.querySelector("img");
  if (!(image instanceof HTMLImageElement)) return;
  const frame = block.querySelector(".biblia-note-image-frame") as HTMLElement | null;
  const mobileBlock = document.createElement("div");
  const savedWidth = frame?.style.width || image.getAttribute("width") || "60%";
  mobileBlock.style.width = /^\d+$/.test(savedWidth) ? `${savedWidth}px` : savedWidth;
  mobileBlock.style.maxWidth = "100%";
  mobileBlock.style.display = "block";
  mobileBlock.style.margin = "12px auto";
  mobileBlock.style.textAlign = "center";
  image.removeAttribute("width");
  applyImageDefaults(mobileBlock, image);
  block.parentNode?.insertBefore(mobileBlock, block);
  mobileBlock.appendChild(image);
  block.remove();
}

function wrapImageElement(image: HTMLImageElement) {
  const mobileBlock = image.closest(".note-image-block");
  if (mobileBlock instanceof HTMLElement) {
    applyImageDefaults(mobileBlock, image);
    return;
  }
  if (image.closest(".biblia-content-block")) return;
  const block = document.createElement("div");
  const width = image.getAttribute("width");
  if (width) block.style.width = /^\d+$/.test(width) ? `${width}px` : width;
  image.removeAttribute("width");
  image.parentNode?.insertBefore(block, image);
  block.appendChild(image);
  applyImageDefaults(block, image);
}

export function wrapAllContentBlocks(editor: HTMLElement) {
  editor
    .querySelectorAll<HTMLElement>(".biblia-content-block.biblia-image-block")
    .forEach(migrateDesktopImageBlock);
  editor.querySelectorAll("img").forEach((image) => {
    wrapImageElement(image as HTMLImageElement);
  });
  editor.querySelectorAll("table").forEach((table) => {
    if (
      table.closest(".biblia-table-widget") ||
      table.closest(".biblia-table-compact-preview")
    )
      return;
    wrapTableElement(table as HTMLTableElement);
  });
  editor.querySelectorAll("blockquote").forEach((bq) => {
    if (
      bq.closest(".biblia-table-compact-preview") ||
      bq.closest(".biblia-content-block")
    )
      return;
    wrapVerseElement(bq);
  });
  editor.querySelectorAll("aside.biblia-dict-entry").forEach((aside) => {
    if (aside.closest(".biblia-content-block")) return;
    wrapDictElement(aside);
  });
}

export type NoteImageSelectionHandler = (block: HTMLElement | null) => void;

export function serializeNoteHtml(editor: HTMLElement): string {
  const clone = editor.cloneNode(true) as HTMLElement;
  clone
    .querySelectorAll<HTMLElement>(".is-selected, .is-dragging")
    .forEach((node) => {
      node.classList.remove("is-selected", "is-dragging");
      node.style.removeProperty("outline");
      node.style.removeProperty("outline-offset");
    });
  return clone.innerHTML;
}

export function setImageBackgroundSelection(
  editor: HTMLElement | null,
  active: boolean,
) {
  if (!editor) return;
  if (active) editor.setAttribute("data-background-selection", "true");
  else editor.removeAttribute("data-background-selection");
}

export function initNoteEditorBlocks(
  editor: HTMLElement,
  onImageSelection?: NoteImageSelectionHandler,
): () => void {
  wrapAllContentBlocks(editor);

  let selectedBlock: Element | null = null;
  let selectedImage: HTMLElement | null = null;
  let drag:
    | {
        pointerId: number;
        startX: number;
        startY: number;
        left: number;
        top: number;
        moved: boolean;
      }
    | null = null;

  function clearSelection() {
    selectedBlock?.classList.remove("is-selected");
    selectedBlock = null;
  }

  function clearImageSelection() {
    selectedImage?.classList.remove("is-selected", "is-dragging");
    selectedImage = null;
    onImageSelection?.(null);
  }

  function notifyChange() {
    editor.dispatchEvent(new Event("input", { bubbles: true }));
  }

  function selectBlock(block: Element) {
    clearImageSelection();
    clearSelection();
    selectedBlock = block;
    block.classList.add("is-selected");
  }

  function selectImage(block: HTMLElement) {
    clearSelection();
    if (selectedImage !== block) clearImageSelection();
    selectedImage = block;
    block.classList.add("is-selected");
    onImageSelection?.(block);
  }

  function moveBlock(block: Element, direction: "up" | "down") {
    const parent = block.parentNode;
    if (!parent) return;
    let sibling =
      direction === "up"
        ? block.previousElementSibling
        : block.nextElementSibling;
    while (
      sibling &&
      sibling.tagName === "P" &&
      !(sibling.textContent ?? "").replace(/\u200B/g, "").trim()
    ) {
      sibling =
        direction === "up"
          ? sibling.previousElementSibling
          : sibling.nextElementSibling;
    }
    if (!sibling) return;
    if (direction === "up") parent.insertBefore(block, sibling);
    else parent.insertBefore(sibling, block);
    selectBlock(block);
    notifyChange();
  }

  function removeBlock(block: Element) {
    block.remove();
    clearSelection();
    notifyChange();
  }

  function copyBlock(block: Element) {
    const main = blockMainNode(block);
    if (!main) return;
    selectBlock(block);
    const range = document.createRange();
    range.selectNodeContents(main);
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(range);
    try {
      document.execCommand("copy");
    } catch {
      // ponytail: WebKitGTK a veces falla copy; no bloquear
    }
    sel?.removeAllRanges();
  }

  function cutBlock(block: Element) {
    copyBlock(block);
    removeBlock(block);
  }

  function handleAction(block: Element, action: string) {
    if (action === "up") moveBlock(block, "up");
    else if (action === "down") moveBlock(block, "down");
    else if (action === "copy") copyBlock(block);
    else if (action === "cut") cutBlock(block);
    else if (action === "delete") removeBlock(block);
  }

  function trySelectFromTarget(target: EventTarget | null): boolean {
    if (!(target instanceof Element)) return false;
    const block = target.closest(".biblia-content-block");
    if (!block || !editor.contains(block)) return false;
    const main = blockMainNode(block);
    if (!main || (target !== main && !main.contains(target))) return false;

    if (main.tagName === "TABLE") {
      if (target.tagName === "TD" || target.tagName === "TH") {
        if (block.classList.contains("is-selected")) {
          clearSelection();
          return true;
        }
      }
      selectBlock(block);
      return true;
    }

    if (
      main.tagName === "BLOCKQUOTE" ||
      main.tagName === "ASIDE" ||
      main.classList.contains("biblia-note-image-frame")
    ) {
      selectBlock(block);
      return true;
    }
    return false;
  }

  function onClick(e: MouseEvent) {
    const imageBlock = (e.target as Element).closest(".note-image-block");
    if (imageBlock instanceof HTMLElement && editor.contains(imageBlock)) {
      e.preventDefault();
      e.stopPropagation();
      selectImage(imageBlock);
      return;
    }
    const actionBtn = (e.target as Element).closest("[data-block-action]");
    if (actionBtn) {
      e.preventDefault();
      e.stopPropagation();
      const block = actionBtn.closest(".biblia-content-block");
      if (block)
        handleAction(block, actionBtn.getAttribute("data-block-action") ?? "");
      return;
    }
    if (trySelectFromTarget(e.target)) {
      e.preventDefault();
      return;
    }
    if (!(e.target as Element).closest(".biblia-content-block")) {
      clearSelection();
      clearImageSelection();
    }
  }

  function onKeyDown(e: KeyboardEvent) {
    if (
      selectedImage &&
      (e.key === "Backspace" || e.key === "Delete")
    ) {
      e.preventDefault();
      selectedImage.remove();
      clearImageSelection();
      notifyChange();
      return;
    }
    if (!selectedBlock) return;
    if (e.key === "Backspace" || e.key === "Delete") {
      e.preventDefault();
      removeBlock(selectedBlock);
    }
  }

  function onPointerDown(e: PointerEvent) {
    const imageBlock = (e.target as Element).closest(".note-image-block");
    if (!(imageBlock instanceof HTMLElement) || !editor.contains(imageBlock))
      return;
    selectImage(imageBlock);
    if (!imageBlock.classList.contains("is-background")) return;
    const blockRect = imageBlock.getBoundingClientRect();
    const editorRect = editor.getBoundingClientRect();
    const parsedLeft = Number.parseFloat(imageBlock.style.left);
    const parsedTop = Number.parseFloat(imageBlock.style.top);
    drag = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      left: Number.isFinite(parsedLeft)
        ? parsedLeft
        : blockRect.left - editorRect.left + editor.scrollLeft,
      top: Number.isFinite(parsedTop)
        ? parsedTop
        : blockRect.top - editorRect.top + editor.scrollTop,
      moved: false,
    };
    imageBlock.classList.add("is-dragging");
    imageBlock.setPointerCapture(e.pointerId);
    e.preventDefault();
  }

  function onPointerMove(e: PointerEvent) {
    if (!drag || !selectedImage || drag.pointerId !== e.pointerId) return;
    const dx = e.clientX - drag.startX;
    const dy = e.clientY - drag.startY;
    if (Math.abs(dx) > 2 || Math.abs(dy) > 2) drag.moved = true;
    const maxLeft = Math.max(0, editor.scrollWidth - selectedImage.offsetWidth);
    const maxTop = Math.max(0, editor.scrollHeight - selectedImage.offsetHeight);
    selectedImage.style.left = `${Math.max(0, Math.min(drag.left + dx, maxLeft))}px`;
    selectedImage.style.top = `${Math.max(0, Math.min(drag.top + dy, maxTop))}px`;
    selectedImage.style.margin = "0";
    e.preventDefault();
  }

  function finishPointerDrag(e: PointerEvent) {
    if (!drag || drag.pointerId !== e.pointerId) return;
    const moved = drag.moved;
    drag = null;
    selectedImage?.classList.remove("is-dragging");
    if (moved) notifyChange();
  }

  editor.addEventListener("click", onClick);
  editor.addEventListener("keydown", onKeyDown);
  editor.addEventListener("pointerdown", onPointerDown);
  editor.addEventListener("pointermove", onPointerMove);
  editor.addEventListener("pointerup", finishPointerDrag);
  editor.addEventListener("pointercancel", finishPointerDrag);

  return () => {
    editor.removeEventListener("click", onClick);
    editor.removeEventListener("keydown", onKeyDown);
    editor.removeEventListener("pointerdown", onPointerDown);
    editor.removeEventListener("pointermove", onPointerMove);
    editor.removeEventListener("pointerup", finishPointerDrag);
    editor.removeEventListener("pointercancel", finishPointerDrag);
    clearSelection();
    clearImageSelection();
  };
}
