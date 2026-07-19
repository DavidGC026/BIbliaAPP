// Paridad con mobile lib/searchHistory.ts: últimas búsquedas guardadas
// localmente, visibles como chips reutilizables cuando el campo está vacío.

const KEY = "biblia_search_history"
const MAX_ENTRIES = 10

export function loadSearchHistory(): string[] {
  if (typeof window === "undefined") return []
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter((t): t is string => typeof t === "string" && t.trim().length > 0)
  } catch {
    return []
  }
}

export function addSearchHistory(term: string): string[] {
  const clean = term.trim()
  if (!clean) return loadSearchHistory()
  const next = [clean, ...loadSearchHistory().filter((t) => t.toLowerCase() !== clean.toLowerCase())].slice(
    0,
    MAX_ENTRIES,
  )
  persist(next)
  return next
}

export function removeSearchHistory(term: string): string[] {
  const next = loadSearchHistory().filter((t) => t !== term)
  persist(next)
  return next
}

export function clearSearchHistory(): string[] {
  persist([])
  return []
}

function persist(entries: string[]) {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(KEY, JSON.stringify(entries))
  } catch {
    // almacenamiento bloqueado: el historial es opcional
  }
}
