export type StrongLanguageHint = "grc" | "heb" | "arc"

const CODE_SHAPE = /^([GHgh])?0*(\d+)([A-Za-z])?$/

/**
 * Códigos que Strong clásico no cubre. H9xxx son partículas de STEPBible;
 * G6xxx (y erratas de 5 dígitos como G20447) no existen en OpenScriptures.
 */
const EXPLICIT_UNRESOLVED_STRONG = new Set<string>(["G20447", "G20833"])

function inferPrefix(hint?: StrongLanguageHint): "G" | "H" | null {
  if (hint === "grc") return "G"
  if (hint === "heb" || hint === "arc") return "H"
  return null
}

function normalizeOne(token: string, languageHint?: StrongLanguageHint): string | null {
  const beforeMorph = token.split("=")[0]?.trim() ?? ""
  const withoutInstance = beforeMorph.replace(/_[A-Z]$/i, "")
  const match = withoutInstance.match(CODE_SHAPE)
  if (!match) return null

  const prefix = (match[1]?.toUpperCase() || inferPrefix(languageHint)) as "G" | "H" | null
  if (!prefix) return null

  const number = Number(match[2])
  if (!Number.isFinite(number)) return null
  return `${prefix}${number}`
}

/** Convierte un token crudo en uno o más códigos al formato de BD: G1 / H1. */
export function normalizeStrongCodes(raw: string, languageHint?: StrongLanguageHint): string[] {
  if (!raw.trim()) return []

  const seen = new Set<string>()
  const codes: string[] = []
  for (const part of raw.replace(/[{}]/g, "").split(/[/\\]/)) {
    const code = normalizeOne(part.trim(), languageHint)
    if (!code || seen.has(code)) continue
    seen.add(code)
    codes.push(code)
  }
  return codes
}

export function normalizeStrongCode(raw: string, languageHint?: StrongLanguageHint): string | null {
  return normalizeStrongCodes(raw, languageHint)[0] ?? null
}

export function isUnresolvedStrongExpected(code: string): boolean {
  if (EXPLICIT_UNRESOLVED_STRONG.has(code)) return true
  const match = code.match(/^([GH])(\d+)$/)
  if (!match) return false
  const value = Number(match[2])
  if (match[1] === "H" && value >= 9000) return true
  if (match[1] === "G" && value >= 6000) return true
  return false
}
