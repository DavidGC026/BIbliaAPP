import type { Devotional } from "@/lib/types";
import { parseDevotionalContent } from "@/lib/devotional";

export interface PlanReadingItem {
  bookId: number;
  bookName: string;
  chapters: number[];
}
export interface PlanDay {
  day: number;
  readings: PlanReadingItem[];
}

export function parsePlanProgress(raw?: string | null): number[] {
  try {
    const value = JSON.parse(raw || "[]");
    return Array.isArray(value) ? value.filter(Number.isFinite) : [];
  } catch {
    return [];
  }
}
export function parsePlanDays(raw?: string | null): PlanDay[] {
  try {
    const value = JSON.parse(raw || "[]");
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}
export function formatPlanReadings(readings: PlanReadingItem[]) {
  return readings
    .map((reading) =>
      reading.chapters.length === 1
        ? `${reading.bookName} ${reading.chapters[0]}`
        : `${reading.bookName} ${reading.chapters[0]}-${reading.chapters[reading.chapters.length - 1]}`,
    )
    .join(", ");
}
export function findPlanDevotional(
  devotionals: Devotional[],
  planId: number,
  day: number,
) {
  return (
    devotionals.find((devotional) => {
      const content = parseDevotionalContent(devotional);
      return content.planId === planId && content.planDay === day;
    }) ?? null
  );
}
