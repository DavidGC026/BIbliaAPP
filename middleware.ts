import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { getAppUrl } from "@/lib/auth"

function allowedOrigins(): string[] {
  const origins = new Set<string>()
  const appUrl = getAppUrl()
  if (appUrl) origins.add(appUrl)
  if (process.env.NODE_ENV !== "production") {
    origins.add("http://localhost:3000")
    origins.add("http://localhost:3003")
    origins.add("http://127.0.0.1:3000")
    origins.add("http://127.0.0.1:3003")
  }
  return Array.from(origins)
}

// Orígenes de la webview de los clientes Tauri (escritorio). En Linux/macOS
// el origin es tauri://localhost; en Windows http(s)://tauri.localhost.
// Se autentican por Bearer token, no por cookies, así que reflejarlos es seguro.
function isTauriOrigin(origin: string): boolean {
  return (
    origin.startsWith("tauri://") ||
    /^https?:\/\/tauri\.localhost$/.test(origin)
  )
}

function isAllowedOrigin(origin: string): boolean {
  return allowedOrigins().includes(origin) || isTauriOrigin(origin)
}

function corsHeaders(request: NextRequest): Record<string, string> {
  const origin = request.headers.get("origin")
  const headers: Record<string, string> = {
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, x-joplin-session",
  }
  if (origin && isAllowedOrigin(origin)) {
    headers["Access-Control-Allow-Origin"] = origin
    headers["Vary"] = "Origin"
  }
  return headers
}

export function middleware(request: NextRequest) {
  const headers = corsHeaders(request)

  if (request.method === "OPTIONS") {
    return new NextResponse(null, { status: 200, headers })
  }

  const response = NextResponse.next()
  for (const [key, value] of Object.entries(headers)) {
    response.headers.set(key, value)
  }
  return response
}

export const config = {
  matcher: "/api/:path*",
}
