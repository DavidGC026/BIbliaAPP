"use client"

import { appSections } from "@/lib/app-sections"
import { getRegisteredSectionUI } from "./store"
import type { AppNavItem } from "./types-nav"

export type { AppNavItem }

export function buildAppNavItems(): AppNavItem[] {
  const uiRegistry = getRegisteredSectionUI()

  return appSections.getAll().map((section) => {
    const ui = uiRegistry.get(section.id as Parameters<typeof uiRegistry.get>[0])
    if (!ui) {
      throw new Error(`Falta icono/UI para la sección "${section.id}" en sections.client.tsx`)
    }

    return {
      id: section.id,
      label: section.navLabel ?? section.label,
      icon: ui.icon,
      groupId: section.groupId,
      groupLabel: section.groupLabel,
    }
  })
}

export function getNavGroupOrder(): { id: string; label: string }[] {
  return appSections.getGroups().map((group) => ({ id: group.id, label: group.label }))
}
