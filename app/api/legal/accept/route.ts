import { type NextRequest, NextResponse } from "next/server"
import { getUserById, markUserLegalAccepted } from "@/lib/bible"
import { getSession } from "@/lib/auth"

/**
 * Registra que el usuario leyó y aceptó los términos y condiciones,
 * el aviso de privacidad y las normas de la comunidad.
 */
export async function POST(req: NextRequest) {
  try {
    const session = getSession(req)
    if (!session) {
      return NextResponse.json({ error: "No autorizado." }, { status: 401 })
    }

    const { accept } = await req.json().catch(() => ({ accept: true }))
    if (accept === false) {
      return NextResponse.json(
        { error: "Debes aceptar los documentos legales para continuar." },
        { status: 400 }
      )
    }

    await markUserLegalAccepted(session.userId)
    const user = await getUserById(session.userId)

    return NextResponse.json({ success: true, legalAcceptedAt: user?.legalAcceptedAt ?? null })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error al registrar la aceptación" },
      { status: 500 }
    )
  }
}
