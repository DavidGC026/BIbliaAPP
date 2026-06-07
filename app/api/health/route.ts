import { type NextRequest, NextResponse } from "next/server"
import { pingMysql } from "@/lib/mysql"
import { pingJoplin } from "@/lib/joplin"
import type { HealthStatus } from "@/lib/types"

export async function GET(req: NextRequest) {
  const status: HealthStatus = {
    mysql: { ok: false, message: "" },
    joplin: { ok: false, message: "" },
  }

  try {
    await pingMysql()
    status.mysql = { ok: true, message: "Conectado" }
  } catch (err) {
    status.mysql = { ok: false, message: err instanceof Error ? err.message : "Error" }
  }

  try {
    await pingJoplin()
    status.joplin = { ok: true, message: "Conectado" }
  } catch (err) {
    status.joplin = { ok: false, message: err instanceof Error ? err.message : "Error" }
  }

  return NextResponse.json(status)
}
