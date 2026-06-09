import { type NextRequest } from "next/server"
import { getSession } from "@/lib/auth"
import { subscribeToUser } from "@/lib/notification-bus"

export const dynamic = "force-dynamic"

/**
 * Server-Sent Events: el cliente (EventSource) recibe un evento cada vez que
 * otro usuario interactúa con su contenido. EventSource no permite headers
 * custom pero sí envía cookies, por lo que la sesión llega vía cookie HttpOnly.
 */
export async function GET(req: NextRequest) {
  const session = getSession(req)
  if (!session) {
    return new Response("No autorizado", { status: 401 })
  }

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    start(controller) {
      let closed = false

      const send = (data: unknown) => {
        if (closed) return
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
        } catch {
          closed = true
        }
      }

      send({ type: "connected" })
      const unsubscribe = subscribeToUser(session.userId, send)

      // Keep-alive: Cloudflare/proxies cortan conexiones idle (~100s)
      const ping = setInterval(() => {
        if (closed) return
        try {
          controller.enqueue(encoder.encode(`: ping\n\n`))
        } catch {
          closed = true
        }
      }, 30000)

      req.signal.addEventListener("abort", () => {
        closed = true
        clearInterval(ping)
        unsubscribe()
        try {
          controller.close()
        } catch {}
      })
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  })
}
