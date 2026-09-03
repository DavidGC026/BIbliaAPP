import { useEffect, useState } from "react";
import { VerseOfDayCard } from "@/components/VerseOfDayCard";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useAuth } from "@/context/AuthContext";
import * as api from "@/lib/api";
import { COMMUNITY_ENABLED } from "@/lib/config";
import {
  dismissOnboarding,
  getHomeActions,
  getLastPassage,
  HOME_ACTION_CATALOG,
  isOnboardingDismissed,
  saveHomeActions,
  type HomeActionKey,
  type LastPassage,
} from "@/lib/preferences";
import * as repo from "@/lib/repo";
import {
  cacheChurchName,
  getCachedChurchName,
} from "@/lib/offline/appCache";
import type { RecentNotebookNote } from "@/lib/repo";
import type { AppTab } from "@/lib/nav";
import { Icon } from "@/components/ui/Icon";
import { parseAllowedSections } from "@/lib/nav";
import type {
  BibleTarget,
  ChurchEvent,
  Favorite,
  FeedAnnouncement,
  HighlightItem,
} from "@/lib/types";

type Props = {
  onOpenBible: (target: BibleTarget) => void;
  onNavigate: (tab: AppTab) => void;
  onOpenNote: (notebookId: number, noteId: number) => void;
};

const HOME_ACTION_SECTIONS: Partial<Record<HomeActionKey, string>> = {
  read: "bible",
  search: "search",
  universalSearch: "search",
  note: "notebook",
  community: "feed",
  stats: "statistics",
  activity: "activity",
  downloads: "bible",
  image: "bible",
  dictionary: "bible",
};

