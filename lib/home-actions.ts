import type { AppIconName } from "@/lib/app-icons"

const HOME_ACTIONS_STORAGE_KEY = "biblia_web_home_actions"

export type HomeActionKey =
  | "read"
  | "search"
  | "note"
  | "statistics"
  | "activity"
  | "dictionary"
  | "community"
  | "games"

export type HomeAction = {
  key: HomeActionKey
  title: string
  description: string
  guestDescription?: string
  requiresAuth?: boolean
  icon: AppIconName
  targetSection: string
}

/**
 * Catálogo web de accesos equivalentes a los de mobile.
 * Las acciones nativas (descargas offline) o dependientes de una selección
 * previa (imagen de versículo) no se anuncian como destinos web directos.
 */
export const HOME_ACTION_CATALOG: readonly HomeAction[] = [
  {
    key: "games",
    title: "Juegos bíblicos",
    description: "Completa versículos, encuentra parejas y adivina palabras",
    icon: "trophy",
    targetSection: "games",
  },
  {
    key: "read",
    title: "Ir a lectura",
    description: "Lee la Biblia capítulo a capítulo",
    icon: "bible",
    targetSection: "reading",
  },
  {
    key: "search",
    title: "Buscador avanzado",
    description: "Busca versículos y palabras clave",
    icon: "search",
    targetSection: "search",
  },
  {
    key: "note",
    title: "Nota rápida",
    description: "Captura una idea en tus libretas",
    guestDescription: "Requiere iniciar sesión",
    requiresAuth: true,
    icon: "notes",
    targetSection: "notebook",
  },
  {
    key: "statistics",
    title: "Estadísticas",
    description: "Revisa tu progreso de lectura",
    guestDescription: "Requiere iniciar sesión",
    requiresAuth: true,
    icon: "chart",
    targetSection: "statistics",
  },
  {
    key: "activity",
    title: "Actividad",
    description: "Consulta tu calendario reciente",
    guestDescription: "Requiere iniciar sesión",
    requiresAuth: true,
    icon: "calendar",
    targetSection: "activity",
  },
  {
    key: "dictionary",
    title: "Diccionario Strong",
    description: "Explora términos griegos y hebreos",
    icon: "dictionary",
    targetSection: "dictionary",
  },
  {
    key: "community",
    title: "Comunidad",
    description: "Consulta publicaciones de tu iglesia",
    guestDescription: "Requiere iniciar sesión",
    requiresAuth: true,
    icon: "community",
    targetSection: "feed",
  },
] as const

export const DEFAULT_HOME_ACTIONS: readonly HomeActionKey[] = ["read", "note", "search"]

function isHomeActionKey(value: unknown): value is HomeActionKey {
  return typeof value === "string" && HOME_ACTION_CATALOG.some((action) => action.key === value)
}

export function sanitizeHomeActions(value: unknown): HomeActionKey[] {
  if (!Array.isArray(value)) return [...DEFAULT_HOME_ACTIONS]
  const requested = new Set(value.filter(isHomeActionKey))
  const ordered = HOME_ACTION_CATALOG.map((action) => action.key).filter((key) => requested.has(key))
  return ordered.length > 0 ? ordered : [...DEFAULT_HOME_ACTIONS]
}

export function loadHomeActions(): HomeActionKey[] {
  if (typeof window === "undefined") return [...DEFAULT_HOME_ACTIONS]
  try {
    const raw = localStorage.getItem(HOME_ACTIONS_STORAGE_KEY)
    return raw ? sanitizeHomeActions(JSON.parse(raw)) : [...DEFAULT_HOME_ACTIONS]
  } catch {
    return [...DEFAULT_HOME_ACTIONS]
  }
}

export function saveHomeActions(keys: readonly HomeActionKey[]): HomeActionKey[] {
  const sanitized = sanitizeHomeActions(keys)
  if (typeof window !== "undefined") {
    localStorage.setItem(HOME_ACTIONS_STORAGE_KEY, JSON.stringify(sanitized))
  }
  return sanitized
}
