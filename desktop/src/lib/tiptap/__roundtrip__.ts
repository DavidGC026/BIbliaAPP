/**
 * Prueba de concepto: comprueba que el HTML real de las notas sobrevive un
 * ida y vuelta por el modelo de documento de Tiptap.
 *
 * Ejecutar con:  npx tsx src/lib/tiptap/__roundtrip__.ts
 */

import { JSDOM } from "jsdom";

// El DOM tiene que existir antes de importar nada de ProseMirror.
const dom = new JSDOM("<!doctype html><html><body></body></html>");
const g = globalThis as unknown as Record<string, unknown>;
g.window = dom.window;
g.document = dom.window.document;
g.Node = dom.window.Node;
g.Element = dom.window.Element;
g.HTMLElement = dom.window.HTMLElement;
g.DocumentFragment = dom.window.DocumentFragment;
g.navigator = dom.window.navigator;

const { getSchema } = await import("@tiptap/core");
const { DOMParser, DOMSerializer } = await import("@tiptap/pm/model");
const { buildNoteExtensions } = await import("./extensions");

const schema = getSchema(buildNoteExtensions());
const parser = DOMParser.fromSchema(schema);
const serializer = DOMSerializer.fromSchema(schema);

function roundTrip(html: string): string {
  const container = document.createElement("div");
  container.innerHTML = html;
  const doc = parser.parse(container);
  const fragment = serializer.serializeFragment(doc.content);
  const out = document.createElement("div");
  out.appendChild(fragment);
  return out.innerHTML;
}

/** Texto visible, para comparar contenido ignorando diferencias de marcado. */
function textOf(html: string): string {
  const el = document.createElement("div");
  el.innerHTML = html;
  return (el.textContent ?? "").replace(/\s+/g, " ").trim();
}

type Case = {
  name: string;
  html: string;
  /** Selectores que deben seguir presentes despues del ida y vuelta. */
  expect: string[];
  /** Selectores que NO deben aparecer (interfaz que no es dato). */
  reject?: string[];
};

const HANDLE =
  '<div class="biblia-block-handle" contenteditable="false">' +
  '<span class="biblia-block-kind">Versículo</span>' +
  '<span class="biblia-block-label">Juan 3:16</span>' +
  '<div class="biblia-block-actions">' +
  '<button type="button" class="biblia-block-btn" data-block-action="up" contenteditable="false">↑</button>' +
  '<button type="button" class="biblia-block-btn" data-block-action="delete" contenteditable="false">Eliminar</button>' +
  "</div></div>";

const cases: Case[] = [
  {
    name: "Formato basico (negrita, cursiva, subrayado, listas)",
    html:
      "<p>Texto <strong>negrita</strong> e <em>cursiva</em> y <u>subrayado</u>.</p>" +
      "<ul><li><p>Primero</p></li><li><p>Segundo</p></li></ul>" +
      "<ol><li><p>Uno</p></li></ol>",
    expect: ["strong", "em", "u", "ul li", "ol li"],
  },
  {
    name: "Encabezados",
    html: "<h1>Titulo</h1><h2>Subtitulo</h2><p>Cuerpo</p>",
    expect: ["h1", "h2", "p"],
  },
  {
    name: "Versiculo con barra de botones guardada (formato actual)",
    html:
      '<div class="biblia-content-block biblia-verse-block">' +
      HANDLE +
      '<blockquote class="biblia-verse-quote" contenteditable="false">' +
      "<strong>Juan 3:16 (RVR60)</strong><br/><strong>16</strong> Porque de tal manera amó Dios al mundo." +
      "</blockquote></div><p><br></p>",
    expect: ["blockquote.biblia-verse-quote", "blockquote strong"],
    reject: [".biblia-block-handle", "[data-block-action]", "button"],
  },
  {
    name: "Diccionario Strong",
    html:
      '<div class="biblia-content-block biblia-dict-block">' +
      '<aside class="biblia-dict-entry" data-strong="H0430" contenteditable="false">' +
      '<span class="biblia-dict-lemma">אֱלֹהִים</span><p>Dios, dioses.</p>' +
      "</aside></div><p><br></p>",
    expect: ["aside.biblia-dict-entry", "aside[data-strong]", ".biblia-dict-lemma"],
    reject: [".biblia-block-handle"],
  },
  {
    name: "Tabla con encabezado",
    html:
      '<div class="biblia-content-block biblia-table-block">' +
      '<table class="biblia-note-table"><thead><tr><th>Col 1</th><th>Col 2</th></tr></thead>' +
      "<tbody><tr><td>a</td><td>b</td></tr><tr><td>c</td><td>d</td></tr></tbody></table>" +
      "</div><p><br></p>",
    expect: ["table", "th", "td"],
    reject: [".biblia-block-handle"],
  },
  {
    name: "Imagen normal",
    html:
      '<div class="note-image-block" contenteditable="false" style="text-align: center; width: 60%; max-width: 100%; display: block; margin: 12px auto;">' +
      '<img src="https://biblia2.dvguzman.com/uploads/foto.webp" alt="Mi foto" draggable="false" style="width: 100%; height: auto; border-radius: 8px;" />' +
      "</div><p><br></p>",
    expect: [
      "div.note-image-block",
      'img[src="https://biblia2.dvguzman.com/uploads/foto.webp"]',
      'img[alt="Mi foto"]',
    ],
  },
  {
    name: "Imagen de fondo posicionada",
    html:
      '<div class="note-image-block is-background" contenteditable="false" style="width: 45%; left: 120px; top: 80px; position: absolute; z-index: -1;">' +
      '<img src="/uploads/fondo.webp" alt="Fondo" draggable="false" />' +
      "</div><p>Texto encima</p>",
    expect: ["div.note-image-block.is-background", 'img[src="/uploads/fondo.webp"]'],
  },
];

