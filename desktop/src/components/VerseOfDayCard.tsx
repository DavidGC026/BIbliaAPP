import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { getVerseOfDay } from "@/lib/api";
import { resolveVerseBackgroundImage } from "@/lib/resolveVerseBackground";
import type { BibleTarget, VerseOfDay } from "@/lib/types";

const THEME_COLORS: Record<string, string> = {
  Amor: "bg-rose-500/20 text-rose-100 border-rose-400/30",
  Fe: "bg-amber-500/20 text-amber-100 border-amber-400/30",
  Fortaleza: "bg-emerald-500/20 text-emerald-100 border-emerald-400/30",
  Ansiedad: "bg-indigo-500/20 text-indigo-100 border-indigo-400/30",
  Esperanza: "bg-sky-500/20 text-sky-100 border-sky-400/30",
  Paz: "bg-teal-500/20 text-teal-100 border-teal-400/30",
  Consuelo: "bg-purple-500/20 text-purple-100 border-purple-400/30",
  Promesa: "bg-fuchsia-500/20 text-fuchsia-100 border-fuchsia-400/30",
};

type Props = {
  onReadInBible?: (target: BibleTarget) => void;
};

export function VerseOfDayCard({ onReadInBible }: Props) {
  const [verse, setVerse] = useState<VerseOfDay | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getVerseOfDay()
      .then(async (v) => {
        if (cancelled) return;
        if (!v.backgroundImage && v.theme) {
          v = {
            ...v,
            backgroundImage:
              (await resolveVerseBackgroundImage(v)) ?? undefined,
          };
        }
        setVerse(v);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "No se pudo cargar");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const hasBg = Boolean(verse?.backgroundImage);
  const themeClass =
    verse?.theme &&
    (THEME_COLORS[verse.theme] ??
      "bg-primary/20 text-primary-foreground border-primary/30");

  if (loading) {
    return (
      <div className="overflow-hidden rounded-2xl border bg-card p-8 text-center shadow-sm">
        <p className="text-muted-foreground">Cargando versículo del día…</p>
      </div>
    );
  }

  if (error || !verse) {
    return (
      <div className="overflow-hidden rounded-2xl border bg-card p-8 text-center shadow-sm">
        <p className="text-xs font-bold uppercase tracking-wider text-primary">
          Versículo del día
        </p>
        <p className="mt-3 text-sm text-destructive">{error ?? "No disponible"}</p>
      </div>
    );
  }

  const content = (
    <>
      {verse.theme ? (
        <span
          className={`mb-6 inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium tracking-wide ${
            hasBg
              ? themeClass
              : (THEME_COLORS[verse.theme] ??
                "bg-primary/10 text-primary border-primary/20")
          }`}
        >
          {verse.theme.toUpperCase()}
        </span>
      ) : null}
      <blockquote
        className={`max-w-2xl text-xl font-medium leading-relaxed md:text-2xl ${
          hasBg ? "text-white" : "text-foreground"
        }`}
      >
        “{verse.text}”
      </blockquote>
      <p
        className={`mt-6 text-sm font-semibold md:text-base ${
          hasBg ? "text-white/85" : "text-muted-foreground"
        }`}
      >
        — {verse.reference}
      </p>
      {onReadInBible ? (
        <Button
          variant="outline"
          className={`mt-8 ${hasBg ? "border-white/30 bg-white/10 text-white hover:bg-white/20 hover:text-white" : ""}`}
          onClick={() =>
            onReadInBible({
              bookId: verse.idBook,
              chapter: verse.chapter,
              bibleId: verse.idBible,
            })
          }
        >
          Leer en la Biblia
        </Button>
      ) : null}
    </>
  );

  if (hasBg) {
    return (
      <div className="relative mx-auto w-full max-w-md overflow-hidden rounded-2xl border shadow-sm">
        <div className="relative aspect-[3/4] w-full">
          <img
            src={verse.backgroundImage!}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-black/45" />
          <div className="relative z-10 flex h-full flex-col items-center justify-center p-6 text-center md:p-8">
            {content}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-2xl border bg-card/50 shadow-sm backdrop-blur-xl">
      <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-primary/5 blur-[50px]" />
      <div className="pointer-events-none absolute -bottom-10 -left-10 h-40 w-40 rounded-full bg-blue-500/5 blur-[50px]" />
      <div className="relative z-10 flex flex-col items-center p-6 text-center md:p-8">
        {content}
      </div>
    </div>
  );
}
