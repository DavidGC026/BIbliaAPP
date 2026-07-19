import { COMMUNITY_ENABLED } from "@/lib/config";

export type AppTab =
  | "home"
  | "bible"
  | "search"
  | "notes"
  | "feed"
  | "groups"
  | "events"
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
  { id: "events", label: "Calendario", icon: "□", section: "calendar" },
  { id: "profile", label: "Perfil", icon: "◐", section: "profile" },
];

export const TAB_SECTIONS: Partial<Record<AppTab, string>> = {
  home: "dashboard",
  bible: "reading",
  search: "search",
  notes: "notebook",
  feed: "feed",
  groups: "groups",
  events: "calendar",
  profile: "profile",
  statistics: "statistics",
  activity: "activity",
  highlights: "highlights",
  admin: "users",
};

export function canOpenTab(
  tab: AppTab,
  user:
    | {
        role?: string;
        allowedSections?: string | string[] | null;
      }
    | null
    | undefined,
) {
  if (!COMMUNITY_ENABLED && (tab === "feed" || tab === "groups")) return false;
  if (tab === "legal" || user?.role === "admin") return true;
  const section = TAB_SECTIONS[tab];
  if (!section) return true;
  const allowed = parseAllowedSections(user?.allowedSections);
  return !allowed || allowed.includes(section);
}

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
