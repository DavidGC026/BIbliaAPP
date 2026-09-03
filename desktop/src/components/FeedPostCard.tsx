import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { FeedContent } from "@/components/FeedContent";
import { Icon } from "@/components/ui/Icon";
import * as api from "@/lib/api";
import type { FeedComment, FeedPost, ReportTargetType } from "@/lib/types";

type Props = {
  post: FeedPost;
  onUpdate: (post: FeedPost) => void;
  onReport?: (type: ReportTargetType, id: number, label?: string) => void;
  onBlockUser?: (userId: number, name: string) => void;
};

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("es", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export function FeedPostCard({
  post,
  onUpdate,
  onReport,
  onBlockUser,
}: Props) {
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<FeedComment[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [busy, setBusy] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const liked = !!post.is_liked;

  async function toggleLike() {
    setBusy(true);
    try {
      if (liked) {
        await api.unlikeFeedPost(post.id);
        onUpdate({
          ...post,
          is_liked: false,
          like_count: Math.max(0, post.like_count - 1),
        });
      } else {
        await api.likeFeedPost(post.id);
        onUpdate({
          ...post,
          is_liked: true,
          like_count: post.like_count + 1,
        });
      }
    } finally {
      setBusy(false);
    }
  }

  async function loadComments() {
    setLoadingComments(true);
    try {
      const { comments: list } = await api.getFeedComments(post.id);
      setComments(list.filter((c) => !c.is_deleted));
    } finally {
      setLoadingComments(false);
    }
  }

  async function toggleComments() {
    const next = !showComments;
    setShowComments(next);
    if (next && comments.length === 0) await loadComments();
  }

  async function submitComment() {
    const text = commentText.trim();
    if (!text) return;
    setBusy(true);
    try {
      await api.addFeedComment(post.id, text);
      setCommentText("");
      await loadComments();
      onUpdate({ ...post, comment_count: post.comment_count + 1 });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="space-y-3 relative group">
      {/* Post author & header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-full bg-primary/10 font-bold text-sm text-primary shrink-0">
            {post.user_name ? post.user_name.charAt(0).toUpperCase() : "U"}
          </div>
          <div>
            <p className="font-semibold text-sm text-foreground">
              {post.user_name}
            </p>
            {post.user_username ? (
              <p className="text-xs text-muted-foreground">
                @{post.user_username}
              </p>
            ) : null}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <time className="text-xs text-muted-foreground">
            {formatDate(post.created_at)}
          </time>

          {/* Context menu for UGC actions */}
          {(onReport || onBlockUser) && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowMenu((v) => !v)}
                className="rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                title="Opciones de publicación"
              >
                <span className="text-sm font-bold leading-none">•••</span>
              </button>

              {showMenu && (
                <>
                  <div
                    className="fixed inset-0 z-20"
                    onClick={() => setShowMenu(false)}
                  />
                  <div className="absolute right-0 top-full mt-1 z-30 w-44 rounded-xl border border-border bg-card p-1 shadow-lg text-xs">
                    {onReport && (
                      <button
                        type="button"
                        onClick={() => {
                          setShowMenu(false);
                          onReport("post", post.id, `Publicación de ${post.user_name}`);
                        }}
                        className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                      >
                        <Icon name="alert" size={14} />
                        <span>Reportar publicación</span>
                      </button>
                    )}
                    {onBlockUser && (
                      <button
                        type="button"
                        onClick={() => {
                          setShowMenu(false);
                          if (
                            confirm(
                              `¿Deseas bloquear a ${post.user_name}? Ya no verás sus publicaciones.`,
                            )
                          ) {
                            // Using user_username or post user id
                            onBlockUser(post.id, post.user_name);
                          }
                        }}
                        className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                      >
                        <Icon name="close" size={14} />
                        <span>Bloquear usuario</span>
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {post.verse_ref ? (
        <blockquote className="border-l-2 border-primary/40 pl-3 text-sm italic text-muted-foreground">
          {post.verse_text ?? post.verse_ref}
        </blockquote>
      ) : null}

      <FeedContent content={post.content} />

      <div className="flex flex-wrap gap-4 text-sm pt-1 border-t border-border/40">
        <button
          type="button"
          disabled={busy}
          onClick={toggleLike}
          className={`inline-flex items-center gap-1.5 transition-colors ${
            liked
              ? "font-semibold text-rose-500"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Icon
            name="heart"
            size={16}
            fill={liked ? "currentColor" : "none"}
          />
          {post.like_count}
        </button>

        <button
          type="button"
          onClick={toggleComments}
          className={`inline-flex items-center gap-1.5 transition-colors ${
            showComments
              ? "font-semibold text-primary"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Icon name="community" size={16} />
          {post.comment_count}
        </button>
      </div>

      {showComments && (
        <div className="space-y-3 border-t border-border pt-3 animate-fade-in">
          {loadingComments ? (
            <p className="text-sm text-muted-foreground">
              Cargando comentarios…
            </p>
          ) : comments.length === 0 ? (
            <p className="text-xs text-muted-foreground italic">
              No hay comentarios aún. ¡Sé el primero en comentar!
            </p>
          ) : (
            <div className="space-y-2.5">
              {comments.map((c) => (
                <div
                  key={c.id}
                  className="group/comment flex items-start justify-between gap-2 rounded-xl bg-background/60 p-2.5 border border-border/40"
                >
                  <div className="space-y-0.5 min-w-0">
                    <p className="text-xs font-semibold text-foreground">
                      {c.user_name}
                      {c.user_username ? (
                        <span className="ml-1 text-muted-foreground font-normal">
                          @{c.user_username}
                        </span>
                      ) : null}
                    </p>
                    <p className="text-xs text-foreground/90">{c.content}</p>
                  </div>

                  {onReport && (
                    <button
                      type="button"
                      onClick={() =>
                        onReport(
                          "comment",
                          c.id,
                          `Comentario de ${c.user_name}`,
                        )
                      }
                      className="opacity-0 group-hover/comment:opacity-100 p-1 text-muted-foreground hover:text-destructive transition-opacity"
                      title="Reportar comentario"
                    >
                      <Icon name="alert" size={13} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <input
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Escribe un comentario…"
              className="min-w-0 flex-1 rounded-xl border border-input bg-background px-3 py-2 text-xs sm:text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  submitComment();
                }
              }}
            />
            <Button
              size="sm"
              onClick={submitComment}
              loading={busy}
              disabled={!commentText.trim()}
            >
              Enviar
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
