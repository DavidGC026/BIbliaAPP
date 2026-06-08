import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { getPool } from "@/lib/mysql"
import { RowDataPacket } from "mysql2"

export async function GET(req: NextRequest) {
  try {
    const session = getSession(req)
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const query = searchParams.get("q")
    
    if (!query || query.length < 2) {
      return NextResponse.json({ users: [] })
    }

    const searchTerm = `%${query}%`
    
    const [rows] = await getPool().query<RowDataPacket[]>(
      `SELECT id, name, username 
       FROM users 
       WHERE name LIKE ? OR username LIKE ? 
       ORDER BY name ASC 
       LIMIT 20`,
      [searchTerm, searchTerm]
    )

    return NextResponse.json({ users: rows })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error al buscar usuarios" },
      { status: 500 }
    )
  }
}
