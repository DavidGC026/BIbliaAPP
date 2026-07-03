import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import * as repo from "@/lib/repo";
import type { BibleTarget, Favorite } from "@/lib/types";

type Props = {
  onOpenBible: (target: BibleTarget) => void;
  onBack?: () => void;
};

export function FavoritesPage({ onOpenBible, onBack }: Props) {
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  async function load() {
    try {
      setError(null);
      const { favorites: list } = await repo.repoListFavorites();
      setFavorites(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar favoritos");
    }
  }

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, []);

  async function remove(id: number) {
    if (!confirm("¿Eliminar este versículo de favoritos?")) return;
    setDeletingId(id);
    try {
      await repo.repoDeleteFavorite(id);
      setFavorites((prev) => prev.filter((f) => f.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo eliminar");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <header className="flex items-center gap-3">
        {onBack ? (
          <Button variant="ghost" onClick={onBack}>
            ← Perfil
          </Button>
        ) : null}
        <div>
          <h1 className="text-2xl font-bold text-foreground">Favoritos</h1>
          <p className="text-sm text-muted-foreground">
            Versículos guardados en tu cuenta.
          </p>
        </div>
      </header>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      {loading ? (
        <p className="text-muted-foreground">Cargando…</p>
      ) : favorites.length === 0 ? (
        <Card className="text-center">
          <p className="text-muted-foreground">No tienes versículos favoritos.</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Selecciona versículos en el lector y pulsa ♥ Favorito.
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {favorites.map((f) => (
            <Card key={f.id} className="space-y-2">
              <p className="text-sm font-bold text-primary">
                {f.book_name} {f.chapter}:{f.verse}
              </p>
              <p className="font-serif text-foreground">{f.verse_text}</p>
              <div className="flex flex-wrap gap-2 pt-1">
                <Button
                  variant="outline"
                  onClick={() =>
                    onOpenBible({
                      bookId: f.book_id,
                      chapter: f.chapter,
                      bibleId: f.bible_id,
                    })
                  }
                >
                  Leer
                </Button>
                <Button
                  variant="ghost"
                  loading={deletingId === f.id}
                  onClick={() => remove(f.id)}
                >
                  Eliminar
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
