import { NextResponse } from "next/server"

export class RequestError extends Error {
  constructor(message: string, public status = 400, public retryAfter?: number) { super(message) }
}

export async function readBoundedBody(req: Request, maxBytes = 16 * 1024): Promise<Uint8Array> {
  if (Number(req.headers.get("content-length")) > maxBytes) throw new RequestError("Solicitud demasiado grande.", 413)
  const reader = req.body?.getReader()
  if (!reader) throw new RequestError("Falta el contenido de la solicitud.")
  const chunks: Uint8Array[] = []
  let size = 0
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      size += value.length
      if (size > maxBytes) {
        await reader.cancel()
        throw new RequestError("Solicitud demasiado grande.", 413)
      }
      chunks.push(value)
    }
  } finally { reader.releaseLock() }
  const bytes = new Uint8Array(size)
  let offset = 0
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length }
  return bytes
}

export async function readAuthBody(req: Request): Promise<Record<string, unknown>> {
  if (!req.headers.get("content-type")?.toLowerCase().startsWith("application/json")) throw new RequestError("Se requiere JSON.", 415)
  const bytes = await readBoundedBody(req)
  try {
    const body = JSON.parse(new TextDecoder().decode(bytes))
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error()
    return body
  } catch { throw new RequestError("JSON inválido.") }
}

export function emailField(value: unknown): string {
  if (typeof value !== "string" || value.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())) throw new RequestError("Correo electrónico inválido.")
  return value.trim().toLowerCase()
}

export function passwordField(value: unknown): string {
  if (typeof value !== "string" || value.length < 1 || value.length > 1024) throw new RequestError("Contraseña inválida.")
  return value
}

export function securityErrorResponse(error: unknown): NextResponse {
  if (error instanceof RequestError) return NextResponse.json({ error: error.message }, { status: error.status,
    headers: { "Cache-Control": "private, no-store", ...(error.retryAfter ? { "Retry-After": String(error.retryAfter) } : {}) } })
  console.error("Error al procesar una solicitud protegida", error)
  return NextResponse.json({ error: "No se pudo completar la solicitud. Reintenta en unos momentos." }, { status: 503, headers: { "Cache-Control": "private, no-store" } })
}
