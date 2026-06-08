import { NextResponse } from "next/server"
import { pingMysql } from "@/lib/mysql"
import type { HealthStatus } from "@/lib/types"

export async function GET() {
  const status: HealthStatus = {
    mysql: { ok: false, message: "" },
  }

  try {
    await pingMysql()
    status.mysql = { ok: true, message: "Conectado" }
  } catch (err) {
    status.mysql = { ok: false, message: err instanceof Error ? err.message : "Error" }
  }

  return NextResponse.json(status)
}
