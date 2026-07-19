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
import type { RecentNotebookNote } from "@/lib/repo";
import type { AppTab } from "@/lib/nav";
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

export function HomePage({ onOpenBible, onNavigate, onOpenNote }: Props) {
  const { user } = useAuth();
  const allowedSections = parseAllowedSections(user?.allowedSections);
  const allows = (section: string) =>
    user?.role === "admin" ||
    !allowedSections ||
    allowedSections.includes(section);
  const [churchName, setChurchName] = useState("BibliaAPP");
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
        .then(({ settings }) =>
          setChurchName(settings.church_name || "BibliaAPP"),
        ),
      repo.repoListRecentNotebookNotes(3).then((r) => setNotes(r.notes)),
      repo.repoListFavorites().then((r) => {
        const sorted = [...r.favorites].sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
        );
        setFavorites(sorted.slice(0, 3));
        setCounts((c) => ({ ...c, favorites: sorted.length }));
      }),
      repo.repoListRecentHighlights(3).then((r) => {
        setHighlights(r.highlights);
      }),
      api
        .getAllHighlights()
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
              .slice(0, 3),
          ),
        ),
      api
        .getFeedAnnouncements()
        .then((r) => setAnnouncements(r.announcements.slice(0, 5))),
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
    <div className="mx-auto max-w-6xl space-y-8 p-6">
      <section>
        <h1 className="text-3xl font-bold text-foreground">
          ¡Hola, {firstName}!
        </h1>
        <p className="mt-2 text-muted-foreground">
          Te damos la bienvenida a {churchName}.
        </p>
      </section>
      {showOnboarding ? (
        <Card className="border-primary/25 bg-primary/10">
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
              className="text-muted-foreground"
              onClick={() => {
                dismissOnboarding();
                setShowOnboarding(false);
              }}
            >
              ×
            </button>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button onClick={() => onNavigate("bible")}>1. Leer</Button>
            <Button variant="outline" onClick={() => onNavigate("profile")}>
              2. Ver favoritos
            </Button>
            {allows("notebook") ? (
              <Button variant="outline" onClick={() => onNavigate("notes")}>
                3. Crear libreta
              </Button>
            ) : null}
          </div>
        </Card>
      ) : null}
      <VerseOfDayCard onReadInBible={onOpenBible} />
      {lastPassage ? (
        <Card className="flex items-center gap-4 border-primary/25">
          <span className="text-3xl">📖</span>
          <button
            className="min-w-0 flex-1 text-left"
            onClick={() =>
              onOpenBible({
                bibleId: lastPassage.bibleId,
                bookId: lastPassage.bookId,
                chapter: lastPassage.chapter,
              })
            }
          >
            <span className="block text-xs font-bold uppercase text-primary">
              Continuar lectura
            </span>
            <span className="block text-lg font-bold text-foreground">
              {lastPassage.bookName} {lastPassage.chapter}
            </span>
            <span className="text-xs text-muted-foreground">
              {lastPassage.bibleAbbr}
            </span>
          </button>
          <Button
            onClick={() =>
              onOpenBible({
                bibleId: lastPassage.bibleId,
                bookId: lastPassage.bookId,
                chapter: lastPassage.chapter,
              })
            }
          >
            Abrir
          </Button>
        </Card>
      ) : null}
      {allows("notebook") && notes.length ? (
        <HomeSection
          title="Notas recientes"
          action="Ver libretas →"
          onAction={() => onNavigate("notes")}
        >
          <div className="grid gap-3 md:grid-cols-3">
            {notes.map((note) => (
              <Card key={note.id}>
                <button
                  className="w-full text-left"
                  onClick={() => onOpenNote(note.notebookId, note.id)}
                >
                  <b className="block truncate text-foreground">
                    {note.title || "Sin título"}
                  </b>
                  <span className="text-xs text-primary">
                    {note.notebookName}
                  </span>
                  <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">
                    {plain(note.content)}
                  </p>
                </button>
              </Card>
            ))}
          </div>
        </HomeSection>
      ) : null}
      {allows("favorites") && favorites.length ? (
        <HomeSection
          title="Versículos guardados"
          action="Ver todos →"
          onAction={() => onNavigate("profile")}
        >
          <div className="grid gap-3 md:grid-cols-3">
            {favorites.map((item) => (
              <Card key={item.id} className="border-primary/20">
                <button
                  className="w-full text-left"
                  onClick={() =>
                    onOpenBible({
                      bibleId: item.bible_id,
                      bookId: item.book_id,
                      chapter: item.chapter,
                    })
                  }
                >
                  <b className="text-primary">
                    {item.book_name} {item.chapter}:{item.verse}
                  </b>
                  <p className="mt-2 line-clamp-4 text-sm text-foreground">
                    {item.verse_text || "Abrir pasaje guardado"}
                  </p>
                </button>
              </Card>
            ))}
          </div>
        </HomeSection>
      ) : null}
      {allows("highlights") && highlights.length ? (
        <HomeSection
          title="Subrayados recientes"
          action="Ver todos →"
          onAction={() => onNavigate("highlights")}
        >
          <div className="grid gap-3 md:grid-cols-3">
            {highlights.map((item) => (
              <Card
                key={item.id}
                style={{
                  borderLeft: `4px solid ${highlightColor(item.color)}`,
                }}
              >
                <button
                  className="w-full text-left"
                  onClick={() =>
                    onOpenBible({
                      bibleId: item.bible_id,
                      bookId: item.book_id,
                      chapter: item.chapter,
                    })
                  }
                >
                  <b className="text-primary">
                    {item.book_name} {item.chapter}:{item.verse}
                  </b>
                  <p className="mt-2 line-clamp-3 text-sm text-foreground">
                    {item.text}
                  </p>
                </button>
              </Card>
            ))}
          </div>
        </HomeSection>
      ) : null}
      {announcements.length ? (
        <HomeSection title="Anuncios oficiales">
          <div className="grid gap-3 md:grid-cols-2">
            {announcements.map((item) => (
              <Card
                key={item.id}
                className="border-amber-500/25 bg-amber-500/5"
              >
                <span className="text-xs font-bold uppercase text-amber-700 dark:text-amber-300">
                  Anuncio · {item.user_name}
                </span>
                <p className="mt-2 text-sm text-foreground">{item.content}</p>
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
          <div className="grid gap-3 md:grid-cols-3">
            {events.map((event) => (
              <Card
                key={`${event.source}-${event.id}`}
                className="cursor-pointer hover:bg-accent/40"
                onClick={() => onNavigate("events")}
              >
                <span className="text-xs font-bold uppercase text-primary">
                  {event.category || event.source}
                </span>
                <b className="mt-1 block text-foreground">{event.title}</b>
                <span className="mt-2 block text-xs text-muted-foreground">
                  {new Date(event.start_time).toLocaleString("es", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </span>
              </Card>
            ))}
          </div>
        </HomeSection>
      ) : null}
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          {
            value: counts.notebooks,
            label: "Libretas",
            tab: "notes" as AppTab,
            section: "notebook",
          },
          {
            value: counts.highlights,
            label: "Subrayados",
            tab: "highlights" as AppTab,
            section: "highlights",
          },
          {
            value: counts.favorites,
            label: "Favoritos",
            tab: "profile" as AppTab,
            section: "favorites",
          },
          {
            value: counts.devotionals,
            label: "Devocionales",
            tab: "notes" as AppTab,
            section: "devotionals",
          },
        ]
          .filter((item) => allows(item.section))
          .map((item) => (
            <Card key={item.label}>
              <button
                className="w-full text-left"
                onClick={() => onNavigate(item.tab)}
              >
                <span className="text-2xl font-bold text-primary">
                  {item.value}
                </span>
                <span className="ml-2 text-sm text-muted-foreground">
                  {item.label}
                </span>
              </button>
            </Card>
          ))}
      </section>
      <HomeSection
        title="Acciones rápidas"
        action="Personalizar →"
        onAction={() => setCustomizing(true)}
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {actions.map((key) => {
            const item = availableActions.find((entry) => entry.key === key);
            return item ? (
              <button
                key={key}
                onClick={() => runAction(key)}
                className="rounded-xl border border-border bg-card p-4 text-left hover:bg-accent"
              >
                <span className="text-2xl text-primary">{item.icon}</span>
                <b className="mt-2 block text-foreground">{item.title}</b>
                <span className="mt-1 block text-xs text-muted-foreground">
                  {item.description}
                </span>
              </button>
            ) : null;
          })}
        </div>
      </HomeSection>
      {customizing ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-5">
          <Card className="max-h-[85vh] w-full max-w-xl overflow-auto">
            <div className="flex justify-between">
              <h2 className="text-xl font-bold text-foreground">
                Accesos rápidos
              </h2>
              <button onClick={() => setCustomizing(false)}>×</button>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Elige qué acciones aparecen en Inicio.
            </p>
            <div className="mt-4 space-y-2">
              {availableActions.map((item) => (
                <label
                  key={item.key}
                  className="flex items-center gap-3 rounded-lg border border-border p-3"
                >
                  <input
                    type="checkbox"
                    checked={actions.includes(item.key)}
                    onChange={() =>
                      setActions((current) =>
                        current.includes(item.key)
                          ? current.length > 1
                            ? current.filter((key) => key !== item.key)
                            : current
                          : [...current, item.key],
                      )
                    }
                  />
                  <span>
                    <b className="block text-foreground">{item.title}</b>
                    <span className="text-xs text-muted-foreground">
                      {item.description}
                    </span>
                  </span>
                </label>
              ))}
            </div>
            <Button
              fullWidth
              className="mt-4"
              onClick={() => {
                saveHomeActions(actions);
                setCustomizing(false);
              }}
            >
              Guardar
            </Button>
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
        {action ? (
          <button onClick={onAction} className="text-xs font-bold text-primary">
            {action}
          </button>
        ) : null}
      </div>
      {children}
    </section>
  );
}
function plain(html: string) {
  const node = document.createElement("div");
  node.innerHTML = html;
  return node.textContent?.replace(/\s+/g, " ").trim() || "Sin contenido";
}
function highlightColor(value: string) {
  return (
    (
      {
        yellow: "#f59e0b",
        green: "#10b981",
        blue: "#0ea5e9",
        orange: "#f97316",
        pink: "#ec4899",
      } as Record<string, string>
    )[value] ?? value
  );
}

const HOME_ACTION_SECTIONS: Partial<Record<HomeActionKey, string>> = {
  read: "reading",
  search: "search",
  universalSearch: "search",
  note: "notebook",
  downloads: "reading",
  image: "reading",
  stats: "statistics",
  activity: "activity",
  dictionary: "dictionary",
  community: "feed",
};
