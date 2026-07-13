"use client"

import * as React from "react"
import { useState, useEffect, useCallback } from "react"
import useSWR from "swr"
import { fetcher } from "@/lib/fetcher"
import { AuthModal } from "@/components/auth-modal"
import { ConnectionBanner } from "@/components/connection-banner"
import { MobileAppBanner } from "@/components/mobile-app-banner"
import { GroupJoinModal } from "@/components/group-join-modal"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ThemeToggle } from "@/components/theme-toggle"
import { NotificationBell } from "@/components/notification-bell"
import { 
  LogOut,
  LogIn,
  Loader2,
  Lock,
  Search,
  User,
  Users,
  Flame,
  MoreHorizontal,
  PanelLeftClose,
  PanelLeftOpen
} from "lucide-react"
import { cn } from "@/lib/utils"
import { loadReaderDeepLink, lockReaderDeepLink, isReaderDeepLinkLocked } from "@/lib/bible-url"
import { loadPendingGroupJoin, clearPendingGroupJoin } from "@/lib/group-invite"
import { GUEST_SECTIONS, resolveAllowedSections } from "@/lib/app-sections"
import {
  AppSectionOutlet,
  buildAppNavItems,
  getNavGroupOrder,
} from "@/lib/app-section-registry/index.client"

function getInitialDeepLink() {
  if (typeof window === "undefined") return null
  return loadReaderDeepLink()
}

// Deep link al diccionario: /?strong=G25
function hasStrongDeepLink() {
  if (typeof window === "undefined") return false
  const code = new URLSearchParams(window.location.search).get("strong")
  return !!code && /^[gh]\d+$/i.test(code)
}

interface UserProfile {
  id: number
  name: string
  email: string
  username: string | null
  role: string
  allowedSections: string | string[] | null
  streakCount: number
}

const APP_NAV_ITEMS = buildAppNavItems()
const NAV_GROUPS = getNavGroupOrder()

