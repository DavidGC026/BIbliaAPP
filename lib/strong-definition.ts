export interface DefinitionSection {
  label: string
  text: string
}

/**
 * Separa la definición cruda ("Strong: …\n\nKJV: …") en bloques etiquetados.
 */
export function parseStrongDefinition(definition: string): DefinitionSection[] {
  if (!definition) return []
  const labelMap: Record<string, string> = {
    Strong: "Definición",
    KJV: "Traducciones (KJV)",
    Derivation: "Derivación",
  }
  const sections: DefinitionSection[] = []
  for (const block of definition.split(/\n\n+/)) {
    const match = block.match(/^(Strong|KJV|Derivation):\s*([\s\S]*)$/)
    if (match) {
      sections.push({ label: labelMap[match[1]] ?? match[1], text: match[2].trim() })
    } else if (block.trim()) {
      sections.push({ label: "", text: block.trim() })
    }
  }
  return sections
}
