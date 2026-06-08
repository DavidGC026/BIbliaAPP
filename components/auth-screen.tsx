"use client"

import * as React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { BookOpen, User, Mail, Lock, Loader2, ArrowRight } from "lucide-react"

interface User {
  id: number
  name: string
  email: string
  role: string
}

interface AuthScreenProps {
  onLoginSuccess: (user: User) => void
}

export function AuthScreen({ onLoginSuccess }: AuthScreenProps) {
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [name, setName] = useState("")
  const [role, setRole] = useState("user")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const url = isLogin ? "/api/auth/login" : "/api/auth/register"
    const body = isLogin 
      ? { email: email.trim(), password }
      : { name: name.trim(), email: email.trim(), password, role }

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || "Algo salió mal")
      }

      // Store token in localStorage
      localStorage.setItem("biblia_token", data.token)
      
      // Notify parent component
      onLoginSuccess(data.user)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al procesar la solicitud")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-muted/50 to-background px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8 rounded-2xl border border-border bg-card/60 p-8 shadow-xl backdrop-blur-md">
        
        {/* Header */}
        <div className="flex flex-col items-center text-center">
          <img 
            src="/logo.png" 
            alt="Logo BibliaAPP" 
            className="size-16 rounded-2xl shadow-lg shadow-primary/25 mb-4 object-cover"
          />
          <h2 className="mt-6 text-3xl font-extrabold tracking-tight text-foreground">
            BibliaAPP
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {isLogin 
              ? "Accede a tus lecturas, notas y devocionales" 
              : "Crea tu cuenta para comenzar a estudiar"}
          </p>
        </div>

        {/* Form */}
        <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
          {error && (
            <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive border border-destructive/20 text-center animate-shake">
              {error}
            </div>
          )}

          <div className="space-y-4">
            {!isLogin && (
              <div className="relative">
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

            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                Contraseña
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
                <Input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="pl-9 h-10"
                />
              </div>
            </div>
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full h-10 mt-6 gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-md transition-all active:scale-[0.98]"
          >
            {loading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <>
                <span>{isLogin ? "Iniciar Sesión" : "Crear Cuenta"}</span>
                <ArrowRight className="size-4" />
              </>
            )}
          </Button>
        </form>

        {/* Toggle link */}
        <div className="text-center pt-4 border-t border-border/40">
          <button
            type="button"
            onClick={() => {
              setIsLogin(!isLogin)
              setError(null)
            }}
            className="text-xs font-semibold text-primary hover:underline transition-all"
          >
            {isLogin 
              ? "¿No tienes una cuenta? Regístrate aquí" 
              : "¿Ya tienes cuenta? Inicia sesión"}
          </button>
        </div>

      </div>
    </div>
  )
}
