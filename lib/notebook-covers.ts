import { htmlToPlainText, isNoteHtml } from "@/lib/note-content"

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

export function stripNotePreview(content: string, max = 100) {
  const plain = isNoteHtml(content)
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

export function noteHtmlToPlainText(content: string): string {
  if (!content) return ""
  return isNoteHtml(content)
    ? htmlToPlainText(content)
    : content
        .replace(/!\[.*?\]\(.*?\)/g, " [imagen] ")
        .replace(/\[.*?\]\(.*?\)/g, " [archivo] ")
        .replace(/[#>*_\n]/g, " ")
        .replace(/\s+/g, " ")
        .trim()
}

export function countNoteWords(content: string): number {
  const plain = noteHtmlToPlainText(content)
  if (!plain) return 0
  return plain.split(/\s+/).filter(Boolean).length
}

export function estimateNoteReadMinutes(content: string): number {
  return Math.max(1, Math.ceil(countNoteWords(content) / 220))
}

export function isNotePinned(raw?: string): boolean {
  return parseNoteTags(raw).includes("pinned")
}

export function togglePinnedNoteTag(raw?: string): string[] {
  const tags = parseNoteTags(raw).filter((tag) => tag !== "pinned")
  if (!isNotePinned(raw)) tags.unshift("pinned")
  return tags
}
