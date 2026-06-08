import { type NextRequest, NextResponse } from "next/server"
import { 
  listReadingPlans, 
  getUserReadingPlans, 
  joinReadingPlan, 
  updateReadingPlanProgress 
} from "@/lib/bible"
import { getSession } from "@/lib/auth"

export async function GET(req: NextRequest) {
  try {
    const session = getSession(req)
    if (!session) {
      return NextResponse.json({ error: "No autorizado." }, { status: 401 })
    }

    const plans = await listReadingPlans()
    const userPlans = await getUserReadingPlans(session.userId)
    
    return NextResponse.json({ plans, userPlans })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error al obtener planes" },
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

    const { action, planId, progress } = await req.json()

    if (!planId) {
      return NextResponse.json({ error: "ID de plan requerido." }, { status: 400 })
    }

    if (action === "join") {
      await joinReadingPlan(session.userId, planId)
      return NextResponse.json({ success: true, message: "Te has unido al plan exitosamente." })
    } else if (action === "progress") {
      if (!Array.isArray(progress)) {
        return NextResponse.json({ error: "El progreso debe ser un array de días completados." }, { status: 400 })
      }
      await updateReadingPlanProgress(session.userId, planId, progress)
      return NextResponse.json({ success: true, message: "Progreso actualizado correctamente." })
    } else {
      return NextResponse.json({ error: "Acción inválida. Utilice 'join' o 'progress'." }, { status: 400 })
    }
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error en la operación del plan" },
      { status: 500 }
    )
  }
}