export function HomePage({ onOpenBible, onNavigate, onOpenNote }: Props) {
  const { user } = useAuth();
  const allowedSections = parseAllowedSections(user?.allowedSections);
  const allows = (section: string) =>
    user?.role === "admin" ||
    !allowedSections ||
    allowedSections.includes(section);
  const [churchName, setChurchName] = useState(getCachedChurchName);
  const [lastPassage, setLastPassage] = useState<LastPassage | null>(
    getLastPassage,
  );
  const [notes, setNotes] = useState<RecentNotebookNote[]>([]);
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [highlights, setHighlights] = useState<HighlightItem[]>([]);
  const [events, setEvents] = useState<ChurchEvent[]>([]);
  const [announcements, setAnnouncements] = useState<FeedAnnouncement[]>([]);
  const [counts, setCounts] = useState({
    notebooks: 0,
    favorites: 0,
    highlights: 0,
    devotionals: 0,
  });
  const [actions, setActions] = useState<HomeActionKey[]>(getHomeActions);
  const [customizing, setCustomizing] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(
    () => !isOnboardingDismissed(),
  );

  useEffect(() => {
    setLastPassage(getLastPassage());
    Promise.allSettled([
      api
        .getChurchSettings()
        .then(({ settings }) => {
          const name = settings.church_name || "BibliaAPP";
          setChurchName(name);
          cacheChurchName(name);
        }),
      repo.repoListRecentNotebookNotes(4).then((r) => setNotes(r.notes)),
      repo.repoListFavorites().then((r) => {
        const sorted = [...r.favorites].sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
        );
        setFavorites(sorted.slice(0, 4));
        setCounts((c) => ({ ...c, favorites: sorted.length }));
      }),
      repo.repoListRecentHighlights(4).then((r) => {
        setHighlights(r.highlights);
      }),
      repo
        .repoListRecentHighlights(Number.MAX_SAFE_INTEGER)
        .then((r) =>
          setCounts((c) => ({ ...c, highlights: r.highlights.length })),
        ),
      api
        .listDevotionals()
        .then((r) =>
          setCounts((c) => ({ ...c, devotionals: r.devotionals.length })),
        ),
      repo
        .repoListNotebooks()
        .then((r) =>
          setCounts((c) => ({ ...c, notebooks: r.notebooks.length })),
        ),
      api
        .listChurchEvents()
        .then((r) =>
          setEvents(
            r.events
              .filter(
                (event) => new Date(event.start_time).getTime() >= Date.now(),
              )
              .slice(0, 4),
          ),
        ),
      api
        .getFeedAnnouncements()
        .then((r) => setAnnouncements(r.announcements.slice(0, 4))),
    ]);
  }, []);

  const firstName = user?.name?.split(" ")[0] ?? "hermano";
  const availableActions = HOME_ACTION_CATALOG.filter((item) => {
    const section = HOME_ACTION_SECTIONS[item.key];
    if (item.key === "community" && !COMMUNITY_ENABLED) return false;
    return !section || allows(section);
  });

  function runAction(key: HomeActionKey) {
    if (key === "read") {
      if (lastPassage)
        onOpenBible({
          bibleId: lastPassage.bibleId,
          bookId: lastPassage.bookId,
          chapter: lastPassage.chapter,
        });
      else onNavigate("bible");
    } else if (key === "search" || key === "universalSearch")
      onNavigate("search");
    else if (key === "note") onNavigate("notes");
    else if (key === "downloads" || key === "image" || key === "dictionary")
      onNavigate("bible");
    else if (key === "stats") onNavigate("statistics");
    else if (key === "activity") onNavigate("activity");
    else if (key === "community") onNavigate("feed");
  }

  return (
    <div className="desktop-page space-y-8 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      {/* 1. TOP HERO GRID: Greeting, Continue Reading, Stats & Verse of the Day */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Greeting, Continue, Stats */}
        <div className="lg:col-span-7 xl:col-span-7 space-y-6">
          <section className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-foreground">
                ¡Hola, {firstName}!
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Te damos la bienvenida a {churchName}.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onNavigate("bible")}
                className="gap-2"
              >
                <Icon name="bible" size={16} />
                <span>Lector</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onNavigate("search")}
                className="gap-2"
              >
                <Icon name="search" size={16} />
                <span>Buscar</span>
              </Button>
            </div>
          </section>

          {/* Onboarding Box if active */}
          {showOnboarding ? (
            <Card className="border-primary/25 bg-primary/10 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-bold text-foreground">
                    Tres pasos para comenzar
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Lee un capítulo, guarda tu primer versículo y crea una libreta
                    para tus reflexiones.
                  </p>
                </div>
                <button
                  className="text-muted-foreground hover:text-foreground text-lg p-1"
                  onClick={() => {
                    dismissOnboarding();
                    setShowOnboarding(false);
                  }}
                >
                  ×
                </button>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button size="sm" onClick={() => onNavigate("bible")}>1. Leer</Button>
                <Button size="sm" variant="outline" onClick={() => onNavigate("profile")}>
                  2. Ver favoritos
                </Button>
                {allows("notebook") ? (
                  <Button size="sm" variant="outline" onClick={() => onNavigate("notes")}>
                    3. Crear libreta
                  </Button>
                ) : null}
              </div>
            </Card>
          ) : null}

          {/* Continue Reading Card */}
          {lastPassage ? (
            <Card className="flex items-center justify-between gap-4 border-primary/30 bg-card p-5 shadow-sm hover:border-primary/50 transition-colors">
              <div className="flex items-center gap-4 min-w-0">
                <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary shrink-0">
                  <Icon name="bible" size={24} />
                </div>
                <div className="min-w-0">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-primary">
                    Continuar lectura
                  </span>
                  <p className="text-xl font-bold text-foreground truncate">
                    {lastPassage.bookName} {lastPassage.chapter}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    Versión {lastPassage.bibleAbbr}
                  </p>
                </div>
              </div>
              <Button
                onClick={() =>
                  onOpenBible({
                    bibleId: lastPassage.bibleId,
                    bookId: lastPassage.bookId,
                    chapter: lastPassage.chapter,
                  })
                }
                className="shrink-0 font-bold px-4"
              >
                Abrir →
              </Button>
            </Card>
          ) : null}

          {/* Quick Stats Grid */}
          <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              {
                value: counts.notebooks,
                label: "Libretas",
                tab: "notes" as AppTab,
                section: "notebook",
                icon: "notes" as const,
              },
              {
                value: counts.highlights,
                label: "Subrayados",
                tab: "highlights" as AppTab,
                section: "highlights",
                icon: "sparkles" as const,
              },
              {
                value: counts.favorites,
                label: "Favoritos",
                tab: "profile" as AppTab,
                section: "favorites",
                icon: "heart" as const,
              },
              {
                value: counts.devotionals,
                label: "Devocionales",
                tab: "notes" as AppTab,
                section: "devotionals",
                icon: "book" as const,
              },
            ]
              .filter((item) => allows(item.section))
              .map((item) => (
                <Card
                  key={item.label}
                  className="p-3.5 hover:bg-accent/40 transition-colors cursor-pointer"
                >
                  <button
                    className="w-full text-left flex flex-col justify-between h-full"
                    onClick={() => onNavigate(item.tab)}
                  >
                    <div className="flex items-center justify-between text-muted-foreground mb-1">
                      <span className="text-xs font-semibold">{item.label}</span>
                      <Icon name={item.icon} size={15} />
                    </div>
                    <span className="text-2xl font-bold text-foreground">
                      {item.value}
                    </span>
                  </button>
                </Card>
              ))}
          </section>
        </div>

        {/* Right Column: Verse of the Day */}
        <div className="lg:col-span-5 xl:col-span-5">
          <VerseOfDayCard onReadInBible={onOpenBible} />
        </div>
      </div>

      {/* 2. ACCIONES RÁPIDAS */}
      <HomeSection
        title="Acciones rápidas"
        action="Personalizar →"
        onAction={() => setCustomizing(true)}
      >
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
          {actions.map((key) => {
            const item = availableActions.find((entry) => entry.key === key);
            return item ? (
              <button
                key={key}
                onClick={() => runAction(key)}
                className="flex flex-col items-start rounded-2xl border border-border/80 bg-card p-4 text-left transition-all hover:bg-accent/50 hover:border-primary/30 shadow-sm"
              >
                <span className="inline-flex rounded-xl bg-primary/10 p-2.5 text-primary mb-2">
                  <Icon name={item.icon} size={20} />
                </span>
                <b className="text-sm font-semibold text-foreground line-clamp-1">
                  {item.title}
                </b>
                <span className="mt-0.5 text-xs text-muted-foreground line-clamp-1">
                  {item.description}
                </span>
              </button>
            ) : null;
          })}
        </div>
      </HomeSection>

      {/* 3. RECENT NOTES */}
      {allows("notebook") && notes.length ? (
        <HomeSection
          title="Notas recientes"
          action="Ver todas las libretas →"
          onAction={() => onNavigate("notes")}
        >
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            {notes.map((note) => (
              <Card
                key={note.id}
                className="hover:border-primary/40 hover:shadow-md transition-all p-4 cursor-pointer"
              >
                <button
                  className="w-full text-left space-y-1.5"
                  onClick={() => onOpenNote(note.notebookId, note.id)}
                >
                  <b className="block truncate text-sm font-bold text-foreground">
                    {note.title || "Sin título"}
                  </b>
                  <span className="inline-block text-xs font-semibold text-primary/90">
                    {note.notebookName}
                  </span>
                  <p className="line-clamp-3 text-xs text-muted-foreground leading-relaxed">
                    {plain(note.content)}
                  </p>
                </button>
              </Card>
            ))}
          </div>
        </HomeSection>
      ) : null}

      {/* 4. SAVED VERSES (FAVORITES) */}
      {allows("favorites") && favorites.length ? (
        <HomeSection
          title="Versículos guardados"
          action="Ver todos →"
          onAction={() => onNavigate("profile")}
        >
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            {favorites.map((item) => (
              <Card
                key={item.id}
                className="hover:border-primary/40 hover:shadow-md transition-all p-4 border-border/80"
              >
                <button
                  className="w-full text-left space-y-1.5"
                  onClick={() =>
                    onOpenBible({
                      bibleId: item.bible_id,
                      bookId: item.book_id,
                      chapter: item.chapter,
                    })
                  }
                >
                  <b className="text-xs font-bold text-primary block">
                    {item.book_name} {item.chapter}:{item.verse}
                  </b>
                  <p className="line-clamp-4 text-xs text-foreground/90 italic">
                    «{item.verse_text || "Abrir pasaje guardado"}»
                  </p>
                </button>
              </Card>
            ))}
          </div>
        </HomeSection>
      ) : null}

      {/* 5. RECENT HIGHLIGHTS */}
      {allows("highlights") && highlights.length ? (
        <HomeSection
          title="Subrayados recientes"
          action="Ver todos →"
          onAction={() => onNavigate("highlights")}
        >
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            {highlights.map((item) => (
              <Card
                key={item.id}
                className="p-4 transition-all hover:shadow-md"
                style={{
                  borderLeft: `4px solid ${highlightColor(item.color)}`,
                }}
              >
                <button
                  className="w-full text-left space-y-1.5"
                  onClick={() =>
                    onOpenBible({
                      bibleId: item.bible_id,
                      bookId: item.book_id,
                      chapter: item.chapter,
                    })
                  }
                >
                  <b className="text-xs font-bold text-primary block">
                    {item.book_name} {item.chapter}:{item.verse}
                  </b>
                  <p className="line-clamp-3 text-xs text-foreground/90">
                    {item.text}
                  </p>
                </button>
              </Card>
            ))}
          </div>
        </HomeSection>
      ) : null}

      {/* 6. ANNOUNCEMENTS & EVENTS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {announcements.length ? (
          <HomeSection title="Anuncios oficiales">
            <div className="space-y-3">
              {announcements.map((item) => (
                <Card
                  key={item.id}
                  className="border-amber-500/25 bg-amber-500/[0.04] p-4"
                >
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                    Anuncio · {item.user_name}
                  </span>
                  <p className="mt-1 text-xs text-foreground leading-relaxed">
                    {item.content}
                  </p>
                </Card>
              ))}
            </div>
          </HomeSection>
        ) : null}

        {allows("calendar") && events.length ? (
          <HomeSection
            title="Próximos eventos"
            action="Ver calendario →"
            onAction={() => onNavigate("events")}
          >
            <div className="space-y-3">
              {events.map((event) => (
                <Card
                  key={`${event.source}-${event.id}`}
                  className="cursor-pointer hover:bg-accent/40 p-4 transition-colors"
                  onClick={() => onNavigate("events")}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
                        {event.category || event.source}
                      </span>
                      <b className="mt-0.5 block text-sm text-foreground">
                        {event.title}
                      </b>
                    </div>
                    <span className="text-[11px] text-muted-foreground whitespace-nowrap">
                      {new Date(event.start_time).toLocaleString("es", {
                        dateStyle: "short",
                        timeStyle: "short",
                      })}
                    </span>
                  </div>
                </Card>
              ))}
            </div>
          </HomeSection>
        ) : null}
      </div>

      {/* Customizing Modal */}
      {customizing ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <Card className="max-h-[85vh] w-full max-w-xl overflow-auto p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-border pb-3">
              <h2 className="text-lg font-bold text-foreground">
                Personalizar accesos rápidos
              </h2>
              <button
                onClick={() => setCustomizing(false)}
                className="text-muted-foreground hover:text-foreground text-lg p-1"
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              Selecciona qué accesos deseas ver en la pantalla de inicio:
            </p>
            <div className="space-y-2">
              {availableActions.map((entry) => {
                const active = actions.includes(entry.key);
                return (
                  <button
                    key={entry.key}
                    type="button"
                    onClick={() => {
                      const next = active
                        ? actions.filter((k) => k !== entry.key)
                        : [...actions, entry.key];
                      setActions(next);
                      saveHomeActions(next);
                    }}
                    className={`flex w-full items-center justify-between rounded-xl border p-3 text-left transition-colors ${
                      active
                        ? "border-primary bg-primary/10 text-foreground"
                        : "border-border bg-card text-muted-foreground"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon name={entry.icon} size={18} />
                      <div>
                        <b className="text-xs text-foreground block">{entry.title}</b>
                        <span className="text-[11px] text-muted-foreground">
                          {entry.description}
                        </span>
                      </div>
                    </div>
                    <span className="text-xs font-bold">{active ? "✓" : "+"}</span>
                  </button>
                );
              })}
            </div>
            <div className="flex justify-end pt-2">
              <Button size="sm" onClick={() => setCustomizing(false)}>
                Listo
              </Button>
            </div>
          </Card>
        </div>
      ) : null}
    </div>
  );
}

function HomeSection({
  title,
  action,
  onAction,
  children,
}: {
  title: string;
  action?: string;
  onAction?: () => void;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-foreground">{title}</h2>
        {action && onAction ? (
          <button
            onClick={onAction}
            className="text-xs font-semibold text-primary hover:underline"
          >
            {action}
          </button>
        ) : null}
      </div>
      {children}
    </section>
  );
}

function plain(html: string) {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function highlightColor(color?: string) {
  switch (color) {
    case "yellow":
      return "#FACC15";
    case "green":
      return "#34D399";
    case "blue":
      return "#38BDF8";
    case "orange":
      return "#FB923C";
    case "pink":
      return "#F472B6";
    default:
      return "var(--primary)";
  }
}
