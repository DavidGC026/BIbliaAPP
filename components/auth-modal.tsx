"use client"

import { X } from "lucide-react"
import { AuthForm } from "@/components/auth-screen"

interface AuthModalProps {
  onClose: () => void
  onLoginSuccess: () => void
}

export function AuthModal({ onClose, onLoginSuccess }: AuthModalProps) {
  return (
    <div
      className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md rounded-2xl border border-border bg-card shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute right-3 top-3 p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors z-10"
          aria-label="Cerrar"
        >
          <X className="size-4" />
        </button>
        <AuthForm
          compact
          onLoginSuccess={() => {
            onLoginSuccess()
          }}
        />
      </div>
    </div>
  )
}
