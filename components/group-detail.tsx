"use client"

import * as React from "react"
import { useState } from "react"
import useSWR from "swr"
import { fetcher } from "@/lib/fetcher"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { buildGroupJoinUrl, buildGroupQrImageUrl } from "@/lib/group-invite"
import {
  GROUP_ROLE_LABELS,
  GROUP_ROLES,
  canManageGroupEvents,
  getGroupRoleLabel,
  isGroupAdmin,
  type GroupRole,
} from "@/lib/group-roles"
import { cn } from "@/lib/utils"
import { GroupVisual } from "@/components/group-visual"
import { GroupAppearanceEditor } from "@/components/group-appearance-editor"
import { GroupCalendar } from "@/components/group-calendar"
import { UserAvatar } from "@/components/user-avatar"
import {
  Calendar,
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
  Pencil,
  ImagePlus,
} from "lucide-react"

interface Group {
  id: number
  name: string
  description: string
  role: string
  invite_code: string
  member_count: number
  created_at: string
  cover_image?: string | null
  avatar_image?: string | null
  is_official_church?: number
}

type TabId = "wall" | "members" | "study" | "discussion" | "prayer" | "calendar" | "about"

const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: "wall", label: "Muro", icon: MessageSquare },
  { id: "members", label: "Miembros", icon: Users },
  { id: "study", label: "Lectura", icon: BookOpen },
  { id: "discussion", label: "Foro", icon: MessageSquare },
  { id: "prayer", label: "Oración", icon: HeartHandshake },
  { id: "calendar", label: "Calendario", icon: Calendar },
  { id: "about", label: "Descripción", icon: UserPlus },
]

