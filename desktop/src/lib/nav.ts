export type AppTab =
  | "home"
  | "bible"
  | "search"
  | "notes"
  | "feed"
  | "groups"
  | "profile"
  | "statistics"
  | "activity"
  | "highlights"
  | "admin"
  | "legal";

export const NAV_ITEMS: {
  id: AppTab;
  label: string;
  icon: string;
  section: string;
}[] = [
  { id: "home", label: "Inicio", icon: "⌂", section: "dashboard" },
  { id: "bible", label: "Biblia", icon: "✦", section: "reading" },
  { id: "search", label: "Búsqueda", icon: "⌕", section: "search" },
  { id: "notes", label: "Notas", icon: "✎", section: "notebook" },
  { id: "feed", label: "Comunidad", icon: "◉", section: "feed" },
  { id: "groups", label: "Grupos", icon: "◎", section: "groups" },
  { id: "profile", label: "Perfil", icon: "◐", section: "profile" },
];

export function parseAllowedSections(
  raw: string | string[] | null | undefined,
): string[] | null {
  if (raw == null) return null;
  if (Array.isArray(raw)) return raw;
  try {
    const value = JSON.parse(raw);
    return Array.isArray(value)
      ? value.filter((item) => typeof item === "string")
      : null;
  } catch {
    return null;
  }
}
