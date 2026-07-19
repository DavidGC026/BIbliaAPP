export type NoteFont = {
  id: string;
  label: string;
  family: string;
  googleFamily?: string;
};

export const NOTE_FONTS: NoteFont[] = [
  { id: "default", label: "Predeterminada", family: "inherit" },
  { id: "serif", label: "Serif del sistema", family: "Georgia, serif" },
  { id: "monospace", label: "Monoespaciada", family: "monospace" },
  { id: "lora", label: "Lora", family: "Lora, serif", googleFamily: "Lora" },
  {
    id: "playfair-display",
    label: "Playfair Display",
    family: '"Playfair Display", serif',
    googleFamily: "Playfair Display",
  },
  {
    id: "merriweather",
    label: "Merriweather",
    family: "Merriweather, serif",
    googleFamily: "Merriweather",
  },
  {
    id: "inter",
    label: "Inter",
    family: "Inter, sans-serif",
    googleFamily: "Inter",
  },
  {
    id: "montserrat",
    label: "Montserrat",
    family: "Montserrat, sans-serif",
    googleFamily: "Montserrat",
  },
  {
    id: "roboto",
    label: "Roboto",
    family: "Roboto, sans-serif",
    googleFamily: "Roboto",
  },
  {
    id: "outfit",
    label: "Outfit",
    family: "Outfit, sans-serif",
    googleFamily: "Outfit",
  },
  {
    id: "poppins",
    label: "Poppins",
    family: "Poppins, sans-serif",
    googleFamily: "Poppins",
  },
  {
    id: "oswald",
    label: "Oswald",
    family: "Oswald, sans-serif",
    googleFamily: "Oswald",
  },
  {
    id: "fira-code",
    label: "Fira Code",
    family: '"Fira Code", monospace',
    googleFamily: "Fira Code",
  },
];

export const DEFAULT_NOTE_COLORS = [
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
];

const FONT_KEY = (noteId: number) => `bibliaapp_note_font_${noteId}`;
const COLOR_KEY = "bibliaapp_note_favorite_colors";

export function getNoteFont(noteId: number | null): string {
  if (noteId == null) return "default";
  return localStorage.getItem(FONT_KEY(noteId)) ?? "default";
}

export function saveNoteFont(noteId: number, fontId: string) {
  if (fontId === "default") localStorage.removeItem(FONT_KEY(noteId));
  else localStorage.setItem(FONT_KEY(noteId), fontId);
}

export function deleteNoteFont(noteId: number) {
  localStorage.removeItem(FONT_KEY(noteId));
}

export function getNoteFontFamily(fontId: string): string {
  return NOTE_FONTS.find((font) => font.id === fontId)?.family ?? "inherit";
}

export function ensureNoteFontLoaded(fontId: string) {
  const font = NOTE_FONTS.find((item) => item.id === fontId);
  if (!font?.googleFamily || typeof document === "undefined") return;
  const id = `bibliaapp-font-${font.id}`;
  if (document.getElementById(id)) return;
  const link = document.createElement("link");
  link.id = id;
  link.rel = "stylesheet";
  link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(font.googleFamily).replace(/%20/g, "+")}:wght@400;600;700&display=swap`;
  document.head.appendChild(link);
}

export function getFavoriteNoteColors(): string[] {
  try {
    const value = JSON.parse(localStorage.getItem(COLOR_KEY) ?? "null");
    if (Array.isArray(value)) {
      const colors = value.filter(
        (item): item is string =>
          typeof item === "string" && /^#[0-9a-f]{6}$/i.test(item),
      );
      if (colors.length) return colors.slice(0, 16);
    }
  } catch {
    // Usa la paleta predeterminada.
  }
  return DEFAULT_NOTE_COLORS;
}

export function saveFavoriteNoteColors(colors: string[]) {
  localStorage.setItem(COLOR_KEY, JSON.stringify(colors.slice(0, 16)));
}
