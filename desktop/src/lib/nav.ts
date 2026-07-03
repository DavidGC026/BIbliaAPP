export type AppTab = "home" | "bible" | "notes" | "feed" | "groups" | "profile";

export const NAV_ITEMS: { id: AppTab; label: string; icon: string }[] = [
  { id: "home", label: "Inicio", icon: "⌂" },
  { id: "bible", label: "Biblia", icon: "✦" },
  { id: "notes", label: "Notas", icon: "✎" },
  { id: "feed", label: "Comunidad", icon: "◉" },
  { id: "groups", label: "Grupos", icon: "◎" },
  { id: "profile", label: "Perfil", icon: "◐" },
];
