import type { Editor } from "@tiptap/core"
import type { LucideIcon } from "lucide-react"

export type RibbonContext = {
  editor: Editor
  colors: readonly string[]
  backgroundMode: boolean
  onToggleBackgroundMode: () => void
  onInsertVerse: () => void
  onInsertDictionary: () => void
  onPickImage: () => void
  onPickBackgroundImage: () => void
  onPickTable: () => void
  onPickFont: () => void
  onClearSelection: () => void
}

export type RibbonButtonItem = {
  kind?: "button"
  label: string
  icon?: LucideIcon
  text?: string
  wide?: boolean
  danger?: boolean
  active?: (context: RibbonContext) => boolean
  disabled?: (context: RibbonContext) => boolean
  run: (context: RibbonContext) => unknown | Promise<unknown>
}

export type RibbonSelectItem = {
  kind: "select"
  label: string
  options: readonly { value: string; label: string }[]
  value: (context: RibbonContext) => string
  run: (context: RibbonContext, value: string) => unknown
}

export type RibbonColorsItem = { kind: "colors" }
export type RibbonItem = RibbonButtonItem | RibbonSelectItem | RibbonColorsItem

export type RibbonGroup = {
  label: string
  items: readonly RibbonItem[]
}

export type RibbonTab = {
  id: string
  label: string
  icon: LucideIcon
  contextual?: boolean
  matches?: (context: RibbonContext) => boolean
  groups: (context: RibbonContext) => readonly RibbonGroup[]
}
