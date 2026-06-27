"use client"

import { useEffect, useState } from "react"
import { Loader2 } from "lucide-react"

export default function GoogleAuthCompletePage() {
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const authError = params.get("error")
    if (authError) {
      setError(authError)
      return
    }

    const linked = params.get("linked") === "1"
    const match = document.cookie.match(/(?:^|;\s*)biblia_oauth_token=([^;]+)/)
    const token = match?.[1] ? decodeURIComponent(match[1]) : null
    if (token) {
      localStorage.setItem("biblia_token", token)
      document.cookie = "biblia_oauth_token=; Path=/; Max-Age=0"
      window.location.replace(linked ? "/?googleLinked=1" : "/")
      return
    }

    setError("No se recibió el token de sesión.")
  }, [])

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
        <p className="text-sm text-destructive max-w-md">{error}</p>
        <a href="/" className="text-sm font-semibold text-primary hover:underline">
          Volver al inicio
        </a>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <Loader2 className="size-8 animate-spin text-primary" />
    </div>
  )
}