interface GroupDetailProps {
  group: Group
  currentUserId: number
  churchLogoUrl?: string | null
  onBack: () => void
  onRegenerateCode: () => Promise<void>
  onRoleChanged: () => void
  onAppearanceChanged: () => void
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

export function GroupDetail({
  group,
  currentUserId,
  churchLogoUrl,
  onBack,
  onRegenerateCode,
  onRoleChanged,
  onAppearanceChanged,
  regenerating,
}: GroupDetailProps) {
  const [tab, setTab] = useState<TabId>("wall")
  const [copied, setCopied] = useState(false)
  const [postContent, setPostContent] = useState("")
  const [postImageUrl, setPostImageUrl] = useState<string | null>(null)
  const [uploadingPostImage, setUploadingPostImage] = useState(false)
  const [editingAppearance, setEditingAppearance] = useState(false)
  const [discussContent, setDiscussContent] = useState("")
  const [replyTo, setReplyTo] = useState<number | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [prayerTitle, setPrayerTitle] = useState("")
  const [prayerDescription, setPrayerDescription] = useState("")
  const [selectedPlanId, setSelectedPlanId] = useState("")
  const [updatingRoleFor, setUpdatingRoleFor] = useState<number | null>(null)
  const [roleError, setRoleError] = useState<string | null>(null)

  const isAdmin = isGroupAdmin(group.role)
  const canManageEvents = canManageGroupEvents(group.role)

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
  const { data: membersData, mutate: mutateMembers } = useSWR(
    tab === "members" ? `/api/groups/${group.id}/members` : null,
    fetcher,
  )
  const { data: allPlans } = useSWR(
    tab === "study" && isAdmin ? "/api/plans" : null,
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
    if (!postContent.trim() && !postImageUrl) return
    setSubmitting(true)
    try {
      const res = await fetch(`/api/groups/${group.id}/activity`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "post", content: postContent, imageUrl: postImageUrl }),
      })
      if (!res.ok) throw new Error()
      setPostContent("")
      setPostImageUrl(null)
      mutatePosts()
    } catch {
      alert("Error al publicar")
    } finally {
      setSubmitting(false)
    }
  }

  async function uploadPostImage(file: File) {
    setUploadingPostImage(true)
    try {
      const fd = new FormData()
      fd.append("file", file)
      fd.append("purpose", "group")
      const res = await fetch("/api/upload", { method: "POST", body: fd })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setPostImageUrl(data.url)
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error al subir")
    } finally {
      setUploadingPostImage(false)
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

  async function createGroupPrayer() {
    if (!prayerTitle.trim()) return
    setSubmitting(true)
    try {
      const res = await fetch("/api/prayers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: prayerTitle.trim(),
          description: prayerDescription,
          visibility: "group",
          groupId: group.id,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Error al publicar")
      setPrayerTitle("")
      setPrayerDescription("")
      mutatePrayers()
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error al publicar la petición")
    } finally {
      setSubmitting(false)
    }
  }

  async function changeMemberRole(userId: number, role: GroupRole) {
    setUpdatingRoleFor(userId)
    setRoleError(null)
    try {
      const res = await fetch(`/api/groups/${group.id}/members`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, role }),
      })
      const body = await res.json()
      if (!res.ok) throw new Error(body.error || "Error al cambiar rol")
      await mutateMembers()
      onRoleChanged()
    } catch (err) {
      setRoleError(err instanceof Error ? err.message : "Error al cambiar rol")
    } finally {
      setUpdatingRoleFor(null)
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
    <div className="w-full max-w-6xl mx-auto space-y-4 animate-fade-in px-1 md:px-2">
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="size-4" />
        Volver a mis grupos
      </button>

      {editingAppearance && isAdmin ? (
        <GroupAppearanceEditor
          groupId={group.id}
          name={group.name}
          coverImage={group.cover_image ?? null}
          avatarImage={group.avatar_image ?? null}
          churchLogoUrl={churchLogoUrl}
          isOfficialChurch={!!group.is_official_church}
          onSaved={() => {
            setEditingAppearance(false)
            onAppearanceChanged()
          }}
          onCancel={() => setEditingAppearance(false)}
        />
      ) : (
        <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
          <GroupVisual
            name={group.name}
            coverImage={group.cover_image}
            avatarImage={group.avatar_image}
            churchLogoUrl={churchLogoUrl}
            isOfficialChurch={!!group.is_official_church}
            variant="compact"
          />
          <div className="px-4 md:px-6 pb-4 pt-12 md:pt-14">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
              <div className="min-w-0">
                <h1 className="text-xl md:text-2xl font-extrabold truncate">{group.name}</h1>
                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                  {group.description || "Sin descripción"}
                </p>
                <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1.5">
                  <Users className="size-3.5 shrink-0" />
                  {group.member_count} miembros · {getGroupRoleLabel(group.role)}
                </p>
              </div>
              {isAdmin && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditingAppearance(true)}
                  className="gap-1.5 shrink-0"
                >
                  <Pencil className="size-3.5" />
                  Editar apariencia
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-1 overflow-x-auto pb-1 border-b border-border">
        {TABS.map((t) => {
          const Icon = t.icon
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium whitespace-nowrap transition-colors border-b-2 -mb-px",
                tab === t.id
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className="size-4" />
              {t.label}
            </button>
          )
        })}
      </div>

      {tab === "about" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-4">
            <h2 className="font-bold text-lg">Sobre el grupo</h2>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
              {group.description || "Este grupo aún no tiene descripción."}
            </p>
            <div className="flex items-center gap-2 text-sm text-muted-foreground pt-2 border-t border-border">
              <Users className="size-4" />
              <span>{group.member_count} miembros</span>
              <span>·</span>
              <span>{getGroupRoleLabel(group.role)}</span>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-4">
            <h2 className="font-bold text-lg">Invitar al grupo</h2>
            <div className="flex flex-col sm:flex-row gap-4 items-center sm:items-start">
              <div className="rounded-lg border border-border bg-white p-2 shrink-0">
                <img src={qrUrl} alt="QR invitación" width={140} height={140} className="size-[140px]" />
              </div>
              <div className="flex-1 w-full space-y-2">
                <p className="font-mono text-lg font-bold tracking-widest">{group.invite_code}</p>
                <div className="flex gap-2">
                  <Input readOnly value={inviteUrl} className="font-mono text-xs" />
                  <Button variant="outline" onClick={handleCopyLink} className="shrink-0 gap-1.5">
                    {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
                    {copied ? "Copiado" : "Copiar"}
                  </Button>
                </div>
                {isAdmin && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onRegenerateCode}
                    disabled={regenerating}
                    className="gap-1.5"
                  >
                    {regenerating ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />}
                    Regenerar código
                  </Button>
                )}
              </div>
            </div>
            <div className="rounded-lg bg-blue-500/5 border border-blue-500/15 p-3 flex gap-2">
              <QrCode className="size-4 text-blue-500 shrink-0 mt-0.5" />
              <p className="text-xs text-muted-foreground">
                Comparte el QR en la reunión o el enlace por WhatsApp para que más personas se unan.
              </p>
            </div>
          </div>
        </div>
      )}

      {tab === "members" && (
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-4">
          {isAdmin && (
            <p className="text-sm text-muted-foreground">
              Como administrador puedes asignar roles a cada miembro del grupo.
            </p>
          )}
          {roleError && (
            <p className="text-sm text-destructive rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2">
              {roleError}
            </p>
          )}
          {!membersData ? (
            <div className="py-6 flex justify-center">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
          ) : (membersData.members ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No hay miembros en este grupo.</p>
          ) : (
            <div className="space-y-3">
              {membersData.members.map((m: {
                user_id: number
                name: string
                username: string
                role: GroupRole
                joined_at: string
                avatar_url: string | null
              }) => (
                <div
                  key={m.user_id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border border-border bg-card/50 p-4"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <UserAvatar name={m.name} avatarUrl={m.avatar_url} size="md" />
                    <div className="min-w-0">
                      <p className="font-semibold truncate">
                        {m.name}
                        {m.user_id === currentUserId && (
                          <span className="ml-2 text-xs font-normal text-primary">(Tú)</span>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground">@{m.username}</p>
                      <p className="text-[10px] text-muted-foreground mt-1">
                        Desde {new Date(m.joined_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  {isAdmin ? (
                    <div className="flex items-center gap-2 shrink-0">
                      {updatingRoleFor === m.user_id && (
                        <Loader2 className="size-4 animate-spin text-muted-foreground" />
                      )}
                      <select
                        value={m.role}
                        disabled={updatingRoleFor === m.user_id}
                        onChange={(e) => changeMemberRole(m.user_id, e.target.value as GroupRole)}
                        className="rounded-lg border border-border bg-background px-3 py-2 text-sm min-w-[160px]"
                      >
                        {GROUP_ROLES.map((role) => (
                          <option key={role} value={role}>
                            {GROUP_ROLE_LABELS[role]}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <span className="text-xs font-semibold bg-muted px-2 py-1 rounded-md shrink-0">
                      {getGroupRoleLabel(m.role)}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
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
          {isAdmin && allPlans?.plans && (
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
              placeholder="Comparte una reflexión, devocional o foto con el grupo..."
              className="min-h-[80px]"
            />
            {postImageUrl && (
              <div className="relative rounded-lg overflow-hidden border border-border max-h-48">
                <img src={postImageUrl} alt="" className="w-full object-cover max-h-48" />
                <button
                  type="button"
                  onClick={() => setPostImageUrl(null)}
                  className="absolute top-2 right-2 text-xs bg-background/90 px-2 py-1 rounded-md border"
                >
                  Quitar
                </button>
              </div>
            )}
            <div className="flex gap-2">
              <input
                type="file"
                accept="image/*"
                className="hidden"
                id="group-wall-image"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) uploadPostImage(f)
                }}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={uploadingPostImage}
                onClick={() => document.getElementById("group-wall-image")?.click()}
                className="gap-1.5"
              >
                {uploadingPostImage ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <ImagePlus className="size-4" />
                )}
                Foto
              </Button>
              <Button
                onClick={postToWall}
                disabled={submitting || (!postContent.trim() && !postImageUrl)}
                className="gap-2"
              >
                {submitting ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                Publicar
              </Button>
            </div>
          </div>
          {(postsData?.posts ?? []).map((p: {
            id: number
            user_name: string
            content: string
            image_url: string | null
            created_at: string
          }) => (
            <div key={p.id} className="rounded-xl border border-border bg-card p-4 overflow-hidden">
              <p className="text-xs font-semibold text-muted-foreground">{p.user_name}</p>
              {p.image_url && (
                <img
                  src={p.image_url}
                  alt=""
                  className="mt-2 rounded-lg w-full max-h-64 object-cover"
                />
              )}
              {p.content && <p className="text-sm mt-2 whitespace-pre-wrap">{p.content}</p>}
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

      {tab === "calendar" && (
        <GroupCalendar groupId={group.id} canManage={canManageEvents} />
      )}

      {tab === "prayer" && (
        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-card p-4 space-y-3">
            <h3 className="text-sm font-semibold">Nueva petición de oración</h3>
            <Input
              value={prayerTitle}
              onChange={(e) => setPrayerTitle(e.target.value)}
              placeholder="Título de la petición"
            />
            <Textarea
              value={prayerDescription}
              onChange={(e) => setPrayerDescription(e.target.value)}
              placeholder="Describe tu petición para que el grupo ore contigo..."
              className="min-h-[80px]"
            />
            <Button
              onClick={createGroupPrayer}
              disabled={submitting || !prayerTitle.trim()}
              className="gap-2"
            >
              {submitting ? <Loader2 className="size-4 animate-spin" /> : <HeartHandshake className="size-4" />}
              Compartir con el grupo
            </Button>
          </div>

          {!prayersData ? (
            <div className="py-6 flex justify-center">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
          ) : (prayersData.prayers ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              Aún no hay peticiones en este grupo. Sé el primero en compartir una.
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
