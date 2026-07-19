"use client"

import * as React from "react"
import useSWR from "swr"
import { fetcher, type FetcherError } from "@/lib/fetcher"
import { VerseOfTheDay } from "@/components/verse-of-the-day"
import {
  BookOpen,
  BookText,
  Heart,
  Highlighter,
  PlusCircle,
  Search,
  Sparkles,
  ArrowRight,
  Lock,
  LogIn,
  TrendingUp,
  FileText,
  Star,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { loadLastReading, type LastReading } from "@/lib/reader-state"

interface DashboardProps {
  userName?: string
  userRole?: string
  isGuest?: boolean
  setActiveTab: (tab: string) => void
  onLoginRequest?: () => void
  onSelectVerse?: (bookId: number, chapter: number, verse?: number, bibleId?: number) => void
}

interface RecentFavorite {
  id: number
  bible_id: number
  book_id: number
  book_name: string
  chapter: number
  verse: number
  verse_text?: string
}

interface RecentHighlight {
  id: number
  bible_id: number
  book_id: number
  book_name: string
  chapter: number
  verse: number
  color: string
  text?: string
}

export function Dashboard({ userName, isGuest = false, userRole, setActiveTab, onLoginRequest, onSelectVerse }: DashboardProps) {
  const { data: devData, error: devError } = useSWR(isGuest ? null : "/api/devotionals", fetcher, {
    shouldRetryOnError: false,
  })
  const { data: notebooksData, error: notebooksError } = useSWR(isGuest ? null : "/api/notebooks", fetcher, {
    shouldRetryOnError: false,
  })
  const { data: announcementsData } = useSWR("/api/feed/announcements", fetcher)
  const { data: eventsData } = useSWR("/api/events", fetcher)
  const { data: favoritesData } = useSWR<{ favorites: RecentFavorite[] }>(
    isGuest ? null : "/api/favorites",
    fetcher,
    { shouldRetryOnError: false },
  )
  const { data: highlightsData } = useSWR<{ highlights: RecentHighlight[] }>(
    isGuest ? null : "/api/highlights/all",
    fetcher,
    { shouldRetryOnError: false },
  )
  const devotionals = devData?.devotionals ?? []
  const notebooks = notebooksData?.notebooks ?? []
  const recentFavorites = (favoritesData?.favorites ?? []).slice(0, 3)
  const recentHighlights = (highlightsData?.highlights ?? []).slice(0, 3)

  // Continuidad de lectura (paridad con "Continuar lectura" del Inicio mobile);
  // se lee en efecto porque localStorage no existe en SSR
  const [lastReading, setLastReading] = React.useState<LastReading | null>(null)
  React.useEffect(() => {
    setLastReading(loadLastReading())
  }, [])

  const openVerse = (bookId: number, chapter: number, verse?: number, bibleId?: number) => {
    if (onSelectVerse) {
      onSelectVerse(bookId, chapter, verse, bibleId)
    } else {
      setActiveTab("reading")
    }
  }
  const announcements = announcementsData?.announcements ?? []
  const upcomingEvents = (eventsData?.events ?? []).slice(0, 3)

  // Si la sesión expiró (401), pedir login de nuevo en vez de mostrar datos vacíos
  const sessionExpired =
    (devError as FetcherError | undefined)?.status === 401 ||
    (notebooksError as FetcherError | undefined)?.status === 401

  React.useEffect(() => {
    if (sessionExpired) {
      onLoginRequest?.()
    }
  }, [sessionExpired, onLoginRequest])

  const handleProtectedAction = (tab: string) => {
    if (isGuest) {
      onLoginRequest?.()
      return
    }
    setActiveTab(tab)
  }

  return (
    <div className="space-y-8 p-1 md:p-4 animate-fade-in">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground md:text-4xl flex items-center gap-2">
          {isGuest ? (
            <>¡Bienvenido a BibliaAPP! <Sparkles className="size-6 text-primary animate-pulse" /></>
          ) : (
            <>¡Hola, {userName}! <Sparkles className="size-6 text-primary animate-pulse" /></>
          )}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {isGuest
            ? "Explora la Biblia y el versículo del día. Inicia sesión para guardar notas y devocionales."
            : "Te damos la bienvenida a tu panel de estudio bíblico personal."}
        </p>
      </div>

      {isGuest && (
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Lock className="size-5" />
            </span>
            <div>
              <p className="text-sm font-semibold text-foreground">Modo exploración</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Puedes leer la Biblia y buscar versículos. Para notas, favoritos y devocionales necesitas una cuenta.
              </p>
            </div>
          </div>
          <Button onClick={onLoginRequest} size="sm" className="gap-2 shrink-0">
            <LogIn className="size-4" />
            Iniciar sesión
          </Button>
        </div>
      )}

      <VerseOfTheDay />

      {lastReading && (
        <button
          type="button"
          onClick={() => openVerse(lastReading.bookId, lastReading.chapter, undefined, lastReading.bibleId)}
          className="flex w-full items-center justify-between gap-4 rounded-xl border border-primary/20 bg-primary/5 p-4 text-left transition-all hover:bg-primary/10 active:scale-[0.99] group"
        >
          <div className="flex items-center gap-3 min-w-0">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <BookOpen className="size-5" />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wider text-primary">Continuar lectura</p>
              <p className="truncate text-sm font-bold text-foreground">
                {lastReading.bookName ? `${lastReading.bookName} ${lastReading.chapter}` : `Capítulo ${lastReading.chapter}`}
              </p>
            </div>
          </div>
          <ArrowRight className="size-4 shrink-0 text-primary transition-transform group-hover:translate-x-1" />
        </button>
      )}

      {announcements.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-bold text-foreground">Anuncios oficiales</h2>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {announcements.slice(0, 5).map((a: { id: number; content: string; user_name: string; created_at: string }) => (
              <div
                key={a.id}
                className="min-w-[260px] max-w-xs shrink-0 rounded-xl border border-amber-500/25 bg-amber-500/5 p-4 shadow-sm"
              >
                <p className="text-[10px] font-bold uppercase text-amber-700 dark:text-amber-400 tracking-wider">
                  Anuncio · {a.user_name}
                </p>
                <p className="text-sm mt-2 line-clamp-3 whitespace-pre-wrap">{a.content}</p>
                <p className="text-[10px] text-muted-foreground mt-2">
                  {new Date(a.created_at).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {upcomingEvents.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-foreground">Próximos eventos</h2>
            <button
              type="button"
              onClick={() => handleProtectedAction("calendar")}
              className="text-xs font-semibold text-primary hover:underline"
            >
              Ver calendario →
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {upcomingEvents.map((ev: { id: number; title: string; start_time: string; category: string }) => (
              <button
                key={ev.id}
                type="button"
                onClick={() => handleProtectedAction("calendar")}
                className="rounded-xl border border-border bg-card p-4 text-left hover:border-violet-500/30 transition-colors"
              >
                <p className="text-xs font-bold uppercase text-violet-600">{ev.category}</p>
                <p className="font-semibold mt-1 line-clamp-2">{ev.title}</p>
                <p className="text-xs text-muted-foreground mt-2">
                  {new Date(ev.start_time).toLocaleString("es", { dateStyle: "medium", timeStyle: "short" })}
                </p>
              </button>
            ))}
          </div>
        </div>
      )}

      {!isGuest && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm flex items-center gap-4 transition-all hover:scale-[1.01]">
            <span className="flex size-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <BookText className="size-6" />
            </span>
            <div>
              <p className="text-2xl font-bold text-foreground">{notebooks.length}</p>
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Libretas Creadas</p>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-5 shadow-sm flex items-center gap-4 transition-all hover:scale-[1.01]">
            <span className="flex size-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Heart className="size-6" />
            </span>
            <div>
              <p className="text-2xl font-bold text-foreground">{devotionals.length}</p>
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Devocionales Escritos</p>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-5 shadow-sm flex items-center gap-4 sm:col-span-2 lg:col-span-1 transition-all hover:scale-[1.01]">
            <span className="flex size-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <TrendingUp className="size-6" />
            </span>
            <div>
              <p className="text-2xl font-bold text-foreground">
                {devotionals.length > 0 ? "Constante" : "Iniciando"}
              </p>
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Progreso Espiritual</p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        <div className="lg:col-span-5 space-y-4">
          <h2 className="text-lg font-bold text-foreground">Acciones Rápidas</h2>

          <div className="flex flex-col gap-3">
            <QuickAction
              icon={BookOpen}
              title="Ir a Lectura"
              description="Lee la Biblia capítulo a capítulo"
              onClick={() => setActiveTab("reading")}
            />
            <QuickAction
              icon={PlusCircle}
              title="Nuevo Devocional"
              description={isGuest ? "Requiere iniciar sesión" : "Escribe en tu diario espiritual hoy"}
              locked={isGuest}
              onClick={() => handleProtectedAction("devotionals")}
            />
            <QuickAction
              icon={Search}
              title="Buscador Avanzado"
              description="Busca versículos y palabras clave"
              onClick={() => setActiveTab("search")}
            />
          </div>
        </div>

        <div className="lg:col-span-7 space-y-4">
          {(recentFavorites.length > 0 || recentHighlights.length > 0) && (
            <div className="space-y-4">
              {recentFavorites.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-bold text-foreground">Favoritos recientes</h2>
                    <button
                      type="button"
                      onClick={() => setActiveTab("favorites")}
                      className="text-xs font-semibold text-primary hover:underline"
                    >
                      Ver todos →
                    </button>
                  </div>
                  <div className="space-y-2">
                    {recentFavorites.map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => openVerse(f.book_id, f.chapter, f.verse, f.bible_id)}
                        className="flex w-full items-start gap-3 rounded-xl border border-border bg-card/30 p-3 text-left transition-colors hover:border-primary/30 hover:bg-accent/30"
                      >
                        <Star className="mt-0.5 size-4 shrink-0 fill-amber-400 text-amber-400" />
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-foreground">
                            {f.book_name} {f.chapter}:{f.verse}
                          </p>
                          {f.verse_text && (
                            <p className="mt-0.5 line-clamp-2 text-xs italic text-muted-foreground">{f.verse_text}</p>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {recentHighlights.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-bold text-foreground">Subrayados recientes</h2>
                    <button
                      type="button"
                      onClick={() => setActiveTab("highlights")}
                      className="text-xs font-semibold text-primary hover:underline"
                    >
                      Ver todos →
                    </button>
                  </div>
                  <div className="space-y-2">
                    {recentHighlights.map((h) => (
                      <button
                        key={h.id}
                        type="button"
                        onClick={() => openVerse(h.book_id, h.chapter, h.verse, h.bible_id)}
                        className="flex w-full items-start gap-3 rounded-xl border border-border bg-card/30 p-3 text-left transition-colors hover:border-primary/30 hover:bg-accent/30"
                      >
                        <Highlighter className="mt-0.5 size-4 shrink-0 text-primary" />
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-foreground">
                            {h.book_name} {h.chapter}:{h.verse}
                          </p>
                          {h.text && (
                            <p className="mt-0.5 line-clamp-2 text-xs italic text-muted-foreground">{h.text}</p>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <h2 className="text-lg font-bold text-foreground">Devocionales Recientes</h2>
          {isGuest ? (
            <div className="rounded-xl border border-dashed border-border p-8 text-center text-muted-foreground">
              <Lock className="mx-auto mb-2 size-8 opacity-40" />
              <p className="text-sm">Inicia sesión para escribir y ver tus devocionales personales.</p>
              <button
                onClick={onLoginRequest}
                className="mt-3 text-xs font-semibold text-primary hover:underline"
              >
                Crear cuenta o iniciar sesión
              </button>
            </div>
          ) : devotionals.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-8 text-center text-muted-foreground">
              <FileText className="mx-auto mb-2 size-8 opacity-40" />
              <p className="text-sm">Aún no has escrito ningún devocional en tu diario espiritual.</p>
              <button
                onClick={() => setActiveTab("devotionals")}
                className="mt-3 text-xs font-semibold text-primary hover:underline"
              >
                Comienza a escribir uno ahora
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {devotionals.slice(0, 3).map((dev: { id: number; emotion?: string; title: string; verseRef?: string; createdAt: string }) => (
                <div
                  key={dev.id}
                  className="p-4 rounded-xl border border-border bg-card/30 flex items-start justify-between gap-4"
                >
                  <div className="min-w-0">
                    <span className="inline-flex items-center gap-1 rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary mb-1.5">
                      {dev.emotion || "Sin emoción"}
                    </span>
                    <h3 className="font-bold text-sm text-foreground truncate">{dev.title}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5 italic">Pasaje: {dev.verseRef || "N/A"}</p>
                  </div>
                  <span className="text-[10px] text-muted-foreground shrink-0 mt-1">
                    {new Date(dev.createdAt).toLocaleDateString()}
                  </span>
                </div>
              ))}
              {devotionals.length > 3 && (
                <button
                  onClick={() => setActiveTab("devotionals")}
                  className="w-full text-center py-2 text-xs font-bold text-primary hover:underline"
                >
                  Ver todos los devocionales ({devotionals.length})
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function QuickAction({
  icon: Icon,
  title,
  description,
  onClick,
  locked = false,
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  description: string
  onClick: () => void
  locked?: boolean
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center justify-between w-full p-4 rounded-xl border border-border bg-card/40 hover:bg-accent/40 text-left transition-all group active:scale-[0.99]"
    >
      <div className="flex items-center gap-3">
        <span className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="size-5" />
        </span>
        <div>
          <h3 className="font-semibold text-sm text-foreground flex items-center gap-1.5">
            {title}
            {locked && <Lock className="size-3 text-muted-foreground" />}
          </h3>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
      <ArrowRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-1" />
    </button>
  )
}
