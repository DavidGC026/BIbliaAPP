export type ImageFormatId = "9:16" | "16:9" | "1:1" | "3:4" | "4:5";

export type UnsplashOrientation = "portrait" | "landscape" | "squarish";

export interface ImageFormatPreset {
  id: ImageFormatId;
  label: string;
  hint: string;
  width: number;
  height: number;
  unsplashOrientation: UnsplashOrientation;
  previewW: number;
  previewH: number;
}

export const IMAGE_FORMATS: ImageFormatPreset[] = [
  { id: "9:16", label: "Historia", hint: "1080×1920", width: 1080, height: 1920, unsplashOrientation: "portrait", previewW: 18, previewH: 32 },
  { id: "16:9", label: "Paisaje", hint: "1920×1080", width: 1920, height: 1080, unsplashOrientation: "landscape", previewW: 32, previewH: 18 },
  { id: "1:1", label: "Cuadrado", hint: "1080×1080", width: 1080, height: 1080, unsplashOrientation: "squarish", previewW: 28, previewH: 28 },
  { id: "3:4", label: "Retrato", hint: "1080×1440", width: 1080, height: 1440, unsplashOrientation: "portrait", previewW: 24, previewH: 32 },
  { id: "4:5", label: "Feed", hint: "1080×1350", width: 1080, height: 1350, unsplashOrientation: "portrait", previewW: 26, previewH: 32 },
];

export function formatById(id: ImageFormatId): ImageFormatPreset {
  return IMAGE_FORMATS.find((f) => f.id === id) ?? IMAGE_FORMATS[0];
}

export function previewDimensions(format: ImageFormatPreset, maxW: number, maxH: number) {
  const ratio = format.width / format.height;
  if (ratio >= 1) {
    const width = Math.min(maxW, maxH * ratio);
    return { width, height: width / ratio };
  }
  const height = Math.min(maxH, maxW / ratio);
  return { width: height * ratio, height };
}

export function drawImageCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  w: number,
  h: number,
  posX = 50,
  posY = 50,
  zoom = 100,
) {
  const scale = zoom / 100;
  const imgRatio = img.width / img.height;
  const frameRatio = w / h;
  let drawW: number;
  let drawH: number;
  if (imgRatio > frameRatio) {
    drawH = h * scale;
    drawW = drawH * imgRatio;
  } else {
    drawW = w * scale;
    drawH = drawW / imgRatio;
  }
  ctx.drawImage(img, (w - drawW) * (posX / 100), (h - drawH) * (posY / 100), drawW, drawH);
}
