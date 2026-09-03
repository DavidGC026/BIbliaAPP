"use client"

import type { MouseEvent, ReactNode } from "react"
import Link from "next/link"
import { getAppSectionHref } from "@/lib/app-section-url"

interface SectionNavLinkProps {
  section: string
  active?: boolean
  onNavigate: (section: string) => void
  onAfterNavigate?: () => void
  className?: string
  title?: string
  ariaLabel?: string
  children: ReactNode
}

/**
 * Enlace de navegación interna con mejora progresiva: conserva la transición
 * instantánea del shell y sigue funcionando al copiar o abrir la URL aparte.
 */
export function SectionNavLink({
  section,
  active = false,
  onNavigate,
  onAfterNavigate,
  className,
  title,
  ariaLabel,
  children,
}: SectionNavLinkProps) {
  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return
    }

    event.preventDefault()
    onNavigate(section)
    onAfterNavigate?.()
  }

  return (
    <Link
      href={getAppSectionHref(section)}
      onClick={handleClick}
      aria-current={active ? "page" : undefined}
      aria-label={ariaLabel}
      title={title}
      className={className}
    >
      {children}
    </Link>
  )
}
