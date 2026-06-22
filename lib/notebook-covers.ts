export const NOTE_TAGS = [
  { id: "fe", label: "Fe", color: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200" },
  { id: "familia", label: "Familia", color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200" },
  { id: "adoracion", label: "Adoración", color: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200" },
  { id: "crecimiento", label: "Crecimiento", color: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200" },
] as const

export function parseNoteTags(raw?: string): string[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter((t) => typeof t === "string") : []
  } catch {
    return []
  }
}

function htmlToPlainText(html: string) {
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

export function stripNotePreview(content: string, max = 100) {
  const looksHtml = /<[a-z][^>]*>/i.test(content)
  const plain = looksHtml
    ? htmlToPlainText(content)
    : content
        .replace(/!\[.*?\]\(.*?\)/g, "[imagen]")
        .replace(/\[.*?\]\(.*?\)/g, "[archivo]")
        .replace(/[#>*_\n]/g, " ")
        .replace(/\s+/g, " ")
        .trim()

  if (plain.length <= max) return plain
  return `${plain.substring(0, max).trim()}…`
}
