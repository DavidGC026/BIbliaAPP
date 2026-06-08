import { type NextRequest, NextResponse } from "next/server"
import { getPool } from "@/lib/mysql"
import { getSession } from "@/lib/auth"

export async function GET(req: NextRequest) {
  try {
    const user = await getSession(req)
    if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

    // Return groups user belongs to
    const [rows] = await getPool().query<any[]>(
      `SELECT g.id, g.name, g.description, g.created_by, g.created_at, m.role 
       FROM bible_groups g
       JOIN bible_group_members m ON g.id = m.group_id
       WHERE m.user_id = ?
       ORDER BY g.created_at DESC`,
      [user.userId]
    )

    return NextResponse.json({ groups: rows })
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

    const { name, description } = await req.json()
    if (!name) return NextResponse.json({ error: "Nombre del grupo requerido" }, { status: 400 })

    const pool = getPool()
    const conn = await pool.getConnection()
    
    try {
      await conn.beginTransaction()

      const [result] = await conn.query<any>(
        "INSERT INTO bible_groups (name, description, created_by) VALUES (?, ?, ?)",
        [name, description || "", user.userId]
      )
      const groupId = result.insertId

      await conn.query<any>(
        "INSERT INTO bible_group_members (group_id, user_id, role) VALUES (?, ?, 'admin')",
        [groupId, user.userId]
      )

      await conn.commit()
      return NextResponse.json({ id: groupId, name, description, role: 'admin' })
    } catch (err) {
      await conn.rollback()
      throw err
    } finally {
      conn.release()
    }
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error desconocido" },
      { status: 500 }
    )
  }
}
