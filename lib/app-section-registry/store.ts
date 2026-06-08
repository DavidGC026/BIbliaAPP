import type { AppSectionId } from "./catalog"
import { defineAppSection } from "@/lib/app-sections"
import type { CompleteAppSectionConfig, SectionUIConfig } from "./types"

const uiBySectionId = new Map<AppSectionId, SectionUIConfig>()

export function registerAppSectionComplete(config: CompleteAppSectionConfig): AppSectionId {
  const { icon, render, requiresUser, layout, suspenseFallback, ...meta } = config
  defineAppSection(meta)
  uiBySectionId.set(meta.id as AppSectionId, {
    icon,
    render,
    requiresUser,
    layout,
    suspenseFallback,
  })
  return meta.id as AppSectionId
}

export function getRegisteredSectionUI(): Map<AppSectionId, SectionUIConfig> {
  return uiBySectionId
}

export function getSectionUI(id: AppSectionId): SectionUIConfig | undefined {
  return uiBySectionId.get(id)
}

export function getAllRegisteredSectionIds(): AppSectionId[] {
  return Array.from(uiBySectionId.keys())
}
