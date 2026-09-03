"use client"

import { useState } from "react"
import useSWR from "swr"
import { fetcher } from "@/lib/fetcher"
import { Button } from "@/components/ui/button"
import { Loader2, ShieldBan, UserX, X } from "lucide-react"
import { UserAvatar } from "@/components/user-avatar"

interface BlockedUser {
  id: number
  name: string
  username: string
  avatar_media_id: number | null
  blocked_at: string
}

export function BlockedUsersDialog({
  isOpen,
  onClose,
}: {
  isOpen: boolean
  onClose: () => void
}) {
  const { data, mutate, isLoading } = useSWR<{ blockedUsers: BlockedUser[] }>(
    isOpen ? "/api/moderation/blocked" : null,
    fetcher,
  )
  const [unblockingId, setUnblockingId] = useState<number | null>(null)

  if (!isOpen) return null

  const handleUnblock = async (userId: number) => {
    setUnblockingId(userId)
    try {
      const res = await fetch(`/api/moderation/block?userId=${userId}`, {
        method: "DELETE",
      })
      if (!res.ok) throw new Error("Error al desbloquear")
      await mutate()
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error al desbloquear usuario")
    } finally {
      setUnblockingId(null)
    }
  }

  const blockedUsers = data?.blockedUsers || []

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
      <div className="relative w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl space-y-4">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1.5 text-muted-foreground hover:bg-muted transition-colors"
          aria-label="Cerrar"
        >
          <X className="size-5" />
        </button>

        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
            <ShieldBan className="size-5" />
          </div>
          <div>
            <h2 className="font-bold text-lg text-foreground">Usuarios bloqueados</h2>
            <p className="text-xs text-muted-foreground">
              Las personas bloqueadas no pueden ver tus publicaciones ni interactuar contigo.
            </p>
          </div>
        </div>

        <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
          ) : blockedUsers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground space-y-2">
              <UserX className="size-8 mx-auto opacity-40" />
              <p className="text-sm font-medium">No tienes usuarios bloqueados.</p>
            </div>
          ) : (
            blockedUsers.map((u) => (
              <div
                key={u.id}
                className="flex items-center justify-between gap-3 p-3 rounded-xl border border-border/60 bg-background/50 hover:border-border transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <UserAvatar
                    name={u.name}
                    avatarUrl={u.avatar_media_id ? `/api/media/${u.avatar_media_id}` : null}
                    size="sm"
                  />
                  <div className="min-w-0">
                    <p className="font-semibold text-sm text-foreground truncate">{u.name}</p>
                    <p className="text-xs text-muted-foreground truncate">@{u.username}</p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={unblockingId === u.id}
                  onClick={() => handleUnblock(u.id)}
                  className="text-xs shrink-0"
                >
                  {unblockingId === u.id ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    "Desbloquear"
                  )}
                </Button>
              </div>
            ))
          )}
        </div>

        <div className="flex justify-end pt-2">
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>
            Cerrar
          </Button>
        </div>
      </div>
    </div>
  )
}
