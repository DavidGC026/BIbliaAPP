import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Heading1,
  Heading2,
  Italic,
  List,
  ListOrdered,
  Pilcrow,
  Quote,
  Redo2,
  Strikethrough,
  Type,
  Underline,
  Undo2,
} from "lucide-react"
import type { RibbonTab } from "../ribbon-types"

const FONT_SIZES = ["14px", "16px", "20px", "28px"] as const

export const homeTab: RibbonTab = {
  id: "home",
  label: "Inicio",
  icon: Type,
  groups: () => [
    {
      label: "Historial",
      items: [
        { label: "Deshacer", icon: Undo2, disabled: ({ editor }) => !editor.can().undo(), run: ({ editor }) => editor.chain().focus().undo().run() },
        { label: "Rehacer", icon: Redo2, disabled: ({ editor }) => !editor.can().redo(), run: ({ editor }) => editor.chain().focus().redo().run() },
      ],
    },
    {
      label: "Estilos",
      items: [
        { label: "Título 1", icon: Heading1, active: ({ editor }) => editor.isActive("heading", { level: 1 }), run: ({ editor }) => editor.chain().focus().toggleHeading({ level: 1 }).run() },
        { label: "Título 2", icon: Heading2, active: ({ editor }) => editor.isActive("heading", { level: 2 }), run: ({ editor }) => editor.chain().focus().toggleHeading({ level: 2 }).run() },
        { label: "Texto normal", icon: Pilcrow, wide: true, active: ({ editor }) => editor.isActive("paragraph"), run: ({ editor }) => editor.chain().focus().setParagraph().run() },
      ],
    },
    {
      label: "Fuente",
      items: [
        { label: "Tipografía", icon: Type, wide: true, run: ({ onPickFont }) => onPickFont() },
        {
          kind: "select",
          label: "Tamaño de letra",
          options: FONT_SIZES.map((size) => ({ value: size, label: size.replace("px", "") })),
          value: ({ editor }) => {
            const current = String(editor.getAttributes("textStyle").fontSize ?? "16px")
            return FONT_SIZES.includes(current as typeof FONT_SIZES[number]) ? current : "16px"
          },
          run: ({ editor }, value) => editor.chain().focus().setFontSize(value).run(),
        },
      ],
    },
    {
      label: "Formato",
      items: [
        { label: "Negrita", icon: Bold, active: ({ editor }) => editor.isActive("bold"), run: ({ editor }) => editor.chain().focus().toggleBold().run() },
        { label: "Cursiva", icon: Italic, active: ({ editor }) => editor.isActive("italic"), run: ({ editor }) => editor.chain().focus().toggleItalic().run() },
        { label: "Subrayado", icon: Underline, active: ({ editor }) => editor.isActive("underline"), run: ({ editor }) => editor.chain().focus().toggleUnderline().run() },
        { label: "Tachado", icon: Strikethrough, active: ({ editor }) => editor.isActive("strike"), run: ({ editor }) => editor.chain().focus().toggleStrike().run() },
      ],
    },
    {
      label: "Párrafo",
      items: [
        { label: "Lista", icon: List, active: ({ editor }) => editor.isActive("bulletList"), run: ({ editor }) => editor.chain().focus().toggleBulletList().run() },
        { label: "Lista numerada", icon: ListOrdered, active: ({ editor }) => editor.isActive("orderedList"), run: ({ editor }) => editor.chain().focus().toggleOrderedList().run() },
        { label: "Cita", icon: Quote, active: ({ editor }) => editor.isActive("blockquote"), run: ({ editor }) => editor.chain().focus().toggleBlockquote().run() },
        { label: "Alinear a la izquierda", icon: AlignLeft, active: ({ editor }) => editor.isActive({ textAlign: "left" }), run: ({ editor }) => editor.chain().focus().setTextAlign("left").run() },
        { label: "Centrar", icon: AlignCenter, active: ({ editor }) => editor.isActive({ textAlign: "center" }), run: ({ editor }) => editor.chain().focus().setTextAlign("center").run() },
        { label: "Alinear a la derecha", icon: AlignRight, active: ({ editor }) => editor.isActive({ textAlign: "right" }), run: ({ editor }) => editor.chain().focus().setTextAlign("right").run() },
      ],
    },
    { label: "Color", items: [{ kind: "colors" }] },
  ],
}
