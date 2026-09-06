import type { ContentEnvelope, EditorCatalog, GameContent } from "./games/catalog"
import type { ProgressOperation, ProgressSyncReply } from "./games/sync"

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 15000)
  try {
    const headers = new Headers(options?.headers)
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("biblia_token")
      if (token) headers.set("Authorization", `Bearer ${token}`)
    }
    const response = await fetch(url, { ...options, headers, signal: controller.signal, cache: "no-store" })
    const result = await response.json()
    if (!response.ok) throw new Error(result.error ?? "No se pudo completar la solicitud.")
    return result
  } finally { clearTimeout(timer) }
}
export const loadGameContent = () => request<ContentEnvelope>("/api/games/content")
export const synchronizeGameProgress = (accountId: number, operations: ProgressOperation[]) => request<ProgressSyncReply>("/api/games/progress", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ accountId, operations }) })
export const loadEditorCatalog = () => request<EditorCatalog>("/api/admin/games/content")
export const saveEditorCatalog = (catalog: GameContent, revision: number) => request<{ catalog: GameContent; revision: number }>("/api/admin/games/content", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ catalog, revision }) })
