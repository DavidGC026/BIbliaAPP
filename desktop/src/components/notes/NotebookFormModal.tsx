import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { BookCover } from "@/components/notes/BookCover";
import * as api from "@/lib/api";
import {
  NOTEBOOK_PRESET_COVERS,
  getPresetCover,
  isPresetCover,
} from "@/lib/notebookCovers";
import type { UnsplashImage } from "@/lib/types";

type Props = {
  open: boolean;
  mode: "create" | "edit";
  initialName?: string;
  initialCover?: string | null;
  saving?: boolean;
  onClose: () => void;
  onSave: (name: string, coverImage: string) => void;
};

const DEFAULT_QUERY = "nature landscape books";
const SEARCH_HINTS = [
  "libros",
  "naturaleza",
  "cielo",
  "mar",
  "montaña",
  "flores",
  "cruz",
  "bosque",
  "atardecer",
  "vintage",
];

export function NotebookFormModal({
  open,
  mode,
  initialName = "",
  initialCover,
  saving,
  onClose,
  onSave,
}: Props) {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [name, setName] = useState(initialName);
  const [cover, setCover] = useState(initialCover || "grad-purple");
  const [query, setQuery] = useState("");
  const [photos, setPhotos] = useState<UnsplashImage[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingPhotos, setLoadingPhotos] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadPhotos = useCallback(
    async (search = DEFAULT_QUERY, nextPage = 1, append = false) => {
      setLoadingPhotos(true);
      setError(null);
      try {
        const result = await api.fetchUnsplashImages(search, {
          page: nextPage,
          orientation: "portrait",
        });
        setPhotos((current) =>
          append
            ? [
                ...current,
                ...result.images.filter(
                  (image) => !current.some((item) => item.id === image.id),
                ),
              ]
            : result.images,
        );
        setPage(nextPage);
        setHasMore(result.hasMore);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "No se pudieron cargar las portadas.",
        );
      } finally {
        setLoadingPhotos(false);
      }
    },
    [],
  );

  useEffect(() => {
    if (!open) return;
    setName(initialName);
    setCover(initialCover || "grad-purple");
    setQuery("");
    setPhotos([]);
    setPage(1);
    setHasMore(false);
    setError(null);
    void loadPhotos();
  }, [open, initialName, initialCover, loadPhotos]);

  if (!open) return null;

  const previewTitle = name.trim() || "Mi libreta";
  const selectedPreset = isPresetCover(cover) ? getPresetCover(cover) : null;

  async function uploadCover(file: File) {
    if (!file.type.startsWith("image/")) {
      setError("Selecciona un archivo de imagen.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("La portada supera el máximo de 10 MB.");
      return;
    }
    setUploading(true);
    setError(null);
    try {
      const uploaded = await api.uploadImage(file);
      setCover(uploaded.url);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "No se pudo subir la portada",
      );
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-border bg-card p-5 shadow-xl">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-foreground">
            {mode === "create" ? "Nueva libreta" : "Editar libreta"}
          </h2>
          <button className="text-muted-foreground" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="mt-4 flex justify-center">
          <BookCover
            title={previewTitle}
            coverImage={cover}
            className="max-w-[120px]"
          />
        </div>
        <label className="mt-4 block text-sm">
          <span className="text-muted-foreground">Nombre</span>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-foreground"
            placeholder="Mi libreta de estudio"
          />
        </label>

        <p className="mt-5 text-xs font-semibold uppercase text-muted-foreground">
          Buscar portada en Unsplash
        </p>
        <div className="mt-2 flex gap-2">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) =>
              event.key === "Enter" && void loadPhotos(query || DEFAULT_QUERY)
            }
            className="min-w-0 flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm"
            placeholder="Biblioteca vintage, montañas, flores…"
          />
          <Button
            variant="outline"
            loading={loadingPhotos}
            onClick={() => void loadPhotos(query || DEFAULT_QUERY)}
          >
            Buscar
          </Button>
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {SEARCH_HINTS.map((hint) => (
            <button
              key={hint}
              type="button"
              onClick={() => {
                setQuery(hint);
                void loadPhotos(hint);
              }}
              className="rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground hover:border-primary hover:text-primary"
            >
              {hint}
            </button>
          ))}
        </div>
        {photos.length ? (
          <div className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-6">
            {photos.map((photo) => (
              <button
                key={photo.id}
                type="button"
                title={`Foto de ${photo.author}`}
                onClick={() => setCover(photo.url)}
                className={`aspect-[3/4] overflow-hidden rounded-lg border-2 ${cover === photo.url ? "border-primary" : "border-transparent"}`}
              >
                <img
                  src={photo.thumb}
                  alt=""
                  className="h-full w-full object-cover"
                />
              </button>
            ))}
          </div>
        ) : null}
        {hasMore ? (
          <Button
            className="mt-2"
            variant="ghost"
            loading={loadingPhotos}
            onClick={() =>
              void loadPhotos(query || DEFAULT_QUERY, page + 1, true)
            }
          >
            Cargar más
          </Button>
        ) : null}

        <p className="mt-5 text-xs font-semibold uppercase text-muted-foreground">
          Portada prediseñada
        </p>
        <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-6">
          {NOTEBOOK_PRESET_COVERS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setCover(item.id)}
              className={`rounded-lg p-1 ${cover === item.id ? "ring-2 ring-primary" : ""}`}
              title={item.label}
            >
              <div
                className="h-12 rounded-md"
                style={{
                  background: `linear-gradient(135deg, ${item.colors.join(", ")})`,
                }}
              />
            </button>
          ))}
        </div>
        {selectedPreset ? (
          <p className="mt-1 text-xs text-muted-foreground">
            {selectedPreset.label}
          </p>
        ) : null}

        <p className="mt-5 text-xs font-semibold uppercase text-muted-foreground">
          URL o archivo propio
        </p>
        <div className="mt-2 flex gap-2">
          <input
            value={isPresetCover(cover) ? "" : cover}
            onChange={(event) => setCover(event.target.value)}
            className="min-w-0 flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm"
            placeholder="https://images.unsplash.com/…"
          />
          <Button
            variant="outline"
            loading={uploading}
            onClick={() => fileRef.current?.click()}
          >
            Subir
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void uploadCover(file);
            }}
          />
        </div>
        {error ? (
          <p className="mt-2 text-sm text-destructive">{error}</p>
        ) : null}
        <div className="mt-5 flex flex-wrap gap-2">
          <Button
            onClick={() => onSave(name.trim(), cover || "grad-purple")}
            loading={saving}
            disabled={!name.trim() || uploading}
          >
            Guardar libreta
          </Button>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
        </div>
      </div>
    </div>
  );
}
