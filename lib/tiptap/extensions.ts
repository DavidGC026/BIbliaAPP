import type { Extensions } from "@tiptap/core"
import { Table, TableCell, TableHeader, TableRow } from "@tiptap/extension-table"
import TextAlign from "@tiptap/extension-text-align"
import { Color, FontFamily, FontSize, TextStyle } from "@tiptap/extension-text-style"
import Underline from "@tiptap/extension-underline"
import { Placeholder } from "@tiptap/extensions"
import StarterKit from "@tiptap/starter-kit"
import { DictionaryBlock } from "./nodes/dictionary-block"
import { ImageBlock } from "./nodes/image-block"
import { StripBlockHandle } from "./nodes/strip-block-handle"
import { VerseBlock } from "./nodes/verse-block"

/** Extensiones de dominio; la UI depende solo de la composicion completa. */
export const bibliaNoteNodes: Extensions = [
  VerseBlock,
  DictionaryBlock,
  ImageBlock,
  StripBlockHandle,
]

export function buildNoteExtensions(): Extensions {
  return [
    StarterKit.configure({ underline: false }),
    Underline,
    TextStyle,
    FontSize,
    FontFamily,
    Color,
    TextAlign.configure({ types: ["heading", "paragraph"] }),
    Table.configure({
      resizable: true,
      HTMLAttributes: { class: "biblia-note-table" },
    }),
    TableRow,
    TableCell,
    TableHeader,
    Placeholder.configure({ placeholder: "Escribe tu nota…" }),
    ...bibliaNoteNodes,
  ]
}
