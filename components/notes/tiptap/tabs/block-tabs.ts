import { ArrowDown, ArrowUp, BookOpen, BookSearch, Copy, Scissors, Trash2, X } from "lucide-react"
import { copySelectedBlock, cutSelectedBlock, hasNodeSelection, moveSelectedBlock, removeSelectedBlock } from "../editor-commands"
import type { RibbonGroup, RibbonTab } from "../ribbon-types"

const blockGroups: readonly RibbonGroup[] = [
  {
    label: "Orden",
    items: [
      { label: "Mover arriba", icon: ArrowUp, run: ({ editor }) => moveSelectedBlock(editor, "up") },
      { label: "Mover abajo", icon: ArrowDown, run: ({ editor }) => moveSelectedBlock(editor, "down") },
    ],
  },
  {
    label: "Portapapeles",
    items: [
      { label: "Copiar", icon: Copy, wide: true, run: ({ editor }) => copySelectedBlock(editor) },
      { label: "Cortar", icon: Scissors, wide: true, run: ({ editor }) => cutSelectedBlock(editor) },
    ],
  },
  {
    label: "Bloque",
    items: [
      { label: "Eliminar", icon: Trash2, wide: true, danger: true, run: ({ editor }) => removeSelectedBlock(editor) },
      { label: "Quitar selección", icon: X, run: ({ onClearSelection }) => onClearSelection() },
    ],
  },
]

export const verseTab: RibbonTab = {
  id: "verse",
  label: "Formato de versículo",
  icon: BookOpen,
  contextual: true,
  matches: ({ editor }) => hasNodeSelection(editor, "verseBlock"),
  groups: () => blockGroups,
}

export const dictionaryTab: RibbonTab = {
  id: "dictionary",
  label: "Formato de definición",
  icon: BookSearch,
  contextual: true,
  matches: ({ editor }) => hasNodeSelection(editor, "dictionaryBlock"),
  groups: () => blockGroups,
}
