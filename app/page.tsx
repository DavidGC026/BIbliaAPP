"use client"

import * as React from "react"
import { useState, useEffect, Suspense, useCallback } from "react"
import useSWR from "swr"
import { fetcher } from "@/lib/fetcher"
import { AuthScreen } from "@/components/auth-screen"
import { ConnectionBanner } from "@/components/connection-banner"
import { BibleReader } from "@/components/bible-reader"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { NotebookSidebar } from "@/components/notebook-sidebar"
import { Dashboard } from "@/components/dashboard"
import { Devotionals } from "@/components/devotionals"
import { SearchAdvanced } from "@/components/search-advanced"
import { UserManagement } from "@/components/user-management"
import { ReadingPlans } from "@/components/reading-plans"
import { ThemeToggle } from "@/components/theme-toggle"
import { PrayerRequests } from "@/components/prayer-requests"
import { Groups } from "@/components/groups"
import { Activity } from "@/components/activity"
import { Statistics } from "@/components/statistics"
import { Favorites } from "@/components/favorites"
import { HighlightsManager } from "@/components/highlights-manager"
import { ReferencesExplorer } from "@/components/references-explorer"
import { PersonalLibrary } from "@/components/personal-library"
import { Feed } from "@/components/feed"
import { ProfileSection } from "@/components/profile-section"
import { 
  BookOpen, 
  LayoutDashboard, 
  BookText, 
  Heart, 
  Search, 
  LogOut, 
  Loader2,
  User,
  Users,
  Calendar,
  Flame,
  Activity as ActivityIcon,
  BarChart2,
  Star,
  HeartHandshake,
  Highlighter,
  Link as LinkIcon,
  Library,
  MoreHorizontal,
  PanelLeftClose,
  PanelLeftOpen
} from "lucide-react"
import { cn } from "@/lib/utils"

interface UserProfile {
  id: number
  name: string
  email: string
  username: string | null
  role: string
  allowedSections: string | string[] | null
  streakCount: number
}

