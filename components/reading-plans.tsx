"use client"

import * as React from "react"
import { useState } from "react"
import useSWR from "swr"
import { fetcher } from "@/lib/fetcher"
import { Button } from "@/components/ui/button"
import { 
  BookOpen, 
  Calendar, 
  CheckCircle2, 
  ChevronDown, 
  ChevronUp, 
  Loader2, 
  Flame, 
  PlusCircle, 
  Trophy,
  ExternalLink,
  Heart,
  Trash2,
  Edit
} from "lucide-react"

interface ReadingItem {
  bookId: number
  bookName: string
  chapters: number[]
}

interface PlanDay {
  day: number
  readings: ReadingItem[]
}

interface ReadingPlan {
  id: number
  name: string
  description: string
  durationDays: number
  chaptersData: string // JSON representation of PlanDay[]
}

interface UserPlan {
  id: number
  planId: number
  progress: string // JSON list of completed days: e.g. "[1, 2]"
  name: string
  description: string
  durationDays: number
  chaptersData: string // JSON representation of PlanDay[]
  startedAt: string
}

interface ReadingPlansProps {
  onSelectReading: (bookId: number, chapter: number) => void
  streakCount: number
}

const EMOTIONS = [
  { name: "Agradecido", emoji: "🙏", color: "bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-300" },
  { name: "Alegre", emoji: "😊", color: "bg-amber-500/10 border-amber-500/20 text-amber-700 dark:text-amber-300" },
  { name: "Cansado", emoji: "🥱", color: "bg-blue-500/10 border-blue-500/20 text-blue-700 dark:text-blue-300" },
  { name: "Triste", emoji: "😢", color: "bg-indigo-500/10 border-indigo-500/20 text-indigo-700 dark:text-indigo-300" },
  { name: "Ansioso", emoji: "😰", color: "bg-rose-500/10 border-rose-500/20 text-rose-700 dark:text-rose-300" },
  { name: "Confiado", emoji: "🛡️", color: "bg-purple-500/10 border-purple-500/20 text-purple-700 dark:text-purple-300" }
]

