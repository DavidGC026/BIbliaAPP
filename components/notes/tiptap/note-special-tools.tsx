import {
  BookOpen,
  BookSearch,
  ChevronLeft,
  ChevronRight,
  Image,
  Layers,
  Quote,
  Table2,
  Upload,
  X,
  type LucideIcon,
} from "lucide-react"
import { useState } from "react"
import { cn } from "@/lib/utils"
import type { RibbonContext } from "./ribbon-types"

type SpecialOption = {
  id: string
  title: string
  description: string
  icon: LucideIcon
  active?: boolean
  run: () => void
}

type SpecialTab = {
  id: string
  label: string
  icon: LucideIcon
  tone: "primary" | "sky" | "violet"
  options: SpecialOption[]
}

/** Fila de inserciones rápidas que replica la superficie especial de desktop. */
export function NoteSpecialTools({ context }: { context: RibbonContext }) {
  const [activeId, setActiveId] = useState<string | null>(null)
  const tabs: SpecialTab[] = [
    {
      id: "backgrounds",
      label: "Fondos",
      icon: Layers,
      tone: "sky",
      options: [
        {
          id: "background-mode",
          title: context.backgroundMode ? "Finalizar fondos" : "Modo fondos",
          description: "Eleva los fondos para seleccionarlos",
          icon: Layers,
          active: context.backgroundMode,
          run: context.onToggleBackgroundMode,
        },
        {
          id: "background-image",
          title: "Imagen de fondo",
          description: "Sube una imagen detrás del texto",
          icon: Upload,
          run: () => {
            if (!context.backgroundMode) context.onToggleBackgroundMode()
            context.onPickBackgroundImage()
          },
        },
      ],
    },
    {
      id: "verses",
      label: "Versículos",
      icon: BookOpen,
      tone: "primary",
      options: [
        {
          id: "insert-verse",
          title: "Insertar versículo",
          description: "Busca y cita un pasaje bíblico",
          icon: BookOpen,
          run: context.onInsertVerse,
        },
        {
          id: "highlight-quote",
          title: "Cita destacada",
          description: "Convierte la selección en una cita",
          icon: Quote,
          run: () => context.editor.chain().focus().toggleBlockquote().run(),
        },
      ],
    },
    {
      id: "dictionary",
      label: "Diccionario",
      icon: BookSearch,
      tone: "violet",
      options: [{
        id: "insert-dictionary",
        title: "Entrada Strong",
        description: "Añade la definición de una palabra original",
        icon: BookSearch,
        run: context.onInsertDictionary,
      }],
    },
    {
      id: "image",
      label: "Imagen",
      icon: Image,
      tone: "sky",
      options: [
        {
          id: "upload-image",
          title: "Subir imagen",
          description: "Desde tu dispositivo",
          icon: Upload,
          run: context.onPickImage,
        },
        {
          id: "insert-table",
          title: "Insertar tabla",
          description: "Elige filas, columnas y encabezado",
          icon: Table2,
          run: context.onPickTable,
        },
      ],
    },
  ]
  const activeTab = tabs.find((tab) => tab.id === activeId) ?? null

  return (
    <div className="note-special-tools">
      <div className="note-special-tabs" role="tablist" aria-label="Herramientas especiales">
        {tabs.map((tab) => {
          const Icon = tab.icon
          const selected = tab.id === activeId
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={selected}
              data-tone={tab.tone}
              className={cn("note-special-tab", selected && "is-active")}
              onPointerDown={(event) => event.preventDefault()}
              onClick={() => setActiveId(selected ? null : tab.id)}
            >
              <Icon aria-hidden="true" /> {tab.label}
            </button>
          )
        })}
        {activeTab ? (
          <button type="button" className="note-special-close" aria-label="Cerrar herramientas especiales" onClick={() => setActiveId(null)}>
            <X aria-hidden="true" />
          </button>
        ) : null}
      </div>

      {activeTab ? (
        <div className="note-special-options">
          <button type="button" className="note-special-arrow" disabled aria-label="Opciones anteriores"><ChevronLeft /></button>
          <div className="note-special-cards">
            {activeTab.options.map((option) => {
              const Icon = option.icon
              return (
                <button
                  key={option.id}
                  type="button"
                  className={cn("note-special-card", option.active && "is-active")}
                  onPointerDown={(event) => event.preventDefault()}
                  onClick={option.run}
                >
                  <Icon aria-hidden="true" />
                  <span><strong>{option.title}</strong><small>{option.description}</small></span>
                </button>
              )
            })}
          </div>
          <button type="button" className="note-special-arrow" disabled aria-label="Más opciones"><ChevronRight /></button>
        </div>
      ) : null}
    </div>
  )
}
