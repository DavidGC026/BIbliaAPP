/** Detecta si el contenido de una nota ya es HTML del editor enriquecido. */
export function isNoteHtml(content: string): boolean {
  return /<[a-z][^>]*>/i.test(content)
}

/** Convierte markdown legacy a HTML para el editor. Si ya es HTML, lo devuelve tal cual. */
export function normalizeNoteContentForEditor(content: string): string {
  if (!content) return ""
  if (isNoteHtml(content)) return content

  const lines = content.split("\n")
  let inQuote = false
  let html = ""

  for (const line of lines) {
    const cleanLine = line.trim()
    if (cleanLine.startsWith(">")) {
      if (!inQuote) {
        html += "<blockquote>"
        inQuote = true
      }
      const quoteText = cleanLine
        .substring(1)
        .trim()
        .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      html += quoteText + "<br/>"
    } else {
      if (inQuote) {
        html += "</blockquote>"
        inQuote = false
      }
      if (cleanLine === "") {
        html += "<br/>"
      } else {
        const paragraphText = cleanLine.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
        html += `<p>${paragraphText}</p>`
      }
    }
  }

  if (inQuote) html += "</blockquote>"
  return html
}

export function defaultNoteTitle(title?: string | null): string {
  const trimmed = title?.trim()
  return trimmed || "Sin título"
}

export function htmlToPlainText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<\/(p|div|li|h[1-6]|blockquote|tr)>/gi, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim()
}

/** Texto plano para textarea de notas de versículo (móvil usa texto plano ahí). */
export function normalizeVerseNoteForEditor(content: string): string {
  if (!content) return ""
  if (isNoteHtml(content)) return htmlToPlainText(content)
  return content
}

export function insertHtmlIntoNoteContent(current: string, html: string): string {
  const base = normalizeNoteContentForEditor(current)
  if (!base) return html
  return base + html
}
