import { fetchUnsplashImages } from "@/lib/api";
import {
  daySeedFromDate,
  pickDailyImage,
  themeToUnsplashQuery,
} from "@/lib/verseThemeUnsplash";
import type { VerseOfDay } from "@/lib/types";

async function fetchUnsplashUrl(
  theme: string,
  orientation: "portrait" | "landscape" = "portrait",
): Promise<string | null> {
  try {
    const { images } = await fetchUnsplashImages(themeToUnsplashQuery(theme), {
      orientation,
    });
    return pickDailyImage(images, daySeedFromDate())?.url ?? null;
  } catch {
    return null;
  }
}

export async function resolveVerseBackgroundImage(
  verse: Pick<VerseOfDay, "theme" | "backgroundImage">,
  orientation: "portrait" | "landscape" = "portrait",
): Promise<string | null> {
  if (verse.backgroundImage?.trim()) return verse.backgroundImage.trim();
  if (!verse.theme?.trim()) return null;
  return fetchUnsplashUrl(verse.theme, orientation);
}
