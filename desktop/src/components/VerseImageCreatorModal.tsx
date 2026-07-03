import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import * as api from "@/lib/api";
import type { UnsplashImage } from "@/lib/types";
import {
  IMAGE_FORMATS,
  type ImageFormatId,
  drawImageCover,
  formatById,
  previewDimensions,
} from "@/lib/verseImageFormats";

const GRADIENTS = [
  { id: "gold", css: "linear-gradient(160deg, #92400e, #451a03, #1c1917)", colors: ["#92400e", "#451a03", "#1c1917"] },
  { id: "sunset", css: "linear-gradient(160deg, #ea580c, #7c2d12, #431407)", colors: ["#ea580c", "#7c2d12", "#431407"] },
  { id: "ocean", css: "linear-gradient(160deg, #0369a1, #155e75, #083344)", colors: ["#0369a1", "#155e75", "#083344"] },
  { id: "forest", css: "linear-gradient(160deg, #15803d, #14532d, #052e16)", colors: ["#15803d", "#14532d", "#052e16"] },
  { id: "purple", css: "linear-gradient(160deg, #7e22ce, #4c1d95, #2e1065)", colors: ["#7e22ce", "#4c1d95", "#2e1065"] },
  { id: "night", css: "linear-gradient(160deg, #1d4ed8, #312e81, #0f172a)", colors: ["#1d4ed8", "#312e81", "#0f172a"] },
] as const;

const HINTS = ["naturaleza", "cielo", "mar", "montaña", "amanecer", "flores", "cruz", "bosque", "atardecer", "lluvia"];
const PREVIEW_MAX_W = 320;
const PREVIEW_MAX_H = 220;

function mergePhotos(prev: UnsplashImage[], next: UnsplashImage[]) {
  const seen = new Set(prev.map((p) => p.id));
  return [...prev, ...next.filter((p) => !seen.has(p.id))];
}

function textSizeForLength(len: number) {
  if (len > 220) return 14;
  if (len > 140) return 16;
  if (len > 80) return 17;
  return 19;
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function bgImgStyle(posX: number, posY: number, zoom: number) {
  return {
    position: "absolute" as const,
    inset: 0,
    width: "100%",
    height: "100%",
    objectFit: "cover" as const,
    objectPosition: `${posX}% ${posY}%`,
    transform: `scale(${zoom / 100})`,
    transformOrigin: `${posX}% ${posY}%`,
  };
}

async function renderToCanvas(
  text: string,
  reference: string,
  abbr: string,
  gradientIdx: number,
  photoUrl: string | null,
  format: ImageFormatId,
  bgPosX: number,
  bgPosY: number,
  bgZoom: number,
): Promise<HTMLCanvasElement> {
  const { width: exportW, height: exportH } = formatById(format);
  const canvas = document.createElement("canvas");
  canvas.width = exportW;
  canvas.height = exportH;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas no disponible");

  const g = GRADIENTS[gradientIdx];
  if (photoUrl) {
    try {
      const img = await loadImage(photoUrl);
      drawImageCover(ctx, img, exportW, exportH, bgPosX, bgPosY, bgZoom);
    } catch {
      const grd = ctx.createLinearGradient(0, 0, exportW, exportH);
      g.colors.forEach((c, i) => grd.addColorStop(i / (g.colors.length - 1), c));
      ctx.fillStyle = grd;
      ctx.fillRect(0, 0, exportW, exportH);
    }
  } else {
    const grd = ctx.createLinearGradient(0, 0, exportW, exportH);
    g.colors.forEach((c, i) => grd.addColorStop(i / (g.colors.length - 1), c));
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, exportW, exportH);
  }

  ctx.fillStyle = "rgba(0,0,0,0.42)";
  ctx.fillRect(0, 0, exportW, exportH);

  const pad = exportW * 0.1;
  const maxW = exportW - pad * 2;
  const preview = previewDimensions(formatById(format), PREVIEW_MAX_W, PREVIEW_MAX_H);
  const scale = exportW / preview.width;
  const fontSize = Math.round(textSizeForLength(text.length) * scale);

  ctx.fillStyle = "#fff";
  ctx.textAlign = "center";
  ctx.font = `500 ${fontSize}px Georgia, serif`;
  const quote = `"${text}"`;
  const lines = wrapText(ctx, quote, maxW);
  const lineH = fontSize * 1.45;
  const blockH = lines.length * lineH + 60 * scale;
  let y = exportH / 2 - blockH / 2;
  for (const line of lines) {
    ctx.fillText(line, exportW / 2, y);
    y += lineH;
  }

  ctx.font = `700 ${Math.round(14 * scale)}px system-ui, sans-serif`;
  ctx.fillStyle = "rgba(255,255,255,0.92)";
  ctx.fillText(reference, exportW / 2, y + 20 * scale);

  ctx.font = `${Math.round(11 * scale)}px system-ui, sans-serif`;
  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.fillText(abbr, exportW / 2, y + 48 * scale);

  return canvas;
}

