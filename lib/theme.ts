// Paridad con mobile/context/ThemeContext.tsx (isDarkTheme):
// centraliza qué paletas web son oscuras. Las clases CSS viven en
// app/globals.css y las opciones del selector en components/theme-toggle.tsx.
export const DARK_THEMES = ['dark', 'sepia-dark', 'midnight', 'forest', 'dvg', 'ubg'] as const

export function isDarkThemeName(name: string | null | undefined): boolean {
  return !!name && (DARK_THEMES as readonly string[]).includes(name)
}
