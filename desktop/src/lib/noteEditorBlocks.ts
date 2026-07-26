/**
 * Bloques de versículo, diccionario y tabla.
 *
 * Regla de oro: **el documento solo contiene el contenido final de la nota**.
 * Ningún bloque lleva barra de botones, encabezado ni controles incrustados;
 * las acciones viven en la cinta superior, en su pestaña contextual. Lo único
 * que se ve al seleccionar es un contorno fino que no altera la maquetación.
 */

/** Tipo de bloque estructurado, para que la cinta sepa qué pestaña mostrar. */
export type NoteBlockKind = "verse" | "dict" | "table" | "image";

export type NoteBlockSelection = {
  element: HTMLElement;
  kind: NoteBlockKind;
} | null;

export type TableAction =
  | "table-row-add"
  | "table-row-del"
  | "table-col-add"
  | "table-col-del";

export function buildVerseBlockHtml(innerHtml: string): string {
  const blockquote = `<blockquote class="biblia-verse-quote" contenteditable="false">${innerHtml}</blockquote>`;
  return (
    `<div class="biblia-content-block biblia-verse-block">` +
    blockquote +
    `</div><p><br></p>`
  );
}

export function buildDictBlockHtml(asideHtml: string): string {
  if (typeof document === "undefined") {
    return `<div class="biblia-content-block biblia-dict-block">${asideHtml}</div><p><br></p>`;
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
  return (
    `<div class="biblia-content-block biblia-table-block">` +
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
  blockquote.parentNode?.insertBefore(block, blockquote);
  block.appendChild(blockquote);
}

function wrapDictElement(aside: Element) {
  if (aside.closest(".biblia-content-block")) return;
  aside.classList.add("biblia-dict-entry");
  aside.setAttribute("contenteditable", "false");
  const block = document.createElement("div");
  block.className = "biblia-content-block biblia-dict-block";
  aside.parentNode?.insertBefore(block, aside);
  block.appendChild(aside);
}

function wrapTableElement(table: HTMLTableElement) {
  const existingBlock = table.closest(".biblia-content-block");
  if (existingBlock) {
    existingBlock.classList.add("biblia-table-block");
    return;
  }
  if (!table.classList.contains("biblia-note-table"))
    table.classList.add("biblia-note-table");
  const block = document.createElement("div");
  block.className = "biblia-content-block biblia-table-block";
  table.parentNode?.insertBefore(block, table);
  block.appendChild(table);
}

/**
 * Quita las barras de botones que quedaron guardadas dentro del contenido por
 * versiones anteriores (y las que añaden web y móvil al abrir la nota).
 *
 * Se ejecuta al cargar y antes de serializar, de modo que el documento nunca
 * contenga interfaz. Si el envoltorio queda vacío tras quitarla, se descarta.
 */
export function stripBlockHandles(root: HTMLElement) {
  root
    .querySelectorAll(".biblia-block-handle, [data-block-action]")
    .forEach((node) => node.remove());
  root.querySelectorAll(".biblia-content-block").forEach((block) => {
    if (!block.firstElementChild && !(block.textContent ?? "").trim()) {
      block.remove();
    }
  });
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
  // Lo primero: fuera cualquier barra incrustada que traiga el HTML guardado.
  stripBlockHandles(editor);
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
  // La nota guardada nunca lleva interfaz dentro.
  stripBlockHandles(clone);
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

/**
 * Acciones sobre el bloque seleccionado. Las invoca la cinta desde su pestaña
 * contextual; el documento no expone ningún control.
 */
export type NoteBlockController = {
  move(direction: "up" | "down"): void;
  copy(): void;
  cut(): void;
  remove(): void;
  changeTable(action: TableAction): void;
  /** Quita la selección y cierra la pestaña contextual. */
  clear(): void;
  destroy(): void;
};

export function initNoteEditorBlocks(
  editor: HTMLElement,
  onImageSelection?: NoteImageSelectionHandler,
  onBlockSelection?: (selection: NoteBlockSelection) => void,
): NoteBlockController {
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

  function blockKind(block: Element): NoteBlockKind {
    if (block.classList.contains("biblia-verse-block")) return "verse";
    if (block.classList.contains("biblia-dict-block")) return "dict";
    return "table";
  }

  function clearSelection() {
    selectedBlock?.classList.remove("is-selected");
    selectedBlock = null;
    onBlockSelection?.(null);
  }

  function clearImageSelection() {
    selectedImage?.classList.remove("is-selected", "is-dragging");
    selectedImage = null;
    onImageSelection?.(null);
  }

  function notifyChange() {
    editor.dispatchEvent(new Event("input", { bubbles: true }));
  }

  function tableColumnCount(table: HTMLTableElement) {
    return Array.from(table.rows).reduce(
      (count, row) => Math.max(count, row.cells.length),
      0,
    );
  }

  function createTableCell(row: HTMLTableRowElement, index: number) {
    const isHeader = row.parentElement?.tagName === "THEAD";
    const cell = document.createElement(isHeader ? "th" : "td");
    cell.innerHTML = isHeader ? `Col ${index + 1}` : "&nbsp;";
    return cell;
  }

  function changeTable(block: Element, action: string): boolean {
    const table = block.querySelector("table");
    if (!(table instanceof HTMLTableElement)) return false;
    const columns = tableColumnCount(table);
    let changed = false;

    if (action === "table-row-add" && table.rows.length < 20) {
      const body = table.tBodies[0] ?? table.createTBody();
      const row = body.insertRow();
      for (let index = 0; index < Math.max(1, columns); index += 1) {
        row.appendChild(createTableCell(row, index));
      }
      changed = true;
    } else if (action === "table-row-del" && table.rows.length > 1) {
      table.deleteRow(table.rows.length - 1);
      changed = true;
    } else if (action === "table-col-add" && columns < 10) {
      Array.from(table.rows).forEach((row) => {
        row.appendChild(createTableCell(row, columns));
      });
      changed = true;
    } else if (action === "table-col-del" && columns > 1) {
      Array.from(table.rows).forEach((row) => {
        if (row.cells.length > 0) row.deleteCell(row.cells.length - 1);
      });
      changed = true;
    }

    if (changed) {
      selectBlock(block);
      notifyChange();
    }
    return changed;
  }

  function selectBlock(block: Element) {
    clearImageSelection();
    selectedBlock?.classList.remove("is-selected");
    selectedBlock = block;
    block.classList.add("is-selected");
    if (block instanceof HTMLElement) {
      onBlockSelection?.({ element: block, kind: blockKind(block) });
    }
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
          return false;
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

  return {
    move: (direction) => {
      if (selectedBlock) moveBlock(selectedBlock, direction);
    },
    copy: () => {
      if (selectedBlock) copyBlock(selectedBlock);
    },
    cut: () => {
      if (selectedBlock) cutBlock(selectedBlock);
    },
    remove: () => {
      if (selectedBlock) removeBlock(selectedBlock);
    },
    changeTable: (action) => {
      if (selectedBlock) changeTable(selectedBlock, action);
    },
    clear: () => {
      clearSelection();
      clearImageSelection();
    },
    destroy: () => {
      editor.removeEventListener("click", onClick);
      editor.removeEventListener("keydown", onKeyDown);
      editor.removeEventListener("pointerdown", onPointerDown);
      editor.removeEventListener("pointermove", onPointerMove);
      editor.removeEventListener("pointerup", finishPointerDrag);
      editor.removeEventListener("pointercancel", finishPointerDrag);
      clearSelection();
      clearImageSelection();
    },
  };
}
