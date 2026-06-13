"use client"

import * as React from "react"
import { useState } from "react"
import useSWR from "swr"
import { fetcher } from "@/lib/fetcher"
import { Button } from "@/components/ui/button"
import { Users, Loader2, X, LogIn } from "lucide-react"

interface GroupPreview {
  id: number
  name: string
  description: string
  member_count: number
  invite_code: string
}

interface GroupJoinModalProps {
  inviteCode: string
  isGuest: boolean
  onClose: () => void
  onLoginRequest: () => void
  onJoined: (groupId: number) => void
}

export function GroupJoinModal({
  inviteCode,
  isGuest,
  onClose,
  onLoginRequest,
  onJoined,
}: GroupJoinModalProps) {
  const { data, error, isLoading } = useSWR<{ group: GroupPreview }>(
    `/api/groups/preview?code=${encodeURIComponent(inviteCode)}`,
    fetcher,
  )
  const group = data?.group
  const [joining, setJoining] = useState(false)
  const [joinError, setJoinError] = useState("")

  async function handleJoin() {
    if (isGuest) {
      onLoginRequest()
      return
    }

    setJoining(true)
    setJoinError("")
    try {
      const res = await fetch("/api/groups/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inviteCode }),
      })
      const body = await res.json()
      if (!res.ok) throw new Error(body.error || "No se pudo unir al grupo")
      onJoined(body.groupId)
    } catch (err) {
      setJoinError(err instanceof Error ? err.message : "Error al unirse")
    } finally {
      setJoining(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-card border border-border rounded-2xl shadow-xl w-full max-w-md p-6 sm:p-8 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors"
          title="Cerrar"
        >
          <X className="size-4" />
        </button>

        <div className="text-center mb-6">
          <div className="size-16 bg-blue-500/10 text-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <Users className="size-8" />
          </div>
          <h2 className="text-2xl font-bold text-foreground">Unirse a un grupo</h2>
          <p className="text-sm text-muted-foreground mt-2">
            Te invitaron a unirte a un grupo de estudio bíblico.
          </p>
        </div>

        {isLoading ? (
          <div className="py-8 flex justify-center">
            <Loader2 className="size-8 animate-spin text-muted-foreground" />
          </div>
        ) : error || !group ? (
          <div className="text-center py-6">
            <p className="text-sm text-rose-500 font-medium">
              {error?.message || "No se encontró el grupo con este código de invitación."}
            </p>
            <Button variant="ghost" className="mt-4" onClick={onClose}>
              Cerrar
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-xl border border-border bg-muted/30 p-4 text-center">
              <h3 className="font-bold text-lg text-foreground">{group.name}</h3>
              {group.description && (
                <p className="text-sm text-muted-foreground mt-2 line-clamp-3">{group.description}</p>
              )}
              <p className="text-xs text-muted-foreground mt-3 font-medium">
                {group.member_count} {group.member_count === 1 ? "miembro" : "miembros"}
              </p>
            </div>

            {joinError && (
              <p className="text-sm text-rose-500 font-medium text-center">{joinError}</p>
            )}

            {isGuest ? (
              <Button className="w-full gap-2" onClick={onLoginRequest}>
                <LogIn className="size-4" />
                Iniciar sesión para unirte
              </Button>
            ) : (
              <Button className="w-full" onClick={handleJoin} disabled={joining}>
                {joining ? <Loader2 className="size-4 animate-spin mr-2" /> : null}
                Unirme al grupo
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
