export type NotebookCoverId =
  | "grad-purple"
  | "grad-blue"
  | "grad-ocean"
  | "grad-emerald"
  | "grad-gold"
  | "grad-rose";

export const NOTEBOOK_PRESET_COVERS: {
  id: NotebookCoverId;
  label: string;
  colors: [string, string, string];
}[] = [
  { id: "grad-purple", label: "Púrpura Imperial", colors: ["#1e1b4b", "#581c87", "#9f1239"] },
  { id: "grad-blue", label: "Cielo Nocturno", colors: ["#020617", "#172554", "#312e81"] },
  { id: "grad-ocean", label: "Océano Profundo", colors: ["#172554", "#164e63", "#115e59"] },
  { id: "grad-emerald", label: "Bosque Místico", colors: ["#022c22", "#042f2e", "#064e3b"] },
  { id: "grad-gold", label: "Escritura Antigua", colors: ["#1c1917", "#451a03", "#78350f"] },
  { id: "grad-rose", label: "Gracia Divina", colors: ["#0c0a09", "#4c0519", "#831843"] },
];

export function getPresetCover(id?: string | null) {
  return NOTEBOOK_PRESET_COVERS.find((c) => c.id === id) ?? NOTEBOOK_PRESET_COVERS[0];
}

export function isCustomCoverUrl(cover?: string | null) {
  if (!cover) return false;
  return !cover.startsWith("grad-");
}

export function isPresetCover(cover?: string | null): cover is NotebookCoverId {
  return !!cover && cover.startsWith("grad-");
}

export function stripNotePreview(content: string, max = 100) {
  const plain = htmlToPlain(content);
  if (plain.length <= max) return plain;
  return `${plain.substring(0, max).trim()}…`;
}

export function htmlToPlain(html: string) {
  if (!/<[a-z][^>]*>/i.test(html)) return html.trim();
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|h[1-6]|blockquote|tr)>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function plainToHtml(text: string) {
  const t = text.trim();
  if (!t) return "";
  if (/<[a-z][^>]*>/i.test(t)) return t;
  return t
    .split(/\n{2,}/)
    .map((p) => `<p>${escapeHtml(p.replace(/\n/g, " "))}</p>`)
    .join("");
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function coverGradientStyle(cover?: string | null): {
  background: string;
} {
  const preset = !isCustomCoverUrl(cover) ? getPresetCover(cover) : null;
  if (!preset) return { background: "#334155" };
  return {
    background: `linear-gradient(135deg, ${preset.colors[0]}, ${preset.colors[1]}, ${preset.colors[2]})`,
  };
}
