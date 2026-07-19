import type { IconName } from "@/components/ui/Icon";

export type ReaderDensity = "relaxed" | "compact";
export type ReaderAlign = "left" | "justify";
export type ReaderTheme = "auto" | "light" | "sepia" | "night" | "contrast";

export type ReaderPreferences = {
  fontSize: number;
  density: ReaderDensity;
  align: ReaderAlign;
  theme: ReaderTheme;
};

export type LastPassage = {
  bibleId: number;
  bibleAbbr: string;
  bookId: number;
  bookName: string;
  chapter: number;
  updatedAt: string;
};

export type HomeActionKey =
  | "read"
  | "search"
  | "universalSearch"
  | "note"
  | "downloads"
  | "image"
  | "stats"
  | "activity"
  | "dictionary"
  | "community";

export const HOME_ACTION_CATALOG: Array<{
  key: HomeActionKey;
  title: string;
  description: string;
  icon: IconName;
}> = [
  {
    key: "read",
    title: "Ir a lectura",
    description: "Continúa leyendo capítulo a capítulo",
    icon: "book",
  },
  {
    key: "search",
    title: "Buscador bíblico",
    description: "Busca palabras en una versión",
    icon: "search",
  },
  {
    key: "universalSearch",
    title: "Búsqueda universal",
    description: "Biblia, notas, diario y diccionario",
    icon: "sparkles",
  },
  {
    key: "note",
    title: "Nota rápida",
    description: "Captura una idea en tus libretas",
    icon: "notes",
  },
  {
    key: "downloads",
    title: "Descargas offline",
    description: "Administra Biblias locales",
    icon: "download",
  },
  {
    key: "image",
    title: "Imagen de versículo",
    description: "Selecciona un texto en el lector",
    icon: "image",
  },
  {
    key: "stats",
    title: "Estadísticas",
    description: "Revisa tu progreso de lectura",
    icon: "chart",
  },
  {
    key: "activity",
    title: "Actividad",
    description: "Consulta tu calendario reciente",
    icon: "activity",
  },
  {
    key: "dictionary",
    title: "Diccionario Strong",
    description: "Explora griego y hebreo",
    icon: "dictionary",
  },
  {
    key: "community",
    title: "Comunidad",
    description: "Publicaciones de tu iglesia",
    icon: "community",
  },
];

export const DEFAULT_HOME_ACTIONS: HomeActionKey[] = [
  "read",
  "search",
  "universalSearch",
  "note",
  "stats",
  "activity",
  "dictionary",
  "community",
];

export const DEFAULT_READER_PREFERENCES: ReaderPreferences = {
  fontSize: 19,
  density: "relaxed",
  align: "left",
  theme: "auto",
};

const KEYS = {
  reader: "bibliaapp_reader_preferences",
  passage: "bibliaapp_last_passage",
  home: "bibliaapp_home_actions",
  history: "bibliaapp_search_history",
  onboarding: "bibliaapp_onboarding_dismissed",
  verseTemplate: "bibliaapp_verse_image_template",
};

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function getReaderPreferences(): ReaderPreferences {
  const value = readJson<Partial<ReaderPreferences>>(KEYS.reader, {});
  return {
    fontSize: Math.min(24, Math.max(16, Number(value.fontSize) || 19)),
    density: value.density === "compact" ? "compact" : "relaxed",
    align: value.align === "justify" ? "justify" : "left",
    theme: ["light", "sepia", "night", "contrast"].includes(value.theme ?? "")
      ? (value.theme as ReaderTheme)
      : "auto",
  };
}

export function saveReaderPreferences(value: ReaderPreferences) {
  localStorage.setItem(KEYS.reader, JSON.stringify(value));
}

export function getLastPassage(): LastPassage | null {
  return readJson<LastPassage | null>(KEYS.passage, null);
}

export function saveLastPassage(value: Omit<LastPassage, "updatedAt">) {
  localStorage.setItem(
    KEYS.passage,
    JSON.stringify({ ...value, updatedAt: new Date().toISOString() }),
  );
}

export function getHomeActions(): HomeActionKey[] {
  const stored = readJson<unknown>(KEYS.home, DEFAULT_HOME_ACTIONS);
  if (!Array.isArray(stored)) return DEFAULT_HOME_ACTIONS;
  const valid = stored.filter((key): key is HomeActionKey =>
    HOME_ACTION_CATALOG.some((item) => item.key === key),
  );
  return valid.length ? valid : DEFAULT_HOME_ACTIONS;
}

export function saveHomeActions(keys: HomeActionKey[]) {
  localStorage.setItem(KEYS.home, JSON.stringify(keys));
}

export function getSearchHistory(): string[] {
  return readJson<string[]>(KEYS.history, [])
    .filter((item) => typeof item === "string")
    .slice(0, 10);
}

export function addSearchHistory(query: string): string[] {
  const clean = query.trim();
  if (clean.length < 2) return getSearchHistory();
  const next = [
    clean,
    ...getSearchHistory().filter(
      (item) => item.toLowerCase() !== clean.toLowerCase(),
    ),
  ].slice(0, 10);
  localStorage.setItem(KEYS.history, JSON.stringify(next));
  return next;
}

export function removeSearchHistory(query: string): string[] {
  const next = getSearchHistory().filter(
    (item) => item.toLowerCase() !== query.toLowerCase(),
  );
  localStorage.setItem(KEYS.history, JSON.stringify(next));
  return next;
}

export function clearSearchHistory() {
  localStorage.removeItem(KEYS.history);
}

export function isOnboardingDismissed() {
  return localStorage.getItem(KEYS.onboarding) === "1";
}

export function dismissOnboarding() {
  localStorage.setItem(KEYS.onboarding, "1");
}

export function getFavoriteVerseTemplate() {
  return localStorage.getItem(KEYS.verseTemplate) ?? "classic";
}

export function saveFavoriteVerseTemplate(template: string) {
  localStorage.setItem(KEYS.verseTemplate, template);
}
