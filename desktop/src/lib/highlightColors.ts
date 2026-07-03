import type { CSSProperties } from "react";

export const HIGHLIGHT_COLORS = ["yellow", "green", "blue", "orange", "pink"] as const;

type HighlightTheme = {
  id: string;
  swatch: string;
  accent: string;
  bgLight: string;
  bgDark: string;
};

const HIGHLIGHT_PALETTE: HighlightTheme[] = [
  { id: "yellow", swatch: "#FACC15", accent: "#EAB308", bgLight: "rgba(234, 179, 8, 0.22)", bgDark: "rgba(234, 179, 8, 0.35)" },
  { id: "green", swatch: "#34D399", accent: "#10B981", bgLight: "rgba(16, 185, 129, 0.22)", bgDark: "rgba(16, 185, 129, 0.35)" },
  { id: "blue", swatch: "#38BDF8", accent: "#0EA5E9", bgLight: "rgba(14, 165, 233, 0.22)", bgDark: "rgba(14, 165, 233, 0.35)" },
  { id: "orange", swatch: "#FB923C", accent: "#F97316", bgLight: "rgba(249, 115, 22, 0.22)", bgDark: "rgba(249, 115, 22, 0.35)" },
  { id: "pink", swatch: "#F472B6", accent: "#EC4899", bgLight: "rgba(236, 72, 153, 0.22)", bgDark: "rgba(236, 72, 153, 0.35)" },
];

const byId = Object.fromEntries(HIGHLIGHT_PALETTE.map((p) => [p.id, p]));

export function verseHighlightStyle(color: string, isDark: boolean): CSSProperties {
  const t = byId[color];
  if (!t) return {};
  return {
    backgroundColor: isDark ? t.bgDark : t.bgLight,
    borderLeft: `4px solid ${t.accent}`,
    borderRadius: "6px",
    paddingLeft: "8px",
  };
}

export function highlightSwatch(color: string) {
  return byId[color]?.swatch ?? color;
}
