const TEMPLATE_KEY = "BIBLIA_VERSE_IMAGE_TEMPLATE"

/**
 * Estilo favorito del creador de imágenes (espejo web de
 * mobile/lib/verseImageTemplate.ts, con localStorage en vez de SecureStore).
 * El tamaño de letra no se guarda porque depende del largo del versículo.
 */
export type VerseImageTemplate = {
  formatId: string
  styleId: string
  gradientId: string
}

export function getVerseImageTemplate(): VerseImageTemplate | null {
  try {
    const raw = localStorage.getItem(TEMPLATE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<VerseImageTemplate>
    if (
      typeof parsed.formatId !== "string" ||
      typeof parsed.styleId !== "string" ||
      typeof parsed.gradientId !== "string"
    ) {
      return null
    }
    return { formatId: parsed.formatId, styleId: parsed.styleId, gradientId: parsed.gradientId }
  } catch {
    return null
  }
}

export function saveVerseImageTemplate(template: VerseImageTemplate) {
  try {
    localStorage.setItem(TEMPLATE_KEY, JSON.stringify(template))
  } catch {
    // storage lleno o no disponible: no bloquear al usuario
  }
}
