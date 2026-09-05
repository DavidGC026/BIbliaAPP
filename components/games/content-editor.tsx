"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { loadEditorCatalog, saveEditorCatalog } from "@/lib/game-api-client"
import { WORD_CATEGORIES } from "@/lib/games/catalog"
import { CONTENT_LABELS, useContentEditor, type ContentDraft, type ContentKind } from "@/lib/games/editor"

export function ContentEditor() {
  const editor = useContentEditor(loadEditorCatalog, saveEditorCatalog)
  const [limit, setLimit] = useState(20)
  const fields: { key: keyof ContentDraft; label: string; max: number; multiline?: boolean }[] = editor.kind === "words"
    ? [{ key: "word", label: "Palabra (4 a 7 letras)", max: 20 }, { key: "clue", label: "Pista", max: 300, multiline: true }]
    : editor.kind === "pairs" ? [{ key: "left", label: "Personaje", max: 80 }, { key: "right", label: "Historia de su pareja", max: 180, multiline: true }] : []
  return <section className="space-y-6">
    <header className="space-y-2"><h1 className="text-2xl font-bold">Contenido de los juegos</h1><p className="text-sm text-muted-foreground">Agrega o corrige palabras, pistas, parejas y pasajes. Revisa la vista previa antes de publicar.</p></header>
    <div role="group" aria-label="Tipo de contenido" className="flex flex-wrap gap-2">{Object.entries(CONTENT_LABELS).map(([kind, label]) => <Button key={kind} className="min-h-11" variant={editor.kind === kind ? "default" : "outline"} aria-pressed={editor.kind === kind} disabled={editor.busy} onClick={() => { editor.chooseKind(kind as ContentKind); setLimit(20) }}>{label}</Button>)}</div>
    {editor.error && <p role="alert" className="rounded-lg border border-destructive p-4">{editor.error}</p>}
    {editor.notice && <p role="status" className="rounded-lg bg-primary/10 p-4">{editor.notice}</p>}
    <Button variant="outline" disabled={editor.busy} className="min-h-11" onClick={() => void editor.reload()}>{editor.busy ? "Procesando…" : "Recargar catálogo"}</Button>
    {editor.content && <>
      <form className="space-y-4 rounded-2xl border border-border bg-card p-5 sm:p-7" onSubmit={event => { event.preventDefault(); editor.prepare() }}>
        <h2 className="text-lg font-semibold">{editor.editing === null ? "Agregar contenido" : "Editar contenido"}</h2>
        <fieldset disabled={editor.busy} className="space-y-4">
          {fields.map(field => <div key={field.key} className="space-y-2"><label htmlFor={`content-${field.key}`} className="block text-sm font-semibold">{field.label}</label>{field.multiline ? <textarea id={`content-${field.key}`} value={editor.draft[field.key]} onChange={event => editor.change(field.key, event.target.value)} required maxLength={field.max} rows={3} className="w-full rounded-lg border border-input bg-background p-3 text-base" /> : <Input id={`content-${field.key}`} value={editor.draft[field.key]} onChange={event => editor.change(field.key, event.target.value)} required maxLength={field.max} className="min-h-12 text-base" />}</div>)}
          {editor.kind === "words" && <div className="space-y-2"><label htmlFor="content-category" className="block text-sm font-semibold">Categoría</label><select id="content-category" className="min-h-12 w-full rounded-lg border border-input bg-background px-3" value={editor.draft.category} onChange={event => editor.change("category", event.target.value)}>{WORD_CATEGORIES.map(category => <option key={category}>{category}</option>)}</select></div>}
          <div className="space-y-2"><label htmlFor="content-book" className="block text-sm font-semibold">Libro bíblico</label><select id="content-book" className="min-h-12 w-full rounded-lg border border-input bg-background px-3" value={editor.draft.bookId} onChange={event => editor.change("bookId", event.target.value)}>{editor.content.books.map(book => <option key={book.bookId} value={book.bookId}>{book.name}</option>)}</select></div>
          <div className="grid grid-cols-2 gap-3">{([ ["chapter", "Capítulo"], ["verse", "Versículo"] ] as const).map(([key, label]) => <div key={key} className="space-y-2"><label htmlFor={`content-${key}`} className="block text-sm font-semibold">{label}</label><Input id={`content-${key}`} inputMode="numeric" type="number" min={1} max={key === "chapter" ? 150 : 176} required value={editor.draft[key]} onChange={event => editor.change(key, event.target.value)} className="min-h-12" /></div>)}</div>
          {editor.kind !== "passages" && <div className="space-y-2"><label htmlFor="content-reference" className="block text-sm font-semibold">Referencia visible (opcional)</label><Input id="content-reference" placeholder="Por ejemplo: Génesis 17:5-8" maxLength={120} value={editor.draft.reference} onChange={event => editor.change("reference", event.target.value)} className="min-h-12" /><p className="text-xs text-muted-foreground">Si la dejas vacía, se usará el libro, capítulo y versículo elegidos.</p></div>}
          <div className="flex flex-wrap gap-2"><Button type="submit" className="min-h-12">Vista previa</Button>{editor.editing !== null && <Button type="button" variant="outline" className="min-h-12" onClick={() => editor.chooseKind(editor.kind)}>Cancelar edición</Button>}</div>
        </fieldset>
      </form>
      {editor.preview && <section aria-label="Vista previa del contenido" className="space-y-3 rounded-xl border-2 border-primary bg-primary/5 p-5"><h2 className="font-semibold">Vista previa</h2><p className="text-xl font-bold">{editor.kind === "words" ? editor.draft.word.toUpperCase() : editor.kind === "pairs" ? editor.draft.left : "Nuevo pasaje para completar y ordenar"}</p><p>{editor.kind === "words" ? editor.draft.clue : editor.kind === "pairs" ? editor.draft.right : "El texto se obtendrá de la versión bíblica elegida al jugar."}</p><p className="text-sm">{editor.draft.reference || `${editor.content.books.find(book => book.bookId === Number(editor.draft.bookId))?.name} ${editor.draft.chapter}:${editor.draft.verse}`}</p><Button className="min-h-12" disabled={editor.busy} onClick={() => void editor.publish()}>Publicar contenido</Button></section>}
      <section className="space-y-4"><h2 className="text-lg font-semibold">Catálogo · {editor.content.catalog[editor.kind].length} entradas</h2><label htmlFor="content-search" className="block text-sm font-semibold">Buscar contenido</label><Input id="content-search" value={editor.search} onChange={event => { editor.setSearch(event.target.value); setLimit(20) }} className="min-h-12" />{editor.entries.slice(0, limit).map(entry => <div key={entry.index} className="flex items-start justify-between gap-4 border-b border-border pb-4"><div className="min-w-0 flex-1"><p className="font-semibold">{entry.title}</p><p className="mt-1 text-sm text-muted-foreground">{entry.detail}</p></div><Button className="min-h-11" variant="outline" disabled={editor.busy} aria-label={`Editar ${entry.title}`} onClick={() => { editor.edit(entry.index); document.querySelector("form")?.scrollIntoView({ block: "start" }) }}>Editar</Button></div>)}{editor.entries.length > limit && <Button variant="outline" onClick={() => setLimit(value => value + 20)}>Mostrar más</Button>}{!editor.entries.length && <p>No hay resultados para esa búsqueda.</p>}</section>
    </>}
  </section>
}
