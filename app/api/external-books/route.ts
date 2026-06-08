import { type NextRequest, NextResponse } from "next/server"
import { getPool } from "@/lib/mysql"
import { getSession } from "@/lib/auth"

export async function GET(req: NextRequest) {
  try {
    const user = getSession(req)
    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const [rows] = await getPool().query(
      `SELECT id, title, author, cover_image, status, created_at 
       FROM user_external_books 
       WHERE user_id = ? 
       ORDER BY created_at DESC`,
      [user.userId]
    )

    return NextResponse.json({ books: rows })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error desconocido" },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = getSession(req)
    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const { title, author, coverImage } = await req.json()
    if (!title || !author) {
      return NextResponse.json({ error: "Título y autor son obligatorios" }, { status: 400 })
    }

    const [result]: any = await getPool().query(
      `INSERT INTO user_external_books (user_id, title, author, cover_image) VALUES (?, ?, ?, ?)`,
      [user.userId, title, author, coverImage || null]
    )

    return NextResponse.json({ success: true, id: result.insertId })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error desconocido" },
      { status: 500 }
    )
  }
}
