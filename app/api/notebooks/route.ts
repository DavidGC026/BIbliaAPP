import { type NextRequest, NextResponse } from "next/server"
import { listNotebooks, createNotebook } from "@/lib/bible"
import { createFolder, syncJoplin } from "@/lib/joplin"

export async function GET(req: NextRequest) {
  try {
    const joplinToken = req.headers.get("x-joplin-token") || undefined
    if (joplinToken) {
      try {
        await syncJoplin(joplinToken)
      } catch (err) {
        console.error("Error syncing notebooks from Joplin:", err)
      }
    }
    const notebooks = await listNotebooks()
    return NextResponse.json({ notebooks })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error desconocido" },
      { status: 500 },
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const { name } = await req.json()
    if (!name || !name.trim()) {
      return NextResponse.json({ error: "El nombre es obligatorio." }, { status: 400 })
    }

    const joplinToken = req.headers.get("x-joplin-token") || undefined
    const joplinFolderId = Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join("")

    if (joplinToken) {
      try {
        await createFolder(name.trim(), joplinFolderId, joplinToken)
      } catch (err) {
        console.error("Error creating folder in Joplin:", err)
      }
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
