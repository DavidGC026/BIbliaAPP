"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Loader2, UserPlus, UserCheck, Clock } from "lucide-react"

interface FriendRequestButtonProps {
  targetUserId: number
  friendStatus: "none" | "pending_sent" | "pending_received" | "friends"
  onChanged: () => void
}

export function FriendRequestButton({
  targetUserId,
  friendStatus,
  onChanged,
}: FriendRequestButtonProps) {
  const [loading, setLoading] = useState(false)

  async function sendRequest() {
    setLoading(true)
    try {
      const res = await fetch("/api/friends", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: targetUserId }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      onChanged()
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error")
    } finally {
      setLoading(false)
    }
  }

  async function respond(action: "accept" | "reject") {
    setLoading(true)
    try {
      const res = await fetch("/api/friends", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requesterId: targetUserId, action }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      onChanged()
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error")
    } finally {
      setLoading(false)
    }
  }

  if (friendStatus === "friends") {
    return (
      <Button variant="outline" size="sm" disabled className="gap-1.5">
        <UserCheck className="size-4" />
        Amigos
      </Button>
    )
  }

  if (friendStatus === "pending_sent") {
    return (
      <Button variant="outline" size="sm" disabled className="gap-1.5">
        <Clock className="size-4" />
        Solicitud enviada
      </Button>
    )
  }

  if (friendStatus === "pending_received") {
    return (
      <div className="flex gap-2">
        <Button size="sm" disabled={loading} onClick={() => respond("accept")} className="gap-1.5">
          {loading ? <Loader2 className="size-4 animate-spin" /> : <UserCheck className="size-4" />}
          Aceptar
        </Button>
        <Button size="sm" variant="ghost" disabled={loading} onClick={() => respond("reject")}>
          Rechazar
        </Button>
      </div>
    )
  }

  return (
    <Button size="sm" variant="outline" disabled={loading} onClick={sendRequest} className="gap-1.5">
      {loading ? <Loader2 className="size-4 animate-spin" /> : <UserPlus className="size-4" />}
      Agregar amigo
    </Button>
  )
}
