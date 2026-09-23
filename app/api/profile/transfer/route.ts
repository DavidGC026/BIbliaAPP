import { readAuthBody, emailField, passwordField, RequestError, securityErrorResponse } from "@/lib/request-security"
import { limitAccountAccess } from "@/lib/auth-rate-limit"
import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import {
  transferAccountData,
  verifyTransferSourceAccount,
  type TransferCategory,
  TRANSFER_CATEGORIES,
} from "@/lib/account-transfer"

function parseCategories(raw: unknown): TransferCategory[] {
  if (!Array.isArray(raw) || raw.length === 0) {
    return [...TRANSFER_CATEGORIES]
  }
  const allowed = new Set<string>(TRANSFER_CATEGORIES)
  return raw.filter((item): item is TransferCategory => typeof item === "string" && allowed.has(item))
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession(req)
    if (!session) {
      return NextResponse.json({ error: "No autorizado." }, { status: 401 })
    }

    const body = await readAuthBody(req)
    const { move, categories } = body
    const sourceEmail = emailField(body.sourceEmail)
    const sourcePassword = passwordField(body.sourcePassword)
    await limitAccountAccess(req, sourceEmail, "login")
    const source = await verifyTransferSourceAccount(
      sourceEmail,
      sourcePassword,
      session.userId,
    )

    const selected = parseCategories(categories)
    if (selected.length === 0) {
      return NextResponse.json({ error: "Selecciona al menos un tipo de contenido." }, { status: 400 })
    }

    const result = await transferAccountData(source.id, session.userId, {
      move: move === true,
      categories: selected,
    })

    return NextResponse.json({
      success: true,
      sourceEmail: source.email,
      ...result,
    })
  } catch (err) {
    return securityErrorResponse(err)
  }
}
