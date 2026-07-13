"use client"

import { appSections } from "@/lib/app-sections"
import { getRegisteredSectionUI } from "./store"
import type { AppNavItem } from "./types-nav"

export type { AppNavItem }

const HIDDEN_CHILD_SECTIONS = new Set([
  "search",
  "references",
  "dictionary",
  "devotionals",
  "prayers",
  "favorites",
  "highlights",
  "plans",
  "activity",
  "statistics",
])

export function buildAppNavItems(): AppNavItem[] {
  const uiRegistry = getRegisteredSectionUI()

  return appSections.getAll().filter((section) => !HIDDEN_CHILD_SECTIONS.has(section.id)).map((section) => {
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
