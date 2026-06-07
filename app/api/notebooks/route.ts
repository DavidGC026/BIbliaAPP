import { type NextRequest, NextResponse } from "next/server"
import { listNotebooks, createNotebook } from "@/lib/bible"
import { createFolder, syncJoplin } from "@/lib/joplin"

function statusForError(err: unknown): number {
  const message = err instanceof Error ? err.message.toLowerCase() : ""
  return message.includes("sesión") || message.includes("session") || message.includes("401") || message.includes("403")
    ? 401
    : 500
}

export async function GET(req: NextRequest) {
  try {
    const sessionId = req.headers.get("x-joplin-session") || undefined
    try {
      await syncJoplin(sessionId)
    } catch (err) {
      console.error("Error syncing notebooks from Joplin:", err)
    }
    const notebooks = await listNotebooks()
    return NextResponse.json({ notebooks })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error desconocido" },
      { status: statusForError(err) },
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const { name } = await req.json()
    if (!name || !name.trim()) {
      return NextResponse.json({ error: "El nombre es obligatorio." }, { status: 400 })
    }

    const sessionId = req.headers.get("x-joplin-session") || undefined
    const joplinFolderId = Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join("")

    try {
      await createFolder(name.trim(), joplinFolderId, sessionId)
    } catch (err) {
      console.error("Error creating folder in Joplin:", err)
      return NextResponse.json(
        { error: err instanceof Error ? err.message : "No se pudo crear la libreta en Joplin." },
        { status: statusForError(err) },
      )
    }

    const id = await createNotebook(name.trim(), joplinFolderId)
    return NextResponse.json({ id, name: name.trim(), joplinFolderId })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error desconocido" },
      { status: 500 },
    )
  }
}
