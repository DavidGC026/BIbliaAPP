import { type NextRequest, NextResponse } from "next/server"
import { getPool } from "@/lib/mysql"
import { getSession } from "@/lib/auth"

export async function GET(req: NextRequest) {
  try {
    const session = getSession(req)
    if (!session) {
      return NextResponse.json({ error: "No autorizado." }, { status: 401 })
    }

    await getPool().query(`
      CREATE TABLE IF NOT EXISTS bible_highlight_categories (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        color VARCHAR(50) NOT NULL,
        name VARCHAR(100) NOT NULL,
        UNIQUE KEY uniq_user_color (user_id, color)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `)

    const [rows] = await getPool().query(
      "SELECT color, name FROM bible_highlight_categories WHERE user_id = ?",
      [session.userId]
    )

    const categories = (rows as any[]).reduce((acc, row) => {
      acc[row.color] = row.name
      return acc
    }, {} as Record<string, string>)

    return NextResponse.json({ categories })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error desconocido" },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = getSession(req)
    if (!session) {
      return NextResponse.json({ error: "No autorizado." }, { status: 401 })
    }

    const { color, name } = await req.json()
    if (!color || typeof name !== "string") {
      return NextResponse.json({ error: "Parámetros inválidos." }, { status: 400 })
    }

    await getPool().query(`
      CREATE TABLE IF NOT EXISTS bible_highlight_categories (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        color VARCHAR(50) NOT NULL,
        name VARCHAR(100) NOT NULL,
        UNIQUE KEY uniq_user_color (user_id, color)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `)

    await getPool().query(
      `INSERT INTO bible_highlight_categories (user_id, color, name) 
       VALUES (?, ?, ?) 
       ON DUPLICATE KEY UPDATE name = ?`,
      [session.userId, color, name.trim(), name.trim()]
    )

    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error desconocido" },
      { status: 500 }
    )
  }
}
