import type { LabelElement, TemplateDoc } from "@/types";
import { MM_PER_INCH } from "@/core/units";
import { drawDoc, toMonochrome } from "./draw";

export interface Raster {
  canvas: HTMLCanvasElement;
  dpi: number;
  pxPerMm: number;
}

export async function renderRaster(
  doc: TemplateDoc,
  values: Record<string, unknown>,
  dpi: number,
): Promise<Raster> {
  const pxPerMm = dpi / MM_PER_INCH;
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(doc.paper.width * pxPerMm));
  canvas.height = Math.max(1, Math.round(doc.paper.height * pxPerMm));
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  const { pending } = drawDoc(ctx, doc, { pxPerMm, values });
  await pending;
  return { canvas, dpi, pxPerMm };
}

/** crop one element's box out of a full-label raster, already 1-bit packed */
export function elementBits(
  raster: Raster,
  el: LabelElement,
  threshold = 170,
): { bytes: Uint8Array; bytesPerRow: number; width: number; height: number; x: number; y: number } {
  const x = Math.round(el.x * raster.pxPerMm);
  const y = Math.round(el.y * raster.pxPerMm);
  const w = Math.max(1, Math.round(el.w * raster.pxPerMm));
  const h = Math.max(1, Math.round(el.h * raster.pxPerMm));
  const cut = document.createElement("canvas");
  cut.width = w;
  cut.height = h;
  const ctx = cut.getContext("2d", { willReadFrequently: true })!;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(raster.canvas, x, y, w, h, 0, 0, w, h);
  const mono = toMonochrome(cut, threshold);
  return { ...mono, x, y };
}

export function labelBytes(raster: Raster, threshold = 170) {
  return toMonochrome(raster.canvas, threshold);
}
