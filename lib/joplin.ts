import type { JoplinFolder, JoplinNote, JoplinNoteSummary } from "./types"

/**
 * Client for the Joplin Data API (desktop/terminal client with Web Clipper enabled).
 *
 * Env:
 *  - JOPLIN_API_URL  e.g. http://your-host:41184
 *  - JOPLIN_TOKEN    Web Clipper token (Tools > Options > Web Clipper)
 */

function config() {
  const base = process.env.JOPLIN_API_URL
  const token = process.env.JOPLIN_TOKEN
  if (!base || !token) {
    throw new Error("Faltan variables de entorno de Joplin (JOPLIN_API_URL, JOPLIN_TOKEN).")
  }
  return { base: base.replace(/\/$/, ""), token }
}

function url(path: string, query: Record<string, string | number> = {}) {
  const { base, token } = config()
  const params = new URLSearchParams({ token, ...Object.fromEntries(Object.entries(query).map(([k, v]) => [k, String(v)])) })
  return `${base}${path}?${params.toString()}`
}

async function jfetch(path: string, query: Record<string, string | number> = {}, init?: RequestInit) {
  const res = await fetch(url(path, query), { cache: "no-store", ...init })
  if (!res.ok) {
    const text = await res.text().catch(() => "")
    throw new Error(`Joplin Data API ${res.status}: ${text || path}`)
  }
  return res
}

export async function pingJoplin(): Promise<void> {
  const { base } = config()
  const res = await fetch(`${base}/ping`, { cache: "no-store" })
  const text = await res.text()
  if (!res.ok || text.trim() !== "JoplinClipperServer") {
    throw new Error("El cliente Joplin (Data API) no respondió. Verifica que el Web Clipper esté activo.")
  }
}

/* ---------- Folders (notebooks) ---------- */

export async function listFolders(): Promise<JoplinFolder[]> {
  const out: JoplinFolder[] = []
  let page = 1
  // paginate through all folders
  while (true) {
    const res = await jfetch("/folders", { fields: "id,title,parent_id", page, limit: 100 })
    const data = await res.json()
    for (const f of data.items as JoplinFolder[]) out.push(f)
    if (!data.has_more) break
    page++
  }
  return out
}

export async function createFolder(title: string, parentId?: string): Promise<JoplinFolder> {
  const res = await jfetch("/folders", {}, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title, parent_id: parentId ?? "" }),
  })
  const f = await res.json()
  return { id: f.id, title: f.title, parent_id: f.parent_id ?? "" }
}

/* ---------- Notes ---------- */

export async function listNotesInFolder(folderId: string): Promise<JoplinNoteSummary[]> {
  const out: JoplinNoteSummary[] = []
  let page = 1
  while (true) {
    const res = await jfetch(`/folders/${folderId}/notes`, {
      fields: "id,title,updated_time",
      order_by: "updated_time",
      order_dir: "DESC",
      page,
      limit: 100,
    })
    const data = await res.json()
    for (const n of data.items as JoplinNoteSummary[]) out.push(n)
    if (!data.has_more) break
    page++
  }
  return out
}

export async function getNote(id: string): Promise<JoplinNote> {
  const res = await jfetch(`/notes/${id}`, { fields: "id,title,body,parent_id,updated_time" })
  const n = await res.json()
  return { id: n.id, title: n.title ?? "", body: n.body ?? "", parent_id: n.parent_id ?? "" }
}

export async function createNote(title: string, body: string, folderId?: string): Promise<JoplinNote> {
  const res = await jfetch("/notes", {}, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title, body, parent_id: folderId ?? "" }),
  })
  const n = await res.json()
  return { id: n.id, title: n.title ?? title, body: n.body ?? body, parent_id: n.parent_id ?? "" }
}

export async function updateNote(id: string, body: string, title?: string): Promise<JoplinNote> {
  const payload: Record<string, string> = { body }
  if (title !== undefined) payload.title = title
  const res = await jfetch(`/notes/${id}`, {}, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
  const n = await res.json()
  return { id: n.id, title: n.title ?? "", body: n.body ?? body, parent_id: n.parent_id ?? "" }
}

/** Append a block of text (e.g. a verse) to the end of an existing note's body. */
export async function appendToNote(id: string, block: string): Promise<JoplinNote> {
  const current = await getNote(id)
  const sep = current.body.trim().length > 0 ? "\n\n" : ""
  return updateNote(id, `${current.body}${sep}${block}`)
}
