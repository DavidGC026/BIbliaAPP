"use client"

import * as React from "react"
import { useState } from "react"
import useSWR from "swr"
import { fetcher } from "@/lib/fetcher"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import {
  User,
  Users,
  Search,
  Loader2,
  MapPin,
  Calendar,
  Flame,
  Copy,
  Check,
  UserPlus,
  UserMinus,
  MessageSquare,
  Heart,
  Share2,
  Flag,
  UserX,
  ShieldBan,
  AlertTriangle,
  Trash2
} from "lucide-react"
import { UserAvatar } from "@/components/user-avatar"
import { FriendRequestButton } from "@/components/friend-request-button"
import { PrivacySettings } from "@/components/privacy-settings"
import { AccountTransferPanel } from "@/components/account-transfer-panel"
import { ReportModal } from "@/components/report-modal"
import { BlockedUsersDialog } from "@/components/blocked-users-dialog"

interface ProfileSectionProps {
  currentUserId: number
  initialUsername?: string // If provided, shows this user's profile instead of searching
}

export function ProfileSection({ currentUserId, initialUsername }: ProfileSectionProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [activeUsername, setActiveUsername] = useState<string | null>(initialUsername || null)
  const [copied, setCopied] = useState(false)
  const [isEditingUsername, setIsEditingUsername] = useState(false)
  const [newUsername, setNewUsername] = useState("")
  const [isSubmittingUsername, setIsSubmittingUsername] = useState(false)
  const [usernameError, setUsernameError] = useState("")
  const [reportTarget, setReportTarget] = useState<{
    type: "user" | "post" | "comment"
    id: number
    label?: string
  } | null>(null)
  const [showBlockedDialog, setShowBlockedDialog] = useState(false)
  const [isDeletingAccount, setIsDeletingAccount] = useState(false)

  // Search users
  const { data: searchData, isLoading: searchLoading } = useSWR<{ users: any[] }>(
    searchQuery.length > 2 && !activeUsername ? `/api/users/search?q=${searchQuery}` : null,
    fetcher
  )

  // Load profile
  const { data: profileData, isLoading: profileLoading, mutate: mutateProfile } = useSWR<{ profile: any }>(
    activeUsername ? `/api/profile/${activeUsername}` : null,
    fetcher
  )
  const profile = profileData?.profile

  // Load posts
  const { data: postsData, isLoading: postsLoading } = useSWR<{ posts: any[] }>(
    activeUsername ? `/api/profile/${activeUsername}/posts` : null,
    fetcher
  )
  const posts = postsData?.posts || []

  const handleCopyUsername = () => {
    if (!profile?.username) return
    navigator.clipboard.writeText(`@${profile.username}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleFollowToggle = async () => {
    if (!profile) return
    const method = profile.isFollowing ? "DELETE" : "POST"
    
    // Optimistic UI update
    mutateProfile({
      profile: {
        ...profile,
        isFollowing: !profile.isFollowing,
        followersCount: profile.followersCount + (profile.isFollowing ? -1 : 1)
      }
    }, false)

    try {
      await fetch(`/api/profile/${profile.username}/follow`, { method })
      mutateProfile()
    } catch (e) {
      console.error(e)
      mutateProfile() // Revert on error
    }
  }

  if (activeUsername) {
    return (
      <div className="flex flex-col h-full bg-card/20 overflow-y-auto animate-fade-in relative rounded-xl border border-border/40">
        {/* Back Button (if we navigated here via search) */}
        {!initialUsername && (
          <button 
            onClick={() => setActiveUsername(null)}
            className="absolute top-4 left-4 z-10 bg-background/50 backdrop-blur-md p-2 rounded-full hover:bg-background transition-colors"
          >
            Volver
          </button>
        )}

        {profileLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="size-8 animate-spin text-primary" />
          </div>
        ) : profile ? (
          <>
            {/* Header/Banner */}
            <div className="relative h-48 bg-gradient-to-r from-primary/30 via-primary/10 to-transparent rounded-t-xl overflow-hidden shrink-0">
              <div className="absolute inset-0 bg-grid-white/5 bg-grid-16" />
              <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent" />
            </div>

            {/* Profile Info */}
            <div className="px-6 relative -mt-16 sm:-mt-20 shrink-0 pb-6 border-b border-border/30">
              <div className="flex flex-col sm:flex-row gap-4 sm:items-end justify-between">
                <div className="flex flex-col sm:flex-row gap-4 sm:items-end">
                  <UserAvatar
                    name={profile.name}
                    avatarUrl={profile.avatarUrl}
                    size="xl"
                    className="rounded-2xl border-4 border-background shadow-xl"
                  />
                  
                  <div className="pb-2">
                    <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">{profile.name}</h1>
                    <div className="flex items-center gap-2 mt-1">
                      {isEditingUsername ? (
                        <div className="flex items-center gap-2">
                          <Input
                            value={newUsername}
                            onChange={(e) => setNewUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                            className="h-7 text-xs w-32"
                            placeholder="nuevo_apodo"
                            maxLength={30}
                          />
                          <Button 
                            size="sm" 
                            className="h-7 px-2" 
                            onClick={async () => {
                              setUsernameError("")
                              if (newUsername.length < 3) {
                                setUsernameError("Min 3 caracteres")
                                return
                              }
                              setIsSubmittingUsername(true)
                              try {
                                const res = await fetch("/api/profile", {
                                  method: "PUT",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({ username: newUsername })
                                })
                                const data = await res.json()
                                if (!res.ok) throw new Error(data.error || "Error")
                                mutateProfile()
                                setIsEditingUsername(false)
                                window.location.reload() // Reload to update global state
                              } catch (err: any) {
                                setUsernameError(err.message)
                              } finally {
                                setIsSubmittingUsername(false)
                              }
                            }}
                            disabled={isSubmittingUsername}
                          >
                            {isSubmittingUsername ? <Loader2 className="size-3 animate-spin" /> : "Guardar"}
                          </Button>
                          <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => setIsEditingUsername(false)}>
                            X
                          </Button>
                        </div>
                      ) : (
                        <button type="button" className="flex items-center gap-1.5 rounded-md bg-muted/50 px-2 py-0.5 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" onClick={handleCopyUsername} aria-label={`Copiar apodo @${profile.username}`}>
                          @{profile.username}
                          {copied ? <Check className="size-3 text-green-500" /> : <Copy className="size-3" />}
                        </button>
                      )}
                      
                      {profile.id === currentUserId && !isEditingUsername && (
                        <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={() => {
                          setNewUsername(profile.username || "")
                          setIsEditingUsername(true)
                        }}>
                          Editar
                        </Button>
                      )}
                      {profile.role === "admin" && !isEditingUsername && (
                        <span className="text-[10px] uppercase font-bold bg-primary/10 text-primary px-1.5 py-0.5 rounded">Admin</span>
                      )}
                    </div>
                    {usernameError && <p className="text-xs text-rose-500 mt-1">{usernameError}</p>}
                  </div>
                </div>

                <div className="flex items-center gap-3 pb-2 flex-wrap">
                  {profile.id !== currentUserId ? (
                    <>
                      <FriendRequestButton
                        targetUserId={profile.id}
                        friendStatus={profile.friendStatus || "none"}
                        onChanged={() => mutateProfile()}
                      />
                      <Button
                        onClick={handleFollowToggle}
                        className={cn(
                          "rounded-full px-6 shadow-md transition-all active:scale-95",
                          profile.isFollowing ? "bg-muted text-foreground hover:bg-muted/80" : "bg-primary text-primary-foreground hover:bg-primary/90"
                        )}
                      >
                        {profile.isFollowing ? (
                          <>Siguiendo</>
                        ) : (
                          <><UserPlus className="size-4 mr-2" /> Seguir</>
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setReportTarget({ type: "user", id: profile.id, label: `@${profile.username} (${profile.name})` })}
                        className="rounded-full text-xs text-rose-600 dark:text-rose-400 border-rose-500/30 hover:bg-rose-500/10 gap-1.5"
                      >
                        <Flag className="size-3.5" />
                        Denunciar
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={async () => {
                          if (!confirm(`¿Bloquear a @${profile.username}? Ya no verás sus publicaciones ni podrá interactuar contigo.`)) return
                          try {
                            const res = await fetch("/api/moderation/block", {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ userId: profile.id }),
                            })
                            if (!res.ok) throw new Error("Error al bloquear")
                            alert("Usuario bloqueado")
                            setActiveUsername(null)
                          } catch (e) {
                            alert(e instanceof Error ? e.message : "Error")
                          }
                        }}
                        className="rounded-full text-xs text-muted-foreground hover:text-rose-500 gap-1.5"
                      >
                        <UserX className="size-3.5" />
                        Bloquear
                      </Button>
                    </>
                  ) : null}
                </div>
              </div>

              {/* Stats */}
              <div className="flex items-center gap-6 mt-6 pl-1">
                <div className="flex flex-col">
                  <span className="text-xl font-bold text-foreground">{profile.followersCount || 0}</span>
                  <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Seguidores</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-xl font-bold text-foreground">{profile.followingCount || 0}</span>
                  <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Siguiendo</span>
                </div>
                <div className="flex flex-col pl-4 border-l border-border/40">
                  <div className="flex items-center gap-1 text-xl font-bold text-amber-500">
                    <Flame className="size-5 fill-amber-500" />
                    {profile.streakCount || 0}
                  </div>
                  <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Racha</span>
                </div>
              </div>
            </div>

            {profile.id === currentUserId && (
              <div className="px-6 pb-4 space-y-4">
                <PrivacySettings />
                
                {/* Gestión de usuarios bloqueados */}
                <div className="rounded-xl border border-border bg-card p-5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="size-9 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                      <ShieldBan className="size-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-foreground">Usuarios bloqueados</h3>
                      <p className="text-xs text-muted-foreground">Administra la lista de personas que has bloqueado.</p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowBlockedDialog(true)}
                  >
                    Ver lista
                  </Button>
                </div>

                <AccountTransferPanel />

                {/* Zona de peligro: Eliminar cuenta */}
                <div className="rounded-xl border border-rose-500/30 bg-rose-500/5 p-5 space-y-3">
                  <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
                    <AlertTriangle className="size-5" />
                    <h3 className="font-bold text-sm">Eliminar cuenta</h3>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Esta acción es irreversible. Se eliminarán permanentemente todas tus notas, libretas, subrayados, publicaciones y datos personales asociados.
                  </p>
                  <Button
                    variant="destructive"
                    size="sm"
                    disabled={isDeletingAccount}
                    onClick={async () => {
                      const c1 = confirm("¿Estás COMPLETAMENTE SEGURO de que deseas eliminar tu cuenta? Esta acción NO se puede deshacer.")
                      if (!c1) return
                      const c2 = prompt("Para confirmar la eliminación, escribe la palabra ELIMINAR:")
                      if (c2 !== "ELIMINAR") {
                        alert("Confirmación cancelada.")
                        return
                      }
                      setIsDeletingAccount(true)
                      try {
                        const res = await fetch("/api/profile", { method: "DELETE" })
                        if (!res.ok) throw new Error("Error al eliminar la cuenta")
                        alert("Tu cuenta y tus datos han sido eliminados correctamente.")
                        window.location.href = "/"
                      } catch (err) {
                        alert(err instanceof Error ? err.message : "Error al eliminar la cuenta")
                        setIsDeletingAccount(false)
                      }
                    }}
                    className="gap-1.5"
                  >
                    {isDeletingAccount ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
                    Eliminar mi cuenta definitivamente
                  </Button>
                </div>
              </div>
            )}

            {/* Modales de moderación */}
            {reportTarget && (
              <ReportModal
                isOpen={true}
                onClose={() => setReportTarget(null)}
                targetType={reportTarget.type}
                targetId={reportTarget.id}
                targetLabel={reportTarget.label}
              />
            )}

            <BlockedUsersDialog
              isOpen={showBlockedDialog}
              onClose={() => setShowBlockedDialog(false)}
            />

            {/* Posts */}
            <div className="flex-1 p-6">
              <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                <MessageSquare className="size-5 text-primary" />
                Publicaciones
              </h3>

              {postsLoading ? (
                <div className="flex justify-center p-8"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div>
              ) : posts.length === 0 ? (
                <div className="text-center py-12 bg-card/30 rounded-xl border border-border/30 border-dashed">
                  <p className="text-muted-foreground font-medium">No hay publicaciones aún.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {posts.map((post: any) => (
                    <div key={post.id} className="bg-card p-4 rounded-xl border border-border/50 shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="size-8 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary text-xs shrink-0">
                          {profile.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="font-bold text-sm text-foreground truncate">{profile.name}</span>
                          <span className="text-[10px] text-muted-foreground">
                            {new Date(post.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="ml-auto">
                          <span className="text-[10px] font-semibold uppercase tracking-wider bg-muted px-2 py-0.5 rounded text-muted-foreground">
                            {post.type === 'verse' ? '📖 Versículo' : post.type === 'devotional' ? '🌅 Devocional' : post.type === 'note' ? '📝 Nota' : 'Publicación'}
                          </span>
                        </div>
                      </div>

                      {post.verse_ref && (
                        <div className="mb-3 pl-3 border-l-2 border-primary/40 text-sm">
                          <strong className="text-primary block">{post.verse_ref}</strong>
                          {post.verse_text && <p className="text-muted-foreground italic mt-1">{post.verse_text}</p>}
                        </div>
                      )}
                      
                      <p className="text-foreground whitespace-pre-wrap text-sm leading-relaxed">{post.content}</p>

                      <div className="flex items-center gap-4 mt-4 pt-3 border-t border-border/30">
                        <button className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-rose-500 transition-colors">
                          <Heart className={cn("size-4", post.is_liked && "fill-rose-500 text-rose-500")} />
                          {post.like_count > 0 && <span>{post.like_count}</span>}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-64 text-muted-foreground">Perfil no encontrado</div>
        )}
      </div>
    )
  }

  // Search view
  return (
    <div className="flex flex-col h-full bg-card/20 rounded-xl overflow-hidden">
      <div className="p-6 border-b border-border/40 bg-card/30 backdrop-blur-md">
        <h1 className="text-xl font-bold text-foreground flex items-center gap-2 mb-4">
          <Users className="size-5 text-primary" />
          Comunidad
        </h1>
        
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input 
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            name="community-search"
            autoComplete="off"
            aria-label="Buscar personas en la comunidad"
            placeholder="Buscar por nombre o @apodo…"
            className="pl-9 bg-background border-border/50"
          />
        </div>
      </div>

      <div className="flex-1 p-6 overflow-y-auto">
        {searchQuery.length > 2 ? (
          searchLoading ? (
            <div className="flex justify-center p-8"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div>
          ) : searchData?.users?.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">No se encontraron usuarios.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {searchData?.users?.map(u => (
                <button
                  type="button"
                  key={u.id}
                  onClick={() => setActiveUsername(u.username)}
                  className="group flex items-center gap-3 rounded-xl border border-border/50 bg-card p-4 text-left transition-all hover:border-primary/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <div className="size-12 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary shrink-0 group-hover:scale-105 transition-transform">
                    {u.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="font-bold text-sm text-foreground truncate">{u.name}</span>
                    <span className="text-xs text-muted-foreground truncate">@{u.username}</span>
                  </div>
                </button>
              ))}
            </div>
          )
        ) : (
          <div className="flex flex-col items-center justify-center h-64 text-center space-y-3 opacity-60">
            <Search className="size-12 text-muted-foreground" />
            <p className="text-sm font-medium">Escribe al menos 3 caracteres para buscar.</p>
          </div>
        )}
      </div>
    </div>
  )
}
