import { readAuthBody, emailField, passwordField, RequestError, securityErrorResponse } from "@/lib/request-security"
import { limitAccountAccess } from "@/lib/auth-rate-limit"
import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import {
  getAccountTransferPreviewDetailed,
  SameAccountTransferError,
  verifyTransferSourceAccount,
} from "@/lib/account-transfer"

export async function POST(req: NextRequest) {
  try {
    const session = await getSession(req)
    if (!session) {
      return NextResponse.json({ error: "No autorizado." }, { status: 401 })
    }

    const body = await readAuthBody(req)
    const sourceEmail = emailField(body.sourceEmail)
    const sourcePassword = passwordField(body.sourcePassword)
    await limitAccountAccess(req, sourceEmail, "login")
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
    return securityErrorResponse(err)
  }
}
