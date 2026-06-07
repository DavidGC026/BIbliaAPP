import type { JoplinNote } from "./types"
import {
  getSyncCursor,
  setSyncCursor,
  findNotebookByJoplinId,
  upsertNotebook,
  upsertNotebookNote,
  deleteNotebookByJoplinId,
  deleteNotebookNoteByJoplinId,
} from "./bible"

/**
 * Client for the Joplin Server API.
 * Uses session-based authentication via POST /api/sessions.
 *
 * Env:
 *  - JOPLIN_API_URL  e.g. https://joplin.dvguzman.com
 * Browser login returns a Joplin session ID, passed by API routes as x-joplin-session.
 */

function config() {
  const base = process.env.JOPLIN_API_URL
  if (!base) {
    throw new Error("Falta la variable de entorno JOPLIN_API_URL.")
  }
  return { base: base.replace(/\/$/, "") }
}

function requireSession(sessionId?: string): string {
  if (!sessionId) {
    throw new Error("Inicia sesión en Joplin para continuar.")
  }
  return sessionId
}

function headers(sessionId?: string): Record<string, string> {
  const token = requireSession(sessionId)
  return {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${token}`,
    "Cookie": `sessionId=${token}`,
    "X-API-AUTH": token,
  }
}

function contentHeaders(sessionId?: string): Record<string, string> {
  return {
    ...headers(sessionId),
    "Content-Type": "application/octet-stream",
  }
}

function formatJoplinNote(title: string, body: string, id: string, parentId?: string): string {
  const timeStr = new Date().toISOString().replace(/\.\d+Z$/, ".000Z")
  const parentLine = parentId ? `parent_id: ${parentId}\n` : ""
  return `${title}\n\n${body}\n\nid: ${id}\n${parentLine}created_time: ${timeStr}\nupdated_time: ${timeStr}\nis_conflict: 0\nlatitude: 0.00000000\nlongitude: 0.00000000\naltitude: 0.0000\nauthor: \nsource_url: \nis_todo: 0\ntodo_due: 0\ntodo_completed: 0\nsource: joplin\nsource_application: net.cozic.joplin-desktop\napplication_data: \norder: 0\nuser_created_time: ${timeStr}\nuser_updated_time: ${timeStr}\nencryption_cipher_text: \nencryption_was_encrypted: 0\nencryption_key_id: \ntype_: 1`
}

export async function createFolder(title: string, id: string, sessionId?: string): Promise<void> {
  const { base } = config()
  const timeStr = new Date().toISOString().replace(/\.\d+Z$/, ".000Z")
  const content = `${title}\n\nid: ${id}\ncreated_time: ${timeStr}\nupdated_time: ${timeStr}\nis_conflict: 0\nlatitude: 0.00000000\nlongitude: 0.00000000\naltitude: 0.0000\nauthor: \nsource_url: \nis_todo: 0\ntodo_due: 0\ntodo_completed: 0\nsource: joplin\nsource_application: net.cozic.joplin-desktop\napplication_data: \norder: 0\nuser_created_time: ${timeStr}\nuser_updated_time: ${timeStr}\nencryption_cipher_text: \nencryption_was_encrypted: 0\nencryption_key_id: \ntype_: 2`

  const res = await fetch(`${base}/api/items/root:/${id}.md:/content`, {
    method: "PUT",
    headers: contentHeaders(sessionId),
    body: content,
  })
  if (!res.ok) throw new Error(`No se pudo crear la libreta en Joplin (${res.status}): ${await res.text()}`)
}

export const BIBLIA_FOLDER_ID = "b1b11a00000000000000000000000000"
export const VERSE_NOTES_FOLDER_ID = "b1b11a00000000000000000000000001"

export async function ensureDefaultFolder(sessionId?: string): Promise<void> {
  try {
    await createFolder("Biblia", BIBLIA_FOLDER_ID, sessionId)
  } catch (err) {
    console.error("Error ensuring default Biblia folder:", err)
  }
}

export async function ensureVerseNotesFolder(sessionId?: string): Promise<void> {
  await createFolder("notas_v", VERSE_NOTES_FOLDER_ID, sessionId)
}

export async function pingJoplin(sessionId?: string): Promise<void> {
  const { base } = config()
  requireSession(sessionId)
  const res = await fetch(`${base}/api/ping`, { cache: "no-store" })
  if (!res.ok) {
    throw new Error(`Joplin Server no alcanzable (${res.status}).`)
  }
  const data = await res.json()
  if (data.status !== "ok") {
    throw new Error("El servicio en JOPLIN_API_URL no respondió correctamente.")
  }
}

export async function getNote(id: string, sessionId?: string): Promise<JoplinNote> {
  const { base } = config()
  const res = await fetch(`${base}/api/items/root:/${id}.md:/content`, {
    cache: "no-store",
    headers: headers(sessionId),
  })
  if (!res.ok) throw new Error(`No se pudo obtener la nota ${id} (${res.status}).`)
  const text = await res.text()
  
  // Extract clean body by stripping out metadata block at the bottom
  const lines = text.split("\n")
  const metadataIndex = lines.findIndex(line => line.startsWith("id: ") || line.startsWith("type_: "))
  
  let body = text
  let title = `Nota ${id}`
  
  if (metadataIndex !== -1) {
    body = lines.slice(0, metadataIndex).join("\n").trim()
  }
  
  // Clean up title if it's the first line
  const firstLine = lines[0] || ""
  if (firstLine.trim()) {
    title = firstLine.trim()
  }
  
  return {
    id,
    title,
    body,
  }
}

export async function updateNote(
  id: string,
  body: string,
  title?: string,
  parentId?: string,
  sessionId?: string,
): Promise<JoplinNote> {
  const { base } = config()
  const actualParentId = parentId
  const cleanTitle = title || `Nota ${id}`
  const content = formatJoplinNote(cleanTitle, body, id, actualParentId)
  
  const res = await fetch(`${base}/api/items/root:/${id}.md:/content`, {
    method: "PUT",
    headers: contentHeaders(sessionId),
    body: content,
  })
  if (!res.ok) throw new Error(`No se pudo actualizar la nota ${id} (${res.status}): ${await res.text()}`)
  return { id, title: cleanTitle, body }
}

export async function createNote(
  title: string,
  body: string,
  parentId?: string,
  sessionId?: string,
): Promise<JoplinNote> {
  const id = Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join("")
  const { base } = config()
  const actualParentId = parentId
  const content = formatJoplinNote(title, body, id, actualParentId)
  
  const res = await fetch(`${base}/api/items/root:/${id}.md:/content`, {
    method: "PUT",
    headers: contentHeaders(sessionId),
    body: content,
  })
  if (!res.ok) throw new Error(`No se pudo crear la nota (${res.status}): ${await res.text()}`)
  return { id, title, body }
}

export async function syncJoplin(sessionId?: string): Promise<void> {
  const { base } = config()
  const authHeaders = headers(sessionId)

  let currentCursor = await getSyncCursor(requireSession(sessionId))
  let hasMore = true
  let pages = 0

  while (hasMore) {
    pages++
    const url = `${base}/api/items/root:/:/delta` + (currentCursor ? `?cursor=${currentCursor}` : "")
    const res = await fetch(url, { headers: authHeaders })
    if (!res.ok) {
      if (res.status === 400 && currentCursor) {
        console.warn("Joplin delta cursor invalid, resetting and retrying from scratch...")
        currentCursor = ""
        continue
      }
      throw new Error(`Error al obtener delta de Joplin (${res.status}): ${await res.text()}`)
    }
    const data = await res.json()

    if (data.items) {
      for (const item of data.items) {
        const jopId = item.item_name.replace(".md", "")
        
        // Deletion change event (type = 2)
        if (item.type === 2) {
          await deleteNotebookNoteByJoplinId(jopId)
          await deleteNotebookByJoplinId(jopId)
          continue
        }

        // Create/Update change event (type = 1)
        if (item.type === 1 && item.jopItem) {
          const type_ = item.jopItem.type_
          
          if (type_ === 2) {
            // Folder
            if (jopId === BIBLIA_FOLDER_ID) continue
            const title = item.jopItem.title || jopId
            await upsertNotebook(title, jopId)
          } else if (type_ === 1) {
            // Note
            const parentId = item.jopItem.parent_id
            if (parentId === BIBLIA_FOLDER_ID) {
              continue
            }
            
            const notebook = await findNotebookByJoplinId(parentId)
            if (notebook) {
              const title = item.jopItem.title || jopId
              let body = item.jopItem.body || ""
              const lines = body.split("\n")
              const metadataIndex = lines.findIndex((line: string) => line.startsWith("id: ") || line.startsWith("type_: "))
              if (metadataIndex !== -1) {
                body = lines.slice(0, metadataIndex).join("\n").trim()
              }
              await upsertNotebookNote(notebook.id, title, body, jopId)
            }
          }
        }
      }
    }

    hasMore = data.has_more
    currentCursor = data.cursor || ""
    await setSyncCursor(requireSession(sessionId), currentCursor)

    if (pages > 100) {
      console.warn("Safeguard: broke out of sync loop after 100 pages.")
      break
    }
  }
}
