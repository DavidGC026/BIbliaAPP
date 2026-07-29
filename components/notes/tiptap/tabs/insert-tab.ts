import { BookOpen, BookSearch, Image, Layers, Plus, Table2 } from "lucide-react"
import type { RibbonTab } from "../ribbon-types"

export const insertTab: RibbonTab = {
  id: "insert",
  label: "Insertar",
  icon: Plus,
  groups: () => [
    {
      label: "Biblia",
      items: [
        { label: "Versículo", icon: BookOpen, wide: true, run: ({ onInsertVerse }) => onInsertVerse() },
        { label: "Diccionario", icon: BookSearch, wide: true, run: ({ onInsertDictionary }) => onInsertDictionary() },
      ],
    },
    {
      label: "Elementos",
      items: [
        { label: "Tabla", icon: Table2, wide: true, run: ({ onPickTable }) => onPickTable() },
        { label: "Imagen", icon: Image, wide: true, run: ({ onPickImage }) => onPickImage() },
      ],
    },
    {
      label: "Fondos",
      items: [{
        label: "Modo fondos",
        icon: Layers,
        wide: true,
        active: ({ backgroundMode }) => backgroundMode,
        run: ({ onToggleBackgroundMode }) => onToggleBackgroundMode(),
      }],
    },
  ],
}
