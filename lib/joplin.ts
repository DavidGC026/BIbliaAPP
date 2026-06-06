import type { JoplinNote } from "./types"

/**
 * Client for the Joplin Server API.
 * Uses session-based authentication via POST /api/sessions.
 *
 * Env:
 *  - JOPLIN_API_URL  e.g. https://joplin.dvguzman.com
 *  - JOPLIN_TOKEN    session ID obtained from POST /api/sessions
 */

function config() {
  const base = process.env.JOPLIN_API_URL
  const token = process.env.JOPLIN_TOKEN
  if (!base || !token) {
    throw new Error("Faltan variables de entorno de Joplin (JOPLIN_API_URL, JOPLIN_TOKEN).")
  }
  return { base: base.replace(/\/$/, ""), token }
}

function headers(): Record<string, string> {
  const { token } = config()
  return {
    "Content-Type": "application/json",
    "Cookie": `sessionId=${token}`,
    "X-API-AUTH": token,
  }
}

export async function pingJoplin(): Promise<void> {
  const { base } = config()
  // Joplin Server exposes /api/ping
  const res = await fetch(`${base}/api/ping`, { cache: "no-store" })
  if (!res.ok) {
    throw new Error(`Joplin Server no alcanzable (${res.status}).`)
  }
  const data = await res.json()
  if (data.status !== "ok") {
    throw new Error("El servicio en JOPLIN_API_URL no respondió correctamente.")
  }
}

export async function getNote(id: string): Promise<JoplinNote> {
  const { base } = config()
  const res = await fetch(`${base}/api/items/root:/notes/${id}.md:/content`, {
    cache: "no-store",
    headers: headers(),
  })
  if (!res.ok) throw new Error(`No se pudo obtener la nota ${id} (${res.status}).`)
  const body = await res.text()
  return {
    id,
    title: `Nota ${id}`,
    body,
  }
}

export async function updateNote(id: string, body: string, title?: string): Promise<JoplinNote> {
  const { base } = config()
  const content = title ? `${title}\n\n${body}` : body
  const res = await fetch(`${base}/api/items/root:/notes/${id}.md:/content`, {
    method: "PUT",
    headers: headers(),
    body: content,
  })
  if (!res.ok) throw new Error(`No se pudo actualizar la nota ${id} (${res.status}).`)
  return { id, title: title ?? `Nota ${id}`, body }
}

export async function createNote(title: string, body: string): Promise<JoplinNote> {
  // Generate a unique note ID (Joplin uses 32-char hex IDs)
  const id = Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join("")
  const { base } = config()
  const content = `${title}\n\n${body}`
  const res = await fetch(`${base}/api/items/root:/notes/${id}.md:/content`, {
    method: "PUT",
    headers: headers(),
    body: content,
  })
  if (!res.ok) throw new Error(`No se pudo crear la nota (${res.status}).`)
  return { id, title, body }
}
