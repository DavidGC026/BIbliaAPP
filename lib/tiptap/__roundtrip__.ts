import { JSDOM } from "jsdom"

const dom = new JSDOM("<!doctype html><html><body></body></html>")
const globals = globalThis as unknown as Record<string, unknown>
globals.window = dom.window
globals.document = dom.window.document
globals.Node = dom.window.Node
globals.Element = dom.window.Element
globals.HTMLElement = dom.window.HTMLElement
globals.DocumentFragment = dom.window.DocumentFragment
globals.navigator = dom.window.navigator

async function main() {
const { getSchema } = await import("@tiptap/core")
const { DOMParser, DOMSerializer } = await import("@tiptap/pm/model")
const { buildNoteExtensions } = await import("./extensions")

const schema = getSchema(buildNoteExtensions())
const parser = DOMParser.fromSchema(schema)
const serializer = DOMSerializer.fromSchema(schema)

function roundTrip(html: string): string {
  const input = document.createElement("div")
  input.innerHTML = html
  const documentNode = parser.parse(input)
  const fragment = serializer.serializeFragment(documentNode.content)
  const output = document.createElement("div")
  output.appendChild(fragment)
  return output.innerHTML
}

const handle = '<div class="biblia-block-handle"><button data-block-action="delete">Eliminar</button></div>'
const cases = [
  {
    name: "formato de texto",
    html: '<h1>Título</h1><p><strong>Negrita</strong> <em>Cursiva</em> <u>Subrayado</u> <span style="color: #ef4444; font-size: 20px">Color</span></p>',
    expect: ["h1", "strong", "em", "u", 'span[style*="color"]', 'span[style*="font-size"]'],
  },
  {
    name: "versículo atómico sin controles guardados",
    html: `<div class="biblia-content-block biblia-verse-block">${handle}<blockquote class="biblia-verse-quote"><strong>Juan 3:16</strong><br>Porque de tal manera…</blockquote></div>`,
    expect: ["blockquote.biblia-verse-quote", "blockquote strong"],
    reject: [".biblia-block-handle", "button", "[data-block-action]"],
  },
  {
    name: "definición Strong",
    html: '<aside class="biblia-dict-entry" data-strong="H0430"><span class="biblia-dict-lemma">אֱלֹהִים</span><p>Dios</p></aside>',
    expect: ["aside.biblia-dict-entry", 'aside[data-strong="H0430"]', ".biblia-dict-lemma"],
  },
  {
    name: "tabla editable",
    html: '<table class="biblia-note-table"><thead><tr><th>A</th><th>B</th></tr></thead><tbody><tr><td>1</td><td>2</td></tr></tbody></table>',
    expect: ["table.biblia-note-table", "th", "td"],
  },
  {
    name: "imagen normal",
    html: '<div class="note-image-block" style="width: 60%; text-align: center"><img src="/uploads/a.webp" alt="A"></div>',
    expect: ["div.note-image-block", 'img[src="/uploads/a.webp"]', 'img[alt="A"]'],
  },
  {
    name: "imagen de fondo",
    html: '<div class="note-image-block is-background" style="width: 45%; left: 20px; top: 30px"><img src="/uploads/bg.webp" alt="Fondo"></div><p>Texto</p>',
    expect: ["div.note-image-block.is-background", 'div[style*="left: 20px"]', 'div[style*="top: 30px"]'],
  },
]

let failures = 0
console.log("\nIda y vuelta del editor web Tiptap\n")
for (const test of cases) {
  const html = roundTrip(test.html)
  const probe = document.createElement("div")
  probe.innerHTML = html
  const missing = test.expect.filter((selector) => !probe.querySelector(selector))
  const leaked = (test.reject ?? []).filter((selector) => probe.querySelector(selector))
  if (!missing.length && !leaked.length) {
    console.log(`  OK    ${test.name}`)
    continue
  }
  failures += 1
  console.log(`  FALLA ${test.name}`)
  if (missing.length) console.log(`        falta: ${missing.join(", ")}`)
  if (leaked.length) console.log(`        se filtró: ${leaked.join(", ")}`)
  console.log(`        salida: ${html.slice(0, 240)}`)
}

console.log(`\n${cases.length - failures} correctos, ${failures} fallidos\n`)
process.exitCode = failures ? 1 : 0
}

void main()
