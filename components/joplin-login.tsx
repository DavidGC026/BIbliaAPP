"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Loader2 } from "lucide-react"

interface JoplinLoginProps {
  onLogin: (sessionId: string) => void
}

export function JoplinLogin({ onLogin }: JoplinLoginProps) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/joplin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json()
      if (!res.ok || !data.sessionId) {
        throw new Error(data.error || "No se pudo iniciar sesión en Joplin.")
      }
      localStorage.setItem("joplin_session", data.sessionId)
      onLogin(data.sessionId)
      setPassword("")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex h-full items-center justify-center p-6">
      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4 rounded-lg border border-border bg-card p-5 shadow-sm">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold text-foreground">Iniciar sesión en Joplin</h2>
          <p className="text-sm text-muted-foreground">
            Ingresa tus credenciales de Joplin para sincronizar libretas y notas.
          </p>
        </div>
        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Correo
          </label>
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="username"
            required
          />
        </div>
        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Contraseña
          </label>
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
        </div>
        {error && (
          <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}
        <Button type="submit" disabled={loading} className="w-full">
          {loading && <Loader2 className="size-4 animate-spin" />}
          {loading ? "Iniciando…" : "Entrar"}
        </Button>
      </form>
    </div>
  )
}
