"use client"

import * as React from "react"
import { useState } from "react"
import useSWR from "swr"
import { fetcher } from "@/lib/fetcher"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import {
  MessageSquarePlus,
  Heart,
  Loader2,
  Users,
  Compass,
  MessageSquare,
  BookOpen,
  Share2,
  Send,
  Image as ImageIcon,
  Paperclip,
  Trash2,
  Reply,
  ChevronDown,
  ChevronRight,
  X
} from "lucide-react"
import { ProfileSection } from "./profile-section"

// ------------------------------------------------------------------
// Hilos de comentarios anidados (estilo Reddit)
// ------------------------------------------------------------------

interface CommentData {
  id: number
  parent_id: number | null
  user_id: number | null
  user_name: string
  user_username: string
  content: string
  created_at: string
  is_deleted: number
}

interface CommentNode extends CommentData {
  replies: CommentNode[]
}

// Tope visual de sangría: más profundo se muestra al mismo nivel
// (sangría infinita destruye el layout en móvil)
const MAX_INDENT_DEPTH = 4

function buildCommentTree(flat: CommentData[]): CommentNode[] {
  const map = new Map<number, CommentNode>(flat.map((c) => [c.id, { ...c, replies: [] }]))
  const roots: CommentNode[] = []
  for (const node of map.values()) {
    const parent = node.parent_id != null ? map.get(node.parent_id) : undefined
    if (parent) parent.replies.push(node)
    else roots.push(node)
  }
  return roots
}

interface PendingAttachment {
  name: string
  url: string
  isImage: boolean
}

