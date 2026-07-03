import { getApiToken } from "@/lib/api";
import { resolveMediaUrl } from "@/lib/media";

export async function openAuthedFile(relativeOrAbsoluteUrl: string, label?: string) {
  const resolved = resolveMediaUrl(relativeOrAbsoluteUrl);
  if (!resolved) throw new Error("URL inválida");

  const token = getApiToken();
  const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};
  const res = await fetch(resolved, { headers });
  if (!res.ok) throw new Error(`No se pudo descargar el archivo (${res.status})`);

  const blob = await res.blob();
  const blobUrl = URL.createObjectURL(blob);
  const opened = window.open(blobUrl, "_blank");
  if (!opened) {
    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = label?.replace(/[/\\?%*:|"<>]/g, "") || "archivo";
    a.click();
  }
  window.setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
}
