/** Tags del dashboard → búsqueda Unsplash (orientación portrait ≈ 3:4). */
export const THEME_UNSPLASH_QUERIES: Record<string, string> = {
  Amor: 'love sunset romantic nature',
  Fe: 'faith light rays cross sky',
  Fortaleza: 'mountain peak strength landscape',
  Ansiedad: 'calm peaceful forest mist',
  Esperanza: 'sunrise horizon hope sky',
  Paz: 'calm lake peaceful water',
  Consuelo: 'soft light meadow comfort',
  Promesa: 'rainbow sky horizon landscape',
};

export function themeToUnsplashQuery(theme: string): string {
  const trimmed = theme?.trim();
  if (!trimmed) return 'nature landscape spiritual';
  return THEME_UNSPLASH_QUERIES[trimmed] ?? `${trimmed} nature spiritual landscape`;
}

export async function fetchThemeBackgroundImage(
  theme: string,
  daySeed: number,
  orientation: 'portrait' | 'landscape' | 'squarish' = 'portrait',
): Promise<string | null> {
  const accessKey = process.env.UNSPLASH_ACCESS_KEY;
  if (!accessKey) return null;

  const query = themeToUnsplashQuery(theme);
  const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&orientation=${orientation}&per_page=15`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Client-ID ${accessKey}`,
      'Accept-Version': 'v1',
    },
    next: { revalidate: 3600 },
  });

  if (!response.ok) return null;

  const data = await response.json();
  const results = data.results as { urls?: { regular?: string } }[] | undefined;
  if (!results?.length) return null;

  const idx = Math.abs(daySeed) % results.length;
  return results[idx]?.urls?.regular ?? null;
}
