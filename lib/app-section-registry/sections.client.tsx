"use client"

import { useState } from "react"
import dynamic from "next/dynamic"
import { SegmentTabs } from "@/components/ui/segment-tabs"
import { AppIcons } from "@/components/ui/app-icon"
import { APP_SECTION_CATALOG, type AppSectionId } from "./catalog"
import { registerAppSectionComplete } from "./store"
import type { SectionRenderContext } from "./types"

function sectionLoading(text: string) {
  return () => (
    <div className="p-8 text-center text-sm text-muted-foreground animate-pulse">{text}</div>
  )
}

const Dashboard = dynamic(
  () => import("@/components/dashboard").then((m) => ({ default: m.Dashboard })),
  { loading: sectionLoading("Cargando inicio...") },
)
const BibleGames = dynamic(
  () => import("@/components/games").then((m) => ({ default: m.BibleGames })),
  { loading: sectionLoading("Cargando juegos...") },
)
const BibleReader = dynamic(
  () => import("@/components/bible-reader").then((m) => ({ default: m.BibleReader })),
  { loading: sectionLoading("Cargando Biblia...") },
)
const Feed = dynamic(
  () => import("@/components/feed").then((m) => ({ default: m.Feed })),
  { loading: sectionLoading("Cargando actividad...") },
)
const SearchAdvanced = dynamic(
  () => import("@/components/search-advanced").then((m) => ({ default: m.SearchAdvanced })),
  { loading: sectionLoading("Cargando búsqueda...") },
)
const ReferencesExplorer = dynamic(
  () => import("@/components/references-explorer").then((m) => ({ default: m.ReferencesExplorer })),
  { loading: sectionLoading("Cargando referencias...") },
)
const StrongDictionary = dynamic(
  () => import("@/components/strong-dictionary").then((m) => ({ default: m.StrongDictionary })),
  { loading: sectionLoading("Cargando diccionario...") },
)
const PersonalLibrary = dynamic(
  () => import("@/components/personal-library").then((m) => ({ default: m.PersonalLibrary })),
  { loading: sectionLoading("Cargando biblioteca...") },
)
const NotebookSidebar = dynamic(
  () => import("@/components/notebook-sidebar").then((m) => ({ default: m.NotebookSidebar })),
  { loading: sectionLoading("Cargando libreta...") },
)
const NotesSection = dynamic(
  () => import("@/components/notes-section").then((m) => ({ default: m.NotesSection })),
  { loading: sectionLoading("Cargando notas...") },
)
const ProfileSection = dynamic(
  () => import("@/components/profile-section").then((m) => ({ default: m.ProfileSection })),
  { loading: sectionLoading("Cargando perfil...") },
)
const Favorites = dynamic(
  () => import("@/components/favorites").then((m) => ({ default: m.Favorites })),
  { loading: sectionLoading("Cargando favoritos...") },
)
const HighlightsManager = dynamic(
  () => import("@/components/highlights-manager").then((m) => ({ default: m.HighlightsManager })),
  { loading: sectionLoading("Cargando subrayados...") },
)
const ReadingPlans = dynamic(
  () => import("@/components/reading-plans").then((m) => ({ default: m.ReadingPlans })),
  { loading: sectionLoading("Cargando planes...") },
)
const PrayerRequests = dynamic(
  () => import("@/components/prayer-requests").then((m) => ({ default: m.PrayerRequests })),
  { loading: sectionLoading("Cargando oración...") },
)
const Devotionals = dynamic(
  () => import("@/components/devotionals").then((m) => ({ default: m.Devotionals })),
  { loading: sectionLoading("Cargando devocionales...") },
)
const Groups = dynamic(
  () => import("@/components/groups").then((m) => ({ default: m.Groups })),
  { loading: sectionLoading("Cargando grupos...") },
)
const ChurchCalendar = dynamic(
  () => import("@/components/church-calendar").then((m) => ({ default: m.ChurchCalendar })),
  { loading: sectionLoading("Cargando calendario...") },
)
const Discipleship = dynamic(
  () => import("@/components/discipleship").then((m) => ({ default: m.Discipleship })),
  { loading: sectionLoading("Cargando discipulado...") },
)
const Activity = dynamic(
  () => import("@/components/activity").then((m) => ({ default: m.Activity })),
  { loading: sectionLoading("Cargando actividad...") },
)
const Statistics = dynamic(
  () => import("@/components/statistics").then((m) => ({ default: m.Statistics })),
  { loading: sectionLoading("Cargando estadísticas...") },
)
const UserManagement = dynamic(
  () => import("@/components/user-management").then((m) => ({ default: m.UserManagement })),
  { loading: sectionLoading("Cargando usuarios...") },
)

