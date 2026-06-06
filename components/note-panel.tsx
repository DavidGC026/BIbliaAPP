"use client"

import { useEffect, useState } from "react"
import useSWR from "swr"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { fetcher } from "@/lib/fetcher"
import type { JoplinNote } from "@/lib/types"
import { X, Save, BookOpen, Key } from "lucide-react"

interface NotePanelProps {
  noteId: string | null
  reference: string | null
  onClose: () => void
}

export function NotePanel({ noteId, reference, onClose }: NotePanelProps) {
  const [token, setToken] = useState<string | null>(null)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loggingIn, setLoggingIn] = useState(false)
  const [loginError, setLoginError] = useState<string | null>(null)

  useEffect(() => {
    if (typeof window !== "undefined") {
      setToken(localStorage.getItem("joplin_token"))
    }
  }, [])

  const { data, isLoading, mutate, error } = useSWR<{ note: JoplinNote }>(
    noteId && token ? `/api/notes/${noteId}` : null,
    fetcher,
  )
  const [body, setBody] = useState("")
  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState<string | null>(null)

  useEffect(() => {
    if (data?.note) setBody(data.note.body ?? "")
  }, [data?.note])

  useEffect(() => {
    if (error && (error.message.includes("session") || error.message.includes("expired") || error.message.includes("token"))) {
      localStorage.removeItem("joplin_token")
      setToken(null)
    }
  }, [error])

  async function handleLogin() {
    if (!email.trim() || !password.trim()) {
      setLoginError("Correo y contraseña son obligatorios.")
      return
    }
    setLoggingIn(true)
    setLoginError(null)
    try {
      const res = await fetch("/api/joplin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password: password.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      
      localStorage.setItem("joplin_token", data.token)
      setToken(data.token)
      setLoginError(null)
      // Force reload page to refresh SWR states globally
      window.location.reload()
    } catch (e) {
      setLoginError(e instanceof Error ? e.message : "Error al iniciar sesión")
    } finally {
      setLoggingIn(false)
    }
  }

  async function handleSave() {
    if (!noteId) return
    setSaving(true)
    try {
      const clientToken = typeof window !== "undefined" ? localStorage.getItem("joplin_token") : null
      const res = await fetch(`/api/notes/${noteId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(clientToken ? { "x-joplin-token": clientToken } : {}),
        },
        body: JSON.stringify({ body }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error)
      }
      await mutate()
      setSavedAt(new Date().toLocaleTimeString())
    } catch (e) {
      alert(e instanceof Error ? e.message : "Error al guardar")
    } finally {
      setSaving(false)
    }
  }

  if (!token) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-6 text-center">
        <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Key className="size-6" />
        </div>
        <h3 className="mb-1 text-sm font-semibold text-foreground">Conectar Joplin</h3>
        <p className="mb-6 text-pretty text-xs text-muted-foreground leading-relaxed">
          Introduce tus credenciales de Joplin Server para ver, crear y vincular tus notas.
        </p>
        <div className="w-full space-y-3">
          <Input
            type="email"
            placeholder="Correo electrónico"
            value={email}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
            className="h-9 text-xs"
            onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
              if (e.key === "Enter") handleLogin()
            }}
          />
          <Input
            type="password"
            placeholder="Contraseña"
            value={password}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
            className="h-9 text-xs"
            onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
              if (e.key === "Enter") handleLogin()
            }}
          />
          {loginError && (
            <p className="text-[11px] text-destructive text-left">{loginError}</p>
          )}
          <Button
            onClick={handleLogin}
            disabled={loggingIn}
            className="w-full h-9 text-xs font-semibold"
          >
            {loggingIn ? "Conectando..." : "Iniciar Sesión"}
          </Button>
        </div>
      </div>
    )
  }

  if (!noteId) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-8 text-center text-muted-foreground">
        <p className="text-pretty text-sm leading-relaxed">
          Selecciona un versículo y abre o crea una nota para verla aquí.
        </p>
        <button
          onClick={() => {
            localStorage.removeItem("joplin_token")
            setToken(null)
            window.location.reload()
          }}
          className="mt-6 text-xs text-muted-foreground hover:text-destructive transition-colors underline"
        >
          Desconectar Joplin
        </button>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-foreground">
            {data?.note?.title ?? reference ?? "Nota"}
          </p>
          <p className="text-xs text-muted-foreground">Nota de Joplin</p>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} aria-label="Cerrar panel">
          <X className="size-4" />
        </Button>
      </header>

      <div className="flex-1 overflow-auto p-4">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Cargando nota…</p>
        ) : (
          <Textarea
            value={body}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setBody(e.target.value)}
            placeholder="Escribe tu nota en Markdown…"
            className="min-h-80 resize-none font-mono text-sm leading-relaxed"
          />
        )}
      </div>

      <footer className="flex items-center justify-between gap-2 border-t border-border px-4 py-3">
        <button
          onClick={() => {
            localStorage.removeItem("joplin_token")
            setToken(null)
            window.location.reload()
          }}
          className="text-xs text-muted-foreground hover:text-destructive transition-colors underline"
        >
          Cerrar sesión
        </button>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {savedAt ? `Guardado ${savedAt}` : "Cambios sin guardar"}
          </span>
          <Button onClick={handleSave} disabled={saving || isLoading} size="sm">
            <Save className="size-4" />
            {saving ? "Guardando…" : "Guardar"}
          </Button>
        </div>
      </footer>
    </div>
  )
}