export function ReadingPlans({ onSelectReading, streakCount }: ReadingPlansProps) {
  const { data: plansData, mutate: mutatePlans, isLoading } = useSWR<{
    plans: ReadingPlan[]
    userPlans: UserPlan[]
  }>("/api/plans", fetcher)

  const { data: devData, mutate: mutateDevotionals } = useSWR<{ devotionals: any[] }>(
    "/api/devotionals",
    fetcher
  )

  const plans = plansData?.plans ?? []
  const userPlans = plansData?.userPlans ?? []
  const devotionals = devData?.devotionals ?? []

  const [activeSubTab, setActiveSubTab] = useState<"my-plans" | "devotionals" | "all-plans">("my-plans")
  const [expandedPlanId, setExpandedPlanId] = useState<number | null>(null)
  const [joiningId, setJoiningId] = useState<number | null>(null)
  const [updatingId, setUpdatingId] = useState<number | null>(null)

  // Devotional Dialog / Form State
  const [activeDevotionalDay, setActiveDevotionalDay] = useState<{
    userPlan: UserPlan
    day: number
    readingsText: string
  } | null>(null)
  
  const [viewingDevotional, setViewingDevotional] = useState<any | null>(null)
  const [editingDevotionalId, setEditingDevotionalId] = useState<number | null>(null)

  const [devTitle, setDevTitle] = useState("")
  const [devEmotion, setDevEmotion] = useState<string | null>(null)
  const [devVerseRef, setDevVerseRef] = useState("")
  const [devReflection, setDevReflection] = useState("")
  const [devApplication, setDevApplication] = useState("")
  const [savingDev, setSavingDev] = useState(false)

  // Auto-switch sub-tab if no active plans
  React.useEffect(() => {
    if (!isLoading && userPlans.length === 0 && activeSubTab === "my-plans") {
      setActiveSubTab("all-plans")
    }
  }, [userPlans, isLoading, activeSubTab])

  async function handleJoinPlan(planId: number) {
    setJoiningId(planId)
    try {
      const res = await fetch("/api/plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "join", planId })
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error)
      }
      await mutatePlans()
      setActiveSubTab("my-plans")
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error al iniciar el plan")
    } finally {
      setJoiningId(null)
    }
  }

  async function handleToggleDay(userPlan: UserPlan, day: number, isCompleted: boolean) {
    setUpdatingId(userPlan.planId)
    const currentProgress: number[] = JSON.parse(userPlan.progress || "[]")
    
    let newProgress: number[]
    if (isCompleted) {
      // Remove day
      newProgress = currentProgress.filter(d => d !== day)
    } else {
      // Add day
      newProgress = [...currentProgress, day].sort((a, b) => a - b)
    }

    try {
      const res = await fetch("/api/plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "progress",
          planId: userPlan.planId,
          progress: newProgress
        })
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error)
      }
      await mutatePlans()
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error al actualizar progreso")
    } finally {
      setUpdatingId(null)
    }
  }

  async function handleSaveDevotional(e: React.FormEvent) {
    e.preventDefault()
    if (!activeDevotionalDay) return

    setSavingDev(true)
    const { userPlan, day } = activeDevotionalDay
    const isEdit = !!editingDevotionalId
    
    const url = isEdit ? `/api/devotionals/${editingDevotionalId}` : "/api/devotionals"
    const method = isEdit ? "PUT" : "POST"
    
    const body = {
      title: devTitle.trim(),
      emotion: devEmotion,
      verseRef: devVerseRef.trim(),
      content: {
        reflection: devReflection.trim(),
        application: devApplication.trim(),
        planId: userPlan.planId,
        planDay: day
      }
    }

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error)
      }

      await mutateDevotionals()

      // Automatically complete the day on plan if it was just written and not checked
      if (!isEdit) {
        const progressDays: number[] = JSON.parse(userPlan.progress || "[]")
        if (!progressDays.includes(day)) {
          await handleToggleDay(userPlan, day, false)
        }
      }

      // Close all modals
      setActiveDevotionalDay(null)
      setEditingDevotionalId(null)
      setViewingDevotional(null)
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error al guardar devocional")
    } finally {
      setSavingDev(false)
    }
  }

  function handleStartEditDevotional(dev: any) {
    const content = getDevotionalContent(dev) ?? {}
    setDevTitle(dev.title)
    setDevEmotion(dev.emotion)
    setDevVerseRef(dev.verseRef || "")
    setDevReflection(content.reflection || "")
    setDevApplication(content.application || "")
    setEditingDevotionalId(dev.id)
    
    const up = userPlans.find(plan => plan.planId === content.planId)
    if (up) {
      setActiveDevotionalDay({
        userPlan: up,
        day: content.planDay,
        readingsText: dev.verseRef
      })
    } else {
      setActiveDevotionalDay({
        userPlan: { planId: content.planId, progress: "[]" } as any,
        day: content.planDay,
        readingsText: dev.verseRef
      })
    }
  }

  async function handleDeleteDevotional(id: number) {
    if (!confirm("¿Estás seguro de eliminar este devocional?")) return
    try {
      const res = await fetch(`/api/devotionals/${id}`, {
        method: "DELETE"
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error)
      }
      await mutateDevotionals()
      setViewingDevotional(null)
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error al eliminar devocional")
    }
  }

  function formatReadingText(readings: ReadingItem[]) {
    return readings.map(r => {
      const chs = r.chapters
      if (chs.length === 1) return `${r.bookName} ${chs[0]}`
      return `${r.bookName} ${chs[0]}-${chs[chs.length - 1]}`
    }).join(", ")
  }

  const planDevotionals = devotionals.filter((dev: any) => {
    const content = typeof dev.content === "string"
      ? (() => { try { return JSON.parse(dev.content) } catch { return null } })()
      : dev.content
    return content?.planId != null
  }).map((dev: any) => ({
    ...dev,
    content: typeof dev.content === "string"
      ? (() => { try { return JSON.parse(dev.content) } catch { return dev.content } })()
      : dev.content,
  }))

  function getDevotionalContent(dev: any) {
    if (!dev?.content) return null
    if (typeof dev.content === "string") {
      try { return JSON.parse(dev.content) } catch { return null }
    }
    return dev.content
  }

  function getPlanName(planId: number) {
    return userPlans.find((p) => p.planId === planId)?.name
      ?? plans.find((p) => p.id === planId)?.name
      ?? "Plan de lectura"
  }

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
        <Loader2 className="mr-2 size-5 animate-spin text-primary" />
        <span>Cargando planes de lectura...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-1 md:p-4 animate-fade-in">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
            Planes de Lectura <Trophy className="size-7 text-primary" />
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Sigue un plan, escribe devocionales por día y revísalos en la pestaña <strong>Mis Devocionales</strong>.
          </p>
        </div>

        {/* Racha */}
        <div className="flex items-center gap-2 px-4 py-2 bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 rounded-xl self-start sm:self-center">
          <Flame className="size-5 fill-amber-500 animate-pulse text-amber-500" />
          <span className="text-sm font-bold">Racha: {streakCount} {streakCount === 1 ? "día" : "días"}</span>
        </div>
      </div>

      {/* Sub tabs */}
      <div className="flex border-b border-border overflow-x-auto">
        <button
          onClick={() => setActiveSubTab("my-plans")}
          className={`px-4 py-2.5 text-sm font-semibold transition-all border-b-2 whitespace-nowrap ${
            activeSubTab === "my-plans"
              ? "border-primary text-primary bg-muted/10 font-bold"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Mis Planes ({userPlans.length})
        </button>
        <button
          onClick={() => setActiveSubTab("devotionals")}
          className={`px-4 py-2.5 text-sm font-semibold transition-all border-b-2 whitespace-nowrap ${
            activeSubTab === "devotionals"
              ? "border-primary text-primary bg-muted/10 font-bold"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Mis Devocionales ({planDevotionals.length})
        </button>
        <button
          onClick={() => setActiveSubTab("all-plans")}
          className={`px-4 py-2.5 text-sm font-semibold transition-all border-b-2 whitespace-nowrap ${
            activeSubTab === "all-plans"
              ? "border-primary text-primary bg-muted/10 font-bold"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Explorar Planes ({plans.length})
        </button>
      </div>

      {/* Sub tab contents */}
      <div className="space-y-6 max-w-4xl">
        
        {/* Mis Planes View */}
        {activeSubTab === "my-plans" && (
          userPlans.length === 0 ? (
            <div className="text-center py-12 rounded-2xl border border-dashed border-border p-8 bg-card/20 max-w-md mx-auto">
              <Calendar className="mx-auto mb-3 size-10 text-muted-foreground/50" />
              <h3 className="text-base font-bold text-foreground mb-1">No estás inscrito en ningún plan</h3>
              <p className="text-xs text-muted-foreground mb-4">Escoge un plan para comenzar tu hábito de lectura diaria.</p>
              <Button onClick={() => setActiveSubTab("all-plans")} size="sm">
                Explorar Planes
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              {userPlans.map((up) => {
                const progressDays: number[] = JSON.parse(up.progress || "[]")
                const progressPct = Math.round((progressDays.length / up.durationDays) * 100)
                const isExpanded = expandedPlanId === up.planId
                const daysList: PlanDay[] = JSON.parse(up.chaptersData || "[]")
                
                // Calculate next incomplete day
                const currentDay = daysList.find(d => !progressDays.includes(d.day))?.day ?? 1
                const todayReading = daysList.find(d => d.day === currentDay)

                return (
                  <div 
                    key={up.id}
                    className="rounded-xl border border-border bg-card/65 shadow-sm overflow-hidden"
                  >
                    {/* Header Plan Card */}
                    <div className="p-5 md:p-6 flex flex-col md:flex-row justify-between gap-4 border-b border-border/40">
                      <div className="min-w-0 space-y-2 flex-1">
                        <h2 className="text-xl font-bold text-foreground">{up.name}</h2>
                        <p className="text-sm text-muted-foreground leading-relaxed">{up.description}</p>
                        
                        {/* Progress bar */}
                        <div className="space-y-1.5 pt-1.5 max-w-md">
                          <div className="flex justify-between text-xs font-semibold text-muted-foreground">
                            <span>Progreso: {progressDays.length} / {up.durationDays} días</span>
                            <span className="text-primary">{progressPct}%</span>
                          </div>
                          <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                            <div 
                              className="h-full bg-primary rounded-full transition-all duration-500" 
                              style={{ width: `${progressPct}%` }}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Today box */}
                      {todayReading && (
                        <div className="shrink-0 flex flex-col justify-center gap-2.5 p-4 bg-primary/5 border border-primary/15 rounded-xl md:w-72">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-primary">Lectura para hoy (Día {currentDay})</span>
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-sm font-semibold text-foreground leading-tight truncate">
                              {formatReadingText(todayReading.readings)}
                            </span>
                            <button
                              onClick={() => {
                                const rd = todayReading.readings[0]
                                onSelectReading(rd.bookId, rd.chapters[0])
                              }}
                              className="p-1 rounded text-primary hover:bg-primary/10 transition-colors shrink-0 cursor-pointer"
                              title="Abrir pasaje en el lector"
                            >
                              <ExternalLink className="size-4" />
                            </button>
                          </div>

                          {/* Devotional button/badge */}
                          {(() => {
                            const readingsText = formatReadingText(todayReading.readings)
                            const existingDev = devotionals.find((dev: any) => {
                              const c = getDevotionalContent(dev)
                              return c?.planId === up.planId && c?.planDay === currentDay
                            })

                            if (existingDev) {
                              return (
                                <button
                                  type="button"
                                  onClick={() => setViewingDevotional(existingDev)}
                                  className="flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg border border-primary/20 bg-primary/10 hover:bg-primary/20 text-xs font-bold text-primary transition-all cursor-pointer w-full text-center"
                                >
                                  <Heart className="size-3.5 fill-primary text-primary" />
                                  <span>Ver Devocional</span>
                                </button>
                              )
                            } else {
                              return (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setDevTitle(`Devocional: ${up.name} - Día ${currentDay}`)
                                    setDevEmotion(null)
                                    setDevVerseRef(readingsText)
                                    setDevReflection("")
                                    setDevApplication("")
                                    setEditingDevotionalId(null)
                                    setActiveDevotionalDay({ userPlan: up, day: currentDay, readingsText })
                                  }}
                                  className="flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg border border-dashed border-primary/35 hover:bg-primary/5 text-xs font-semibold text-primary transition-all cursor-pointer w-full text-center"
                                >
                                  <PlusCircle className="size-3.5" />
                                  <span>Escribir Devocional</span>
                                </button>
                              )
                            }
                          })()}

                          <Button 
                            onClick={() => handleToggleDay(up, currentDay, false)}
                            disabled={updatingId === up.planId}
                            size="sm"
                            className="w-full text-xs h-8 gap-1 font-semibold"
                          >
                            <CheckCircle2 className="size-3.5" />
                            <span>Marcar Completado</span>
                          </Button>
                        </div>
                      )}
                    </div>

                    {/* Expand Days List Trigger */}
                    <button
                      onClick={() => setExpandedPlanId(isExpanded ? null : up.planId)}
                      className="w-full py-2 bg-muted/20 hover:bg-muted/40 text-xs font-semibold text-muted-foreground flex items-center justify-center gap-1.5 border-t border-border/20 transition-colors cursor-pointer"
                    >
                      <span>{isExpanded ? "Ocultar días del plan" : "Mostrar todos los días del plan"}</span>
                      {isExpanded ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
                    </button>

                    {/* Expandable days list */}
                    {isExpanded && (
                      <div className="p-4 md:p-6 bg-muted/5 divide-y divide-border/30 max-h-96 overflow-y-auto">
                        {daysList.map((d) => {
                          const isDone = progressDays.includes(d.day)
                          const readingsText = formatReadingText(d.readings)
                          const existingDev = devotionals.find((dev: any) => {
                            const c = getDevotionalContent(dev)
                            return c?.planId === up.planId && c?.planDay === d.day
                          })

                          return (
                            <div 
                              key={d.day}
                              className="py-3 flex items-center justify-between gap-4"
                            >
                              <div className="min-w-0 flex items-center gap-2 flex-wrap sm:flex-nowrap">
                                <span className={`text-xs font-semibold px-2 py-0.5 rounded shrink-0 ${
                                  isDone 
                                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" 
                                    : "bg-muted text-muted-foreground"
                                }`}>
                                  Día {d.day}
                                </span>
                                <span className={`text-sm leading-tight truncate ${isDone ? "text-muted-foreground line-through" : "text-foreground font-medium"}`}>
                                  {readingsText}
                                </span>
                                
                                <div className="flex items-center gap-2 shrink-0">
                                  <button
                                    onClick={() => {
                                      const rd = d.readings[0]
                                      onSelectReading(rd.bookId, rd.chapters[0])
                                    }}
                                    className="text-xs text-primary hover:underline inline-flex items-center gap-0.5 cursor-pointer font-semibold"
                                  >
                                    <span>Leer</span>
                                    <ExternalLink className="size-3" />
                                  </button>

                                  {existingDev ? (
                                    <button
                                      onClick={() => setViewingDevotional(existingDev)}
                                      className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline inline-flex items-center gap-0.5 bg-emerald-500/10 px-1.5 py-0.5 rounded cursor-pointer"
                                    >
                                      <span>📖 Devocional</span>
                                    </button>
                                  ) : (
                                    <button
                                      onClick={() => {
                                        setDevTitle(`Devocional: ${up.name} - Día ${d.day}`)
                                        setDevEmotion(null)
                                        setDevVerseRef(readingsText)
                                        setDevReflection("")
                                        setDevApplication("")
                                        setEditingDevotionalId(null)
                                        setActiveDevotionalDay({ userPlan: up, day: d.day, readingsText })
                                      }}
                                      className="text-xs font-bold text-primary hover:underline inline-flex items-center gap-0.5 bg-primary/10 px-1.5 py-0.5 rounded cursor-pointer"
                                    >
                                      <span>+ Devocional</span>
                                    </button>
                                  )}
                                </div>
                              </div>

                              <button
                                onClick={() => handleToggleDay(up, d.day, isDone)}
                                className={`size-8 rounded-lg border flex items-center justify-center transition-all cursor-pointer ${
                                  isDone 
                                    ? "bg-emerald-500 text-white border-emerald-500" 
                                    : "bg-transparent border-border hover:bg-muted"
                                }`}
                                title={isDone ? "Marcar como no leído" : "Marcar como leído"}
                              >
                                <CheckCircle2 className="size-4.5" />
                              </button>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )
        )}

        {/* Mis Devocionales del Plan */}
        {activeSubTab === "devotionals" && (
          planDevotionals.length === 0 ? (
            <div className="text-center py-12 rounded-2xl border border-dashed border-border p-8 bg-card/20 max-w-md mx-auto">
              <Heart className="mx-auto mb-3 size-10 text-muted-foreground/50" />
              <h3 className="text-base font-bold text-foreground mb-1">Aún no tienes devocionales de plan</h3>
              <p className="text-xs text-muted-foreground mb-4">
                En <strong>Mis Planes</strong>, abre un día y pulsa <strong>Escribir Devocional</strong> para guardar tus reflexiones de cada lectura.
              </p>
              <Button onClick={() => setActiveSubTab("my-plans")} size="sm">
                Ir a Mis Planes
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Devocionales que escribiste mientras seguías un plan de lectura. Pulsa uno para leerlo completo.
              </p>
              <div className="space-y-3">
                {planDevotionals.map((dev: any) => (
                  <button
                    key={dev.id}
                    type="button"
                    onClick={() => setViewingDevotional(dev)}
                    className="w-full text-left rounded-xl border border-border bg-card/65 p-4 shadow-sm hover:bg-accent/30 transition-colors cursor-pointer"
                  >
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className="inline-flex items-center gap-1 rounded-lg border border-primary/20 bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                        <Calendar className="size-3" />
                        {getPlanName(dev.content.planId)} · Día {dev.content.planDay}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(dev.createdAt).toLocaleDateString()}
                      </span>
                      {dev.emotion && (
                        <span className="text-[10px] font-semibold text-muted-foreground">
                          {EMOTIONS.find((e) => e.name === dev.emotion)?.emoji} {dev.emotion}
                        </span>
                      )}
                    </div>
                    <h3 className="text-base font-bold text-foreground">{dev.title}</h3>
                    {dev.verseRef && (
                      <p className="mt-1 text-xs text-primary font-medium">{dev.verseRef}</p>
                    )}
                    <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
                      {dev.content?.reflection}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )
        )}

        {/* Explorar Planes View */}
        {activeSubTab === "all-plans" && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {plans.map((p) => {
              const hasJoined = userPlans.some(up => up.planId === p.id)
              return (
                <div 
                  key={p.id}
                  className="rounded-xl border border-border bg-card/65 p-5 flex flex-col justify-between gap-4 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="space-y-2">
                    <h3 className="font-bold text-base text-foreground leading-snug">{p.name}</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">{p.description}</p>
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded">
                      <Calendar className="size-3" />
                      {p.durationDays} días
                    </span>
                  </div>

                  <Button
                    onClick={() => handleJoinPlan(p.id)}
                    disabled={hasJoined || joiningId === p.id}
                    size="sm"
                    className="w-full text-xs h-9 gap-1.5 font-semibold"
                  >
                    {joiningId === p.id ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : hasJoined ? (
                      <span>Iniciado</span>
                    ) : (
                      <>
                        <PlusCircle className="size-3.5" />
                        <span>Empezar este plan</span>
                      </>
                    )}
                  </Button>
                </div>
              )
            })}
          </div>
        )}

      </div>

      {/* Devotional Modal (Write / Edit) */}
      {activeDevotionalDay && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-background border border-border w-full max-w-2xl rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col max-h-[90dvh]">
            <header className="px-6 py-4 border-b border-border flex items-center justify-between">
              <h3 className="text-lg font-bold text-foreground">
                {editingDevotionalId ? "Editar Devocional del Plan" : "Escribir Devocional del Plan"}
              </h3>
              <button 
                onClick={() => {
                  setActiveDevotionalDay(null)
                  setEditingDevotionalId(null)
                }}
                className="text-muted-foreground hover:text-foreground text-sm font-semibold p-1.5 hover:bg-muted rounded-lg transition-colors cursor-pointer"
              >
                Cerrar
              </button>
            </header>

            <form onSubmit={handleSaveDevotional} className="p-6 space-y-4 overflow-y-auto flex-1 text-left">
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                  Título del Devocional
                </label>
                <input
                  type="text"
                  value={devTitle}
                  onChange={(e) => setDevTitle(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-2">
                  ¿Cómo te sientes hoy? (Estado de Ánimo)
                </label>
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                  {EMOTIONS.map((e) => (
                    <button
                      key={e.name}
                      type="button"
                      onClick={() => setDevEmotion(devEmotion === e.name ? null : e.name)}
                      className={`flex flex-col items-center justify-center gap-1 p-2 rounded-xl border text-xs font-medium transition-all cursor-pointer ${
                        devEmotion === e.name
                          ? "border-primary bg-primary/10 text-primary scale-105 shadow-sm font-semibold"
                          : "border-border bg-card/45 text-muted-foreground hover:bg-muted/40"
                      }`}
                    >
                      <span className="text-xl">{e.emoji}</span>
                      <span className="text-[10px] truncate max-w-full">{e.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                  Pasaje o Versículo Clave
                </label>
                <input
                  type="text"
                  value={devVerseRef}
                  onChange={(e) => setDevVerseRef(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-muted px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 text-muted-foreground"
                  readOnly
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                  ¿Qué te enseña Dios hoy? (Reflexión)
                </label>
                <textarea
                  value={devReflection}
                  onChange={(e) => setDevReflection(e.target.value)}
                  className="flex min-h-[120px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none font-serif"
                  placeholder="Escribe tus reflexiones, lecciones o meditaciones del pasaje..."
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                  ¿Cómo lo aplicarás a tu vida? (Aplicación)
                </label>
                <textarea
                  value={devApplication}
                  onChange={(e) => setDevApplication(e.target.value)}
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none bg-primary/5 border-primary/10"
                  placeholder="Escribe acciones específicas o instrucciones prácticas..."
                  required
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setActiveDevotionalDay(null)
                    setEditingDevotionalId(null)
                  }}
                  className="h-9 px-4 font-semibold text-xs cursor-pointer"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={savingDev}
                  className="h-9 px-6 font-semibold text-xs gap-1.5 cursor-pointer"
                >
                  {savingDev ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <span>Guardar Devocional</span>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Viewing Devotional Modal */}
      {viewingDevotional && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-background border border-border w-full max-w-2xl rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col max-h-[90dvh]">
            <header className="px-6 py-4 border-b border-border flex items-center justify-between">
              <h3 className="text-lg font-bold text-foreground">
                Devocional Guardado
              </h3>
              <div className="flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleStartEditDevotional(viewingDevotional)}
                  className="h-8 text-xs font-semibold cursor-pointer"
                >
                  <Edit className="size-3.5 mr-1" />
                  Editar
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleDeleteDevotional(viewingDevotional.id)}
                  className="h-8 text-xs font-semibold cursor-pointer"
                >
                  <Trash2 className="size-3.5 mr-1" />
                  Eliminar
                </Button>
                <button 
                  onClick={() => setViewingDevotional(null)}
                  className="text-muted-foreground hover:text-foreground text-sm font-semibold p-1.5 hover:bg-muted rounded-lg transition-colors ml-2 cursor-pointer"
                >
                  Cerrar
                </button>
              </div>
            </header>

            <div className="p-6 space-y-5 overflow-y-auto flex-1 text-left">
              {(() => {
                const viewContent = getDevotionalContent(viewingDevotional) ?? {}
                return (
              <>
              <div className="flex flex-wrap items-center gap-3">
                <span className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1 text-[11px] font-semibold text-muted-foreground shadow-sm">
                  <Calendar className="size-3.5" />
                  {new Date(viewingDevotional.createdAt).toLocaleDateString()}
                </span>
                {viewingDevotional.emotion && (
                  <span className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] font-bold shadow-sm ${
                    EMOTIONS.find(e => e.name === viewingDevotional.emotion)?.color || "bg-muted text-muted-foreground"
                  }`}>
                    <span>{EMOTIONS.find(e => e.name === viewingDevotional.emotion)?.emoji}</span>
                    <span>{viewingDevotional.emotion}</span>
                  </span>
                )}
                {viewContent.planId && (
                  <span className="flex items-center gap-1.5 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 shadow-sm">
                    <Calendar className="size-3.5" />
                    {getPlanName(viewContent.planId)} · Día {viewContent.planDay}
                  </span>
                )}
                {viewingDevotional.verseRef && (
                  <span className="flex items-center gap-1.5 rounded-lg border border-primary/20 bg-primary/5 px-2.5 py-1 text-[11px] font-semibold text-primary shadow-sm">
                    <BookOpen className="size-3.5" />
                    {viewingDevotional.verseRef}
                  </span>
                )}
              </div>

              <h2 className="text-2xl font-extrabold text-foreground">{viewingDevotional.title}</h2>

              <div className="space-y-4 pt-4 border-t border-border">
                <div className="space-y-1">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Reflexión
                  </h4>
                  <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap font-serif">
                    {viewContent.reflection}
                  </p>
                </div>

                <div className="space-y-1">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Instrucción / Aplicación Práctica
                  </h4>
                  <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap bg-primary/5 p-4 rounded-xl border border-primary/10">
                    {viewContent.application}
                  </p>
                </div>
              </div>
              </>
                )
              })()}
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
