"use client"

import { Suspense } from "react"
import { LoginPrompt } from "@/components/login-prompt"
import { GUEST_SECTIONS, appSections, getSectionLoginPrompt } from "@/lib/app-sections"
import { APP_SECTION_CATALOG } from "./catalog"
import { getRegisteredSectionUI } from "./store"
import type { SectionRenderContext, SectionUIConfig } from "./types"

interface AppSectionOutletProps extends SectionRenderContext {
  activeTab: string
}

function wrapLayout(layout: SectionUIConfig["layout"], content: React.ReactNode) {
  switch (layout) {
    case "fullscreen":
      return (
        <div className="h-[calc(100vh-8rem)] md:h-[calc(100vh-3rem)] rounded-xl shadow-sm overflow-hidden">
          {content}
        </div>
      )
    case "card":
      return (
        <div className="h-[calc(100vh-8rem)] md:h-[calc(100vh-3rem)] rounded-xl border border-border shadow-sm overflow-hidden bg-card/10">
          {content}
        </div>
      )
    case "notebook":
      return (
        <div className="h-[calc(100vh-8rem)] md:h-[calc(100vh-3rem)] rounded-xl border border-border bg-card/45 shadow-sm backdrop-blur-sm overflow-hidden p-4">
          {content}
        </div>
      )
    default:
      return content
  }
}

function renderSection(id: string, ui: SectionUIConfig, ctx: AppSectionOutletProps) {
  if (ctx.activeTab !== id) return null

  const meta = appSections.get(id)
  if (!meta) return null

  const isLocked = ctx.isGuest && !GUEST_SECTIONS.includes(id)

  if (isLocked) {
    const prompt = getSectionLoginPrompt(id)
    return (
      <LoginPrompt
        key={`${id}-locked`}
        title={prompt?.title ? `${prompt.title} requiere cuenta` : "Inicia sesión para continuar"}
        description={prompt?.description ?? "Esta función requiere iniciar sesión."}
        onLogin={ctx.openLogin}
      />
    )
  }

  if (!meta.guestAccess && ctx.isGuest) return null
  if (!ctx.isGuest && !ctx.allowedSections.includes(id)) return null
  if (ui.requiresUser && !ctx.user) return null

  let content = ui.render(ctx)

  if (ui.suspenseFallback) {
    content = (
      <Suspense
        fallback={
          <div className="p-8 text-center text-sm text-muted-foreground">{ui.suspenseFallback}</div>
        }
      >
        {content}
      </Suspense>
    )
  }

  return <div key={id}>{wrapLayout(ui.layout, content)}</div>
}

export function AppSectionOutlet(props: AppSectionOutletProps) {
  const uiRegistry = getRegisteredSectionUI()

  if (uiRegistry.size !== APP_SECTION_CATALOG.length) {
    throw new Error(
      "Faltan registros UI en sections.client.tsx. Cada sección del catálogo debe tener registerAppSectionComplete.",
    )
  }

  return (
    <>
      {APP_SECTION_CATALOG.map((section) => {
        const ui = uiRegistry.get(section.id)
        if (!ui) {
          throw new Error(`Falta registerAppSectionComplete para "${section.id}"`)
        }
        return renderSection(section.id, ui, props)
      })}
    </>
  )
}
