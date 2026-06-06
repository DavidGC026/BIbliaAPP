import type { JoplinNote } from "./types"

/**
 * Client for the Joplin Server API.
 * Uses session-based authentication via POST /api/sessions.
 *
 * Env:
 *  - JOPLIN_API_URL  e.g. https://joplin.dvguzman.com
 *  - JOPLIN_TOKEN    session ID obtained from POST /api/sessions
 */

function config(customToken?: string) {
  const base = process.env.JOPLIN_API_URL
  const token = customToken || process.env.JOPLIN_TOKEN
  if (!base) {
    throw new Error("Falta la variable de entorno JOPLIN_API_URL.")
  }
  return { base: base.replace(/\/$/, ""), token }
}

function headers(customToken?: string): Record<string, string> {
  const { token } = config(customToken)
  if (!token) {
    throw new Error("No hay un token de sesión de Joplin activo.")
  }
  return {
    "Content-Type": "application/json",
    "Cookie": `sessionId=${token}`,
    "X-API-AUTH": token,
  }
}

export async function pingJoplin(customToken?: string): Promise<void> {
  const { base, token } = config(customToken)
  if (!token) {
    throw new Error("Token de sesión no configurado.")
  }
  const res = await fetch(`${base}/api/ping`, { cache: "no-store" })
  if (!res.ok) {
    throw new Error(`Joplin Server no alcanzable (${res.status}).`)
  }
  const data = await res.json()
  if (data.status !== "ok") {
    throw new Error("El servicio en JOPLIN_API_URL no respondió correctamente.")
  }
}

export async function getNote(id: string, customToken?: string): Promise<JoplinNote> {
  const { base } = config(customToken)
  const res = await fetch(`${base}/api/items/root:/notes/${id}.md:/content`, {
    cache: "no-store",
    headers: headers(customToken),
  })
  if (!res.ok) throw new Error(`No se pudo obtener la nota ${id} (${res.status}).`)
  const body = await res.text()
  return {
    id,
    title: `Nota ${id}`,
    body,
  }
}

export async function updateNote(
  id: string,
  body: string,
  title?: string,
  customToken?: string,
): Promise<JoplinNote> {
  const { base } = config(customToken)
  const content = title ? `${title}\n\n${body}` : body
  const res = await fetch(`${base}/api/items/root:/notes/${id}.md:/content`, {
    method: "PUT",
    headers: headers(customToken),
    body: content,
  })
  if (!res.ok) throw new Error(`No se pudo actualizar la nota ${id} (${res.status}).`)
  return { id, title: title ?? `Nota ${id}`, body }
}

export async function createNote(title: string, body: string, customToken?: string): Promise<JoplinNote> {
  // Generate a unique note ID (Joplin uses 32-char hex IDs)
  const id = Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join("")
  const { base } = config(customToken)
  const content = `${title}\n\n${body}`
  const res = await fetch(`${base}/api/items/root:/notes/${id}.md:/content`, {
    method: "PUT",
    headers: headers(customToken),
    body: content,
  })
  if (!res.ok) throw new Error(`No se pudo crear la nota (${res.status}).`)
  return { id, title, body }
}
