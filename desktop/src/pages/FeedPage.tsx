import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { FeedPostCard } from "@/components/FeedPostCard";
import * as api from "@/lib/api";
import type { FeedPost } from "@/lib/types";
import { EmptyState } from "@/components/ui/EmptyState";

export function FeedPage() {
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [feedType, setFeedType] = useState<"following" | "explore">(
    "following",
  );
  const [newPost, setNewPost] = useState("");
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  return (
    <div className="desktop-page space-y-6 p-6">
      <header className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-foreground">Comunidad</h1>
        <div className="flex rounded-lg border border-border p-1">
          {(["following", "explore"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setFeedType(t)}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold ${
                feedType === t
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground"
              }`}
            >
              {t === "following" ? "Siguiendo" : "Explorar"}
            </button>
          ))}
        </div>
      </header>

      <Card className="space-y-3">
        <textarea
          value={newPost}
          onChange={(e) => setNewPost(e.target.value)}
          placeholder="Comparte algo con la comunidad…"
          rows={3}
          className="w-full resize-none rounded-lg border border-input bg-background px-3 py-2 text-foreground outline-none focus:ring-2 focus:ring-ring"
        />
        <Button
          onClick={publish}
          loading={publishing}
          disabled={!newPost.trim()}
        >
          Publicar
        </Button>
      </Card>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      {loading ? (
        <p className="text-muted-foreground">Cargando publicaciones…</p>
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
            <FeedPostCard key={post.id} post={post} onUpdate={updatePost} />
          ))}
        </div>
      )}
    </div>
  );
}
