import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { getAppSettings, updateAppSettings } from "@/lib/app-settings"
import { listAllGroupsForAdmin } from "@/lib/groups"

export async function GET(req: NextRequest) {
  try {
    const user = getSession(req)
    if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

    const settings = await getAppSettings()
    const groups =
      user.role === "admin" ? await listAllGroupsForAdmin() : undefined
    return NextResponse.json({ settings, groups })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error desconocido" },
      { status: 500 },
    )
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = getSession(req)
    if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    if (user.role !== "admin") {
      return NextResponse.json({ error: "Solo administradores" }, { status: 403 })
    }

    const body = await req.json()
    const settings = await updateAppSettings({
      church_name: body.church_name,
      church_logo_url: body.church_logo_url,
      official_group_id: body.official_group_id ?? null,
    })

    const groups = await listAllGroupsForAdmin()
    return NextResponse.json({ settings, groups })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error desconocido" },
      { status: 500 },
    )
  }
}