type Props = {
  open: boolean;
  onClose: () => void;
  text: string;
  reference: string;
  abbr: string;
};

export function VerseImageCreatorModal({ open, onClose, text, reference, abbr }: Props) {
  const [gradientIdx, setGradientIdx] = useState(0);
  const [imageFormat, setImageFormat] = useState<ImageFormatId>("9:16");
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [selectedPhotoId, setSelectedPhotoId] = useState<string | null>(null);
  const [photos, setPhotos] = useState<UnsplashImage[]>([]);
  const [search, setSearch] = useState("");
  const [activeSearch, setActiveSearch] = useState<string | undefined>();
  const [photosPage, setPhotosPage] = useState(1);
  const [hasMorePhotos, setHasMorePhotos] = useState(false);
  const [loadingPhotos, setLoadingPhotos] = useState(false);
  const [loadingMorePhotos, setLoadingMorePhotos] = useState(false);
  const [bgPosX, setBgPosX] = useState(50);
  const [bgPosY, setBgPosY] = useState(50);
  const [bgZoom, setBgZoom] = useState(100);
  const [exporting, setExporting] = useState(false);
  const imageFormatRef = useRef(imageFormat);
  imageFormatRef.current = imageFormat;

  const format = formatById(imageFormat);
  const preview = previewDimensions(format, PREVIEW_MAX_W, PREVIEW_MAX_H);
  const textSize = textSizeForLength(text.length);
  const gradient = GRADIENTS[gradientIdx];

  const loadPhotos = useCallback(async (
    query?: string,
    page = 1,
    append = false,
    formatId?: ImageFormatId,
  ) => {
    if (page === 1) setLoadingPhotos(true);
    else setLoadingMorePhotos(true);
    try {
      const res = await api.fetchUnsplashImages(query, {
        page,
        orientation: formatById(formatId ?? imageFormatRef.current).unsplashOrientation,
      });
      setPhotos((prev) => (append ? mergePhotos(prev, res.images) : res.images));
      setPhotosPage(page);
      setHasMorePhotos(res.hasMore);
    } catch {
      if (!append) setPhotos([]);
    } finally {
      setLoadingPhotos(false);
      setLoadingMorePhotos(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    setGradientIdx(0);
    setImageFormat("9:16");
    setPhotoUrl(null);
    setSelectedPhotoId(null);
    setSearch("");
    setActiveSearch(undefined);
    setPhotosPage(1);
    setHasMorePhotos(false);
    setBgPosX(50);
    setBgPosY(50);
    setBgZoom(100);
    void loadPhotos(undefined, 1, false);
  }, [open, loadPhotos]);

  const runSearch = () => {
    const q = search.trim() || undefined;
    setActiveSearch(q);
    void loadPhotos(q, 1, false);
  };

  const loadMorePhotos = () => {
    if (!hasMorePhotos || loadingMorePhotos) return;
    void loadPhotos(activeSearch, photosPage + 1, true);
  };

  const selectFormat = (id: ImageFormatId) => {
    setImageFormat(id);
    void loadPhotos(activeSearch, 1, false, id);
  };

  async function downloadImage() {
    setExporting(true);
    try {
      const canvas = await renderToCanvas(
        text,
        reference,
        abbr,
        gradientIdx,
        photoUrl,
        imageFormat,
        bgPosX,
        bgPosY,
        bgZoom,
      );
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/png"),
      );
      if (!blob) throw new Error("No se pudo generar la imagen");
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${reference.replace(/[/\\?%*:|"<>]/g, "-")}.png`;
      a.click();
      URL.revokeObjectURL(url);
      onClose();
    } finally {
      setExporting(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/50 p-4 sm:items-center">
      <div className="max-h-[94vh] w-full max-w-lg overflow-y-auto rounded-xl border border-border bg-card p-4 shadow-xl">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold text-foreground">Crear imagen</h2>
          <button type="button" onClick={onClose} className="text-xl text-muted-foreground">
            ×
          </button>
        </div>

        <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">Formato</p>
        <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
          {IMAGE_FORMATS.map((fmt) => (
            <button
              key={fmt.id}
              type="button"
              onClick={() => selectFormat(fmt.id)}
              className={`flex shrink-0 flex-col items-center gap-1 rounded-lg border px-2.5 py-2 ${
                imageFormat === fmt.id ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"
              }`}
            >
              <div
                className="border-2 border-current rounded-sm"
                style={{ width: fmt.previewW, height: fmt.previewH }}
              />
              <span className="text-[10px] font-bold">{fmt.label}</span>
              <span className="text-[9px] opacity-70">{fmt.hint}</span>
            </button>
          ))}
        </div>

        <div className="mb-4 flex justify-center">
          <div
            className="relative overflow-hidden rounded-2xl"
            style={{ width: preview.width, height: preview.height }}
          >
            {photoUrl ? (
              <img src={photoUrl} alt="" style={bgImgStyle(bgPosX, bgPosY, bgZoom)} />
            ) : (
              <div className="absolute inset-0" style={{ backgroundImage: gradient.css }} />
            )}
            <div className="absolute inset-0 bg-black/40" />
            <div className="relative flex h-full flex-col items-center justify-center px-6 text-center text-white">
              <p style={{ fontSize: textSize, lineHeight: `${textSize * 1.45}px` }}>"{text}"</p>
              <p className="mt-5 text-sm font-bold">{reference}</p>
              <p className="mt-1 text-xs text-white/55">{abbr}</p>
            </div>
          </div>
        </div>

        {photoUrl ? (
          <div className="mb-4 space-y-2 rounded-lg border border-border p-3">
            <label className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Zoom fondo</span>
              <span>{bgZoom}%</span>
            </label>
            <input type="range" min={100} max={200} step={5} value={bgZoom} onChange={(e) => setBgZoom(Number(e.target.value))} className="w-full accent-primary" />
            <label className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Posición horizontal</span>
              <span>{bgPosX}%</span>
            </label>
            <input type="range" min={0} max={100} step={5} value={bgPosX} onChange={(e) => setBgPosX(Number(e.target.value))} className="w-full accent-primary" />
            <label className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Posición vertical</span>
              <span>{bgPosY}%</span>
            </label>
            <input type="range" min={0} max={100} step={5} value={bgPosY} onChange={(e) => setBgPosY(Number(e.target.value))} className="w-full accent-primary" />
          </div>
        ) : null}

        <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">Colores</p>
        <div className="mb-4 flex flex-wrap gap-2">
          {GRADIENTS.map((g, i) => (
            <button
              key={g.id}
              type="button"
              onClick={() => {
                setGradientIdx(i);
                setPhotoUrl(null);
                setSelectedPhotoId(null);
              }}
              className={`h-10 w-10 rounded-full border-2 ${i === gradientIdx && !photoUrl ? "border-primary" : "border-transparent"}`}
              style={{ backgroundImage: g.css }}
              title={g.id}
            />
          ))}
        </div>

        <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
          Fotos (Unsplash)
        </p>
        <div className="mb-2 flex gap-2">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && runSearch()}
            placeholder="Buscar fondo (mar, cielo, cruz…)"
            className="min-w-0 flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
          />
          <Button variant="outline" onClick={runSearch} disabled={loadingPhotos}>
            Buscar
          </Button>
        </div>
        <div className="mb-3 flex flex-wrap gap-2">
          {HINTS.map((h) => (
            <button
              key={h}
              type="button"
              onClick={() => {
                setSearch(h);
                setActiveSearch(h);
                void loadPhotos(h, 1, false);
              }}
              className={`rounded-full border px-2 py-1 text-xs ${
                activeSearch === h
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground"
              }`}
            >
              {h}
            </button>
          ))}
        </div>

        <div className="mb-2 grid grid-cols-4 gap-2 sm:grid-cols-5">
          {loadingPhotos ? (
            <p className="col-span-full text-sm text-muted-foreground">Cargando fotos…</p>
          ) : (
            photos.map((img) => (
              <button
                key={img.id}
                type="button"
                onClick={() => {
                  setPhotoUrl(img.url);
                  setSelectedPhotoId(img.id);
                }}
                className={`aspect-[4/5] overflow-hidden rounded-lg border-2 ${
                  selectedPhotoId === img.id ? "border-primary" : "border-transparent"
                }`}
              >
                <img src={img.thumb} alt="" className="h-full w-full object-cover" />
              </button>
            ))
          )}
        </div>

        {hasMorePhotos && !loadingPhotos ? (
          <Button
            variant="outline"
            fullWidth
            className="mb-4"
            onClick={loadMorePhotos}
            loading={loadingMorePhotos}
          >
            Cargar más fotos
          </Button>
        ) : (
          <div className="mb-4" />
        )}

        <Button fullWidth loading={exporting} onClick={downloadImage}>
          Descargar imagen ({format.hint})
        </Button>
      </div>
    </div>
  );
}
