// Paridad con mobile lib/readerState.ts ("Continuidad de lectura"):
// recuerda la última posición del lector para restaurarla al volver a Leer
// y mostrar "Continuar lectura" en el Dashboard. Solo localStorage, igual
// que en móvil la preferencia es local al dispositivo.

export interface LastReading {
  bibleId: number
  bookId: number
  chapter: number
  bookName?: string
  updatedAt: number
}

const LAST_READING_KEY = "biblia_last_reading"

export function saveLastReading(reading: Omit<LastReading, "updatedAt">) {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(
      LAST_READING_KEY,
      JSON.stringify({ ...reading, updatedAt: Date.now() } satisfies LastReading),
    )
  } catch {
    // almacenamiento lleno o bloqueado: la continuidad es opcional
  }
}

export function loadLastReading(): LastReading | null {
  if (typeof window === "undefined") return null
  try {
    const raw = localStorage.getItem(LAST_READING_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<LastReading>
    if (
      typeof parsed.bibleId !== "number" ||
      typeof parsed.bookId !== "number" ||
      typeof parsed.chapter !== "number" ||
      parsed.bookId < 1 ||
      parsed.chapter < 1
    ) {
      return null
    }
    return parsed as LastReading
  } catch {
    return null
  }
}
