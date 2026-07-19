import type { NoteEditorColors } from "./note-editor-html"
import { DARK_THEMES } from "./theme"

// primarySoft/primaryBorder no existen como variables CSS; se toman de
// mobile/constants/Colors.ts por tema (claro/oscuro como fallback)
const PRIMARY_EXTRAS: Record<string, { soft: string; border: string }> = {
  light: { soft: "#FEF3C7", border: "rgba(146, 112, 12, 0.2)" },
  dark: { soft: "#422006", border: "rgba(232, 184, 74, 0.25)" },
  sepia: { soft: "#EAD7B3", border: "rgba(138, 90, 43, 0.25)" },
  "sepia-dark": { soft: "#3D2A18", border: "rgba(214, 161, 93, 0.3)" },
  midnight: { soft: "#1E2D57", border: "rgba(138, 164, 255, 0.3)" },
  forest: { soft: "#123D31", border: "rgba(74, 222, 167, 0.28)" },
  lavender: { soft: "#E9E1FF", border: "rgba(103, 72, 173, 0.22)" },
  dvg: { soft: "#3F0D12", border: "rgba(248, 113, 113, 0.34)" },
  ubg: { soft: "#0B3B35", border: "rgba(56, 189, 248, 0.36)" },
}

export const DEFAULT_EDITOR_COLORS = [
  "#3D3835",
  "#E7E5E4",
  "#92700C",
  "#E8B84A",
  "#EF4444",
  "#F97316",
  "#F59E0B",
  "#10B981",
  "#0EA5E9",
  "#8B5CF6",
  "#EC4899",
]

export function getNoteEditorColors(): NoteEditorColors {
  if (typeof document === "undefined") {
    return {
      text: "#3D3835",
      textMuted: "#78716C",
      background: "#FAF8F5",
      card: "#FFFFFF",
      border: "#E7E5E4",
      accent: "#EDE8DE",
      primary: "#92700C",
      primarySoft: "#FEF3C7",
      primaryBorder: "rgba(146, 112, 12, 0.2)",
    }
  }

  const root = document.documentElement
  const read = (name: string, fallback: string) =>
    getComputedStyle(root).getPropertyValue(name).trim() || fallback

  const activeTheme =
    Object.keys(PRIMARY_EXTRAS).find(name => root.classList.contains(name)) ?? "light"
  const isDark = (DARK_THEMES as readonly string[]).includes(activeTheme)
  const extras = PRIMARY_EXTRAS[activeTheme]

  return {
    text: read("--foreground", isDark ? "#E7E5E4" : "#3D3835"),
    textMuted: read("--muted-foreground", isDark ? "#A8A29E" : "#78716C"),
    background: read("--background", isDark ? "#1C1917" : "#FAF8F5"),
    card: read("--card", isDark ? "#292524" : "#FFFFFF"),
    border: read("--border", isDark ? "rgba(255,255,255,0.12)" : "#E7E5E4"),
    accent: read("--accent", isDark ? "#3D3835" : "#EDE8DE"),
    primary: read("--primary", isDark ? "#E8B84A" : "#92700C"),
    primarySoft: extras.soft,
    primaryBorder: extras.border,
  }
}