export default function Page() {
  const { data, mutate, isLoading } = useSWR<{ user: UserProfile | null }>(
    "/api/auth/me",
    fetcher,
    {
      shouldRetryOnError: false,
    }
  )

  const user = data?.user ?? null
  const isResolvingSession = isLoading
  const isGuest = !isLoading && !user

  const { data: churchData } = useSWR<{ settings: { church_name: string; church_logo_url: string | null } }>(
    user ? "/api/church-settings" : null,
    fetcher,
  )
  const churchLogo = churchData?.settings?.church_logo_url || "/logo.png"
  const churchName = churchData?.settings?.church_name || "BibliaAPP"

  const [showAuthModal, setShowAuthModal] = useState(false)
  const [googleLinkedBanner, setGoogleLinkedBanner] = useState(false)
  const openLogin = useCallback(() => setShowAuthModal(true), [])

  useEffect(() => {
    if (typeof window === "undefined") return
    const params = new URLSearchParams(window.location.search)
    if (params.get("googleLinked") === "1") {
      setGoogleLinkedBanner(true)
      params.delete("googleLinked")
      const next = params.toString()
      const url = next ? `${window.location.pathname}?${next}` : window.location.pathname
      window.history.replaceState(null, "", url)
    }
  }, [])

  // Navigation tabs
  const [activeTab, setActiveTab] = useState<string>(() => {
    if (hasStrongDeepLink()) return "dictionary"
    const deepLink = getInitialDeepLink()
    return deepLink || isReaderDeepLinkLocked() ? "reading" : "dashboard"
  })

  // Direct reader navigation state (from Search page or shared links)
  const [navBookId, setNavBookId] = useState<number | null>(() => getInitialDeepLink()?.book ?? null)
  const [navChapter, setNavChapter] = useState<number | null>(() => getInitialDeepLink()?.chapter ?? null)
  const [navVerse, setNavVerse] = useState<number | null>(() => getInitialDeepLink()?.verse ?? null)
  const [navBibleId, setNavBibleId] = useState<number | null>(() => getInitialDeepLink()?.bible ?? null)
  const [hasPendingDeepLink, setHasPendingDeepLink] = useState(
    () => !!getInitialDeepLink() || isReaderDeepLinkLocked(),
  )

  const [pendingGroupJoinCode, setPendingGroupJoinCode] = useState<string | null>(() => {
    if (typeof window === "undefined") return null
    return loadPendingGroupJoin()
  })
  const [showGroupJoinModal, setShowGroupJoinModal] = useState(() => {
    if (typeof window === "undefined") return false
    return !!loadPendingGroupJoin()
  })
  const [navGroupId, setNavGroupId] = useState<number | null>(null)

  const applyDeepLink = useCallback((deepLink: NonNullable<ReturnType<typeof loadReaderDeepLink>>) => {
    lockReaderDeepLink()
    setHasPendingDeepLink(true)
    setActiveTab("reading")
    if (deepLink.bible != null) setNavBibleId(deepLink.bible)
    if (deepLink.book != null) setNavBookId(deepLink.book)
    if (deepLink.chapter != null) setNavChapter(deepLink.chapter)
    if (deepLink.verse != null) setNavVerse(deepLink.verse)
  }, [])

  // Separated Notebook Tab States
  const [notebookEditingNote, setNotebookEditingNote] = useState<{ id: number; title: string; content: string; tags?: string } | null>(null)

  // Mobile navigation bottom sheet state
  const [showMobileMore, setShowMobileMore] = useState(false)

  // Desktop sidebar collapsed state (persisted in localStorage)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("sidebar_collapsed") === "true"
    }
    return false
  })

  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed(prev => {
      const next = !prev
      localStorage.setItem("sidebar_collapsed", String(next))
      return next
    })
  }, [])

  // Parsed sections permissions
  const allowedSections = React.useMemo(() => {
    if (isGuest) return GUEST_SECTIONS
    if (!user) return []
    return resolveAllowedSections(user)
  }, [isGuest, user])

  function handleClearNavGroupId() {
    setNavGroupId(null)
  }

  const handleGroupJoined = useCallback((groupId: number) => {
    clearPendingGroupJoin()
    setPendingGroupJoinCode(null)
    setShowGroupJoinModal(false)
    setNavGroupId(groupId)
    setActiveTab("groups")
  }, [])

  const handleCloseGroupJoinModal = useCallback(() => {
    clearPendingGroupJoin()
    setPendingGroupJoinCode(null)
    setShowGroupJoinModal(false)
  }, [])

  // Detect group invite deep link on mount
  useEffect(() => {
    const code = loadPendingGroupJoin()
    if (code) {
      setPendingGroupJoinCode(code)
      setShowGroupJoinModal(true)
    }
  }, [])

  // After login, re-show join modal if there was a pending invite
  useEffect(() => {
    if (!isLoading && user && pendingGroupJoinCode && !showGroupJoinModal) {
      setShowGroupJoinModal(true)
    }
  }, [isLoading, user, pendingGroupJoinCode, showGroupJoinModal])

  // Apply shared verse links on mount
  useEffect(() => {
    const deepLink = loadReaderDeepLink()
    if (deepLink) applyDeepLink(deepLink)
  }, [applyDeepLink])

  // Set default tab based on user role and permissions (never override a shared verse link)
  useEffect(() => {
    if (isReaderDeepLinkLocked()) return
    if (hasStrongDeepLink()) return
    if (pendingGroupJoinCode) return

    const deepLink = loadReaderDeepLink()
    if (deepLink) {
      applyDeepLink(deepLink)
      return
    }

    if (isGuest) {
      setActiveTab("dashboard")
    } else if (user) {
      const defaults = user.role === "admin" ? "dashboard" : "reading"
      if (allowedSections.includes(defaults)) {
        setActiveTab(defaults)
      } else if (allowedSections.length > 0) {
        setActiveTab(allowedSections[0])
      }
    }
  }, [isGuest, user, allowedSections, applyDeepLink, pendingGroupJoinCode])

  async function handleLogout() {
    if (!confirm("¿Estás seguro de cerrar sesión?")) return
    try {
      await fetch("/api/auth/logout", { method: "POST" })
      localStorage.removeItem("biblia_token")
      mutate(undefined, { revalidate: true })
    } catch (err) {
      console.error("Error logging out:", err)
    }
  }

  const handleSelectVerse = (bookId: number, chapter: number, verse?: number, bibleId?: number) => {
    setNavBookId(bookId)
    setNavChapter(chapter)
    setNavVerse(verse || 1)
    if (bibleId) {
      setNavBibleId(bibleId)
    }
    setActiveTab("reading")
  }

  function handleClearNavValues() {
    setNavBookId(null)
    setNavChapter(null)
    setNavVerse(null)
    setNavBibleId(null)
    setHasPendingDeepLink(false)
  }

  // Pantalla de carga solo para deep links al lector (evita flash incorrecto)
  if (isResolvingSession && hasPendingDeepLink) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background text-muted-foreground">
        <Loader2 className="size-10 animate-spin text-primary mb-4" />
        <p className="text-sm font-medium">Cargando tu estudio bíblico...</p>
      </div>
    )
  }

  // Render auth screen if not authenticated
  if (user && !user.username) {
    return <UsernameSetupModal user={user} onComplete={() => mutate()} />
  }

  const isTabLocked = (tabId: string) => isGuest && !GUEST_SECTIONS.includes(tabId)

  const desktopNavItems = isGuest
    ? APP_NAV_ITEMS
    : APP_NAV_ITEMS.filter(item => allowedSections.includes(item.id))

  const guestDirectIds = GUEST_SECTIONS
  const showMoreButton = isGuest
    ? APP_NAV_ITEMS.some(item => !guestDirectIds.includes(item.id))
    : desktopNavItems.length > 5
  const mobileDirectItems = isGuest
    ? APP_NAV_ITEMS.filter(item => guestDirectIds.includes(item.id))
    : showMoreButton ? desktopNavItems.slice(0, 4) : desktopNavItems
  const mobileMoreItems = isGuest
    ? APP_NAV_ITEMS.filter(item => !guestDirectIds.includes(item.id))
    : showMoreButton ? desktopNavItems.slice(4) : []

  const activeLabel = APP_NAV_ITEMS.find(item => item.id === activeTab)?.label ?? "Estudio"

  return (
    <main className="mobile-app-shell min-h-[100dvh] bg-background flex flex-col md:min-h-screen md:flex-row">
      <ConnectionBanner />
      <MobileAppBanner />
      {googleLinkedBanner ? (
        <div className="mx-4 mt-3 rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-800 dark:text-emerald-200 flex items-start justify-between gap-3">
          <p>
            <strong>Cuenta vinculada con Google.</strong> Entraste a la misma cuenta que ya tenías; tus libretas y datos siguen aquí.
          </p>
          <button
            type="button"
            onClick={() => setGoogleLinkedBanner(false)}
            className="text-xs font-semibold shrink-0 opacity-70 hover:opacity-100"
          >
            Cerrar
          </button>
        </div>
      ) : null}

      {/* Desktop Navigation (Collapsible Sidebar) */}
      <aside
        className={cn(
          "hidden md:flex md:flex-col md:fixed md:inset-y-0 border-r border-border bg-card/65 backdrop-blur-md z-30 transition-all duration-300 ease-in-out",
          sidebarCollapsed ? "md:w-[60px]" : "md:w-64"
        )}
      >
        <div className="flex flex-col flex-grow pt-4 pb-4 overflow-y-auto overflow-x-hidden">

          {/* Logo + collapse toggle */}
          <div className={cn("flex items-center mb-3 px-3", sidebarCollapsed ? "justify-center" : "justify-between gap-2 px-4")}>
            <div className={cn("flex items-center gap-2.5", sidebarCollapsed && "justify-center")}>
              <img
                src={churchLogo}
                alt={`Logo ${churchName}`}
                className="size-8 rounded-lg object-cover shadow-md shadow-primary/20 shrink-0"
              />
              {!sidebarCollapsed && (
                <div className="flex flex-col min-w-0">
                  <h1 className="text-sm font-bold tracking-tight text-foreground leading-none">{churchName}</h1>
                  <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider mt-0.5">
                    {isGuest ? "Visitante" : user?.role === "admin" ? "Administrador" : "Lector"}
                  </p>
                </div>
              )}
            </div>
            {!sidebarCollapsed && (
              <button
                onClick={toggleSidebar}
                title="Colapsar menú"
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-all shrink-0"
              >
                <PanelLeftClose className="size-4" />
              </button>
            )}
          </div>

          {/* Racha */}
          {!isGuest && user && (
          <div className={cn("flex items-center mb-4 shrink-0", sidebarCollapsed ? "justify-center px-2" : "px-5")}>
            {sidebarCollapsed ? (
              <div title={`Racha: ${user.streakCount || 0} días`} className="flex items-center justify-center size-8 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <Flame className="size-4 fill-amber-500 text-amber-500 animate-pulse" />
              </div>
            ) : (
              <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 rounded-xl text-xs font-bold">
                <Flame className="size-4 fill-amber-500 text-amber-500 animate-pulse" />
                <span>Racha: {user.streakCount || 0} {user.streakCount === 1 ? "día" : "días"}</span>
              </div>
            )}
          </div>
          )}

          {/* Navigation links */}
          <nav className={cn("flex-1 pb-4 space-y-1", sidebarCollapsed ? "px-2" : "px-3 space-y-5")}>
            {sidebarCollapsed ? (
              // Collapsed: only icons, no sections
              desktopNavItems.map((item) => {
                const Icon = item.icon
                const isActive = activeTab === item.id
                const locked = isTabLocked(item.id)
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    title={locked ? `${item.label} (requiere cuenta)` : item.label}
                    className={cn(
                      "flex items-center justify-center w-full p-2.5 rounded-xl transition-all group cursor-pointer relative",
                      isActive
                        ? "bg-primary text-primary-foreground shadow-md"
                        : "text-muted-foreground hover:bg-accent/40 hover:text-foreground",
                      locked && !isActive && "opacity-70"
                    )}
                  >
                    <Icon className="size-5 shrink-0" />
                    {locked && (
                      <Lock className="size-2.5 absolute top-1 right-1 text-muted-foreground" />
                    )}
                  </button>
                )
              })
            ) : (
              // Expanded: sections + labels
              NAV_GROUPS.map(group => {
                const sectionItems = desktopNavItems.filter(item => item.groupId === group.id)
                if (sectionItems.length === 0) return null
                return (
                  <div key={group.id} className="space-y-0.5">
                    <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-3 mb-1.5">
                      {group.label}
                    </h3>
                    {sectionItems.map((item) => {
                      const Icon = item.icon
                      const isActive = activeTab === item.id
                      const locked = isTabLocked(item.id)
                      return (
                        <button
                          key={item.id}
                          onClick={() => setActiveTab(item.id)}
                          className={cn(
                            "flex items-center gap-3 w-full px-3 py-2 rounded-xl text-sm font-medium transition-all group cursor-pointer",
                            isActive
                              ? "bg-primary text-primary-foreground shadow-md shadow-primary/10"
                              : "text-muted-foreground hover:bg-accent/40 hover:text-foreground",
                            locked && !isActive && "opacity-75"
                          )}
                        >
                          <Icon className={cn("size-4 shrink-0 transition-transform group-hover:scale-110", isActive ? "" : "text-muted-foreground group-hover:text-primary")} />
                          <span className="flex-1 text-left">{item.label}</span>
                          {locked && <Lock className="size-3 shrink-0 opacity-60" />}
                        </button>
                      )
                    })}
                  </div>
                )
              })
            )}
          </nav>
        </div>

        {/* User profile section & ThemeToggle */}
        <div className={cn("flex flex-col gap-2 p-3 border-t border-border bg-card/40", sidebarCollapsed && "items-center")}>
          {isGuest ? (
            sidebarCollapsed ? (
              <>
                <button
                  onClick={toggleSidebar}
                  title="Expandir menú"
                  className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-all"
                >
                  <PanelLeftOpen className="size-4" />
                </button>
                <ThemeToggle />
                <button
                  onClick={openLogin}
                  title="Iniciar sesión"
                  className="p-2 rounded-lg text-primary hover:bg-primary/10 transition-all"
                >
                  <LogIn className="size-4" />
                </button>
              </>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="flex size-8 items-center justify-center rounded-full bg-muted text-muted-foreground shrink-0">
                      <User className="size-4" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-foreground truncate">Modo visitante</p>
                      <p className="text-[10px] text-muted-foreground truncate">Explora sin cuenta</p>
                    </div>
                  </div>
                  <ThemeToggle />
                </div>
                <button
                  onClick={openLogin}
                  className="flex items-center justify-center gap-2 w-full px-3 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-all cursor-pointer"
                >
                  <LogIn className="size-3.5" />
                  <span>Iniciar sesión</span>
                </button>
              </>
            )
          ) : sidebarCollapsed ? (
            <>
              <button
                onClick={toggleSidebar}
                title="Expandir menú"
                className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-all"
              >
                <PanelLeftOpen className="size-4" />
              </button>
              <ThemeToggle />
              <button
                onClick={handleLogout}
                title="Cerrar Sesión"
                className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all"
              >
                <LogOut className="size-4" />
              </button>
            </>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-primary shrink-0">
                    <User className="size-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-foreground truncate">{user?.name}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{user?.email}</p>
                  </div>
                </div>
                <div className="flex items-center">
                  {allowedSections.includes("feed") && (
                    <NotificationBell
                      onNavigateToFeed={() => setActiveTab("feed")}
                      onNavigateToPrayers={() => setActiveTab("prayers")}
                      onNavigateToGroup={(groupId) => {
                        setNavGroupId(groupId)
                        setActiveTab("groups")
                      }}
                      dropDirection="up"
                    />
                  )}
                  <ThemeToggle />
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center justify-center gap-2 w-full px-3 py-2 rounded-lg border border-border bg-transparent text-xs font-semibold text-muted-foreground hover:bg-destructive/10 hover:text-destructive hover:border-destructive/25 transition-all cursor-pointer"
              >
                <LogOut className="size-3.5" />
                <span>Cerrar Sesión</span>
              </button>
            </>
          )}
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="mobile-app-header md:hidden sticky top-0 left-0 right-0 z-40 flex h-[58px] items-center justify-between border-b border-border/70 bg-background/95 px-4 backdrop-blur-xl animate-fade-in">
        <div className="flex min-w-0 items-center gap-2.5">
          <img 
            src={churchLogo} 
            alt={`Logo ${churchName}`} 
            className="size-9 rounded-xl border border-border/70 bg-card object-cover shadow-sm"
          />
          <div className="min-w-0">
            <span className="block truncate text-[17px] font-extrabold leading-tight text-foreground">{activeLabel}</span>
            <span className="block truncate text-[11px] font-semibold leading-tight text-muted-foreground">{churchName}</span>
          </div>
          
          {/* Racha (Mobile) */}
          {!isGuest && user && (
          <div className="ml-0.5 flex shrink-0 items-center gap-0.5 rounded-full border border-amber-500/20 bg-amber-500/10 px-2 py-1 text-xs font-extrabold text-amber-700 dark:text-amber-300">
            <Flame className="size-3.5 fill-amber-500 text-amber-500 animate-pulse" />
            <span>{user.streakCount || 0}</span>
          </div>
          )}
        </div>
        
        <div className="flex shrink-0 items-center gap-1.5">
          {allowedSections.includes("search") && (
            <button
              onClick={() => setActiveTab("search")}
              className={cn(
                "flex size-9 items-center justify-center rounded-xl border transition-colors",
                activeTab === "search"
                  ? "border-primary/25 bg-primary/10 text-primary"
                  : "border-border/70 bg-card text-muted-foreground hover:text-foreground"
              )}
              title="Buscar"
            >
              <Search className="size-4.5" />
            </button>
          )}
          {allowedSections.includes("users") && (
            <button
              onClick={() => setActiveTab("users")}
              className={cn(
                "flex size-9 items-center justify-center rounded-xl border transition-colors",
                activeTab === "users"
                  ? "border-primary/25 bg-primary/10 text-primary"
                  : "border-border/70 bg-card text-muted-foreground hover:text-foreground"
              )}
              title="Gestión de Usuarios"
            >
              <Users className="size-4.5" />
            </button>
          )}
          {!isGuest && allowedSections.includes("feed") && (
            <NotificationBell
              onNavigateToFeed={() => setActiveTab("feed")}
              onNavigateToPrayers={() => setActiveTab("prayers")}
              onNavigateToGroup={(groupId) => {
                setNavGroupId(groupId)
                setActiveTab("groups")
              }}
            />
          )}
          <ThemeToggle />
          {isGuest ? (
            <button
              onClick={openLogin}
              className="flex size-9 items-center justify-center rounded-xl border border-primary/25 bg-primary/10 text-primary transition-colors hover:bg-primary/15"
              title="Iniciar sesión"
            >
              <LogIn className="size-4.5" />
            </button>
          ) : (
          <button
            onClick={handleLogout}
            className="flex size-9 items-center justify-center rounded-xl border border-border/70 bg-card text-muted-foreground transition-colors hover:text-destructive"
            title="Cerrar Sesión"
          >
            <LogOut className="size-4.5" />
          </button>
          )}
        </div>
      </div>

      {/* Page Content Area */}
      <div className={cn("flex-1 flex flex-col min-h-[100dvh] overflow-hidden pb-[calc(72px+env(safe-area-inset-bottom))] md:min-h-screen md:pb-0 transition-all duration-300 ease-in-out", sidebarCollapsed ? "md:pl-[60px]" : "md:pl-64")}>
        <div className="mobile-web-content flex-grow overflow-y-auto p-0 md:p-6">
          <AppSectionOutlet
            activeTab={activeTab}
            isGuest={isGuest}
            user={user}
            allowedSections={allowedSections}
            openLogin={openLogin}
            setActiveTab={setActiveTab}
            navBookId={navBookId}
            navChapter={navChapter}
            navVerse={navVerse}
            navBibleId={navBibleId}
            handleClearNavValues={handleClearNavValues}
            handleSelectVerse={handleSelectVerse}
            notebookEditingNote={notebookEditingNote}
            setNotebookEditingNote={setNotebookEditingNote}
            navGroupId={navGroupId}
            handleClearNavGroupId={handleClearNavGroupId}
          />
        </div>
      </div>

      {/* Mobile More Sheet */}
      {showMobileMore && (
        <div 
          className="md:hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end justify-center transition-all animate-fade-in"
          onClick={() => setShowMobileMore(false)}
        >
          <div 
            className="w-full max-h-[82vh] overflow-y-auto rounded-t-[22px] border-t border-border bg-card p-4 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-2xl backdrop-blur-xl animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-muted-foreground/25" />
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <div>
                <h3 className="text-[17px] font-extrabold leading-tight text-foreground">Más</h3>
                <p className="text-xs font-semibold text-muted-foreground">Herramientas disponibles</p>
              </div>
              <button 
                onClick={() => setShowMobileMore(false)}
                className="rounded-full bg-muted px-3 py-1.5 text-xs font-extrabold text-muted-foreground transition-colors hover:text-foreground"
              >
                Cerrar
              </button>
            </div>
            
            <div className="grid grid-cols-3 gap-3 pt-4">
              {mobileMoreItems.map((item) => {
                const Icon = item.icon
                const isActive = activeTab === item.id
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveTab(item.id)
                      setShowMobileMore(false)
                    }}
                    className={cn(
                      "flex min-h-[82px] flex-col items-center justify-center gap-2 rounded-2xl border p-3 text-center transition-all active:scale-[0.97] cursor-pointer",
                      isActive 
                        ? "border-primary bg-primary text-primary-foreground shadow-md"
                        : "border-border bg-background text-muted-foreground hover:bg-accent/40 hover:text-foreground"
                    )}
                  >
                    <Icon className="size-5" />
                    <span className="text-[10px] font-bold tracking-tight line-clamp-1">{item.label}</span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Mobile Bottom Navigation (Persist bottom menu) */}
      <nav className="mobile-tabbar md:hidden fixed bottom-0 left-0 right-0 z-40 flex h-[calc(72px+env(safe-area-inset-bottom))] items-start justify-around border-t border-border bg-card/98 px-2 pt-1.5 shadow-[0_-8px_24px_rgba(28,25,23,0.08)] backdrop-blur-xl">
        {mobileDirectItems.map((item) => {
          const Icon = item.icon
          const isActive = activeTab === item.id && !showMobileMore
          return (
            <button
              key={item.id}
              onClick={() => {
                setActiveTab(item.id)
                setShowMobileMore(false)
              }}
              className={cn(
                "flex min-w-0 flex-1 flex-col items-center justify-start gap-0.5 py-1 text-[10px] font-bold transition-all cursor-pointer",
                isActive 
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <span className={cn(
                "flex size-8 items-center justify-center rounded-xl transition-colors",
                isActive ? "bg-primary/10" : "bg-transparent"
              )}>
                <Icon className={cn("size-5 transition-transform", isActive ? "stroke-[2.5]" : "")} />
              </span>
              <span className="max-w-full truncate leading-tight">{item.label}</span>
            </button>
          )
        })}
        {showMoreButton && (
          <button
            onClick={() => setShowMobileMore(!showMobileMore)}
            className={cn(
              "flex min-w-0 flex-1 flex-col items-center justify-start gap-0.5 py-1 text-[10px] font-bold transition-all cursor-pointer",
              showMobileMore 
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <span className={cn(
              "flex size-8 items-center justify-center rounded-xl transition-colors",
              showMobileMore ? "bg-primary/10" : "bg-transparent"
            )}>
              <MoreHorizontal className={cn("size-5 transition-transform", showMobileMore ? "stroke-[2.5]" : "")} />
            </span>
            <span className="leading-tight">Más</span>
          </button>
        )}
      </nav>

      {showAuthModal && (
        <AuthModal
          onClose={() => setShowAuthModal(false)}
          onLoginSuccess={() => {
            setShowAuthModal(false)
            mutate()
          }}
        />
      )}

      {showGroupJoinModal && pendingGroupJoinCode && (
        <GroupJoinModal
          inviteCode={pendingGroupJoinCode}
          isGuest={isGuest}
          onClose={handleCloseGroupJoinModal}
          onLoginRequest={() => {
            setShowGroupJoinModal(false)
            openLogin()
          }}
          onJoined={handleGroupJoined}
        />
      )}

      {user && !user.username && (
        <UsernameSetupModal 
          user={user} 
          onComplete={() => window.location.reload()} 
        />
      )}
    </main>
  )
}

// ----------------------------------------------------------------------------
// Username Setup Modal (For first-time login)
// ----------------------------------------------------------------------------
function UsernameSetupModal({ user, onComplete }: { user: UserProfile, onComplete: () => void }) {
  const [username, setUsername] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    if (username.length < 3) {
      setError("El apodo debe tener al menos 3 caracteres")
      return
    }

    setLoading(true)
    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Error al guardar el apodo")
      onComplete()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-card border border-border rounded-2xl shadow-xl w-full max-w-md p-6 sm:p-8">
        <div className="text-center mb-6">
          <div className="size-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-4">
            <User className="size-8" />
          </div>
          <h2 className="text-2xl font-bold text-foreground">Elige tu Apodo</h2>
          <p className="text-sm text-muted-foreground mt-2">
            ¡Hola {user.name.split(" ")[0]}! Para interactuar en la comunidad, necesitas un apodo único (ej. @davguz42).
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold">@</span>
              <Input
                value={username}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                placeholder="tu_apodo"
                className="pl-8 bg-background border-border/50"
                maxLength={30}
              />
            </div>
            <p className="text-[10px] text-muted-foreground mt-1.5 ml-1">
              Solo letras minúsculas, números y guiones bajos (_).
            </p>
          </div>

          {error && <p className="text-sm text-rose-500 font-medium text-center">{error}</p>}

          <Button type="submit" className="w-full" disabled={loading || username.length < 3}>
            {loading ? <Loader2 className="size-4 animate-spin mr-2" /> : null}
            Continuar
          </Button>
        </form>
      </div>
    </div>
  )
}
