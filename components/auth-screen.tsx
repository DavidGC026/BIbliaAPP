"use client"

import * as React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { User, Mail, Lock, Loader2, ArrowRight, CheckCircle2 } from "lucide-react"

interface AuthUser {
  id: number
  name: string
  email: string
  role: string
}

type AuthView = "login" | "register" | "forgot" | "register-success"

interface AuthFormProps {
  onLoginSuccess: (user: AuthUser) => void
  compact?: boolean
}

export function AuthForm({ onLoginSuccess, compact = false }: AuthFormProps) {
  const [view, setView] = useState<AuthView>("login")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [name, setName] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [pendingVerificationEmail, setPendingVerificationEmail] = useState<string | null>(null)

  async function handleResendVerification(targetEmail?: string) {
    const emailToUse = (targetEmail || email || pendingVerificationEmail || "").trim().toLowerCase()
    if (!emailToUse) return

    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailToUse }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "No se pudo reenviar el correo")
      setInfo(data.message || "Te enviamos un nuevo enlace de verificación.")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al reenviar verificación")
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setInfo(null)
    setLoading(true)

    try {
      if (view === "forgot") {
        const res = await fetch("/api/auth/forgot-password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: email.trim().toLowerCase() }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || "No se pudo enviar el correo")
        setInfo(data.message || "Revisa tu bandeja de entrada.")
        return
      }

      const url = view === "login" ? "/api/auth/login" : "/api/auth/register"
      const body =
        view === "login"
          ? { email: email.trim().toLowerCase(), password }
          : { name: name.trim(), email: email.trim().toLowerCase(), password }

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      const data = await res.json()

      if (!res.ok) {
        if (data.code === "EMAIL_NOT_VERIFIED") {
          setPendingVerificationEmail(data.email || email.trim().toLowerCase())
          throw new Error(data.error || "Debes verificar tu correo.")
        }
        throw new Error(data.error || "Algo salió mal")
      }

      if (view === "register" && data.needsVerification) {
        setPendingVerificationEmail(data.email || email.trim().toLowerCase())
        setView("register-success")
        setInfo(data.message)
        return
      }

      localStorage.setItem("biblia_token", data.token)
      onLoginSuccess(data.user)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al procesar la solicitud")
    } finally {
      setLoading(false)
    }
  }

  const shellClass = compact
    ? "p-6 sm:p-8"
    : "w-full max-w-md space-y-8 rounded-2xl border border-border bg-card/60 p-8 shadow-xl backdrop-blur-md"

  if (view === "register-success") {
    return (
      <div className={`${shellClass} text-center space-y-4`}>
        <CheckCircle2 className="size-12 text-emerald-500 mx-auto" />
        <h2 className="text-xl font-bold text-foreground">Revisa tu correo</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {info ||
            "Te enviamos un enlace de verificación. Confírmalo para activar tu cuenta e iniciar sesión."}
        </p>
        {pendingVerificationEmail && (
          <p className="text-xs text-muted-foreground">
            Enviado a <strong>{pendingVerificationEmail}</strong>
          </p>
        )}
        <Button
          variant="outline"
          className="w-full"
          disabled={loading}
          onClick={() => handleResendVerification()}
        >
          {loading ? <Loader2 className="size-4 animate-spin" /> : "Reenviar correo de verificación"}
        </Button>
        <button
          type="button"
          onClick={() => {
            setView("login")
            setError(null)
            setInfo(null)
          }}
          className="text-xs font-semibold text-primary hover:underline"
        >
          Volver a iniciar sesión
        </button>
      </div>
    )
  }

  return (
    <div className={compact ? "p-6 sm:p-8" : shellClass}>
      <div className="flex flex-col items-center text-center">
        <img
          src="/logo.png"
          alt="Logo BibliaAPP"
          className={
            compact
              ? "size-12 rounded-xl shadow-md shadow-primary/20 mb-3 object-cover"
              : "size-16 rounded-2xl shadow-lg shadow-primary/25 mb-4 object-cover"
          }
        />
        <h2
          className={
            compact
              ? "text-2xl font-extrabold tracking-tight text-foreground"
              : "mt-6 text-3xl font-extrabold tracking-tight text-foreground"
          }
        >
          BibliaAPP
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {view === "forgot"
            ? "Te enviaremos un enlace para restablecer tu contraseña"
            : view === "login"
              ? "Accede a tus lecturas, notas y devocionales"
              : "Crea tu cuenta para comenzar a estudiar"}
        </p>
      </div>

      <form className={compact ? "mt-6 space-y-4" : "mt-8 space-y-5"} onSubmit={handleSubmit}>
        {error && (
          <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive border border-destructive/20 text-center space-y-2">
            <p>{error}</p>
            {pendingVerificationEmail && error.includes("verificar") && (
              <button
                type="button"
                onClick={() => handleResendVerification()}
                className="text-xs font-semibold underline"
              >
                Reenviar correo de verificación
              </button>
            )}
          </div>
        )}

        {info && !error && (
          <div className="rounded-lg bg-emerald-500/10 p-3 text-sm text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 text-center">
            {info}
          </div>
        )}

        <div className="space-y-4">
          {view === "register" && (
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                Nombre Completo
              </label>
              <div className="relative">
                <User className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
                <Input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Juan Pérez"
                  className="pl-9 h-10"
                />
              </div>
            </div>
          )}

          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
              Correo Electrónico
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
              <Input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ejemplo@correo.com"
                className="pl-9 h-10"
              />
            </div>
          </div>

          {view !== "forgot" && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Contraseña
                </label>
                {view === "login" && (
                  <button
                    type="button"
                    onClick={() => {
                      setView("forgot")
                      setError(null)
                      setInfo(null)
                    }}
                    className="text-[11px] font-semibold text-primary hover:underline"
                  >
                    ¿Olvidaste tu contraseña?
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
                <Input
                  type="password"
                  required
                  minLength={view === "register" ? 6 : undefined}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="pl-9 h-10"
                />
              </div>
            </div>
          )}
        </div>

        <Button
          type="submit"
          disabled={loading}
          className="w-full h-10 mt-2 gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-md transition-all active:scale-[0.98]"
        >
          {loading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <>
              <span>
                {view === "forgot"
                  ? "Enviar enlace"
                  : view === "login"
                    ? "Iniciar Sesión"
                    : "Crear Cuenta"}
              </span>
              <ArrowRight className="size-4" />
            </>
          )}
        </Button>
      </form>

      <div className="text-center pt-4 border-t border-border/40">
        {view === "forgot" ? (
          <button
            type="button"
            onClick={() => {
              setView("login")
              setError(null)
              setInfo(null)
            }}
            className="text-xs font-semibold text-primary hover:underline transition-all"
          >
            Volver a iniciar sesión
          </button>
        ) : (
          <button
            type="button"
            onClick={() => {
              setView(view === "login" ? "register" : "login")
              setError(null)
              setInfo(null)
            }}
            className="text-xs font-semibold text-primary hover:underline transition-all"
          >
            {view === "login"
              ? "¿No tienes una cuenta? Regístrate aquí"
              : "¿Ya tienes cuenta? Inicia sesión"}
          </button>
        )}
      </div>
    </div>
  )
}

interface AuthScreenProps {
  onLoginSuccess: (user: AuthUser) => void
}

export function AuthScreen({ onLoginSuccess }: AuthScreenProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-muted/50 to-background px-4 py-12 sm:px-6 lg:px-8">
      <AuthForm onLoginSuccess={onLoginSuccess} />
    </div>
  )
}
