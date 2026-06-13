"use client"

import { Suspense } from "react"
import {
  Activity as ActivityIcon,
  BarChart2,
  BookMarked,
  BookOpen,
  BookText,
  Calendar,
  Heart,
  HeartHandshake,
  Highlighter,
  LayoutDashboard,
  Library,
  Link as LinkIcon,
  Search,
  Star,
  User,
  UserPlus,
  Users,
} from "lucide-react"
import { Activity } from "@/components/activity"
import { BibleReader } from "@/components/bible-reader"
import { Dashboard } from "@/components/dashboard"
import { Devotionals } from "@/components/devotionals"
import { Favorites } from "@/components/favorites"
import { Feed } from "@/components/feed"
import { Groups } from "@/components/groups"
import { ChurchCalendar } from "@/components/church-calendar"
import { Discipleship } from "@/components/discipleship"
import { HighlightsManager } from "@/components/highlights-manager"
import { NotebookSidebar } from "@/components/notebook-sidebar"
import { PersonalLibrary } from "@/components/personal-library"
import { PrayerRequests } from "@/components/prayer-requests"
import { ProfileSection } from "@/components/profile-section"
import { ReadingPlans } from "@/components/reading-plans"
import { ReferencesExplorer } from "@/components/references-explorer"
import { SearchAdvanced } from "@/components/search-advanced"
import { StrongDictionary } from "@/components/strong-dictionary"
import { Statistics } from "@/components/statistics"
import { UserManagement } from "@/components/user-management"
import { APP_SECTION_CATALOG, type AppSectionId } from "./catalog"
import { registerAppSectionComplete } from "./store"

function meta(id: AppSectionId) {
  const section = APP_SECTION_CATALOG.find((entry) => entry.id === id)
  if (!section) {
    throw new Error(`Sección "${id}" no está en APP_SECTION_CATALOG (lib/app-section-registry/catalog.ts)`)
  }
  return section
}

/**
 * Registra icono + componente de cada sección.
 * Metadatos (permisos, invitados, labels): lib/app-section-registry/catalog.ts
 *
 * Guía completa: docs/nuevas-secciones.md
 */
registerAppSectionComplete({
  ...meta("dashboard"),
  icon: LayoutDashboard,
  render: (ctx) => (
    <Dashboard
      userName={ctx.user?.name}
      userRole={ctx.user?.role}
      isGuest={ctx.isGuest}
      setActiveTab={ctx.setActiveTab}
      onLoginRequest={ctx.openLogin}
    />
  ),
})

registerAppSectionComplete({
  ...meta("reading"),
  icon: BookOpen,
  suspenseFallback: "Cargando Biblia...",
  render: (ctx) => (
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
  ),
})

registerAppSectionComplete({
  ...meta("feed"),
  icon: Users,
  requiresUser: true,
  layout: "card",
  suspenseFallback: "Cargando Feed...",
  render: (ctx) => <Feed currentUserId={ctx.user!.id} userRole={ctx.user!.role} />,
})

registerAppSectionComplete({
  ...meta("search"),
  icon: Search,
  render: (ctx) => <SearchAdvanced onSelectVerse={ctx.handleSelectVerse} />,
})

registerAppSectionComplete({
  ...meta("references"),
  icon: LinkIcon,
  render: () => <ReferencesExplorer />,
})

registerAppSectionComplete({
  ...meta("dictionary"),
  icon: BookMarked,
  render: () => <StrongDictionary />,
})

registerAppSectionComplete({
  ...meta("library"),
  icon: Library,
  render: () => <PersonalLibrary />,
})

registerAppSectionComplete({
  ...meta("notebook"),
  icon: BookText,
  layout: "notebook",
  suspenseFallback: "Cargando libreta...",
  render: (ctx) => (
    <NotebookSidebar
      editingNote={ctx.notebookEditingNote}
      setEditingNote={ctx.setNotebookEditingNote}
      onSessionExpired={() => {
        localStorage.removeItem("biblia_token")
        window.location.reload()
      }}
    />
  ),
})

registerAppSectionComplete({
  ...meta("profile"),
  icon: User,
  requiresUser: true,
  layout: "fullscreen",
  suspenseFallback: "Cargando Perfil...",
  render: (ctx) => (
    <ProfileSection
      currentUserId={ctx.user!.id}
      initialUsername={ctx.user!.username || undefined}
    />
  ),
})

registerAppSectionComplete({
  ...meta("favorites"),
  icon: Star,
  render: () => <Favorites />,
})

registerAppSectionComplete({
  ...meta("highlights"),
  icon: Highlighter,
  render: () => <HighlightsManager />,
})

registerAppSectionComplete({
  ...meta("plans"),
  icon: Calendar,
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
  icon: HeartHandshake,
  render: () => <PrayerRequests />,
})

registerAppSectionComplete({
  ...meta("devotionals"),
  icon: Heart,
  render: () => <Devotionals />,
})

registerAppSectionComplete({
  ...meta("groups"),
  icon: Users,
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
  icon: Calendar,
  requiresUser: true,
  render: (ctx) => <ChurchCalendar isAdmin={ctx.user!.role === "admin"} />,
})

registerAppSectionComplete({
  ...meta("discipleship"),
  icon: UserPlus,
  requiresUser: true,
  render: (ctx) => <Discipleship currentUserId={ctx.user!.id} />,
})

registerAppSectionComplete({
  ...meta("activity"),
  icon: ActivityIcon,
  render: () => <Activity />,
})

registerAppSectionComplete({
  ...meta("statistics"),
  icon: BarChart2,
  render: () => <Statistics />,
})

registerAppSectionComplete({
  ...meta("users"),
  icon: Users,
  requiresUser: true,
  render: (ctx) => <UserManagement currentUserId={ctx.user!.id} />,
})