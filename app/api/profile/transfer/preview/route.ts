import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import {
  getAccountTransferPreviewDetailed,
  SameAccountTransferError,
  verifyTransferSourceAccount,
} from "@/lib/account-transfer"

export async function POST(req: NextRequest) {
  try {
    const session = getSession(req)
    if (!session) {
      return NextResponse.json({ error: "No autorizado." }, { status: 401 })
    }

    const { sourceEmail, sourcePassword } = await req.json()
    const source = await verifyTransferSourceAccount(
      sourceEmail,
      sourcePassword,
      session.userId,
    )
    const { counts, notebookNotes } = await getAccountTransferPreviewDetailed(source.id)

    return NextResponse.json({
      source: {
        id: source.id,
        email: source.email,
        name: source.name,
      },
      counts,
      notebookNotes,
    })
  } catch (err) {
    const code = err instanceof SameAccountTransferError ? err.code : undefined
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "No se pudo verificar la cuenta", code },
      { status: 400 },
    )
  }
}
