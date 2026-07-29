import type { Editor } from "@tiptap/core"
import { NodeSelection } from "@tiptap/pm/state"

export type ImageAlign = "left" | "center" | "right" | "full"

export function selectedImage(editor: Editor): Record<string, unknown> | null {
  const { selection } = editor.state
  if (!(selection instanceof NodeSelection) || selection.node.type.name !== "imageBlock") return null
  return selection.node.attrs
}

export function imageWidth(attrs: Record<string, unknown>): number {
  const parsed = Number.parseInt(String(attrs.width ?? "60"), 10)
  return Number.isFinite(parsed) ? parsed : 60
}

export function imageAlign(attrs: Record<string, unknown>): ImageAlign {
  if (attrs.width === "100%") return "full"
  if (attrs.float === "left" || attrs.float === "right") return attrs.float
  return "center"
}

export function setImageWidth(editor: Editor, percent: number): void {
  editor.chain().focus().updateAttributes("imageBlock", { width: `${percent}%` }).run()
}

export function setImageAlign(editor: Editor, align: ImageAlign): void {
  const attrs = align === "full"
    ? { width: "100%", align: "center", float: null }
    : align === "center"
      ? { align: "center", float: null }
      : { align, float: align }
  editor.chain().focus().updateAttributes("imageBlock", attrs).run()
}

export function setImageBackground(editor: Editor, background: boolean): void {
  editor.chain().focus().updateAttributes("imageBlock", background
    ? { background: true, float: null }
    : { background: false, left: null, top: null }).run()
}
