import { memo, useMemo, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import {
  parseMarkdownBlocks,
  type InlineToken,
  type MarkdownBlock,
} from "@/lib/commentaryMarkdown";
import type { VerseCommentaryEntry } from "@/lib/types";

export interface VerseCommentaryProps {
  commentaries: VerseCommentaryEntry[];
  fontSize: number;
  mutedColor?: string;
  accentColor?: string;
  borderColor?: string;
}

export const VerseCommentary = memo(function VerseCommentary({
  commentaries,
  fontSize,
  mutedColor,
  accentColor,
  borderColor,
}: VerseCommentaryProps) {
  const [expanded, setExpanded] = useState(false);
  const [activeAuthor, setActiveAuthor] = useState<string | null>(null);

  const authors = useMemo(
    () => [...new Set(commentaries.map((entry) => entry.author))],
    [commentaries],
  );

  const author =
    activeAuthor && authors.includes(activeAuthor)
      ? activeAuthor
      : authors[0];
  const visible = commentaries.filter((entry) => entry.author === author);

  if (commentaries.length === 0) return null;

  return (
    <div
      className="mt-1 border-t border-dashed border-border/70 pt-1.5"
      style={borderColor ? { borderColor } : undefined}
    >
      <button
        type="button"
        onClick={() => setExpanded((open) => !open)}
        aria-expanded={expanded}
        className="inline-flex items-center gap-1.5 rounded-md px-1 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        style={mutedColor ? { color: mutedColor } : undefined}
      >
        <span style={accentColor ? { color: accentColor } : undefined}>
          <Icon name="notes" size={14} />
        </span>
        <span>
          {authors.length === 1
            ? `Comentario · ${authors[0]}`
            : `Comentarios · ${authors.length} autores`}
        </span>
        <span
          className={`transition-transform duration-200 text-xs ${
            expanded ? "rotate-180" : ""
          }`}
        >
          ▼
        </span>
      </button>

      {expanded && (
        <div className="mt-2 space-y-3 pl-1">
          {authors.length > 1 && (
            <div
              role="tablist"
              aria-label="Autor del comentario"
              className="flex flex-wrap gap-1"
            >
              {authors.map((name) => {
                const selected = name === author;
                return (
                  <button
                    key={name}
                    type="button"
                    role="tab"
                    aria-selected={selected}
                    onClick={() => setActiveAuthor(name)}
                    className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                      selected
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-background text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {name}
                  </button>
                );
              })}
            </div>
          )}

          {visible.map((entry) => (
            <CommentaryBlockList
              key={entry.id}
              markdown={entry.contentMd}
              fontSize={Math.max(12, Math.round(fontSize * 0.88))}
              mutedColor={mutedColor}
            />
          ))}
        </div>
      )}
    </div>
  );
});

function CommentaryBlockList({
  markdown,
  fontSize,
  mutedColor,
}: {
  markdown: string;
  fontSize: number;
  mutedColor?: string;
}) {
  const blocks = useMemo(() => parseMarkdownBlocks(markdown), [markdown]);

  return (
    <div
      className="space-y-2 text-foreground leading-relaxed"
      style={{ fontSize: `${fontSize}px` }}
    >
      {blocks.map((block, idx) => (
        <CommentaryBlockItem key={idx} block={block} mutedColor={mutedColor} />
      ))}
    </div>
  );
}

function CommentaryBlockItem({
  block,
  mutedColor,
}: {
  block: MarkdownBlock;
  mutedColor?: string;
}) {
  switch (block.type) {
    case "heading": {
      const Tag = (`h${Math.min(6, Math.max(3, block.level + 2))}` as
        | "h3"
        | "h4"
        | "h5"
        | "h6");
      return (
        <Tag className="font-bold tracking-tight text-foreground pt-1">
          <InlineTokens tokens={block.inline} />
        </Tag>
      );
    }
    case "quote":
      return (
        <blockquote
          className="border-l-2 border-primary/60 pl-3 italic text-muted-foreground"
          style={mutedColor ? { color: mutedColor } : undefined}
        >
          <InlineTokens tokens={block.inline} />
        </blockquote>
      );
    case "list":
      return block.ordered ? (
        <ol className="list-decimal space-y-1 pl-5">
          {block.items.map((item, i) => (
            <li key={i}>
              <InlineTokens tokens={item} />
            </li>
          ))}
        </ol>
      ) : (
        <ul className="list-disc space-y-1 pl-5">
          {block.items.map((item, i) => (
            <li key={i}>
              <InlineTokens tokens={item} />
            </li>
          ))}
        </ul>
      );
    case "paragraph":
    default:
      return (
        <p>
          <InlineTokens tokens={block.inline} />
        </p>
      );
  }
}

function InlineTokens({ tokens }: { tokens: InlineToken[] }) {
  return (
    <>
      {tokens.map((token, i) => {
        let node: React.ReactNode = token.text;
        if (token.bold) node = <strong key={i}>{node}</strong>;
        if (token.italic) node = <em key={i}>{node}</em>;
        return <span key={i}>{node}</span>;
      })}
    </>
  );
}
