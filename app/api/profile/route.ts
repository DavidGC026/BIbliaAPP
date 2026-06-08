import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { getPool } from "@/lib/mysql"
import { RowDataPacket } from "mysql2"

export async function PUT(req: NextRequest) {
  try {
    const session = getSession(req)
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const { username } = await req.json()

    if (!username || typeof username !== "string") {
      return NextResponse.json({ error: "Apodo inválido" }, { status: 400 })
    }

    const sanitizedUsername = username.toLowerCase().replace(/[^a-z0-9_]/g, "")
    
    if (sanitizedUsername.length < 3 || sanitizedUsername.length > 30) {
      return NextResponse.json({ error: "El apodo debe tener entre 3 y 30 caracteres (solo letras, números y guiones bajos)" }, { status: 400 })
    }

    const pool = getPool()

    // Check if username is taken by someone else
    const [existing] = await pool.query<RowDataPacket[]>(
      "SELECT id FROM users WHERE username = ? AND id != ?",
      [sanitizedUsername, session.userId]
    )

    if (existing.length > 0) {
      return NextResponse.json({ error: "Este apodo ya está en uso. Por favor elige otro." }, { status: 409 })
    }

    // Update username
    await pool.query("UPDATE users SET username = ? WHERE id = ?", [sanitizedUsername, session.userId])

    return NextResponse.json({ success: true, username: sanitizedUsername })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error al actualizar el perfil" },
      { status: 500 }
    )
  }
}
