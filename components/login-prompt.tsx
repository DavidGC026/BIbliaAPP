"use client"

import { Lock, LogIn } from "lucide-react"
import { Button } from "@/components/ui/button"

interface LoginPromptProps {
  title?: string
  description?: string
  onLogin: () => void
}

export function LoginPrompt({
  title = "Inicia sesión para continuar",
  description = "Crea una cuenta o inicia sesión para guardar notas, devocionales, favoritos y más.",
  onLogin,
}: LoginPromptProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] p-4 animate-fade-in">
      <div className="max-w-md w-full text-center space-y-6 rounded-2xl border border-border bg-card/60 p-8 shadow-lg backdrop-blur-sm">
        <div className="size-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
          <Lock className="size-8 text-primary" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-foreground">{title}</h2>
          <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{description}</p>
        </div>
        <Button onClick={onLogin} className="gap-2 w-full sm:w-auto">
          <LogIn className="size-4" />
          Iniciar sesión
        </Button>
      </div>
    </div>
  )
}
