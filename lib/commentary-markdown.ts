/**
 * Markdown mínimo para los comentarios bíblicos (`content_md`).
 *
 * El proyecto no traía ninguna librería de markdown y estos textos usan una
 * porción muy pequeña del formato: títulos, párrafos, citas, listas, negrita y
 * cursiva. En vez de añadir una dependencia se analiza aquí a una estructura de
 * bloques que el componente pinta como elementos de React.
 *
 * Que el resultado sean datos y no HTML es deliberado: el contenido llega de
 * ficheros importados, y al no existir `dangerouslySetInnerHTML` en el camino,
 * un comentario con `<script>` se muestra como texto en lugar de ejecutarse.
 *
 * Funciones puras y sin DOM: se comprueban en scripts/test_commentaries.cjs.
 */

export interface InlineToken {
  text: string
  bold?: boolean
  italic?: boolean
}

export type MarkdownBlock =
  | { type: "heading"; level: number; inline: InlineToken[] }
  | { type: "paragraph"; inline: InlineToken[] }
  | { type: "quote"; inline: InlineToken[] }
  | { type: "list"; ordered: boolean; items: InlineToken[][] }

const HEADING = /^(#{1,6})\s+(.*)$/
const QUOTE = /^>\s?(.*)$/
const BULLET = /^[-+*]\s+(.*)$/
const ORDERED = /^\d+[.)]\s+(.*)$/

// ***fuerte y cursiva*** | **fuerte** | *cursiva* | _cursiva_
const EMPHASIS = /\*\*\*([^*]+)\*\*\*|\*\*([^*]+)\*\*|\*([^*]+)\*|_([^_]+)_/g

/** Divide un texto en tramos con negrita/cursiva. Nunca devuelve tramos vacíos. */
export function parseInline(text: string): InlineToken[] {
  const tokens: InlineToken[] = []
  let lastIndex = 0

  EMPHASIS.lastIndex = 0
  let match: RegExpExecArray | null
  while ((match = EMPHASIS.exec(text)) !== null) {
    if (match.index > lastIndex) {
      tokens.push({ text: text.slice(lastIndex, match.index) })
    }
    const [, boldItalic, bold, italic, underscoreItalic] = match
    if (boldItalic !== undefined) tokens.push({ text: boldItalic, bold: true, italic: true })
    else if (bold !== undefined) tokens.push({ text: bold, bold: true })
    else tokens.push({ text: (italic ?? underscoreItalic) as string, italic: true })
    lastIndex = match.index + match[0].length
  }

  if (lastIndex < text.length) tokens.push({ text: text.slice(lastIndex) })
  return tokens.filter((token) => token.text.length > 0)
}

/**
 * Convierte markdown en bloques. Las líneas seguidas del mismo tipo se unen en
 * un solo párrafo o cita, como en markdown clásico; una línea en blanco cierra
 * el bloque en curso.
 */
export function parseMarkdownBlocks(markdown: string): MarkdownBlock[] {
  if (!markdown) return []

  const blocks: MarkdownBlock[] = []
  // Acumuladores del bloque abierto: se vuelcan al cambiar de tipo o al final.
  let paragraph: string[] = []
  let quote: string[] = []
  let listItems: string[] = []
  let listOrdered = false

  const flushParagraph = () => {
    if (paragraph.length > 0) {
      blocks.push({ type: "paragraph", inline: parseInline(paragraph.join(" ")) })
      paragraph = []
    }
  }
  const flushQuote = () => {
    if (quote.length > 0) {
      blocks.push({ type: "quote", inline: parseInline(quote.join(" ")) })
      quote = []
    }
  }
  const flushList = () => {
    if (listItems.length > 0) {
      blocks.push({
        type: "list",
        ordered: listOrdered,
        items: listItems.map((item) => parseInline(item)),
      })
      listItems = []
    }
  }
  const flushAll = () => {
    flushParagraph()
    flushQuote()
    flushList()
  }

  for (const rawLine of markdown.replace(/\r\n?/g, "\n").split("\n")) {
    const line = rawLine.trim()

    if (line === "") {
      flushAll()
      continue
    }

    const heading = HEADING.exec(line)
    if (heading) {
      flushAll()
      blocks.push({
        type: "heading",
        level: heading[1].length,
        inline: parseInline(heading[2].trim()),
      })
      continue
    }

    const quoted = QUOTE.exec(line)
    if (quoted) {
      flushParagraph()
      flushList()
      quote.push(quoted[1].trim())
      continue
    }

    const ordered = ORDERED.exec(line)
    const bullet = ordered ? null : BULLET.exec(line)
    if (ordered || bullet) {
      flushParagraph()
      flushQuote()
      const isOrdered = ordered !== null
      // Cambiar de viñetas a numeración (o al revés) empieza una lista nueva.
      if (listItems.length > 0 && listOrdered !== isOrdered) flushList()
      listOrdered = isOrdered
      listItems.push((ordered ? ordered[1] : bullet![1]).trim())
      continue
    }

    flushQuote()
    flushList()
    paragraph.push(line)
  }

  flushAll()
  return blocks
}

/** Texto plano del comentario (vistas previas y resúmenes). */
export function markdownToPlainText(markdown: string): string {
  return parseMarkdownBlocks(markdown)
    .map((block) =>
      block.type === "list"
        ? block.items.map((item) => item.map((token) => token.text).join("")).join(" ")
        : block.inline.map((token) => token.text).join(""),
    )
    .join(" ")
    .replace(/\s+/g, " ")
    .trim()
}
