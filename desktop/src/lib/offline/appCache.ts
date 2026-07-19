import type { VerseOfDay } from "@/lib/types";

const CHURCH_NAME_KEY = "bibliaapp_offline_church_name";
const VERSE_PREFIX = "bibliaapp_offline_verse_of_day_";

export function getCachedChurchName() {
  return localStorage.getItem(CHURCH_NAME_KEY) || "BibliaAPP";
}

export function cacheChurchName(name: string) {
  localStorage.setItem(CHURCH_NAME_KEY, name || "BibliaAPP");
}

export function getCachedVerseOfDay(bibleId: number): VerseOfDay | null {
  try {
    const raw = localStorage.getItem(`${VERSE_PREFIX}${bibleId}`);
    return raw ? (JSON.parse(raw) as VerseOfDay) : null;
  } catch {
    return null;
  }
}

export function cacheVerseOfDay(bibleId: number, verse: VerseOfDay) {
  localStorage.setItem(`${VERSE_PREFIX}${bibleId}`, JSON.stringify(verse));
}
