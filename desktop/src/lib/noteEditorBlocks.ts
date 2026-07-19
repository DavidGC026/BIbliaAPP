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

function imageLabel(image: HTMLImageElement | null): string {
  return image?.alt?.trim() || "Imagen de la nota";
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
    `<div class="biblia-content-block biblia-image-block">` +
    buildBlockHandleHtml("🖼️", safeAlt) +
    `<div class="biblia-note-image-frame" contenteditable="false">` +
    `<img src="${safeSrc}" alt="${safeAlt}" />` +
    `</div></div><p><br></p>`
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

function wrapImageElement(image: HTMLImageElement) {
  if (image.closest(".biblia-content-block")) return;
  const block = document.createElement("div");
  block.className = "biblia-content-block biblia-image-block";
  block.innerHTML = buildBlockHandleHtml("🖼️", imageLabel(image));
  const frame = document.createElement("div");
  frame.className = "biblia-note-image-frame";
  frame.setAttribute("contenteditable", "false");
  const width = image.getAttribute("width");
  if (width) frame.style.width = /^\d+$/.test(width) ? `${width}px` : width;
  image.removeAttribute("width");
  image.parentNode?.insertBefore(block, image);
  frame.appendChild(image);
  block.appendChild(frame);
}

export function wrapAllContentBlocks(editor: HTMLElement) {
  editor.querySelectorAll("img").forEach((image) => {
    if (image.closest(".biblia-content-block")) return;
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

export function initNoteEditorBlocks(editor: HTMLElement): () => void {
  wrapAllContentBlocks(editor);

  let selectedBlock: Element | null = null;

  function clearSelection() {
    selectedBlock?.classList.remove("is-selected");
    selectedBlock = null;
  }

  function notifyChange() {
    editor.dispatchEvent(new Event("input", { bubbles: true }));
  }

  function selectBlock(block: Element) {
    clearSelection();
    selectedBlock = block;
    block.classList.add("is-selected");
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
    if (!(e.target as Element).closest(".biblia-content-block"))
      clearSelection();
  }

  function onKeyDown(e: KeyboardEvent) {
    if (!selectedBlock) return;
    if (e.key === "Backspace" || e.key === "Delete") {
      e.preventDefault();
      removeBlock(selectedBlock);
    }
  }

  editor.addEventListener("click", onClick);
  editor.addEventListener("keydown", onKeyDown);

  return () => {
    editor.removeEventListener("click", onClick);
    editor.removeEventListener("keydown", onKeyDown);
    clearSelection();
  };
}
