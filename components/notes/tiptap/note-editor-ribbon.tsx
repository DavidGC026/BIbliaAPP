import { ChevronDown, ChevronUp, Palette } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { cn } from "@/lib/utils"
import { RibbonButton } from "./ribbon-button"
import { NoteSpecialTools } from "./note-special-tools"
import type { RibbonColorsItem, RibbonContext, RibbonItem, RibbonSelectItem } from "./ribbon-types"
import { ribbonTabs } from "./tabs/ribbon-tabs"

type Props = {
  context: RibbonContext
  revision: number
}

function RibbonSelect({ context, item }: { context: RibbonContext; item: RibbonSelectItem }) {
  return (
    <select
      className="note-ribbon-select"
      aria-label={item.label}
      value={item.value(context)}
      onPointerDown={(event) => event.stopPropagation()}
      onChange={(event) => item.run(context, event.target.value)}
    >
      {item.options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
    </select>
  )
}

function RibbonColors({ context }: { context: RibbonContext; item: RibbonColorsItem }) {
  return (
    <div className="note-ribbon-colors">
      <button
        type="button"
        className="note-ribbon-color is-auto"
        aria-label="Color automático"
        title="Color automático"
        onPointerDown={(event) => event.preventDefault()}
        onClick={() => context.editor.chain().focus().unsetColor().run()}
      >A</button>
      {context.colors.map((color) => (
        <button
          key={color}
          type="button"
          className={cn("note-ribbon-color", context.editor.isActive("textStyle", { color }) && "is-active")}
          style={{ backgroundColor: color }}
          aria-label={`Color ${color}`}
          title={`Color ${color}`}
          onPointerDown={(event) => event.preventDefault()}
          onClick={() => context.editor.chain().focus().setColor(color).run()}
        />
      ))}
      <label className="note-ribbon-color is-picker" title="Elegir otro color">
        <Palette aria-hidden="true" />
        <span className="sr-only">Elegir otro color</span>
        <input
          type="color"
          aria-label="Elegir otro color"
          onChange={(event) => context.editor.chain().focus().setColor(event.target.value).run()}
        />
      </label>
    </div>
  )
}

function renderItem(context: RibbonContext, item: RibbonItem, key: string) {
  if (item.kind === "select") return <RibbonSelect key={key} context={context} item={item} />
  if (item.kind === "colors") return <RibbonColors key={key} context={context} item={item} />
  return <RibbonButton key={key} context={context} item={item} />
}

export function NoteEditorRibbon({ context, revision }: Props) {
  const [manualTab, setManualTab] = useState("home")
  const [collapsed, setCollapsed] = useState(false)
  const visibleTabs = useMemo(
    () => ribbonTabs.filter((tab) => !tab.contextual || tab.matches?.(context)),
    // revision representa las transacciones/selecciones del editor.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [context, revision],
  )
  const contextualTab = visibleTabs.find((tab) => tab.contextual)
  const activeTab = contextualTab
    ?? visibleTabs.find((tab) => tab.id === manualTab)
    ?? visibleTabs[0]

  useEffect(() => {
    if (!visibleTabs.some((tab) => tab.id === manualTab && !tab.contextual)) setManualTab("home")
  }, [manualTab, visibleTabs])

  if (!activeTab) return null

  return (
    <div className={cn("note-editor-ribbon", collapsed && "is-collapsed")}>
      <div className="note-ribbon-tabs" role="tablist" aria-label="Herramientas del editor">
        {visibleTabs.map((tab) => {
          const Icon = tab.icon
          const selected = tab.id === activeTab.id
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={selected}
              className={cn("note-ribbon-tab", selected && "is-active", tab.contextual && "is-contextual")}
              onPointerDown={(event) => event.preventDefault()}
              onClick={() => {
                if (!tab.contextual) setManualTab(tab.id)
                if (collapsed) setCollapsed(false)
              }}
            >
              <Icon aria-hidden="true" />
              <span>{tab.label}</span>
            </button>
          )
        })}
        <button
          type="button"
          className="note-ribbon-collapse"
          aria-label={collapsed ? "Desplegar cinta" : "Contraer cinta"}
          aria-expanded={!collapsed}
          onPointerDown={(event) => event.preventDefault()}
          onClick={() => setCollapsed((value) => !value)}
        >
          {collapsed ? <ChevronUp /> : <ChevronDown />}
        </button>
      </div>
      <div className="note-ribbon-groups" role="tabpanel">
        {activeTab.groups(context).map((group) => (
          <section className="note-ribbon-group" key={group.label} aria-label={group.label}>
            <div className="note-ribbon-group-items">
              {group.items.map((item, index) => renderItem(context, item, `${group.label}-${index}`))}
            </div>
            <span className="note-ribbon-group-label">{group.label}</span>
          </section>
        ))}
      </div>
      <NoteSpecialTools context={context} />
    </div>
  )
}
