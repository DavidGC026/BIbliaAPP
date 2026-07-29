import type { Editor } from "@tiptap/core"
import { DOMSerializer, type Node as ProseMirrorNode, type ResolvedPos } from "@tiptap/pm/model"
import { NodeSelection } from "@tiptap/pm/state"

function topLevelRange(editor: Editor): { from: number; to: number; index: number } | null {
  const { selection } = editor.state
  if (selection instanceof NodeSelection && selection.$anchor.depth === 0) {
    return { from: selection.from, to: selection.to, index: selection.$anchor.index() }
  }
  const position: ResolvedPos = selection.$from
  if (position.depth === 0) return null
  return { from: position.before(1), to: position.after(1), index: position.index(0) }
}

export function hasNodeSelection(editor: Editor, nodeName: string): boolean {
  const { selection } = editor.state
  return selection instanceof NodeSelection && selection.node.type.name === nodeName
}

export function moveSelectedBlock(editor: Editor, direction: "up" | "down"): boolean {
  const range = topLevelRange(editor)
  if (!range) return false
  const targetIndex = direction === "up" ? range.index - 1 : range.index + 1
  if (targetIndex < 0 || targetIndex >= editor.state.doc.childCount) return false

  const node = editor.state.doc.child(range.index)
  const sibling = editor.state.doc.child(targetIndex)
  const target = direction === "up" ? range.from - sibling.nodeSize : range.to + sibling.nodeSize
  const transaction = editor.state.tr.delete(range.from, range.to)
  const mapped = transaction.mapping.map(target)
  transaction.insert(mapped, node)
  if (node.isAtom) transaction.setSelection(NodeSelection.create(transaction.doc, mapped))
  editor.view.dispatch(transaction.scrollIntoView())
  return true
}

function blockPlainText(node: ProseMirrorNode): string {
  const rawHtml = String(node.attrs?.html ?? "")
  if (!rawHtml) return node.textContent.trim()
  const holder = document.createElement("div")
  holder.innerHTML = rawHtml
  return (holder.textContent ?? "").trim()
}

export async function copySelectedBlock(editor: Editor): Promise<boolean> {
  const range = topLevelRange(editor)
  if (!range) return false
  const node = editor.state.doc.child(range.index)
  const holder = document.createElement("div")
  holder.appendChild(DOMSerializer.fromSchema(editor.schema).serializeNode(node))
  const html = holder.innerHTML
  const text = blockPlainText(node)

  try {
    if (navigator.clipboard?.write && typeof ClipboardItem !== "undefined") {
      await navigator.clipboard.write([new ClipboardItem({
        "text/html": new Blob([html], { type: "text/html" }),
        "text/plain": new Blob([text], { type: "text/plain" }),
      })])
    } else if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
    } else {
      return false
    }
    editor.commands.focus()
    return true
  } catch {
    editor.commands.focus()
    return false
  }
}

export function removeSelectedBlock(editor: Editor): boolean {
  const range = topLevelRange(editor)
  if (!range) return false
  editor.view.dispatch(editor.state.tr.delete(range.from, range.to).scrollIntoView())
  editor.commands.focus()
  return true
}

export async function cutSelectedBlock(editor: Editor): Promise<boolean> {
  const copied = await copySelectedBlock(editor)
  if (!copied) return false
  return removeSelectedBlock(editor)
}

export function clearNodeSelection(editor: Editor): void {
  const { to } = editor.state.selection
  editor.chain().focus().setTextSelection(Math.min(to, editor.state.doc.content.size)).run()
}
