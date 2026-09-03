"use client"

import { memo, useMemo, useState } from "react"
import { BookMarked, ChevronDown } from "lucide-react"

import { cn } from "@/lib/utils"
import { parseMarkdownBlocks, type InlineToken, type MarkdownBlock } from "@/lib/commentary-markdown"

export interface VerseCommentaryEntry {
  id: number
  verseStart: number
  verseEnd: number
  author: string
  contentMd: string
}

export interface VerseCommentaryProps {
  commentaries: VerseCommentaryEntry[]
  /** Tamaño del versículo; el comentario se pinta algo más pequeño. */
  fontSize: number
  mutedColor?: string
  accentColor?: string
  borderColor?: string
}

/**
 * Comentario clásico (Matthew Henry, Spurgeon…) bajo un versículo.
 *
 * Empieza plegado a propósito: el lector es para leer la Biblia, y un
 * comentario abierto en cada versículo del capítulo entierra el texto. Al
 * plegarlo, además, el markdown solo se analiza cuando alguien lo abre.
 *
 * Con varios autores para el mismo pasaje aparece un selector; con uno solo se
 * muestra su nombre sin más, para no añadir controles que no eligen nada.
 */
export const VerseCommentary = memo(function VerseCommentary({
  commentaries,
  fontSize,
  mutedColor,
  accentColor,
  borderColor,
}: VerseCommentaryProps) {
  const [expanded, setExpanded] = useState(false)
  const [activeAuthor, setActiveAuthor] = useState<string | null>(null)

  const authors = useMemo(
    () => [...new Set(commentaries.map((entry) => entry.author))],
    [commentaries],
  )

  // El autor elegido puede desaparecer al cambiar de capítulo: se cae al primero
  // en lugar de quedarse sin nada que mostrar.
  const author = activeAuthor && authors.includes(activeAuthor) ? activeAuthor : authors[0]
  const visible = commentaries.filter((entry) => entry.author === author)

  if (commentaries.length === 0) return null

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
        <BookMarked className="size-3.5" style={accentColor ? { color: accentColor } : undefined} />
        <span>
          {authors.length === 1
            ? `Comentario · ${authors[0]}`
            : `Comentarios · ${authors.length} autores`}
        </span>
        <ChevronDown className={cn("size-3.5 transition-transform", expanded && "rotate-180")} />
      </button>

      {expanded && (
        <div className="mt-2 space-y-3 pl-1">
          {authors.length > 1 && (
            <div role="tablist" aria-label="Autor del comentario" className="flex flex-wrap gap-1">
              {authors.map((name) => {
                const selected = name === author
                return (
                  <button
                    key={name}
                    type="button"
                    role="tab"
                    aria-selected={selected}
                    onClick={() => setActiveAuthor(name)}
                    className={cn(
                      "rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors",
                      selected
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-background text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {name}
                  </button>
                )
              })}
            </div>
          )}

          {visible.map((entry) => (
            <article key={entry.id} className="space-y-1.5">
              <p
                className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground"
                style={mutedColor ? { color: mutedColor } : undefined}
              >
                {entry.author}
                <span className="ml-1.5 font-normal normal-case tracking-normal">
                  · vv. {entry.verseStart === entry.verseEnd
                    ? entry.verseStart
                    : `${entry.verseStart}-${entry.verseEnd}`}
                </span>
              </p>
              <CommentaryMarkdown
                markdown={entry.contentMd}
                fontSize={fontSize}
                accentColor={accentColor}
              />
            </article>
          ))}
        </div>
      )}
    </div>
  )
})

/**
 * Pinta el markdown como elementos de React.
 *
 * Sin `dangerouslySetInnerHTML`: el texto viene de ficheros importados, y al
 * pasar por tokens en vez de por HTML, un comentario que traiga etiquetas se lee
 * como texto en lugar de ejecutarse. Ver lib/commentary-markdown.ts.
 */
function CommentaryMarkdown({
  markdown,
  fontSize,
  accentColor,
}: {
  markdown: string
  fontSize: number
  accentColor?: string
}) {
  const blocks = useMemo(() => parseMarkdownBlocks(markdown), [markdown])
  // El comentario va un punto por debajo del versículo: acompaña, no compite.
  const bodySize = Math.max(12, fontSize - 3)

  return (
    <div className="space-y-2 font-serif leading-relaxed text-muted-foreground">
      {blocks.map((block, index) => (
        <MarkdownBlockView
          key={index}
          block={block}
          bodySize={bodySize}
          accentColor={accentColor}
        />
      ))}
    </div>
  )
}

function MarkdownBlockView({
  block,
  bodySize,
  accentColor,
}: {
  block: MarkdownBlock
  bodySize: number
  accentColor?: string
}) {
  switch (block.type) {
    case "heading":
      return (
        <p
          className="font-sans font-bold text-foreground"
          style={{ fontSize: `${bodySize}px`, color: accentColor }}
        >
          <Inline tokens={block.inline} />
        </p>
      )
    case "quote":
      return (
        <blockquote
          className="border-l-2 border-primary/40 pl-3 italic"
          style={{ fontSize: `${bodySize}px`, borderColor: accentColor }}
        >
          <Inline tokens={block.inline} />
        </blockquote>
      )
    case "list":
      return block.ordered ? (
        <ol className="list-decimal space-y-1 pl-5" style={{ fontSize: `${bodySize}px` }}>
          {block.items.map((item, index) => (
            <li key={index}>
              <Inline tokens={item} />
            </li>
          ))}
        </ol>
      ) : (
        <ul className="list-disc space-y-1 pl-5" style={{ fontSize: `${bodySize}px` }}>
          {block.items.map((item, index) => (
            <li key={index}>
              <Inline tokens={item} />
            </li>
          ))}
        </ul>
      )
    case "paragraph":
      return (
        <p style={{ fontSize: `${bodySize}px` }}>
          <Inline tokens={block.inline} />
        </p>
      )
  }
}

function Inline({ tokens }: { tokens: InlineToken[] }) {
  return (
    <>
      {tokens.map((token, index) => {
        if (token.bold && token.italic) {
          return (
            <strong key={index} className="italic text-foreground">
              {token.text}
            </strong>
          )
        }
        if (token.bold) {
          return (
            <strong key={index} className="text-foreground">
              {token.text}
            </strong>
          )
        }
        if (token.italic) return <em key={index}>{token.text}</em>
        return <span key={index}>{token.text}</span>
      })}
    </>
  )
}
