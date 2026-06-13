"use client"

import * as React from "react"
import { useState } from "react"
import useSWR from "swr"
import { fetcher } from "@/lib/fetcher"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { buildGroupJoinUrl, buildGroupQrImageUrl } from "@/lib/group-invite"
import { cn } from "@/lib/utils"
import {
  Users,
  ArrowLeft,
  Copy,
  Check,
  QrCode,
  RefreshCw,
  UserPlus,
  BookOpen,
  MessageSquare,
  HeartHandshake,
  Loader2,
  Send,
} from "lucide-react"

interface Group {
  id: number
  name: string
  description: string
  role: string
  invite_code: string
  member_count: number
  created_at: string
}

type TabId = "invite" | "study" | "wall" | "discussion" | "prayer"

const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: "invite", label: "Invitar", icon: UserPlus },
  { id: "study", label: "Lectura", icon: BookOpen },
  { id: "wall", label: "Muro", icon: MessageSquare },
  { id: "discussion", label: "Foro", icon: MessageSquare },
  { id: "prayer", label: "Oración", icon: HeartHandshake },
]

interface GroupDetailProps {
  group: Group
  onBack: () => void
  onRegenerateCode: () => Promise<void>
  regenerating: boolean
}

function buildDiscussionTree(
  flat: { id: number; parent_id: number | null; content: string; user_name: string; created_at: string }[],
) {
  const map = new Map(flat.map((d) => [d.id, { ...d, replies: [] as typeof flat }]))
  const roots: (typeof flat[0] & { replies: typeof flat })[] = []
  for (const node of map.values()) {
    const parent = node.parent_id != null ? map.get(node.parent_id) : undefined
    if (parent) parent.replies.push(node)
    else roots.push(node)
  }
  return roots
}

