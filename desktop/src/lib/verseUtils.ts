import type { Verse } from "@/lib/types";

export function formatVerseRange(versesList: number[]): string {
  if (versesList.length === 0) return "";
  const sorted = [...versesList].sort((a, b) => a - b);
  const ranges: string[] = [];
  let start = sorted[0];
  let end = sorted[0];
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] === end + 1) end = sorted[i];
    else {
      ranges.push(start === end ? `${start}` : `${start}-${end}`);
      start = sorted[i];
      end = sorted[i];
    }
  }
  ranges.push(start === end ? `${start}` : `${start}-${end}`);
  return ranges.join(",");
}

export function buildImageCreatorData(options: {
  selectedVerses: number[];
  verses: Verse[];
  bookName: string;
  chapter: number;
  bibleAbbr: string;
}): { text: string; reference: string; abbr: string } | null {
  const selectedVersesData = options.verses
    .filter((v) => options.selectedVerses.includes(v.verse))
    .sort((a, b) => a.verse - b.verse);
  if (selectedVersesData.length === 0) return null;

  const verseRangeStr = formatVerseRange(options.selectedVerses);
  return {
    text: selectedVersesData.map((v) => v.text).join(" "),
    reference: `${options.bookName} ${options.chapter}:${verseRangeStr}`,
    abbr: options.bibleAbbr,
  };
}
