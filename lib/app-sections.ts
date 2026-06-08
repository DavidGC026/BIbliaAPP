/**
 * Registro global de secciones de BibliaAPP.
 *
 * Metadatos: lib/app-section-registry/catalog.ts
 * Iconos + componentes: lib/app-section-registry/sections.client.tsx
 */

export interface AppSectionDefinition {
  id: string
  label: string
  navLabel?: string
  groupId: string
  groupLabel: string
  adminOnly?: boolean
  /** Visible para visitantes sin cuenta */
  guestAccess?: boolean
  /** Habilitada por defecto al crear un lector */
  defaultForReader?: boolean
  loginPrompt?: { title: string; description: string }
}

export interface AppSection {
  id: string
  label: string
  adminOnly?: boolean
}

export interface AppSectionGroup {
  id: string
  label: string
  sections: AppSection[]
}

class AppSectionRegistry {
  private readonly byId = new Map<string, AppSectionDefinition>()
  private readonly order: string[] = []

  define(def: AppSectionDefinition): AppSectionDefinition {
    if (this.byId.has(def.id)) {
      return this.byId.get(def.id)!
    }
    this.byId.set(def.id, def)
    this.order.push(def.id)
    return def
  }

  get(id: string): AppSectionDefinition | undefined {
    return this.byId.get(id)
  }

  getAll(): AppSectionDefinition[] {
    return this.order.map((id) => this.byId.get(id)!)
  }

  getGroups(): AppSectionGroup[] {
    const groups: AppSectionGroup[] = []
    const indexById = new Map<string, number>()

    for (const def of this.getAll()) {
      let idx = indexById.get(def.groupId)
      if (idx === undefined) {
        idx = groups.length
        indexById.set(def.groupId, idx)
        groups.push({ id: def.groupId, label: def.groupLabel, sections: [] })
      }
      groups[idx].sections.push({
        id: def.id,
        label: def.label,
        adminOnly: def.adminOnly,
      })
    }

    return groups
  }

  getAllIds(): string[] {
    return [...this.order]
  }

  getAdminOnlyIds(): string[] {
    return this.getAll().filter((s) => s.adminOnly).map((s) => s.id)
  }

  getAssignableIds(): string[] {
    return this.getAll().filter((s) => !s.adminOnly).map((s) => s.id)
  }

  getGuestIds(): string[] {
    return this.getAll().filter((s) => s.guestAccess).map((s) => s.id)
  }

  getDefaultReaderIds(): string[] {
    const defaults = this.getAll()
      .filter((s) => s.defaultForReader && !s.adminOnly)
      .map((s) => s.id)
    return defaults.length > 0 ? defaults : this.getGuestIds()
  }

  getLoginPrompt(id: string): { title: string; description: string } | undefined {
    return this.byId.get(id)?.loginPrompt
  }
}

export const appSections = new AppSectionRegistry()

/** API pública: registrar una sección (también usable desde otros módulos al arrancar) */
export function defineAppSection(def: AppSectionDefinition): string {
  appSections.define(def)
  return def.id
}

import { APP_SECTION_CATALOG } from "@/lib/app-section-registry/catalog"

for (const section of APP_SECTION_CATALOG) {
  defineAppSection(section)
}

// ─── Derivados (consumidos por permisos, navegación, etc.) ───────────────────

export const APP_SECTION_GROUPS = appSections.getGroups()
export const ALL_APP_SECTIONS: AppSection[] = APP_SECTION_GROUPS.flatMap((g) => g.sections)
export const ALL_SECTION_IDS = appSections.getAllIds()
export const ADMIN_ONLY_SECTION_IDS = appSections.getAdminOnlyIds()
export const DEFAULT_READER_SECTIONS = appSections.getDefaultReaderIds()
export const READER_ASSIGNABLE_SECTION_IDS = appSections.getAssignableIds()
export const GUEST_SECTIONS = appSections.getGuestIds()

export function getSectionLabel(sectionId: string): string {
  return appSections.get(sectionId)?.label ?? sectionId
}

export function getSectionLoginPrompt(sectionId: string): { title: string; description: string } | undefined {
  return appSections.getLoginPrompt(sectionId)
}

export function parseAllowedSections(raw: string | string[] | null | undefined): string[] | null {
  if (raw == null) return null
  try {
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw
    if (!Array.isArray(parsed)) return null
    return parsed.filter((id): id is string => typeof id === "string" && ALL_SECTION_IDS.includes(id))
  } catch {
    return null
  }
}

export function sanitizeReaderSections(sectionIds: string[]): string[] {
  const unique = Array.from(new Set(sectionIds.filter((id) => READER_ASSIGNABLE_SECTION_IDS.includes(id))))
  return unique.length > 0 ? unique : [...DEFAULT_READER_SECTIONS]
}

export function resolveAllowedSections(user: {
  role: string
  allowedSections?: string | string[] | null
}): string[] {
  if (user.role === "admin") {
    const parsed = parseAllowedSections(user.allowedSections)
    if (parsed && parsed.length > 0) {
      return Array.from(new Set([...parsed, ...ALL_SECTION_IDS]))
    }
    return [...ALL_SECTION_IDS]
  }

  const parsed = parseAllowedSections(user.allowedSections)
  if (parsed && parsed.length > 0) {
    return sanitizeReaderSections(parsed)
  }
  return [...DEFAULT_READER_SECTIONS]
}
