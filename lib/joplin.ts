import type { JoplinNote } from "./types"

/**
 * Thin client over the Joplin Data API.
 * Requires a running Joplin Desktop/Terminal client (synced with the server)
 * that exposes the Data API, plus its token.
 *
 * Env:
 *  - JOPLIN_API_URL  e.g. http://localhost:41184
 *  - JOPLIN_TOKEN    the Web Clipper authorization token
 */
function config() {
  const base = process.env.JOPLIN_API_URL
  const token = process.env.JOPLIN_TOKEN
  if (!base || !token) {
    throw new Error("Faltan variables de entorno de Joplin (JOPLIN_API_URL, JOPLIN_TOKEN).")
  }
  return { base: base.replace(/\/$/, ""), token }
}

function withToken(path: string, params: Record<string, string> = {}): string {
  const { base, token } = config()
  const url = new URL(base + path)
  url.searchParams.set("token", token)
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)
  return url.toString()
}

export async function pingJoplin(): Promise<void> {
  const { base, token } = config()
  const res = await fetch(`${base}/ping`, { cache: "no-store" })
  const text = await res.text()
  if (text.trim() !== "JoplinClipperServer") {
    throw new Error("El servicio en JOPLIN_API_URL no respondió como un cliente Joplin.")
  }
  // Validate the token by hitting an authenticated endpoint.
  const authRes = await fetch(`${base}/notes?token=${token}&limit=1`, { cache: "no-store" })
  if (!authRes.ok) {
    throw new Error("Token de Joplin inválido o sin permisos.")
  }
}

export async function getNote(id: string): Promise<JoplinNote> {
  const res = await fetch(withToken(`/notes/${id}`, { fields: "id,title,body,updated_time,created_time" }), {
    cache: "no-store",
  })
  if (!res.ok) throw new Error(`No se pudo obtener la nota ${id} (${res.status}).`)
  return (await res.json()) as JoplinNote
}

export async function updateNote(id: string, body: string, title?: string): Promise<JoplinNote> {
  const payload: Record<string, string> = { body }
  if (title) payload.title = title
  const res = await fetch(withToken(`/notes/${id}`), {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
  if (!res.ok) throw new Error(`No se pudo actualizar la nota ${id} (${res.status}).`)
  return (await res.json()) as JoplinNote
}

export async function createNote(title: string, body: string): Promise<JoplinNote> {
  const res = await fetch(withToken("/notes"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title, body }),
  })
  if (!res.ok) throw new Error(`No se pudo crear la nota (${res.status}).`)
  return (await res.json()) as JoplinNote
}
