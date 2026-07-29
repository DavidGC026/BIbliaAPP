import type { RibbonButtonItem, RibbonContext } from "./ribbon-types"
import { cn } from "@/lib/utils"

type Props = {
  context: RibbonContext
  item: RibbonButtonItem
}

export function RibbonButton({ context, item }: Props) {
  const Icon = item.icon
  const active = item.active?.(context) ?? false
  const disabled = item.disabled?.(context) ?? false

  return (
    <button
      type="button"
      title={item.label}
      aria-label={item.label}
      aria-pressed={active}
      disabled={disabled}
      onPointerDown={(event) => event.preventDefault()}
      onClick={() => void item.run(context)}
      className={cn(
        "note-ribbon-button",
        item.wide && "is-wide",
        item.danger && "is-danger",
        active && "is-active",
      )}
    >
      {Icon ? <Icon aria-hidden="true" /> : null}
      {item.text || item.wide || !Icon ? <span>{item.text ?? item.label}</span> : null}
    </button>
  )
}