export function Feed({ currentUserId, userRole }: { currentUserId: number; userRole?: string }) {
  const [activeTab, setActiveTab] = useState<"following" | "explore">("following")
  const [isComposing, setIsComposing] = useState(false)
  const [newPostContent, setNewPostContent] = useState("")
  const [isAnnouncement, setIsAnnouncement] = useState(false)
  const [attachments, setAttachments] = useState<PendingAttachment[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isUploading, setIsUploading] = useState(false)

  // In a real app, 'explore' might hit a different endpoint or pass a flag.
  // For now, getFeed returns public posts from followed users + own posts.
  // We'll reuse it but might need a dedicated explore endpoint later.
  const { data: feedData, isLoading: feedLoading, mutate: mutateFeed } = useSWR<{ feed: any[] }>(
    `/api/feed?type=${activeTab}`,
    fetcher
  )
  const { data: announcementsData } = useSWR<{ announcements: any[] }>("/api/feed/announcements", fetcher)
  const posts = feedData?.feed || []
  const announcements = announcementsData?.announcements ?? []
  const isAdmin = userRole === "admin"

  const handleCreatePost = async () => {
    if (!newPostContent.trim() && attachments.length === 0) return
    setIsSubmitting(true)
    try {
      // El markdown de los adjuntos se agrega al publicar, no se muestra en el textarea
      const attachmentMarkdown = attachments
        .map((a) => (a.isImage ? `![${a.name}](${a.url})` : `[📄 ${a.name}](${a.url})`))
        .join("\n\n")
      const content = [newPostContent.trim(), attachmentMarkdown].filter(Boolean).join("\n\n")

      await fetch("/api/feed/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "custom",
          content,
          isPublic: true,
          isAnnouncement: isAdmin && isAnnouncement,
        })
      })
      setNewPostContent("")
      setAttachments([])
      setIsAnnouncement(false)
      setIsComposing(false)
      mutateFeed()
    } catch (e) {
      console.error("Error creating post:", e)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleLikeToggle = async (postId: number, isLiked: boolean) => {
    const method = isLiked ? "DELETE" : "POST"
    
    // Optimistic update
    mutateFeed({
      feed: posts.map(p => 
        p.id === postId 
          ? { ...p, is_liked: !isLiked, like_count: p.like_count + (isLiked ? -1 : 1) } 
          : p
      )
    }, false)

    try {
      await fetch(`/api/feed/posts/${postId}/like`, { method })
      mutateFeed()
    } catch (e) {
      console.error("Error toggling like:", e)
      mutateFeed() // Revert on error
    }
  }

  const handleDeletePost = async (postId: number) => {
    if (!confirm("¿Seguro que deseas eliminar esta publicación?")) return
    
    // Optimistic update
    mutateFeed({
      feed: posts.filter(p => p.id !== postId)
    }, false)

    try {
      const res = await fetch(`/api/feed/posts/${postId}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Failed to delete")
      mutateFeed()
    } catch (e) {
      console.error("Error deleting post:", e)
      alert("No se pudo eliminar la publicación")
      mutateFeed() // Revert on error
    }
  }

  return (
    <div className="flex flex-col h-full bg-card/10 relative">
      {/* Header */}
      <div className="sticky top-0 z-10 flex flex-col px-4 pt-4 pb-0 bg-card/80 backdrop-blur-md border-b border-border/80">
        <h2 className="text-xl font-bold text-foreground mb-4">Comunidad</h2>
        
        <div className="flex gap-6">
          <button
            onClick={() => setActiveTab("following")}
            className={cn(
              "pb-3 text-sm font-bold border-b-2 transition-colors",
              activeTab === "following" 
                ? "border-primary text-foreground" 
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            Para Ti
          </button>
          <button
            onClick={() => setActiveTab("explore")}
            className={cn(
              "pb-3 text-sm font-bold border-b-2 transition-colors",
              activeTab === "explore" 
                ? "border-primary text-foreground" 
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            Explorar
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-6 pb-24">
        <div className="max-w-2xl mx-auto space-y-4">
          
          {/* Compose Box (Always visible at top for quick posting) */}
          <div className="bg-card rounded-xl border border-border/50 p-4 shadow-sm mb-6 overflow-hidden">
            <div className="flex gap-3 min-w-0">
              <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <UserAvatarPlaceholder />
              </div>
              <div className="flex-1 min-w-0">
                {isComposing ? (
                  <div className="space-y-3 animate-fade-in">
                    <Textarea
                      autoFocus
                      value={newPostContent}
                      onChange={(e) => setNewPostContent(e.target.value)}
                      placeholder="¿Qué Dios te ha enseñado hoy?"
                      className="min-h-[100px] w-full resize-none border-border/50 focus-visible:ring-primary/30 break-words"
                    />

                    {/* Previews de adjuntos (en vez de markdown crudo en el textarea) */}
                    {attachments.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {attachments.map((att, i) => (
                          <div
                            key={`${att.url}-${i}`}
                            className="relative group rounded-lg border border-border/50 overflow-hidden bg-muted/20"
                          >
                            {att.isImage ? (
                              <img
                                src={att.url}
                                alt={att.name}
                                className="size-20 object-cover"
                              />
                            ) : (
                              <div className="flex items-center gap-2 px-3 py-2 max-w-44">
                                <Paperclip className="size-4 text-primary shrink-0" />
                                <span className="text-xs text-foreground truncate">{att.name}</span>
                              </div>
                            )}
                            <button
                              onClick={() => setAttachments(prev => prev.filter((_, idx) => idx !== i))}
                              className="absolute top-1 right-1 size-5 flex items-center justify-center rounded-full bg-background/90 text-muted-foreground hover:text-rose-500 border border-border/50 shadow-sm transition-colors"
                              title="Quitar adjunto"
                            >
                              <X className="size-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    <input
                      type="file"
                      accept="image/*,.pdf,.doc,.docx,.txt"
                      className="hidden"
                      id="feed-attachment-upload"
                      onChange={async (e) => {
                        const file = e.target.files?.[0]
                        if (!file) return
                        setIsUploading(true)
                        try {
                          const formData = new FormData()
                          formData.append("file", file)
                          const res = await fetch("/api/upload", {
                            method: "POST",
                            body: formData
                          })
                          if (!res.ok) throw new Error("Error al subir archivo")
                          const data = await res.json()

                          setAttachments(prev => [...prev, {
                            name: file.name,
                            url: data.url,
                            isImage: file.type.startsWith("image/")
                          }])
                        } catch (err) {
                          console.error(err)
                          alert("Hubo un problema al adjuntar el archivo")
                        } finally {
                          setIsUploading(false)
                          e.target.value = ""
                        }
                      }}
                    />

                    {/* Acciones: iconos compactos a la izquierda, publicar a la derecha */}
                    {isAdmin && (
                      <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isAnnouncement}
                          onChange={(e) => setIsAnnouncement(e.target.checked)}
                          className="rounded border-border"
                        />
                        Marcar como anuncio oficial
                      </label>
                    )}
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => document.getElementById("feed-attachment-upload")?.click()}
                        disabled={isUploading}
                        className="shrink-0 gap-1.5"
                      >
                        {isUploading ? <Loader2 className="size-4 animate-spin" /> : <ImageIcon className="size-4" />}
                        <span className="hidden sm:inline">Adjuntar</span>
                      </Button>
                      <div className="flex-1" />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setIsComposing(false)
                          setNewPostContent("")
                          setAttachments([])
                          setIsAnnouncement(false)
                        }}
                        className="shrink-0"
                      >
                        Cancelar
                      </Button>
                      <Button
                        size="sm"
                        onClick={handleCreatePost}
                        disabled={(!newPostContent.trim() && attachments.length === 0) || isSubmitting || isUploading}
                        className="shrink-0 bg-primary hover:bg-primary/90 gap-1.5"
                      >
                        {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                        Publicar
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div 
                    onClick={() => setIsComposing(true)}
                    className="w-full bg-muted/40 hover:bg-muted/60 text-muted-foreground px-4 py-2.5 rounded-full text-sm cursor-text transition-colors border border-border/30"
                  >
                    Comparte una reflexión, versículo o nota...
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Anuncios destacados */}
          {announcements.length > 0 && activeTab === "following" && (
            <div className="mb-6 space-y-2">
              <h3 className="text-sm font-bold text-foreground">Anuncios oficiales</h3>
              <div className="flex gap-3 overflow-x-auto pb-1">
                {announcements.slice(0, 4).map((a: any) => (
                  <div
                    key={a.id}
                    className="min-w-[220px] shrink-0 rounded-xl border border-amber-500/30 bg-amber-500/5 p-3"
                  >
                    <p className="text-[10px] font-bold text-amber-700 dark:text-amber-400 uppercase">
                      {a.user_name}
                    </p>
                    <p className="text-sm mt-1 line-clamp-3">{a.content}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Posts List */}
          {feedLoading ? (
            <div className="flex justify-center p-12">
              <Loader2 className="size-8 animate-spin text-primary" />
            </div>
          ) : posts.length === 0 ? (
            <div className="text-center py-16 bg-card/30 rounded-xl border border-border/30 border-dashed">
              <Users className="size-12 mx-auto text-muted-foreground/50 mb-3" />
              <h3 className="font-bold text-foreground mb-1">Tu feed está vacío</h3>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                Sigue a otros usuarios en la pestaña Explorar o en su Perfil para ver sus publicaciones aquí.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {posts.map((post: any) => (
                <FeedPostCard 
                  key={post.id} 
                  post={post} 
                  currentUserId={currentUserId}
                  onLikeToggle={handleLikeToggle} 
                  onDelete={handleDeletePost}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Floating Action Button (Mobile only) */}
      {!isComposing && (
        <button
          onClick={() => {
            window.scrollTo({ top: 0, behavior: 'smooth' })
            setIsComposing(true)
          }}
          className="md:hidden fixed bottom-20 right-4 size-14 bg-primary text-primary-foreground rounded-full shadow-lg shadow-primary/30 flex items-center justify-center hover:scale-105 active:scale-95 transition-all z-20"
        >
          <MessageSquarePlus className="size-6" />
        </button>
      )}
    </div>
  )
}

function CommentThread({
  node,
  depth,
  currentUserId,
  onReply,
  onDelete,
}: {
  node: CommentNode
  depth: number
  currentUserId: number
  onReply: (id: number, name: string) => void
  onDelete: (id: number) => void
}) {
  const [collapsed, setCollapsed] = useState(false)
  const isDeleted = !!node.is_deleted
  const hasReplies = node.replies.length > 0
  const indent = depth > 0 && depth <= MAX_INDENT_DEPTH

  return (
    <div className={cn(indent && "ml-4 pl-3 border-l border-border/40")}>
      <div className="flex gap-2">
        <div className="size-6 rounded-full bg-primary/20 flex items-center justify-center font-bold text-primary text-[10px] shrink-0 mt-0.5">
          {isDeleted ? "×" : node.user_name.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <div
            className={cn(
              "rounded-2xl rounded-tl-none px-3 py-2 text-sm border border-border/20 inline-block max-w-full",
              isDeleted ? "bg-muted/10" : "bg-muted/30"
            )}
          >
            {isDeleted ? (
              <p className="text-muted-foreground/60 italic text-xs">[comentario eliminado]</p>
            ) : (
              <>
                <div className="font-bold text-xs text-foreground mb-0.5">
                  {node.user_name}
                  {depth > MAX_INDENT_DEPTH && node.parent_id != null && (
                    <span className="font-normal text-muted-foreground ml-1.5">↳ respuesta</span>
                  )}
                </div>
                <p className="text-foreground/90 whitespace-pre-wrap break-words">{node.content}</p>
              </>
            )}
          </div>

          {/* Acciones del comentario */}
          <div className="flex items-center gap-3 mt-0.5 ml-1">
            {!isDeleted && (
              <button
                onClick={() => onReply(node.id, node.user_name)}
                className="flex items-center gap-1 text-[10px] font-semibold text-muted-foreground hover:text-primary transition-colors"
              >
                <Reply className="size-3" />
                Responder
              </button>
            )}
            {!isDeleted && node.user_id === currentUserId && (
              <button
                onClick={() => onDelete(node.id)}
                className="text-[10px] font-semibold text-muted-foreground hover:text-rose-500 transition-colors"
              >
                Eliminar
              </button>
            )}
            {hasReplies && (
              <button
                onClick={() => setCollapsed(!collapsed)}
                className="flex items-center gap-0.5 text-[10px] font-semibold text-muted-foreground hover:text-foreground transition-colors"
              >
                {collapsed ? <ChevronRight className="size-3" /> : <ChevronDown className="size-3" />}
                {node.replies.length} {node.replies.length === 1 ? "respuesta" : "respuestas"}
              </button>
            )}
            <span className="text-[10px] text-muted-foreground/60">
              {new Date(node.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
            </span>
          </div>

          {/* Respuestas anidadas */}
          {hasReplies && !collapsed && (
            <div className="mt-2 space-y-2">
              {node.replies.map((reply) => (
                <CommentThread
                  key={reply.id}
                  node={reply}
                  depth={depth + 1}
                  currentUserId={currentUserId}
                  onReply={onReply}
                  onDelete={onDelete}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function UserAvatarPlaceholder() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  )
}

function FeedPostCard({ 
  post, 
  currentUserId,
  onLikeToggle, 
  onDelete 
}: { 
  post: any, 
  currentUserId: number,
  onLikeToggle: (id: number, isLiked: boolean) => void,
  onDelete: (id: number) => void
}) {
  const [showComments, setShowComments] = useState(false)
  const [newComment, setNewComment] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [replyTo, setReplyTo] = useState<{ id: number; name: string } | null>(null)

  const { data: commentsData, mutate: mutateComments, isLoading: commentsLoading } = useSWR<{ comments: CommentData[] }>(
    showComments ? `/api/feed/posts/${post.id}/comments` : null,
    fetcher
  )

  const commentTree = React.useMemo(
    () => buildCommentTree(commentsData?.comments || []),
    [commentsData]
  )
  const hasComments = (commentsData?.comments?.length ?? 0) > 0

  const handleCommentSubmit = async () => {
    if (!newComment.trim() || isSubmitting) return
    setIsSubmitting(true)
    try {
      await fetch(`/api/feed/posts/${post.id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: newComment.trim(),
          parentId: replyTo?.id ?? null
        })
      })
      setNewComment("")
      setReplyTo(null)
      mutateComments()
    } catch (e) {
      console.error(e)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteComment = async (commentId: number) => {
    if (!confirm("¿Eliminar este comentario? Las respuestas se conservarán.")) return
    try {
      const res = await fetch(`/api/feed/comments/${commentId}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Failed")
      mutateComments()
    } catch (e) {
      console.error(e)
      alert("No se pudo eliminar el comentario")
    }
  }

  const handleShare = async () => {
    const shareUrl = `${window.location.origin}/?tab=feed`
    const shareText = `Mira esta publicación de @${post.user_username} en la BibliaApp:\n\n"${post.content.substring(0, 100)}..."`
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Publicación en BibliaApp',
          text: shareText,
          url: shareUrl
        })
      } catch (err) {
        console.error("Error sharing", err)
      }
    } else {
      try {
        await navigator.clipboard.writeText(`${shareText}\n${shareUrl}`)
        alert("¡Enlace copiado al portapapeles!")
      } catch (err) {
        console.error("Error copying", err)
      }
    }
  }

  return (
    <div className={cn(
      "bg-card p-4 md:p-5 rounded-xl border shadow-sm hover:shadow-md transition-shadow animate-fade-in",
      post.is_announcement ? "border-amber-500/40 bg-amber-500/5" : "border-border/50",
    )}>
      {post.is_announcement && (
        <p className="text-[10px] font-bold uppercase text-amber-700 dark:text-amber-400 tracking-wider mb-2">
          📢 Anuncio oficial
        </p>
      )}
      {/* Post Header */}
      <div className="flex items-center gap-3 mb-3">
        <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary text-sm shrink-0 cursor-pointer hover:opacity-80">
          {post.user_name.charAt(0).toUpperCase()}
        </div>
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-sm text-foreground truncate cursor-pointer hover:underline">{post.user_name}</span>
            <span className="text-xs text-muted-foreground truncate">@{post.user_username}</span>
          </div>
          <span className="text-[10px] text-muted-foreground">
            {new Date(post.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute:'2-digit' })}
          </span>
        </div>
        <div className="ml-auto pl-2 flex items-center gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-wider bg-muted px-2 py-0.5 rounded text-muted-foreground">
            {post.type === 'verse' ? '📖 Versículo' : post.type === 'devotional' ? '🌅 Devocional' : post.type === 'note' ? '📝 Nota' : 'Publicación'}
          </span>
          {post.user_id === currentUserId && (
            <button
              onClick={() => onDelete(post.id)}
              className="text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 p-1 rounded-md transition-colors"
              title="Eliminar publicación"
            >
              <Trash2 className="size-4" />
            </button>
          )}
        </div>
      </div>

      {/* Post Content */}
      {post.verse_ref && (
        <div className="mb-3 pl-3.5 border-l-2 border-primary/40 text-sm bg-primary/5 py-2 pr-3 rounded-r-lg">
          <strong className="text-primary block mb-0.5">{post.verse_ref}</strong>
          {post.verse_text && <p className="text-foreground italic">{post.verse_text}</p>}
        </div>
      )}
      
      <div className="text-foreground whitespace-pre-wrap text-[15px] leading-relaxed break-words space-y-3">
        {post.content.split('\n\n').map((paragraph: string, i: number) => {
          // Check for image markdown ![alt](url)
          const imgMatch = paragraph.match(/^!\[(.*?)\]\((.*?)\)$/)
          if (imgMatch) {
            return (
              <img 
                key={i} 
                src={imgMatch[2]} 
                alt={imgMatch[1]} 
                className="max-w-full rounded-lg border border-border/50 max-h-96 object-cover" 
              />
            )
          }
          // Check for simple link [alt](url)
          const linkMatch = paragraph.match(/^\[(.*?)\]\((.*?)\)$/)
          if (linkMatch) {
            return (
              <a 
                key={i} 
                href={linkMatch[2]} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-primary hover:underline flex items-center gap-1.5 p-3 border border-border/50 rounded-lg bg-muted/20"
              >
                <Paperclip className="size-4" />
                <span className="font-medium truncate">{linkMatch[1]}</span>
              </a>
            )
          }
          // Default text
          return <p key={i}>{paragraph}</p>
        })}
      </div>

      {/* Post Actions */}
      <div className="flex flex-wrap items-center gap-4 sm:gap-6 mt-4 pt-3 border-t border-border/30">
        <button 
          onClick={() => onLikeToggle(post.id, post.is_liked)}
          className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-rose-500 transition-colors group"
        >
          <div className={cn("p-1.5 rounded-full group-hover:bg-rose-500/10 transition-colors", post.is_liked && "bg-rose-500/10")}>
            <Heart className={cn("size-4", post.is_liked && "fill-rose-500 text-rose-500")} />
          </div>
          <span className={cn(post.is_liked && "text-rose-500")}>{post.like_count > 0 ? post.like_count : "Me gusta"}</span>
        </button>
        
        <button 
          onClick={() => setShowComments(!showComments)}
          className={cn("flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-primary transition-colors group", showComments && "text-primary")}
        >
          <div className={cn("p-1.5 rounded-full group-hover:bg-primary/10 transition-colors", showComments && "bg-primary/10")}>
            <MessageSquare className={cn("size-4", showComments && "fill-primary/20")} />
          </div>
          <span>{post.comment_count > 0 ? post.comment_count : "Comentar"}</span>
        </button>
        
        <button 
          onClick={handleShare}
          className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-green-500 transition-colors group ml-auto sm:ml-0"
        >
          <div className="p-1.5 rounded-full group-hover:bg-green-500/10 transition-colors">
            <Share2 className="size-4" />
          </div>
          <span>Compartir</span>
        </button>
      </div>

      {/* Comments Section */}
      {showComments && (
        <div className="mt-4 pt-4 border-t border-border/30 animate-fade-in space-y-4">
          {/* Comments Thread (anidado) */}
          {commentsLoading ? (
            <div className="flex justify-center p-4">
              <Loader2 className="size-5 animate-spin text-primary" />
            </div>
          ) : hasComments ? (
            <div className="space-y-3">
              {commentTree.map((node) => (
                <CommentThread
                  key={node.id}
                  node={node}
                  depth={0}
                  currentUserId={currentUserId}
                  onReply={(id, name) => setReplyTo({ id, name })}
                  onDelete={handleDeleteComment}
                />
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground text-center py-2">No hay comentarios aún. ¡Sé el primero!</p>
          )}

          {/* New Comment Input */}
          <div className="flex flex-col gap-2">
            {replyTo && (
              <div className="flex items-center justify-between ml-9 px-3 py-1.5 bg-primary/5 border border-primary/20 rounded-lg text-xs">
                <span className="text-muted-foreground">
                  Respondiendo a <strong className="text-primary">{replyTo.name}</strong>
                </span>
                <button
                  onClick={() => setReplyTo(null)}
                  className="font-semibold text-muted-foreground hover:text-foreground"
                >
                  Cancelar
                </button>
              </div>
            )}
            <div className="flex gap-2 items-center">
              <div className="size-7 rounded-full bg-primary/10 shrink-0 flex items-center justify-center">
                <UserAvatarPlaceholder />
              </div>
              <div className="flex-1 relative">
                <input
                  type="text"
                  placeholder={replyTo ? `Responde a ${replyTo.name}...` : "Escribe un comentario..."}
                  className="w-full bg-muted/40 border border-border/50 rounded-full pl-4 pr-10 py-1.5 text-sm focus:outline-none focus:border-primary/50"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleCommentSubmit()
                  }}
                />
                <button 
                  onClick={handleCommentSubmit}
                  disabled={!newComment.trim() || isSubmitting}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1 text-primary hover:bg-primary/10 rounded-full disabled:opacity-50 transition-colors"
                >
                  {isSubmitting ? <Loader2 className="size-3.5 animate-spin" /> : <Send className="size-3.5" />}
                </button>
              </div>
            </div>
            
            {/* Quick Emojis */}
            <div className="flex gap-1.5 ml-9">
              {['👍', '❤️', '🙏', '🙌', '😊', '🔥', '👏', '🕊️'].map(emoji => (
                <button
                  key={emoji}
                  onClick={() => setNewComment(prev => prev + emoji)}
                  className="text-sm hover:bg-muted p-1 rounded transition-colors"
                  type="button"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
