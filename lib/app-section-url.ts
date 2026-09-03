import { ALL_SECTION_IDS } from "@/lib/app-sections"

export const APP_SECTION_PARAM = "section"

const READER_QUERY_PARAMS = ["bible", "book", "chapter", "verse"] as const

/** Devuelve una sección válida desde cualquier cadena de búsqueda. */
export function parseAppSection(search: string): string | null {
  const section = new URLSearchParams(search).get(APP_SECTION_PARAM)
  return section && ALL_SECTION_IDS.includes(section) ? section : null
}

/** URL estable que funciona al abrir en otra pestaña o compartirla. */
export function getAppSectionHref(section: string): string {
  return `/?${APP_SECTION_PARAM}=${encodeURIComponent(section)}`
}

/** Conserva parámetros compatibles y limpia el contexto de la sección anterior. */
export function buildAppSectionUrl(pathname: string, search: string, section: string): string {
  const params = new URLSearchParams(search)
  params.set(APP_SECTION_PARAM, section)

  if (section !== "reading") {
    READER_QUERY_PARAMS.forEach((param) => params.delete(param))
  }
  if (section !== "dictionary") {
    params.delete("strong")
  }

  const query = params.toString()
  return query ? `${pathname}?${query}` : pathname
}
