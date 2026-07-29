import { AlignCenter, AlignLeft, AlignRight, ArrowDown, ArrowUp, Image, Layers, Maximize2, Trash2, X } from "lucide-react"
import { moveSelectedBlock, removeSelectedBlock } from "../editor-commands"
import { imageAlign, imageWidth, selectedImage, setImageAlign, setImageBackground, setImageWidth } from "../image-commands"
import type { RibbonTab } from "../ribbon-types"

export const imageTab: RibbonTab = {
  id: "image",
  label: "Formato de imagen",
  icon: Image,
  contextual: true,
  matches: ({ editor }) => selectedImage(editor) !== null,
  groups: (context) => {
    const attrs = selectedImage(context.editor) ?? {}
    const width = imageWidth(attrs)
    const align = imageAlign(attrs)
    const background = Boolean(attrs.background)
    return [
      {
        label: "Tamaño",
        items: [25, 50, 75, 100].map((percent) => ({
          label: `${percent} %`, text: `${percent}%`, wide: true,
          active: () => width === percent,
          run: ({ editor }) => setImageWidth(editor, percent),
        })),
      },
      {
        label: "Posición",
        items: [
          { label: "Izquierda", icon: AlignLeft, active: () => align === "left", run: ({ editor }) => setImageAlign(editor, "left") },
          { label: "Centro", icon: AlignCenter, active: () => align === "center", run: ({ editor }) => setImageAlign(editor, "center") },
          { label: "Derecha", icon: AlignRight, active: () => align === "right", run: ({ editor }) => setImageAlign(editor, "right") },
          { label: "Ancho completo", icon: Maximize2, active: () => align === "full", run: ({ editor }) => setImageAlign(editor, "full") },
        ],
      },
      {
        label: "Ajuste",
        items: [{
          label: background ? "Quitar fondo" : "Detrás del texto",
          icon: Layers,
          wide: true,
          active: () => background,
          run: ({ editor, backgroundMode, onToggleBackgroundMode }) => {
            setImageBackground(editor, !background)
            if (!background && !backgroundMode) onToggleBackgroundMode()
          },
        }],
      },
      {
        label: "Orden",
        items: [
          { label: "Mover arriba", icon: ArrowUp, run: ({ editor }) => moveSelectedBlock(editor, "up") },
          { label: "Mover abajo", icon: ArrowDown, run: ({ editor }) => moveSelectedBlock(editor, "down") },
        ],
      },
      {
        label: "Imagen",
        items: [
          { label: "Eliminar", icon: Trash2, wide: true, danger: true, run: ({ editor }) => removeSelectedBlock(editor) },
          { label: "Quitar selección", icon: X, run: ({ onClearSelection }) => onClearSelection() },
        ],
      },
    ]
  },
}
