import type { Verse } from "@/lib/types";
import { buildVerseBlockHtml } from "@/lib/noteEditorBlocks";

function escapeHtml(text: string) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** HTML de un bloque de versículo, compatible con el formato de la app móvil. */
export function formatVerseHtml(
  verses: Pick<Verse, "verse" | "text">[],
  bookName: string,
  chapter: number,
  bibleAbbr: string,
): string {
  if (verses.length === 0) return "";

  const sorted = [...verses].sort((a, b) => a.verse - b.verse);
  const numbers = sorted.map((v) => v.verse);
  const min = Math.min(...numbers);
  const max = Math.max(...numbers);
  const isRange = max - min === numbers.length - 1;
  const verseRefStr = isRange && numbers.length > 1 ? `${min}-${max}` : numbers.join(",");

  const reference = `${bookName} ${chapter}:${verseRefStr} (${bibleAbbr})`;
  const versesHtml = sorted
    .map((v) => `<strong>${v.verse}</strong> ${escapeHtml(v.text)}`)
    .join(" ");

  const inner = `<strong>${escapeHtml(reference)}</strong><br/>${versesHtml}`;
  return buildVerseBlockHtml(inner);
}