function meta(id: AppSectionId) {
  const section = APP_SECTION_CATALOG.find((entry) => entry.id === id)
  if (!section) {
    throw new Error(`Sección "${id}" no está en APP_SECTION_CATALOG (lib/app-section-registry/catalog.ts)`)
  }
  return section
}

type StudyMode = "reader" | "search" | "references" | "dictionary" | "plans"
type ProfileMode = "profile" | "favorites" | "highlights" | "plans" | "activity" | "statistics"

const STUDY_TABS: { key: StudyMode; label: string }[] = [
  { key: "reader", label: "Lector" },
  { key: "search", label: "Buscar" },
  { key: "references", label: "Referencias" },
  { key: "dictionary", label: "Diccionario" },
  { key: "plans", label: "Planes" },
]

const PROFILE_TABS: { key: ProfileMode; label: string }[] = [
  { key: "profile", label: "Perfil" },
  { key: "favorites", label: "Favoritos" },
  { key: "highlights", label: "Subrayados" },
  { key: "plans", label: "Planes" },
  { key: "activity", label: "Actividad" },
  { key: "statistics", label: "Estadísticas" },
]

function StudyHub(ctx: SectionRenderContext) {
  const [mode, setMode] = useState<StudyMode>("reader")
  const tabs = STUDY_TABS.filter((tab) => (
    tab.key === "reader" ||
    (tab.key === "search" && ctx.allowedSections.includes("search")) ||
    (tab.key === "references" && ctx.allowedSections.includes("references")) ||
    (tab.key === "dictionary" && ctx.allowedSections.includes("dictionary")) ||
    (tab.key === "plans" && Boolean(ctx.user) && ctx.allowedSections.includes("plans"))
  ))
  const activeMode = tabs.some((tab) => tab.key === mode) ? mode : tabs[0]?.key ?? "reader"

  return (
    <div className="flex h-full min-h-0 flex-col bg-background">
      <SegmentTabs tabs={tabs} active={activeMode} onChange={setMode} />
      <div className="min-h-0 flex-1 overflow-y-auto">
        {activeMode === "reader" ? (
          <BibleReader
            initialBookId={ctx.navBookId}
            initialChapter={ctx.navChapter}
            initialVerse={ctx.navVerse}
            initialBibleId={ctx.navBibleId}
            onClearInitialValues={ctx.handleClearNavValues}
            showOnlyVerseNotes={true}
            isGuest={ctx.isGuest}
            onLoginRequest={ctx.openLogin}
          />
        ) : activeMode === "search" ? (
          <SearchAdvanced onSelectVerse={(bookId, chapter, verse, bibleId) => {
            ctx.handleSelectVerse(bookId, chapter, verse, bibleId)
            setMode("reader")
          }} />
        ) : activeMode === "references" ? (
          <ReferencesExplorer />
        ) : activeMode === "dictionary" ? (
          <StrongDictionary />
        ) : (
          <ReadingPlans
            onSelectReading={(bookId, chapter) => {
              ctx.handleSelectVerse(bookId, chapter)
              setMode("reader")
            }}
            streakCount={ctx.user!.streakCount || 0}
          />
        )}
      </div>
    </div>
  )
}

function NotesHub(ctx: SectionRenderContext) {
  return (
    <NotesSection
      editingNote={ctx.notebookEditingNote}
      setEditingNote={ctx.setNotebookEditingNote}
      allowedSections={ctx.allowedSections}
      onSelectReading={ctx.handleSelectVerse}
      streakCount={ctx.user?.streakCount ?? 0}
      onSessionExpired={() => {
        localStorage.removeItem("biblia_token")
        window.location.reload()
      }}
    />
  )
}

function ProfileHub(ctx: SectionRenderContext) {
  const [mode, setMode] = useState<ProfileMode>("profile")
  const tabs = PROFILE_TABS.filter((tab) => (
    tab.key === "profile" ||
    (tab.key === "favorites" && ctx.allowedSections.includes("favorites")) ||
    (tab.key === "highlights" && ctx.allowedSections.includes("highlights")) ||
    (tab.key === "plans" && ctx.allowedSections.includes("plans")) ||
    (tab.key === "activity" && ctx.allowedSections.includes("activity")) ||
    (tab.key === "statistics" && ctx.allowedSections.includes("statistics"))
  ))
  const activeMode = tabs.some((tab) => tab.key === mode) ? mode : tabs[0]?.key ?? "profile"

  return (
    <div className="flex h-full min-h-0 flex-col bg-background">
      <SegmentTabs tabs={tabs} active={activeMode} onChange={setMode} />
      <div className="min-h-0 flex-1 overflow-y-auto">
        {activeMode === "profile" ? (
          <ProfileSection
            currentUserId={ctx.user!.id}
            initialUsername={ctx.user!.username || undefined}
          />
        ) : activeMode === "favorites" ? (
          <Favorites />
        ) : activeMode === "highlights" ? (
          <HighlightsManager />
        ) : activeMode === "plans" ? (
          <ReadingPlans
            onSelectReading={ctx.handleSelectVerse}
            streakCount={ctx.user!.streakCount || 0}
          />
        ) : activeMode === "activity" ? (
          <Activity />
        ) : (
          <Statistics />
        )}
      </div>
    </div>
  )
}