export function GroupDetail({ group, onBack, onRegenerateCode, regenerating }: GroupDetailProps) {
  const [tab, setTab] = useState<TabId>("invite")
  const [copied, setCopied] = useState(false)
  const [postContent, setPostContent] = useState("")
  const [discussContent, setDiscussContent] = useState("")
  const [replyTo, setReplyTo] = useState<number | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [selectedPlanId, setSelectedPlanId] = useState("")

  const inviteUrl = buildGroupJoinUrl(group.invite_code)
  const qrUrl = buildGroupQrImageUrl(inviteUrl)

  const { data: planData, mutate: mutatePlan } = useSWR(
    tab === "study" ? `/api/groups/${group.id}/activity?tab=plan` : null,
    fetcher,
  )
  const { data: postsData, mutate: mutatePosts } = useSWR(
    tab === "wall" ? `/api/groups/${group.id}/activity?tab=posts` : null,
    fetcher,
  )
  const { data: discussData, mutate: mutateDiscuss } = useSWR(
    tab === "discussion" ? `/api/groups/${group.id}/activity?tab=discussions` : null,
    fetcher,
  )
  const { data: prayersData, mutate: mutatePrayers } = useSWR(
    tab === "prayer" ? `/api/groups/${group.id}/prayers` : null,
    fetcher,
  )
  const { data: allPlans } = useSWR(
    tab === "study" && group.role === "admin" ? "/api/plans" : null,
    fetcher,
  )

  async function handleCopyLink() {
    try {
      await navigator.clipboard.writeText(inviteUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      alert("No se pudo copiar")
    }
  }

  async function postToWall() {
    if (!postContent.trim()) return
    setSubmitting(true)
    try {
      const res = await fetch(`/api/groups/${group.id}/activity`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "post", content: postContent }),
      })
      if (!res.ok) throw new Error()
      setPostContent("")
      mutatePosts()
    } catch {
      alert("Error al publicar")
    } finally {
      setSubmitting(false)
    }
  }

  async function postDiscussion() {
    if (!discussContent.trim()) return
    setSubmitting(true)
    try {
      const res = await fetch(`/api/groups/${group.id}/activity`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "discuss", content: discussContent, parentId: replyTo }),
      })
      if (!res.ok) throw new Error()
      setDiscussContent("")
      setReplyTo(null)
      mutateDiscuss()
    } catch {
      alert("Error al publicar")
    } finally {
      setSubmitting(false)
    }
  }

  async function assignPlan() {
    if (!selectedPlanId) return
    setSubmitting(true)
    try {
      const res = await fetch(`/api/groups/${group.id}/activity`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "assign_plan", planId: parseInt(selectedPlanId, 10) }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      mutatePlan()
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error")
    } finally {
      setSubmitting(false)
    }
  }

  async function intercede(prayerId: number) {
    try {
      await fetch(`/api/groups/${group.id}/prayers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prayerId }),
      })
      mutatePrayers()
    } catch {
      alert("Error al unirse a orar")
    }
  }

  const discussionTree = buildDiscussionTree(discussData?.discussions ?? [])

  function renderDiscussion(nodes: ReturnType<typeof buildDiscussionTree>, depth = 0) {
    return nodes.map((node) => (
      <div key={node.id} className={cn("space-y-2", depth > 0 && "ml-4 pl-3 border-l border-border")}>
        <div className="rounded-lg border border-border bg-card/50 p-3">
          <p className="text-xs font-semibold text-muted-foreground">{node.user_name}</p>
          <p className="text-sm mt-1 whitespace-pre-wrap">{node.content}</p>
          <div className="flex items-center justify-between mt-2">
            <span className="text-[10px] text-muted-foreground">
              {new Date(node.created_at).toLocaleString()}
            </span>
            <button
              type="button"
              onClick={() => setReplyTo(node.id)}
              className="text-xs text-primary hover:underline"
            >
              Responder
            </button>
          </div>
        </div>
        {node.replies.length > 0 && renderDiscussion(node.replies as ReturnType<typeof buildDiscussionTree>, depth + 1)}
      </div>
    ))
  }

  return (
    <div className="space-y-6 animate-fade-in p-1 md:p-4 max-w-3xl mx-auto">
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="size-4" />
        Volver a mis grupos
      </button>

      <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold">{group.name}</h1>
            <p className="text-sm text-muted-foreground mt-1">{group.description || "Sin descripción"}</p>
          </div>
          <span className="text-xs font-semibold bg-muted px-2 py-1 rounded-md uppercase">{group.role}</span>
        </div>
        <p className="text-sm text-muted-foreground mt-3 flex items-center gap-1.5">
          <Users className="size-4" />
          {group.member_count} miembros
        </p>
      </div>

      <div className="flex gap-1 overflow-x-auto pb-1">
        {TABS.map((t) => {
          const Icon = t.icon
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors",
                tab === t.id ? "bg-primary text-primary-foreground" : "bg-muted/40 text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className="size-4" />
              {t.label}
            </button>
          )
        })}
      </div>

      {tab === "invite" && (
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-5">
          <div className="flex flex-col sm:flex-row gap-6 items-center sm:items-start">
            <div className="rounded-xl border border-border bg-white p-3 shrink-0">
              <img src={qrUrl} alt="QR invitación" width={200} height={200} className="size-[200px]" />
            </div>
            <div className="flex-1 w-full space-y-3">
              <p className="font-mono text-2xl font-bold tracking-widest">{group.invite_code}</p>
              <div className="flex gap-2">
                <Input readOnly value={inviteUrl} className="font-mono text-xs" />
                <Button variant="outline" onClick={handleCopyLink} className="shrink-0 gap-1.5">
                  {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
                  {copied ? "Copiado" : "Copiar"}
                </Button>
              </div>
              {group.role === "admin" && (
                <Button variant="ghost" size="sm" onClick={onRegenerateCode} disabled={regenerating} className="gap-1.5">
                  {regenerating ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />}
                  Regenerar código
                </Button>
              )}
            </div>
          </div>
          <div className="rounded-lg bg-blue-500/5 border border-blue-500/15 p-4 flex gap-3">
            <QrCode className="size-5 text-blue-500 shrink-0" />
            <p className="text-sm text-muted-foreground">
              Comparte el QR en la reunión de la célula o el enlace por WhatsApp.
            </p>
          </div>
        </div>
      )}

      {tab === "study" && (
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-4">
          {!planData ? (
            <div className="py-6 flex justify-center">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
          ) : planData.plan ? (
            <>
              <div>
                <h3 className="font-bold text-lg">{planData.plan.name}</h3>
                <p className="text-sm text-muted-foreground">{planData.plan.description}</p>
                <div className="mt-3 h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all"
                    style={{ width: `${planData.plan.group_progress_pct}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Progreso grupal: {planData.plan.group_progress_pct}%
                </p>
              </div>
              <div className="space-y-2">
                {planData.plan.members?.map((m: { user_name: string; progress_pct: number }) => (
                  <div key={m.user_name} className="flex items-center justify-between text-sm">
                    <span>{m.user_name}</span>
                    <span className="text-muted-foreground">{m.progress_pct}%</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Aún no hay un plan de lectura asignado.</p>
          )}
          {group.role === "admin" && allPlans?.plans && (
            <div className="flex gap-2 pt-2 border-t border-border">
              <select
                value={selectedPlanId}
                onChange={(e) => setSelectedPlanId(e.target.value)}
                className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm"
              >
                <option value="">Seleccionar plan...</option>
                {allPlans.plans.map((p: { id: number; name: string }) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
              <Button onClick={assignPlan} disabled={submitting || !selectedPlanId}>
                Asignar
              </Button>
            </div>
          )}
        </div>
      )}

      {tab === "wall" && (
        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-card p-4 space-y-3">
            <Textarea
              value={postContent}
              onChange={(e) => setPostContent(e.target.value)}
              placeholder="Comparte una reflexión o devocional con el grupo..."
              className="min-h-[80px]"
            />
            <Button onClick={postToWall} disabled={submitting} className="gap-2">
              {submitting ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
              Publicar
            </Button>
          </div>
          {(postsData?.posts ?? []).map((p: { id: number; user_name: string; content: string; created_at: string }) => (
            <div key={p.id} className="rounded-xl border border-border bg-card p-4">
              <p className="text-xs font-semibold text-muted-foreground">{p.user_name}</p>
              <p className="text-sm mt-2 whitespace-pre-wrap">{p.content}</p>
              <p className="text-[10px] text-muted-foreground mt-2">{new Date(p.created_at).toLocaleString()}</p>
            </div>
          ))}
        </div>
      )}

      {tab === "discussion" && (
        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-card p-4 space-y-3">
            {replyTo && (
              <p className="text-xs text-primary">
                Respondiendo...{" "}
                <button type="button" onClick={() => setReplyTo(null)} className="underline">Cancelar</button>
              </p>
            )}
            <Textarea
              value={discussContent}
              onChange={(e) => setDiscussContent(e.target.value)}
              placeholder="Coordina reuniones o debate sobre la lectura..."
            />
            <Button onClick={postDiscussion} disabled={submitting} className="gap-2">
              {submitting ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
              {replyTo ? "Responder" : "Publicar"}
            </Button>
          </div>
          <div className="space-y-3">{renderDiscussion(discussionTree)}</div>
        </div>
      )}

      {tab === "prayer" && (
        <div className="space-y-4">
          {!prayersData ? (
            <div className="py-6 flex justify-center">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
          ) : (prayersData.prayers ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No hay peticiones compartidas con este grupo. Comparte una desde la sección Oración.
            </p>
          ) : (
            prayersData.prayers.map((p: {
              id: number
              title: string
              description: string
              user_name: string
              intercessor_count: number
              is_interceding: number
            }) => (
              <div key={p.id} className="rounded-xl border border-border bg-card p-4 flex justify-between gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">{p.user_name}</p>
                  <h3 className="font-bold">{p.title}</h3>
                  {p.description && <p className="text-sm text-muted-foreground mt-1">{p.description}</p>}
                  <p className="text-xs text-muted-foreground mt-2">
                    {p.intercessor_count} {p.intercessor_count === 1 ? "persona ora" : "personas oran"}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant={p.is_interceding ? "outline" : "default"}
                  onClick={() => !p.is_interceding && intercede(p.id)}
                  disabled={!!p.is_interceding}
                  className="shrink-0"
                >
                  {p.is_interceding ? "🙏 Orando" : "Amén"}
                </Button>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