export default function Page() {
  const { data, error, mutate, isLoading } = useSWR<{ user: UserProfile }>(
    "/api/auth/me",
    fetcher,
    {
      shouldRetryOnError: false,
    }
  )

  const user = data?.user
  
  // Navigation tabs
  const [activeTab, setActiveTab] = useState<string>("reading")

  // Direct reader navigation state (from Search page)
  const [navBookId, setNavBookId] = useState<number | null>(null)
  const [navChapter, setNavChapter] = useState<number | null>(null)
  const [navVerse, setNavVerse] = useState<number | null>(null)
  const [navBibleId, setNavBibleId] = useState<number | null>(null)

  // Separated Notebook Tab States
  const [notebookEditingNote, setNotebookEditingNote] = useState<{ id: number; title: string; content: string } | null>(null)

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
    if (!user) return []
    
    // Default config that everyone should have access to
    const defaultBasics = ["reading", "search", "highlights", "references", "library", "feed", "profile", "dashboard", "notebook", "favorites", "plans", "prayers", "devotionals", "groups", "activity", "statistics"]
    
    if (user.role === "admin") {
      try {
        let parsed: string[] = []
        if (typeof user.allowedSections === "string") {
          parsed = JSON.parse(user.allowedSections)
        } else if (Array.isArray(user.allowedSections)) {
          parsed = user.allowedSections
        }
        
        // Admins also get "users"
        return Array.from(new Set([...parsed, ...defaultBasics, "users"]))
      } catch (_) {
        return [...defaultBasics, "users"]
      }
    } else {
      // Default configurations for non-admin
      return defaultBasics
    }
  }, [user])

  // Set default tab based on user role and permissions
  useEffect(() => {
    if (user) {
      const defaults = user.role === "admin" ? "dashboard" : "reading"
      if (allowedSections.includes(defaults)) {
        setActiveTab(defaults)
      } else if (allowedSections.length > 0) {
        setActiveTab(allowedSections[0])
      }
    }
  }, [user, allowedSections])

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
  }

  // Render loading screen
  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background text-muted-foreground">
        <Loader2 className="size-10 animate-spin text-primary mb-4" />
        <p className="text-sm font-medium">Cargando tu estudio bíblico...</p>
      </div>
    )
  }

  // Render auth screen if not authenticated
  if (error || !user) {
    return <AuthScreen onLoginSuccess={() => mutate()} />
  }

  // Force username setup if missing
  if (user && !user.username) {
    return <UsernameSetupModal user={user} onComplete={() => mutate()} />
  }

  // Define tab navigation structure
  const allNavItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, section: "PRINCIPAL" },
    { id: "reading", label: "Leer", icon: BookOpen, section: "PRINCIPAL" },
    { id: "feed", label: "Comunidad", icon: Users, section: "PRINCIPAL" },

    { id: "search", label: "Búsqueda", icon: Search, section: "ESTUDIO BÍBLICO" },
    { id: "references", label: "Referencias", icon: LinkIcon, section: "ESTUDIO BÍBLICO" },
    
    { id: "library", label: "Libros", icon: Library, section: "PERSONAL" },
    { id: "notebook", label: "Notas", icon: BookText, section: "PERSONAL" },
    { id: "profile", label: "Perfil", icon: User, section: "PERSONAL" },
    { id: "favorites", label: "Favoritos", icon: Star, section: "PERSONAL" },
    { id: "highlights", label: "Subrayados", icon: Highlighter, section: "PERSONAL" },
    { id: "plans", label: "Planes", icon: Calendar, section: "PERSONAL" },

    { id: "prayers", label: "Oración", icon: HeartHandshake, section: "VIDA ESPIRITUAL" },
    { id: "devotionals", label: "Diario", icon: Heart, section: "VIDA ESPIRITUAL" },
    { id: "groups", label: "Grupos", icon: Users, section: "VIDA ESPIRITUAL" },

    { id: "activity", label: "Actividad", icon: ActivityIcon, section: "GENERAL" },
    { id: "statistics", label: "Estadísticas", icon: BarChart2, section: "GENERAL" },
    { id: "users", label: "Usuarios", icon: Users, section: "GENERAL" }
  ]

  // Filter allowed navigation links
  const desktopNavItems = allNavItems.filter(item => allowedSections.includes(item.id))

  // Mobile Bottom Navigation logic (shows first 4 allowed items + 1 "Más" button if > 5 allowed)
  const showMoreButton = desktopNavItems.length > 5
  const mobileDirectItems = showMoreButton ? desktopNavItems.slice(0, 4) : desktopNavItems
  const mobileMoreItems = showMoreButton ? desktopNavItems.slice(4) : []

  // Get active tab label for mobile header
  const activeLabel = allNavItems.find(item => item.id === activeTab)?.label ?? "Estudio"

  return (
    <main className="min-h-screen bg-background flex flex-col md:flex-row">
      <ConnectionBanner />

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
                src="/logo.png"
                alt="Logo BibliaAPP"
                className="size-8 rounded-lg object-cover shadow-md shadow-primary/20 shrink-0"
              />
              {!sidebarCollapsed && (
                <div className="flex flex-col min-w-0">
                  <h1 className="text-sm font-bold tracking-tight text-foreground leading-none">BibliaAPP</h1>
                  <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider mt-0.5">
                    {user.role === "admin" ? "Administrador" : "Lector"}
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

          {/* Navigation links */}
          <nav className={cn("flex-1 pb-4 space-y-1", sidebarCollapsed ? "px-2" : "px-3 space-y-5")}>
            {sidebarCollapsed ? (
              // Collapsed: only icons, no sections
              desktopNavItems.map((item) => {
                const Icon = item.icon
                const isActive = activeTab === item.id
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    title={item.label}
                    className={cn(
                      "flex items-center justify-center w-full p-2.5 rounded-xl transition-all group cursor-pointer",
                      isActive
                        ? "bg-primary text-primary-foreground shadow-md"
                        : "text-muted-foreground hover:bg-accent/40 hover:text-foreground"
                    )}
                  >
                    <Icon className="size-5 shrink-0" />
                  </button>
                )
              })
            ) : (
              // Expanded: sections + labels
              ["PRINCIPAL", "ESTUDIO BÍBLICO", "PERSONAL", "VIDA ESPIRITUAL", "GENERAL"].map(section => {
                const sectionItems = desktopNavItems.filter(item => item.section === section)
                if (sectionItems.length === 0) return null
                return (
                  <div key={section} className="space-y-0.5">
                    <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-3 mb-1.5">
                      {section}
                    </h3>
                    {sectionItems.map((item) => {
                      const Icon = item.icon
                      const isActive = activeTab === item.id
                      return (
                        <button
                          key={item.id}
                          onClick={() => setActiveTab(item.id)}
                          className={cn(
                            "flex items-center gap-3 w-full px-3 py-2 rounded-xl text-sm font-medium transition-all group cursor-pointer",
                            isActive
                              ? "bg-primary text-primary-foreground shadow-md shadow-primary/10"
                              : "text-muted-foreground hover:bg-accent/40 hover:text-foreground"
                          )}
                        >
                          <Icon className={cn("size-4 shrink-0 transition-transform group-hover:scale-110", isActive ? "" : "text-muted-foreground group-hover:text-primary")} />
                          <span>{item.label}</span>
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
          {sidebarCollapsed ? (
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
                    <p className="text-xs font-bold text-foreground truncate">{user.name}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{user.email}</p>
                  </div>
                </div>
                <ThemeToggle />
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

      {/* Mobile Header (Slim & Compact) */}
      <div className="md:hidden sticky top-0 left-0 right-0 h-12 bg-card/85 border-b border-border flex items-center justify-between px-4 z-40 backdrop-blur-md animate-fade-in">
        <div className="flex items-center gap-2">
          <img 
            src="/logo.png" 
            alt="Logo BibliaAPP" 
            className="size-7 rounded object-cover"
          />
          <span className="text-sm font-bold text-foreground">{activeLabel}</span>
          
          {/* Racha (Mobile) */}
          <div className="flex items-center gap-0.5 text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded-lg border border-amber-500/15">
            <Flame className="size-3.5 fill-amber-500 text-amber-500 animate-pulse" />
            <span>{user.streakCount || 0}</span>
          </div>
        </div>
        
        <div className="flex items-center gap-1">
          {allowedSections.includes("search") && (
            <button
              onClick={() => setActiveTab("search")}
              className={cn(
                "p-2 rounded transition-colors",
                activeTab === "search" ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground"
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
                "p-2 rounded transition-colors",
                activeTab === "users" ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground"
              )}
              title="Gestión de Usuarios"
            >
              <Users className="size-4.5" />
            </button>
          )}
          <ThemeToggle />
          <button
            onClick={handleLogout}
            className="p-2 text-muted-foreground hover:text-destructive transition-colors rounded"
            title="Cerrar Sesión"
          >
            <LogOut className="size-4.5" />
          </button>
        </div>
      </div>

      {/* Page Content Area */}
      <div className={cn("flex-1 flex flex-col min-h-screen overflow-hidden pb-16 md:pb-0 transition-all duration-300 ease-in-out", sidebarCollapsed ? "md:pl-[60px]" : "md:pl-64")}>
        <div className="flex-grow p-4 md:p-6 overflow-y-auto">
          
          {activeTab === "dashboard" && allowedSections.includes("dashboard") && (
            <Dashboard userName={user.name} setActiveTab={setActiveTab} />
          )}

          {activeTab === "reading" && allowedSections.includes("reading") && (
            <Suspense fallback={<div className="p-8 text-center text-sm text-muted-foreground">Cargando Biblia...</div>}>
              <BibleReader 
                initialBookId={navBookId}
                initialChapter={navChapter}
                initialVerse={navVerse}
                initialBibleId={navBibleId}
                onClearInitialValues={handleClearNavValues}
                showOnlyVerseNotes={true}
              />
            </Suspense>
          )}

          {activeTab === "feed" && allowedSections.includes("feed") && (
            <div className="h-[calc(100vh-8rem)] md:h-[calc(100vh-3rem)] rounded-xl border border-border shadow-sm overflow-hidden">
              <Suspense fallback={<div className="p-8 text-center text-sm text-muted-foreground">Cargando Feed...</div>}>
                <Feed />
              </Suspense>
            </div>
          )}

          {activeTab === "profile" && allowedSections.includes("profile") && (
            <div className="h-[calc(100vh-8rem)] md:h-[calc(100vh-3rem)] rounded-xl shadow-sm overflow-hidden">
              <Suspense fallback={<div className="p-8 text-center text-sm text-muted-foreground">Cargando Perfil...</div>}>
                <ProfileSection currentUserId={user.id} initialUsername={user.username || undefined} />
              </Suspense>
            </div>
          )}

          {activeTab === "notebook" && allowedSections.includes("notebook") && (
            <div className="h-[calc(100vh-8rem)] md:h-[calc(100vh-3rem)] rounded-xl border border-border bg-card/45 shadow-sm backdrop-blur-sm overflow-hidden p-4">
              <Suspense fallback={<div className="p-8 text-center text-sm text-muted-foreground">Cargando libreta...</div>}>
                <NotebookSidebar 
                  editingNote={notebookEditingNote}
                  setEditingNote={setNotebookEditingNote}
                  onSessionExpired={() => {
                    localStorage.removeItem("biblia_token")
                    window.location.reload()
                  }}
                />
              </Suspense>
            </div>
          )}

          {activeTab === "devotionals" && allowedSections.includes("devotionals") && (
            <Devotionals />
          )}

          {activeTab === "plans" && allowedSections.includes("plans") && (
            <ReadingPlans 
              onSelectReading={handleSelectVerse} 
              streakCount={user.streakCount || 0}
            />
          )}

          {activeTab === "search" && allowedSections.includes("search") && (
            <SearchAdvanced onSelectVerse={handleSelectVerse} />
          )}

          {activeTab === "prayers" && allowedSections.includes("prayers") && (
            <PrayerRequests />
          )}

          {activeTab === "groups" && allowedSections.includes("groups") && (
            <Groups />
          )}

          {activeTab === "activity" && allowedSections.includes("activity") && (
            <Activity />
          )}

          {activeTab === "statistics" && allowedSections.includes("statistics") && (
            <Statistics />
          )}

          {activeTab === "favorites" && allowedSections.includes("favorites") && (
            <Favorites />
          )}

          {activeTab === "highlights" && allowedSections.includes("highlights") && (
            <HighlightsManager />
          )}

          {activeTab === "references" && allowedSections.includes("references") && (
            <ReferencesExplorer />
          )}

          {activeTab === "library" && allowedSections.includes("library") && (
            <PersonalLibrary />
          )}

          {activeTab === "users" && allowedSections.includes("users") && (
            <UserManagement currentUserId={user.id} />
          )}
        </div>
      </div>

      {/* Mobile More Sheet */}
      {showMobileMore && (
        <div 
          className="md:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end justify-center transition-all animate-fade-in"
          onClick={() => setShowMobileMore(false)}
        >
          <div 
            className="w-full max-h-[80vh] bg-card border-t border-border rounded-t-2xl p-5 pb-8 overflow-y-auto space-y-4 shadow-2xl backdrop-blur-xl animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <h3 className="font-bold text-base text-foreground">Más Funciones</h3>
              <button 
                onClick={() => setShowMobileMore(false)}
                className="text-xs font-semibold text-muted-foreground hover:text-foreground bg-muted px-2.5 py-1 rounded-full transition-colors"
              >
                Cerrar
              </button>
            </div>
            
            <div className="grid grid-cols-3 gap-4 py-2">
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
                      "flex flex-col items-center justify-center p-3 rounded-xl border transition-all text-center gap-1.5 active:scale-[0.97] cursor-pointer",
                      isActive 
                        ? "bg-primary border-primary text-primary-foreground shadow-md"
                        : "bg-card/40 border-border hover:bg-accent/40 text-muted-foreground hover:text-foreground"
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
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-card/95 border-t border-border flex items-center justify-around px-2 z-40 shadow-lg backdrop-blur-md">
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
                "flex flex-col items-center justify-center gap-1 flex-1 py-1 text-[10px] font-semibold transition-all cursor-pointer",
                isActive 
                  ? "text-primary scale-105" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className={cn("size-5 transition-transform", isActive ? "stroke-[2.5]" : "")} />
              <span>{item.label}</span>
            </button>
          )
        })}
        {showMoreButton && (
          <button
            onClick={() => setShowMobileMore(!showMobileMore)}
            className={cn(
              "flex flex-col items-center justify-center gap-1 flex-1 py-1 text-[10px] font-semibold transition-all cursor-pointer",
              showMobileMore 
                ? "text-primary scale-105" 
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <MoreHorizontal className={cn("size-5 transition-transform", showMobileMore ? "stroke-[2.5]" : "")} />
            <span>Más</span>
          </button>
        )}
      </nav>

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