registerAppSectionComplete({
  ...meta("dashboard"),
  icon: AppIcons.home,
  render: (ctx) => (
    <Dashboard
      userName={ctx.user?.name}
      userRole={ctx.user?.role}
      isGuest={ctx.isGuest}
      setActiveTab={ctx.setActiveTab}
      onLoginRequest={ctx.openLogin}
      onSelectVerse={ctx.handleSelectVerse}
    />
  ),
})

registerAppSectionComplete({
  ...meta("reading"),
  icon: AppIcons.bible,
  suspenseFallback: "Cargando Biblia...",
  render: (ctx) => <StudyHub {...ctx} />,
})

registerAppSectionComplete({
  ...meta("feed"),
  icon: AppIcons.community,
  requiresUser: true,
  layout: "card",
  suspenseFallback: "Cargando Feed...",
  render: (ctx) => <Feed currentUserId={ctx.user!.id} userRole={ctx.user!.role} />,
})

registerAppSectionComplete({
  ...meta("search"),
  icon: AppIcons.search,
  render: (ctx) => <SearchAdvanced onSelectVerse={ctx.handleSelectVerse} />,
})

registerAppSectionComplete({
  ...meta("references"),
  icon: AppIcons.link,
  render: () => <ReferencesExplorer />,
})

registerAppSectionComplete({
  ...meta("dictionary"),
  icon: AppIcons.dictionary,
  render: () => <StrongDictionary />,
})

registerAppSectionComplete({
  ...meta("games"),
  icon: AppIcons.trophy,
  render: (ctx) => <BibleGames key={ctx.user?.id ?? "guest"} userId={ctx.user?.id} onOpenPassage={ctx.handleSelectVerse} />,
})

registerAppSectionComplete({
  ...meta("library"),
  icon: AppIcons.library,
  render: () => <PersonalLibrary />,
})

registerAppSectionComplete({
  ...meta("notebook"),
  icon: AppIcons.notes,
  layout: "notebook",
  suspenseFallback: "Cargando libreta...",
  render: (ctx) => <NotesHub {...ctx} />,
})

registerAppSectionComplete({
  ...meta("profile"),
  icon: AppIcons.profile,
  requiresUser: true,
  layout: "fullscreen",
  suspenseFallback: "Cargando Perfil...",
  render: (ctx) => <ProfileHub {...ctx} />,
})

registerAppSectionComplete({
  ...meta("favorites"),
  icon: AppIcons.heart,
  render: () => <Favorites />,
})

registerAppSectionComplete({
  ...meta("highlights"),
  icon: AppIcons.highlighter,
  render: () => <HighlightsManager />,
})

registerAppSectionComplete({
  ...meta("plans"),
  icon: AppIcons.readingPlan,
  requiresUser: true,
  render: (ctx) => (
    <ReadingPlans
      onSelectReading={ctx.handleSelectVerse}
      streakCount={ctx.user!.streakCount || 0}
    />
  ),
})

registerAppSectionComplete({
  ...meta("prayers"),
  icon: AppIcons.heart,
  render: () => <PrayerRequests />,
})

registerAppSectionComplete({
  ...meta("devotionals"),
  icon: AppIcons.heart,
  render: () => <Devotionals />,
})

registerAppSectionComplete({
  ...meta("groups"),
  icon: AppIcons.groups,
  requiresUser: true,
  render: (ctx) => (
    <Groups
      currentUserId={ctx.user!.id}
      initialGroupId={ctx.navGroupId}
      onClearInitialGroupId={ctx.handleClearNavGroupId}
    />
  ),
})

registerAppSectionComplete({
  ...meta("calendar"),
  icon: AppIcons.calendar,
  requiresUser: true,
  render: (ctx) => <ChurchCalendar isAdmin={ctx.user!.role === "admin"} />,
})

registerAppSectionComplete({
  ...meta("discipleship"),
  icon: AppIcons.groups,
  requiresUser: true,
  render: (ctx) => <Discipleship currentUserId={ctx.user!.id} />,
})

registerAppSectionComplete({
  ...meta("activity"),
  icon: AppIcons.sync,
  render: () => <Activity />,
})

registerAppSectionComplete({
  ...meta("statistics"),
  icon: AppIcons.chart,
  render: () => <Statistics />,
})

registerAppSectionComplete({
  ...meta("users"),
  icon: AppIcons.groups,
  requiresUser: true,
  render: (ctx) => <UserManagement currentUserId={ctx.user!.id} />,
})
