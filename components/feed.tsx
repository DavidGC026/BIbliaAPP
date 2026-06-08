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
  BookOpen
} from "lucide-react"

export function Feed() {
  const [activeTab, setActiveTab] = useState<"following" | "explore">("following")
  const [isComposing, setIsComposing] = useState(false)
  const [newPostContent, setNewPostContent] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  // In a real app, 'explore' might hit a different endpoint or pass a flag.
  // For now, getFeed returns public posts from followed users + own posts.
  // We'll reuse it but might need a dedicated explore endpoint later.
  const { data: feedData, isLoading: feedLoading, mutate: mutateFeed } = useSWR<{ feed: any[] }>(
    `/api/feed?type=${activeTab}`,
    fetcher
  )
  const posts = feedData?.feed || []

  const handleCreatePost = async () => {
    if (!newPostContent.trim()) return
    setIsSubmitting(true)
    try {
      await fetch("/api/feed/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "custom",
          content: newPostContent.trim(),
          isPublic: true
        })
      })
      setNewPostContent("")
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

      {/* Feed Area */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 pb-24">
        <div className="max-w-2xl mx-auto space-y-4">
          
          {/* Compose Box (Always visible at top for quick posting) */}
          <div className="bg-card rounded-xl border border-border/50 p-4 shadow-sm mb-6">
            <div className="flex gap-3">
              <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <UserAvatarPlaceholder />
              </div>
              <div className="flex-1">
                {isComposing ? (
                  <div className="space-y-3 animate-fade-in">
                    <Textarea
                      autoFocus
                      value={newPostContent}
                      onChange={(e) => setNewPostContent(e.target.value)}
                      placeholder="¿Qué Dios te ha enseñado hoy?"
                      className="min-h-[100px] resize-none border-border/50 focus-visible:ring-primary/30"
                    />
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="sm" onClick={() => setIsComposing(false)}>
                        Cancelar
                      </Button>
                      <Button size="sm" onClick={handleCreatePost} disabled={!newPostContent.trim() || isSubmitting}>
                        {isSubmitting ? <Loader2 className="size-4 animate-spin mr-2" /> : <MessageSquarePlus className="size-4 mr-2" />}
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
                <div key={post.id} className="bg-card p-4 md:p-5 rounded-xl border border-border/50 shadow-sm hover:shadow-md transition-shadow animate-fade-in">
                  
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
                    <div className="ml-auto pl-2">
                      <span className="text-[10px] font-semibold uppercase tracking-wider bg-muted px-2 py-0.5 rounded text-muted-foreground">
                        {post.type === 'verse' ? '📖 Versículo' : post.type === 'devotional' ? '🌅 Devocional' : post.type === 'note' ? '📝 Nota' : 'Publicación'}
                      </span>
                    </div>
                  </div>

                  {/* Post Content */}
                  {post.verse_ref && (
                    <div className="mb-3 pl-3.5 border-l-2 border-primary/40 text-sm bg-primary/5 py-2 pr-3 rounded-r-lg">
                      <strong className="text-primary block mb-0.5">{post.verse_ref}</strong>
                      {post.verse_text && <p className="text-foreground italic">{post.verse_text}</p>}
                    </div>
                  )}
                  
                  <p className="text-foreground whitespace-pre-wrap text-[15px] leading-relaxed">
                    {post.content}
                  </p>

                  {/* Post Actions */}
                  <div className="flex items-center gap-6 mt-4 pt-3 border-t border-border/30">
                    <button 
                      onClick={() => handleLikeToggle(post.id, post.is_liked)}
                      className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-rose-500 transition-colors group"
                    >
                      <div className={cn("p-1.5 rounded-full group-hover:bg-rose-500/10 transition-colors", post.is_liked && "bg-rose-500/10")}>
                        <Heart className={cn("size-4", post.is_liked && "fill-rose-500 text-rose-500")} />
                      </div>
                      <span className={cn(post.is_liked && "text-rose-500")}>{post.like_count > 0 ? post.like_count : "Me gusta"}</span>
                    </button>
                    
                    <button className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-primary transition-colors group">
                      <div className="p-1.5 rounded-full group-hover:bg-primary/10 transition-colors">
                        <MessageSquare className="size-4" />
                      </div>
                      <span>Comentar</span>
                    </button>
                  </div>
                </div>
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

function UserAvatarPlaceholder() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  )
}
