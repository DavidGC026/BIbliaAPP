const READER_PREFERENCES_KEY = "biblia_reader_preferences"
const LEGACY_FONT_SIZE_KEY = "bible_font_size"

export type ReaderDensity = "relaxed" | "compact"
export type ReaderAlign = "left" | "justify"
export type ReaderTheme = "auto" | "light" | "sepia" | "night" | "contrast"
/** "verses": un bloque por versículo; "paragraphs": texto corrido con números en superíndice */
export type ReaderLayout = "verses" | "paragraphs"

export type ReaderPreferences = {
  fontSize: number
  density: ReaderDensity
  align: ReaderAlign
  theme: ReaderTheme
  layout: ReaderLayout
  /**
   * Mostrar los comentarios clásicos bajo los versículos que los tengan.
   * Desactivado por defecto: el lector es para leer la Biblia, y quien quiera
   * estudio lo enciende. Apagado, el capítulo ni siquiera los pide al servidor.
   */
  showCommentaries: boolean
  /**
   * Panel interlineal bajo el versículo. Desactivado por defecto, igual que
   * los comentarios: solo se pide al servidor cuando alguien lo enciende.
   */
  showInterlinear: boolean
}

export type ReaderPalette = {
  background: string
  text: string
  muted: string
  border: string
  accent: string
  accentSoft: string
}

export const READER_THEME_PALETTES: Record<Exclude<ReaderTheme, "auto">, ReaderPalette> = {
  light: { background: "#FFFFFF", text: "#1F2937", muted: "#6B7280", border: "#E5E7EB", accent: "#92700C", accentSoft: "#FEF3C7" },
  sepia: { background: "#F5ECD9", text: "#433422", muted: "#8A7256", border: "#DCCBA4", accent: "#8A5A2B", accentSoft: "#EAD7B3" },
  night: { background: "#0B1220", text: "#E5E7EB", muted: "#94A3B8", border: "#1E293B", accent: "#E8B84A", accentSoft: "#332A11" },
  contrast: { background: "#000000", text: "#FFFFFF", muted: "#D1D5DB", border: "#4B5563", accent: "#FFD866", accentSoft: "#2B2200" },
}

export const READER_THEME_OPTIONS: readonly { key: ReaderTheme; label: string }[] = [
  { key: "auto", label: "Auto" },
  { key: "light", label: "Claro" },
  { key: "sepia", label: "Sepia" },
  { key: "night", label: "Noche" },
  { key: "contrast", label: "Contraste" },
]

export const DEFAULT_READER_PREFERENCES: ReaderPreferences = {
  fontSize: 18,
  density: "relaxed",
  align: "left",
  theme: "auto",
  layout: "verses",
  showCommentaries: false,
  showInterlinear: false,
}

function clampFontSize(value: unknown): number {
  const parsed = typeof value === "number" ? value : Number(value)
  return Number.isFinite(parsed) ? Math.min(28, Math.max(14, parsed)) : DEFAULT_READER_PREFERENCES.fontSize
}

export function sanitizeReaderPreferences(value: unknown): ReaderPreferences {
  const source = value && typeof value === "object" ? value as Partial<ReaderPreferences> : {}
  return {
    fontSize: clampFontSize(source.fontSize),
    density: source.density === "compact" ? "compact" : "relaxed",
    align: source.align === "justify" ? "justify" : "left",
    theme: source.theme === "light" || source.theme === "sepia" || source.theme === "night" || source.theme === "contrast"
      ? source.theme
      : "auto",
    layout: source.layout === "paragraphs" ? "paragraphs" : "verses",
    showCommentaries: source.showCommentaries === true,
    showInterlinear: source.showInterlinear === true,
  }
}

export function loadReaderPreferences(): ReaderPreferences {
  if (typeof window === "undefined") return { ...DEFAULT_READER_PREFERENCES }
  try {
    const raw = localStorage.getItem(READER_PREFERENCES_KEY)
    if (raw) return sanitizeReaderPreferences(JSON.parse(raw))
    const legacySize = localStorage.getItem(LEGACY_FONT_SIZE_KEY)
    return sanitizeReaderPreferences({ ...DEFAULT_READER_PREFERENCES, fontSize: legacySize ?? undefined })
  } catch {
    return { ...DEFAULT_READER_PREFERENCES }
  }
}

export function saveReaderPreferences(preferences: ReaderPreferences): ReaderPreferences {
  const sanitized = sanitizeReaderPreferences(preferences)
  if (typeof window !== "undefined") {
    localStorage.setItem(READER_PREFERENCES_KEY, JSON.stringify(sanitized))
    localStorage.removeItem(LEGACY_FONT_SIZE_KEY)
  }
  return sanitized
}

export function getReaderPalette(theme: ReaderTheme): ReaderPalette | null {
  return theme === "auto" ? null : READER_THEME_PALETTES[theme]
}
