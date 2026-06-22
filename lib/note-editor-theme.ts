import type { NoteEditorColors } from "./note-editor-html"

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

  const isDark = root.classList.contains("dark")

  return {
    text: read("--foreground", isDark ? "#E7E5E4" : "#3D3835"),
    textMuted: read("--muted-foreground", isDark ? "#A8A29E" : "#78716C"),
    background: read("--background", isDark ? "#1C1917" : "#FAF8F5"),
    card: read("--card", isDark ? "#292524" : "#FFFFFF"),
    border: read("--border", isDark ? "rgba(255,255,255,0.12)" : "#E7E5E4"),
    accent: read("--accent", isDark ? "#3D3835" : "#EDE8DE"),
    primary: read("--primary", isDark ? "#E8B84A" : "#92700C"),
    primarySoft: isDark ? "#422006" : "#FEF3C7",
    primaryBorder: isDark ? "rgba(232, 184, 74, 0.25)" : "rgba(146, 112, 12, 0.2)",
  }
}