let passed = 0;
let failed = 0;

console.log("\n  Ida y vuelta del HTML de notas por el esquema de Tiptap\n");

for (const testCase of cases) {
  const out = roundTrip(testCase.html);
  const probe = document.createElement("div");
  probe.innerHTML = out;

  const missing = testCase.expect.filter((sel) => !probe.querySelector(sel));
  const leaked = (testCase.reject ?? []).filter((sel) => probe.querySelector(sel));
  const textBefore = textOf(testCase.html);
  const textAfter = textOf(out);
  // El texto de la barra de botones desaparece a proposito.
  const handleWords = ["↑", "↓", "Copiar", "Cortar", "Eliminar", "Versículo", "Juan 3:16"];
  const normalize = (t: string) =>
    handleWords.reduce((acc, w) => acc.split(w).join(""), t).replace(/\s+/g, " ").trim();
  const textLost = normalize(textBefore) !== normalize(textAfter);

  const ok = missing.length === 0 && leaked.length === 0 && !textLost;
  if (ok) {
    passed++;
    console.log(`  OK    ${testCase.name}`);
  } else {
    failed++;
    console.log(`  FALLA ${testCase.name}`);
    if (missing.length) console.log(`        falta: ${missing.join(", ")}`);
    if (leaked.length) console.log(`        se colo: ${leaked.join(", ")}`);
    if (textLost) {
      console.log(`        texto antes: ${normalize(textBefore).slice(0, 90)}`);
      console.log(`        texto despues: ${normalize(textAfter).slice(0, 90)}`);
    }
    console.log(`        salida: ${out.slice(0, 220)}`);
  }
}

console.log(`\n  ${passed} correctos, ${failed} fallidos\n`);

// ---------------------------------------------------------------------------
// Parte 2: interoperabilidad con los clientes actuales.
//
// Tiptap guarda HTML limpio, sin barra de botones. Esta parte comprueba que el
// codigo que YA existe (wrapAllContentBlocks, identico en concepto al
// normalizeContentBlocks de web y movil) reconstruye los bloques al abrirlo.
// Si esto pasa, web y movil no necesitan ningun cambio.
// ---------------------------------------------------------------------------

const { wrapAllContentBlocks } = await import("../noteEditorBlocks");

console.log("  Reconstruccion en los clientes actuales (sin tocar su codigo)\n");

const interop: { name: string; html: string; expect: string[] }[] = [
  {
    name: "Versiculo limpio recupera envoltorio y barra",
    html:
      '<blockquote class="biblia-verse-quote"><strong>Juan 3:16</strong><br>Porque de tal manera…</blockquote>',
    expect: [
      ".biblia-content-block.biblia-verse-block",
      ".biblia-block-handle",
      '[data-block-action="delete"]',
    ],
  },
  {
    name: "Tabla limpia recupera barra con acciones de fila y columna",
    html:
      '<table class="biblia-note-table"><tbody><tr><td>a</td><td>b</td></tr></tbody></table>',
    expect: [
      ".biblia-content-block.biblia-table-block",
      '[data-block-action="table-row-add"]',
      '[data-block-action="table-col-del"]',
    ],
  },
  {
    name: "Diccionario limpio recupera envoltorio",
    html:
      '<aside class="biblia-dict-entry" data-strong="H0430"><p>Dios</p></aside>',
    expect: [".biblia-content-block.biblia-dict-block", ".biblia-block-handle"],
  },
  {
    name: "Imagen limpia conserva su bloque",
    html:
      '<div class="note-image-block" style="width: 60%;"><img src="/uploads/a.webp" alt="a" /></div>',
    expect: ["div.note-image-block", "img[src]"],
  },
];

let interopPassed = 0;
let interopFailed = 0;

for (const testCase of interop) {
  const host = document.createElement("div");
  host.innerHTML = roundTrip(testCase.html);
  wrapAllContentBlocks(host);
  const missing = testCase.expect.filter((sel) => !host.querySelector(sel));
  if (missing.length === 0) {
    interopPassed++;
    console.log(`  OK    ${testCase.name}`);
  } else {
    interopFailed++;
    console.log(`  FALLA ${testCase.name}`);
    console.log(`        falta: ${missing.join(", ")}`);
    console.log(`        salida: ${host.innerHTML.slice(0, 200)}`);
  }
}

console.log(`\n  ${interopPassed} correctos, ${interopFailed} fallidos\n`);
process.exit(failed === 0 && interopFailed === 0 ? 0 : 1);
