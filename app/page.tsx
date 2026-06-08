"use client"

import * as React from "react"
import { useState, useEffect, Suspense } from "react"
import useSWR from "swr"
import { fetcher } from "@/lib/fetcher"
import { AuthScreen } from "@/components/auth-screen"
import { ConnectionBanner } from "@/components/connection-banner"
import { BibleReader } from "@/components/bible-reader"
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
  Highlighter
} from "lucide-react"
import { cn } from "@/lib/utils"

interface UserProfile {
  id: number
  name: string
  email: string
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

  // Separated Notebook Tab States
  const [notebookEditingNote, setNotebookEditingNote] = useState<{ id: number; title: string; content: string } | null>(null)

  // Parsed sections permissions
  const allowedSections = React.useMemo(() => {
    if (!user) return []
    if (user.allowedSections) {
      try {
        return typeof user.allowedSections === "string"
          ? JSON.parse(user.allowedSections)
          : user.allowedSections
      } catch (_) {
        return ["reading", "notebook", "plans"]
      }
    } else {
      // Default configurations
      return user.role === "admin"
        ? ["dashboard", "reading", "search", "notebook", "favorites", "highlights", "plans", "prayers", "devotionals", "groups", "activity", "statistics", "users"]
        : ["reading", "search", "notebook", "favorites", "highlights", "plans", "prayers", "devotionals", "groups", "activity", "statistics"]
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

  function handleSelectVerse(bookId: number, chapter: number) {
    setNavBookId(bookId)
    setNavChapter(chapter)
    setNavVerse(1) // Default to verse 1
    setActiveTab("reading")
  }

  function handleClearNavValues() {
    setNavBookId(null)
    setNavChapter(null)
    setNavVerse(null)
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

  // Define tab navigation structure
  const allNavItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, section: "PRINCIPAL" },
    { id: "reading", label: "Leer", icon: BookOpen, section: "PRINCIPAL" },
    { id: "search", label: "Buscar", icon: Search, section: "PRINCIPAL" },
    
    { id: "notebook", label: "Notas", icon: BookText, section: "PERSONAL" },
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

  // Mobile Bottom Navigation Items (limited to 5 items to prevent crowding)
  const mobileNavItems = desktopNavItems.filter(item => item.id !== "users" && item.id !== "search").slice(0, 5)

  // Get active tab label for mobile header
  const activeLabel = allNavItems.find(item => item.id === activeTab)?.label ?? "Estudio"

  return (
    <main className="min-h-screen bg-background flex flex-col md:flex-row">
      <ConnectionBanner />

      {/* Desktop Navigation (Sidebar) */}
      <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 border-r border-border bg-card/65 backdrop-blur-md z-30">
        <div className="flex flex-col flex-grow pt-5 pb-4 overflow-y-auto">
          {/* Logo */}
          <div className="flex items-center gap-2.5 px-6 mb-3">
            <img 
              src="/logo.png" 
              alt="Logo BibliaAPP" 
              className="size-9 rounded-lg object-cover shadow-md shadow-primary/20"
            />
            <div className="flex flex-col">
              <h1 className="text-sm font-bold tracking-tight text-foreground">
                BibliaAPP
              </h1>
              <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">
                {user.role === "admin" ? "Administrador" : "Lector"}
              </p>
            </div>
          </div>

          {/* Racha (PC) */}
          <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 rounded-xl text-xs font-bold w-fit mb-4 ml-6 shrink-0">
            <Flame className="size-4 fill-amber-500 text-amber-500 animate-pulse" />
            <span>Racha: {user.streakCount || 0} {user.streakCount === 1 ? "día" : "días"}</span>
          </div>

          {/* Navigation links */}
          <nav className="flex-1 px-4 space-y-5 pb-4">
            {["PRINCIPAL", "PERSONAL", "VIDA ESPIRITUAL", "GENERAL"].map(section => {
              const sectionItems = desktopNavItems.filter(item => item.section === section)
              if (sectionItems.length === 0) return null
              
              return (
                <div key={section} className="space-y-1">
                  <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-3 mb-2">
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
                          "flex items-center gap-3 w-full px-4 py-2 rounded-xl text-sm font-medium transition-all group cursor-pointer",
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
            })}
          </nav>
        </div>

        {/* User profile section & ThemeToggle */}
        <div className="flex flex-col gap-3 p-4 border-t border-border bg-card/40">
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
      <div className="flex-1 md:pl-64 flex flex-col min-h-screen overflow-hidden pb-16 md:pb-0">
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
                onClearInitialValues={handleClearNavValues}
                showOnlyVerseNotes={true}
              />
            </Suspense>
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

          {activeTab === "users" && allowedSections.includes("users") && (
            <UserManagement currentUserId={user.id} />
          )}
        </div>
      </div>

      {/* Mobile Bottom Navigation (Persist bottom menu) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-card/95 border-t border-border flex items-center justify-around px-2 z-40 shadow-lg backdrop-blur-md">
        {mobileNavItems.map((item) => {
          const Icon = item.icon
          const isActive = activeTab === item.id
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
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
      </nav>
    </main>
  )
}
