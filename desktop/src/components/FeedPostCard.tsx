import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { FeedContent } from "@/components/FeedContent";
import { Icon } from "@/components/ui/Icon";
import * as api from "@/lib/api";
import type { FeedComment, FeedPost } from "@/lib/types";

type Props = {
  post: FeedPost;
  onUpdate: (post: FeedPost) => void;
};

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("es", {
      day: "numeric",
      month: "short",
    });
  } catch {
    return iso;
  }
}

export function FeedPostCard({ post, onUpdate }: Props) {
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<FeedComment[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [busy, setBusy] = useState(false);

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
    <Card className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-foreground">{post.user_name}</p>
          {post.user_username ? (
            <p className="text-xs text-muted-foreground">@{post.user_username}</p>
          ) : null}
        </div>
        <time className="text-xs text-muted-foreground">
          {formatDate(post.created_at)}
        </time>
      </div>

      {post.verse_ref ? (
        <blockquote className="border-l-2 border-primary/40 pl-3 text-sm italic text-muted-foreground">
          {post.verse_text ?? post.verse_ref}
        </blockquote>
      ) : null}

      <FeedContent content={post.content} />

      <div className="flex flex-wrap gap-4 text-sm">
        <button
          type="button"
          disabled={busy}
          onClick={toggleLike}
          className={`inline-flex items-center gap-1.5 ${liked ? "font-semibold text-primary" : "text-muted-foreground hover:text-foreground"}`}
        >
          <Icon name="heart" size={16} fill={liked ? "currentColor" : "none"} />
          {post.like_count}
        </button>
        <button
          type="button"
          onClick={toggleComments}
          className={`inline-flex items-center gap-1.5 ${showComments ? "font-semibold text-primary" : "text-muted-foreground hover:text-foreground"}`}
        >
          <Icon name="community" size={16} />
          {post.comment_count}
        </button>
      </div>

      {showComments ? (
        <div className="space-y-3 border-t border-border pt-3">
          {loadingComments ? (
            <p className="text-sm text-muted-foreground">Cargando comentarios…</p>
          ) : (
            comments.map((c) => (
              <div key={c.id}>
                <p className="text-sm font-semibold text-foreground">{c.user_name}</p>
                <p className="text-sm text-foreground">{c.content}</p>
              </div>
            ))
          )}
          <div className="flex gap-2">
            <input
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Escribe un comentario…"
              className="min-w-0 flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  submitComment();
                }
              }}
            />
            <Button
              onClick={submitComment}
              loading={busy}
              disabled={!commentText.trim()}
            >
              Enviar
            </Button>
          </div>
        </div>
      ) : null}
    </Card>
  );
}
