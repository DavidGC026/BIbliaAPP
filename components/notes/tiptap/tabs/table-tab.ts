import { ArrowDown, ArrowUp, Grid2X2, Minus, Plus, Table2, Trash2, X } from "lucide-react"
import { moveSelectedBlock } from "../editor-commands"
import type { RibbonTab } from "../ribbon-types"

export const tableTab: RibbonTab = {
  id: "table",
  label: "Diseño de tabla",
  icon: Table2,
  contextual: true,
  matches: ({ editor }) => editor.isActive("table"),
  groups: () => [
    {
      label: "Filas",
      items: [
        { label: "Añadir fila", icon: Plus, wide: true, run: ({ editor }) => editor.chain().focus().addRowAfter().run() },
        { label: "Quitar fila", icon: Minus, wide: true, run: ({ editor }) => editor.chain().focus().deleteRow().run() },
      ],
    },
    {
      label: "Columnas",
      items: [
        { label: "Añadir columna", icon: Plus, wide: true, run: ({ editor }) => editor.chain().focus().addColumnAfter().run() },
        { label: "Quitar columna", icon: Minus, wide: true, run: ({ editor }) => editor.chain().focus().deleteColumn().run() },
      ],
    },
    {
      label: "Celdas",
      items: [
        { label: "Combinar", icon: Grid2X2, wide: true, disabled: ({ editor }) => !editor.can().mergeCells(), run: ({ editor }) => editor.chain().focus().mergeCells().run() },
        { label: "Dividir", icon: Grid2X2, wide: true, disabled: ({ editor }) => !editor.can().splitCell(), run: ({ editor }) => editor.chain().focus().splitCell().run() },
        { label: "Encabezado", icon: Table2, wide: true, run: ({ editor }) => editor.chain().focus().toggleHeaderRow().run() },
      ],
    },
    {
      label: "Orden",
      items: [
        { label: "Mover arriba", icon: ArrowUp, run: ({ editor }) => moveSelectedBlock(editor, "up") },
        { label: "Mover abajo", icon: ArrowDown, run: ({ editor }) => moveSelectedBlock(editor, "down") },
      ],
    },
    {
      label: "Tabla",
      items: [
        { label: "Eliminar", icon: Trash2, wide: true, danger: true, run: ({ editor }) => editor.chain().focus().deleteTable().run() },
        { label: "Quitar selección", icon: X, run: ({ onClearSelection }) => onClearSelection() },
      ],
    },
  ],
}
