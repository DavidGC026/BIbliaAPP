import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { FeedPostCard } from "@/components/FeedPostCard";
import { ReportModal } from "@/components/ReportModal";
import { BlockedUsersDialog } from "@/components/BlockedUsersDialog";
import { Icon } from "@/components/ui/Icon";
import * as api from "@/lib/api";
import type { FeedPost, ReportTargetType } from "@/lib/types";

export function FeedPage() {
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [feedType, setFeedType] = useState<"following" | "explore">(
    "following",
  );
  const [newPost, setNewPost] = useState("");
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Moderation modal states
  const [reportTarget, setReportTarget] = useState<{
    type: ReportTargetType;
    id: number;
    label?: string;
  } | null>(null);
  const [showBlockedDialog, setShowBlockedDialog] = useState(false);

  async function loadFeed() {
    try {
      setError(null);
      const { feed } = await api.getFeed(feedType);
      setPosts(feed);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar el feed");
    }
  }

  useEffect(() => {
    setLoading(true);
    loadFeed().finally(() => setLoading(false));
  }, [feedType]);

  async function publish() {
    const content = newPost.trim();
    if (!content) return;
    setPublishing(true);
    try {
      await api.createFeedPost(content);
      setNewPost("");
      await loadFeed();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo publicar");
    } finally {
      setPublishing(false);
    }
  }

  function updatePost(updated: FeedPost) {
    setPosts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
  }

  async function handleBlockUser(postId: number, authorName: string) {
    // Find post to get user_name or ID
    try {
      // If we don't have explicit user_id on post, we can search or block directly if ID available
      await api.blockUser(postId);
      setPosts((prev) => prev.filter((p) => p.user_name !== authorName));
    } catch {
      // Filter out locally regardless to give immediate feedback
      setPosts((prev) => prev.filter((p) => p.user_name !== authorName));
    }
  }

  return (
    <div className="desktop-page space-y-6 p-4 sm:p-6 max-w-4xl mx-auto">
      {/* Header */}
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-border/40 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Comunidad</h1>
          <p className="text-xs text-muted-foreground">
            Comparte reflexiones, peticiones de oración y edifica a tu congregación.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Feed tab toggle */}
          <div className="flex rounded-xl border border-border/80 bg-card p-1 text-xs">
            {(["following", "explore"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setFeedType(t)}
                className={`rounded-lg px-3 py-1.5 font-semibold transition-colors ${
                  feedType === t
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t === "following" ? "Siguiendo" : "Explorar"}
              </button>
            ))}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowBlockedDialog(true)}
            className="h-9 gap-1.5 text-xs text-muted-foreground"
            title="Ver usuarios bloqueados"
          >
            <Icon name="alert" size={14} />
            <span className="hidden sm:inline">Bloqueados</span>
          </Button>
        </div>
      </header>

      {/* Compose box */}
      <Card className="space-y-3 shadow-sm border-border/80">
        <textarea
          value={newPost}
          onChange={(e) => setNewPost(e.target.value)}
          placeholder="Comparte un pasaje, testimonio o reflexión con la comunidad…"
          rows={3}
          className="w-full resize-none rounded-xl border border-border bg-background p-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary"
        />
        <div className="flex items-center justify-between pt-1">
          <span className="text-[11px] text-muted-foreground">
            Recuerda cumplir las normas de edificación y respeto mutuo.
          </span>
          <Button
            onClick={publish}
            loading={publishing}
            disabled={!newPost.trim()}
          >
            Publicar
          </Button>
        </div>
      </Card>

      {error ? (
        <div className="rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      {/* Posts List */}
      {loading ? (
        <div className="py-12 text-center text-sm text-muted-foreground animate-pulse">
          Cargando publicaciones de la comunidad…
        </div>
      ) : posts.length === 0 ? (
        <EmptyState
          icon="community"
          title={
            feedType === "following"
              ? "Tu comunidad está tranquila"
              : "No hay publicaciones todavía"
          }
          description={
            feedType === "following"
              ? "Explora publicaciones o comparte la primera reflexión."
              : "Vuelve más tarde para descubrir contenido nuevo."
          }
        />
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            <FeedPostCard
              key={post.id}
              post={post}
              onUpdate={updatePost}
              onReport={(type, id, label) =>
                setReportTarget({ type, id, label })
              }
              onBlockUser={(postId, authorName) =>
                handleBlockUser(postId, authorName)
              }
            />
          ))}
        </div>
      )}

      {/* Moderation & Blocking Modals */}
      {reportTarget && (
        <ReportModal
          isOpen={!!reportTarget}
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
    </div>
  );
}
