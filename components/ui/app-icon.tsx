import type { ComponentType, CSSProperties } from "react"
import { cn } from "@/lib/utils"
import type { AppIconName } from "@/lib/app-icons"

type AppIconProps = {
  name: AppIconName
  className?: string
  style?: CSSProperties
  label?: string
}

/**
 * Renderiza un SVG compartido como máscara para que `text-*` y `bg-current`
 * controlen su color en cualquier tema, igual que los iconos previos.
 */
export function AppIcon({ name, className, style, label }: AppIconProps) {
  const source = `/api/assets/icons/${name}`

  return (
    <span
      aria-hidden={label ? undefined : true}
      aria-label={label}
      role={label ? "img" : undefined}
      className={cn(
        "inline-block shrink-0 bg-current [mask-position:center] [mask-repeat:no-repeat] [mask-size:contain] [-webkit-mask-position:center] [-webkit-mask-repeat:no-repeat] [-webkit-mask-size:contain]",
        className,
      )}
      style={{
        maskImage: `url(${source})`,
        WebkitMaskImage: `url(${source})`,
        ...style,
      }}
    />
  )
}

export type AppIconComponent = ComponentType<{ className?: string }>

function createAppIcon(name: AppIconName): AppIconComponent {
  return function NamedAppIcon({ className }) {
    return <AppIcon name={name} className={className} />
  }
}

/** Iconos destinados a la navegación y a configuraciones que reciben un componente. */
export const AppIcons = {
  home: createAppIcon("home"),
  bible: createAppIcon("bible"),
  community: createAppIcon("community"),
  search: createAppIcon("search"),
  link: createAppIcon("link"),
  dictionary: createAppIcon("dictionary"),
  library: createAppIcon("library"),
  notes: createAppIcon("notes"),
  profile: createAppIcon("profile"),
  heart: createAppIcon("heart"),
  highlighter: createAppIcon("highlighter"),
  readingPlan: createAppIcon("reading-plan"),
  groups: createAppIcon("groups"),
  calendar: createAppIcon("calendar"),
  sync: createAppIcon("sync"),
  chart: createAppIcon("chart"),
  trophy: createAppIcon("trophy"),
} as const
