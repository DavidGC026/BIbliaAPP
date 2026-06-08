"use client"

import { useEffect, useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Loader2, CheckCircle2, XCircle } from "lucide-react"

function VerifyEmailContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const token = searchParams.get("token")

  const [status, setStatus] = useState<"loading" | "success" | "error">("loading")
  const [message, setMessage] = useState("Verificando tu correo...")

  useEffect(() => {
    if (!token) {
      setStatus("error")
      setMessage("Enlace de verificación inválido.")
      return
    }

    fetch(`/api/auth/verify-email?token=${encodeURIComponent(token)}`)
      .then(async (res) => {
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || "No se pudo verificar el correo")
        setStatus("success")
        setMessage(data.message || "¡Correo verificado correctamente!")
      })
      .catch((err) => {
        setStatus("error")
        setMessage(err instanceof Error ? err.message : "Error al verificar")
      })
  }, [token])

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-muted/50 to-background px-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card/80 p-8 shadow-xl text-center space-y-4">
        {status === "loading" && (
          <>
            <Loader2 className="size-10 animate-spin text-primary mx-auto" />
            <p className="text-sm text-muted-foreground">{message}</p>
          </>
        )}
        {status === "success" && (
          <>
            <CheckCircle2 className="size-12 text-emerald-500 mx-auto" />
            <h1 className="text-xl font-bold text-foreground">¡Correo verificado!</h1>
            <p className="text-sm text-muted-foreground">{message}</p>
            <Button className="w-full mt-2" onClick={() => router.push("/")}>
              Ir a BibliaAPP
            </Button>
          </>
        )}
        {status === "error" && (
          <>
            <XCircle className="size-12 text-destructive mx-auto" />
            <h1 className="text-xl font-bold text-foreground">No se pudo verificar</h1>
            <p className="text-sm text-muted-foreground">{message}</p>
            <Button variant="outline" className="w-full mt-2" asChild>
              <Link href="/">Volver al inicio</Link>
            </Button>
          </>
        )}
      </div>
    </div>
  )
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <Loader2 className="size-8 animate-spin text-primary" />
        </div>
      }
    >
      <VerifyEmailContent />
    </Suspense>
  )
}
