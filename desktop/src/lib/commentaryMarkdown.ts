/**
 * Markdown mínimo para los comentarios bíblicos (`content_md`) en Desktop.
 *
 * Convierte markdown simple (títulos, párrafos, citas, listas, negritas, cursivas)
 * en un árbol de bloques y tokens para pintar como elementos React seguros,
 * sin dangerouslySetInnerHTML ni vulnerabilidades XSS.
 */

export interface InlineToken {
  text: string;
  bold?: boolean;
  italic?: boolean;
}

export type MarkdownBlock =
  | { type: "heading"; level: number; inline: InlineToken[] }
  | { type: "paragraph"; inline: InlineToken[] }
  | { type: "quote"; inline: InlineToken[] }
  | { type: "list"; ordered: boolean; items: InlineToken[][] };

const HEADING = /^(#{1,6})\s+(.*)$/;
const QUOTE = /^>\s?(.*)$/;
const BULLET = /^[-+*]\s+(.*)$/;
const ORDERED = /^\d+[.)]\s+(.*)$/;

// ***fuerte y cursiva*** | **fuerte** | *cursiva* | _cursiva_
const EMPHASIS = /\*\*\*([^*]+)\*\*\*|\*\*([^*]+)\*\*|\*([^*]+)\*|_([^_]+)_/g;

/** Divide un texto en tramos con negrita/cursiva. */
export function parseInline(text: string): InlineToken[] {
  const tokens: InlineToken[] = [];
  let lastIndex = 0;

  EMPHASIS.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = EMPHASIS.exec(text)) !== null) {
    if (match.index > lastIndex) {
      tokens.push({ text: text.slice(lastIndex, match.index) });
    }
    const [, boldItalic, bold, italic, underscoreItalic] = match;
    if (boldItalic !== undefined) {
      tokens.push({ text: boldItalic, bold: true, italic: true });
    } else if (bold !== undefined) {
      tokens.push({ text: bold, bold: true });
    } else {
      tokens.push({
        text: (italic ?? underscoreItalic) as string,
        italic: true,
      });
    }
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    tokens.push({ text: text.slice(lastIndex) });
  }
  return tokens.filter((token) => token.text.length > 0);
}

/**
 * Convierte markdown en bloques. Las líneas seguidas del mismo tipo se unen en
 * un solo párrafo o cita; una línea en blanco cierra el bloque en curso.
 */
export function parseMarkdownBlocks(markdown: string): MarkdownBlock[] {
  if (!markdown) return [];

  const blocks: MarkdownBlock[] = [];
  let paragraph: string[] = [];
  let quote: string[] = [];
  let listItems: string[] = [];
  let listOrdered = false;

  const flushParagraph = () => {
    if (paragraph.length > 0) {
      blocks.push({
        type: "paragraph",
        inline: parseInline(paragraph.join(" ")),
      });
      paragraph = [];
    }
  };
  const flushQuote = () => {
    if (quote.length > 0) {
      blocks.push({ type: "quote", inline: parseInline(quote.join(" ")) });
      quote = [];
    }
  };
  const flushList = () => {
    if (listItems.length > 0) {
      blocks.push({
        type: "list",
        ordered: listOrdered,
        items: listItems.map((item) => parseInline(item)),
      });
      listItems = [];
    }
  };
  const flushAll = () => {
    flushParagraph();
    flushQuote();
    flushList();
  };

  for (const rawLine of markdown.split(/\r?\n/)) {
    const line = rawLine.trim();

    if (!line) {
      flushAll();
      continue;
    }

    const headingMatch = line.match(HEADING);
    if (headingMatch) {
      flushAll();
      blocks.push({
        type: "heading",
        level: Math.min(6, headingMatch[1].length),
        inline: parseInline(headingMatch[2]),
      });
      continue;
    }

    const quoteMatch = line.match(QUOTE);
    if (quoteMatch) {
      flushParagraph();
      flushList();
      quote.push(quoteMatch[1]);
      continue;
    }

    const bulletMatch = line.match(BULLET);
    if (bulletMatch) {
      flushParagraph();
      flushQuote();
      if (listItems.length > 0 && listOrdered) flushList();
      listOrdered = false;
      listItems.push(bulletMatch[1]);
      continue;
    }

    const orderedMatch = line.match(ORDERED);
    if (orderedMatch) {
      flushParagraph();
      flushQuote();
      if (listItems.length > 0 && !listOrdered) flushList();
      listOrdered = true;
      listItems.push(orderedMatch[1]);
      continue;
    }

    // Línea de texto normal: si había cita o lista abierta se cierra
    flushQuote();
    flushList();
    paragraph.push(line);
  }

  flushAll();
  return blocks;
}
