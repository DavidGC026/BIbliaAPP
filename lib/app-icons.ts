/**
 * Identificadores semánticos del set SVG compartido.
 *
 * Los archivos viven en `assets/icons` para que mobile, web y desktop partan
 * de la misma fuente visual. La web los expone con la ruta interna de assets.
 */
export const APP_ICON_NAMES = [
  "add", "arrow-left", "arrow-right", "bible", "bookmark", "calendar",
  "chart", "check", "chevron-down", "chevron-left", "chevron-right",
  "chevron-up", "close", "community", "copy", "delete", "dictionary",
  "download", "edit", "error", "flame", "folder", "groups", "heart",
  "highlighter", "home", "image", "info", "library", "link", "lock",
  "login", "logout", "more", "notes", "notifications", "offline", "pin",
  "profile", "quote", "reading-plan", "search", "settings", "share",
  "sidebar-collapse", "sidebar-expand", "sun", "sync", "text-size", "trophy",
  "upload", "visibility", "visibility-off",
] as const

export type AppIconName = (typeof APP_ICON_NAMES)[number]

export function isAppIconName(value: string): value is AppIconName {
  return (APP_ICON_NAMES as readonly string[]).includes(value)
}
