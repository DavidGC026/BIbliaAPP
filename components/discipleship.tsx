"use client"

import * as React from "react"
import { useState } from "react"
import useSWR from "swr"
import { fetcher } from "@/lib/fetcher"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { UserPlus, Loader2, BookOpen, Flame, Check, X } from "lucide-react"

interface DiscipleshipProps {
  currentUserId: number
}

export function Discipleship({ currentUserId }: DiscipleshipProps) {
  const { data, mutate, isLoading } = useSWR<{ asMentor: any[]; asDisciple: any[] }>(
    "/api/discipleship",
    fetcher,
  )
  const [mentorUsername, setMentorUsername] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [viewingDiscipleId, setViewingDiscipleId] = useState<number | null>(null)

  const { data: progressData, isLoading: progressLoading } = useSWR(
    viewingDiscipleId ? `/api/discipleship?discipleId=${viewingDiscipleId}` : null,
    fetcher,
  )

  async function requestMentor(e: React.FormEvent) {
    e.preventDefault()
    if (!mentorUsername.trim()) return
    setSubmitting(true)
    try {
      const res = await fetch("/api/discipleship", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mentorUsername: mentorUsername.replace(/^@/, "") }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      setMentorUsername("")
      mutate()
      alert("Solicitud enviada al mentor")
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error")
    } finally {
      setSubmitting(false)
    }
  }

  async function respond(id: number, accept: boolean) {
    try {
      await fetch("/api/discipleship", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "respond", id, accept }),
      })
      mutate()
    } catch {
      alert("Error al responder")
    }
  }

  const pendingAsMentor = (data?.asMentor ?? []).filter((r) => r.status === "pending")
  const activeAsMentor = (data?.asMentor ?? []).filter((r) => r.status === "active")
  const asDisciple = data?.asDisciple ?? []

  return (
    <div className="space-y-6 animate-fade-in p-1 md:p-4 max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-2">
          Discipulado <UserPlus className="size-7 text-emerald-500" />
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Acompañamiento espiritual uno a uno
        </p>
      </div>

      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <h2 className="font-bold mb-3">Solicitar un mentor</h2>
        <form onSubmit={requestMentor} className="flex gap-2">
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold">@</span>
            <Input
              value={mentorUsername}
              onChange={(e) => setMentorUsername(e.target.value.toLowerCase())}
              placeholder="apodo_del_mentor"
              className="pl-8"
            />
          </div>
          <Button type="submit" disabled={submitting}>
            {submitting ? <Loader2 className="size-4 animate-spin" /> : "Enviar solicitud"}
          </Button>
        </form>
      </div>

      {isLoading ? (
        <div className="py-12 flex justify-center"><Loader2 className="size-8 animate-spin" /></div>
      ) : (
        <>
          {pendingAsMentor.length > 0 && (
            <div className="space-y-3">
              <h2 className="font-bold">Solicitudes pendientes (como mentor)</h2>
              {pendingAsMentor.map((r) => (
                <div key={r.id} className="rounded-xl border border-border bg-card p-4 flex justify-between items-center">
                  <div>
                    <p className="font-semibold">{r.partner_name}</p>
                    <p className="text-sm text-muted-foreground">@{r.partner_username}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => respond(r.id, true)} className="gap-1">
                      <Check className="size-4" /> Aceptar
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => respond(r.id, false)} className="gap-1">
                      <X className="size-4" /> Rechazar
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeAsMentor.length > 0 && (
            <div className="space-y-3">
              <h2 className="font-bold">Mis discípulos</h2>
              {activeAsMentor.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setViewingDiscipleId(r.partner_id)}
                  className="w-full rounded-xl border border-border bg-card p-4 text-left hover:border-emerald-500/30 transition-colors"
                >
                  <p className="font-semibold">{r.partner_name}</p>
                  <p className="text-sm text-muted-foreground">@{r.partner_username} — Ver progreso →</p>
                </button>
              ))}
            </div>
          )}

          {asDisciple.length > 0 && (
            <div className="space-y-3">
              <h2 className="font-bold">Mis mentores</h2>
              {asDisciple.map((r) => (
                <div key={r.id} className="rounded-xl border border-border bg-card p-4">
                  <p className="font-semibold">{r.partner_name}</p>
                  <p className="text-sm text-muted-foreground">
                    @{r.partner_username} — {r.status === "pending" ? "Pendiente" : r.status === "active" ? "Activo" : r.status}
                  </p>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {viewingDiscipleId && (
        <div className="rounded-xl border border-emerald-500/20 bg-card p-6 shadow-sm space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="font-bold text-lg">Progreso del discípulo</h2>
            <Button variant="ghost" size="sm" onClick={() => setViewingDiscipleId(null)}>Cerrar</Button>
          </div>
          {progressLoading ? (
            <Loader2 className="size-6 animate-spin mx-auto" />
          ) : progressData?.progress ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-amber-600">
                <Flame className="size-5" />
                <span className="font-bold">Racha: {progressData.progress.streak_count} días</span>
              </div>
              {progressData.progress.reading_plans?.length > 0 && (
                <div>
                  <h3 className="font-semibold flex items-center gap-2 mb-2">
                    <BookOpen className="size-4" /> Planes de lectura
                  </h3>
                  {progressData.progress.reading_plans.map((p: any) => {
                    const done = JSON.parse(p.progress || "[]").length
                    return (
                      <p key={p.plan_id} className="text-sm text-muted-foreground">
                        {p.name}: {done} días completados
                      </p>
                    )
                  })}
                </div>
              )}
              {progressData.progress.devotionals?.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-2">Últimos devocionales</h3>
                  {progressData.progress.devotionals.slice(0, 5).map((d: any) => (
                    <p key={d.id} className="text-sm border-b border-border/50 py-2">
                      <span className="font-medium">{d.title}</span>
                      <span className="text-muted-foreground"> — {new Date(d.created_at).toLocaleDateString()}</span>
                    </p>
                  ))}
                </div>
              )}
            </div>
          ) : null}
        </div>
      )}
    </div>
  )
}
