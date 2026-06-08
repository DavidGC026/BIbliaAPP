import { type NextRequest, NextResponse } from "next/server"
import { getPool } from "@/lib/mysql"
import { getSession } from "@/lib/auth"

export async function GET(req: NextRequest) {
  try {
    const user = await getSession(req)
    if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

    const [rows] = await getPool().query<any[]>(
      "SELECT * FROM bible_prayer_requests WHERE user_id = ? ORDER BY created_at DESC",
      [user.userId]
    )

    return NextResponse.json({ prayers: rows })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error desconocido" },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSession(req)
    if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

    const { title, description } = await req.json()
    if (!title) return NextResponse.json({ error: "Título requerido" }, { status: 400 })

    const [result] = await getPool().query<any>(
      "INSERT INTO bible_prayer_requests (user_id, title, description, status) VALUES (?, ?, ?, 'active')",
      [user.userId, title, description || ""]
    )

    return NextResponse.json({ id: result.insertId, title, description, status: "active" })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error desconocido" },
      { status: 500 }
    )
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = await getSession(req)
    if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

    const { id, status } = await req.json()
    if (!id || !status) return NextResponse.json({ error: "Faltan campos requeridos" }, { status: 400 })

    const answeredAt = status === "answered" ? new Date() : null

    const [result] = await getPool().query<any>(
      "UPDATE bible_prayer_requests SET status = ?, answered_at = ? WHERE id = ? AND user_id = ?",
      [status, answeredAt, id, user.userId]
    )

    if (result.affectedRows === 0) {
       return NextResponse.json({ error: "Petición no encontrada o no autorizada" }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error desconocido" },
      { status: 500 }
    )
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await getSession(req)
    if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const id = searchParams.get("id")
    if (!id) return NextResponse.json({ error: "ID requerido" }, { status: 400 })

    const [result] = await getPool().query<any>(
      "DELETE FROM bible_prayer_requests WHERE id = ? AND user_id = ?",
      [id, user.userId]
    )

    if (result.affectedRows === 0) {
       return NextResponse.json({ error: "Petición no encontrada o no autorizada" }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error desconocido" },
      { status: 500 }
    )
  }
}
