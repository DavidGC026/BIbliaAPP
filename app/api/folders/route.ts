import { type NextRequest, NextResponse } from "next/server"
import { listFolders, createFolder } from "@/lib/joplin"

export async function GET() {
  try {
    const folders = await listFolders()
    return NextResponse.json({ folders })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Error desconocido" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { title, parentId } = await req.json()
    if (!title || typeof title !== "string") {
      return NextResponse.json({ error: "El título de la libreta es obligatorio." }, { status: 400 })
    }
    const folder = await createFolder(title, parentId)
    return NextResponse.json({ folder })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Error desconocido" }, { status: 500 })
  }
}
