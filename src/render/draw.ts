import type {
  BarcodeElement,
  ImageElement,
  LabelElement,
  LineElement,
  QrElement,
  RectElement,
  TableElement,
  TemplateDoc,
  TextElement,
} from "@/types";
import { MM_PER_INCH } from "@/core/units";
import { interpolate, tableRows } from "@/core/resolve";
import { barcodeCanvas, getImage, getQr, loadImage, qrCanvas } from "./barcode";
import { alignX, alignY, fontSpec, wrapLines } from "./text";

export const PT_TO_MM = MM_PER_INCH / 72;

export interface DrawOptions {
  pxPerMm: number;
  values: Record<string, unknown>;
  /** hide background for transparent exports */
  transparent?: boolean;
  /** draw element frames (design aid, screen only) */
  guide?: boolean;
}

type Ctx = CanvasRenderingContext2D;

export function drawDoc(
  ctx: Ctx,
  doc: TemplateDoc,
  opts: DrawOptions,
): { pending: Promise<void> } {
  const pending = (async () => {
    await primeAssets(doc, opts);
    paint(ctx, doc, opts);
  })();
  return { pending };
}

async function primeAssets(doc: TemplateDoc, opts: DrawOptions) {
  const jobs: Promise<unknown>[] = [];
  for (const el of doc.elements) {
    if (el.hidden) continue;
    if (el.type === "qrcode") {
      const value = interpolate(el.value, opts.values);
      const size = Math.max(el.w, el.h) * opts.pxPerMm;
      jobs.push(qrCanvas(value, el.level, size));
    } else if (el.type === "image" && el.src) {
      jobs.push(loadImage(el.src));
    }
  }
  if (jobs.length) await Promise.all(jobs);
}

function paint(ctx: Ctx, doc: TemplateDoc, opts: DrawOptions) {
  const { pxPerMm } = opts;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.setTransform(pxPerMm, 0, 0, pxPerMm, 0, 0);

  if (!opts.transparent) {
    ctx.fillStyle = doc.paper.background || "#ffffff";
    ctx.fillRect(0, 0, doc.paper.width, doc.paper.height);
  }

  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, doc.paper.width, doc.paper.height);
  ctx.clip();
  ctx.textBaseline = "top";

  for (const el of doc.elements) {
    if (el.hidden) continue;
    drawElement(ctx, el, opts);
  }
  ctx.restore();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
}

function withElement(
  ctx: Ctx,
  el: LabelElement,
  fn: (ctx: Ctx) => void | Promise<void>,
) {
  ctx.save();
  const cx = el.x + el.w / 2;
  const cy = el.y + el.h / 2;
  ctx.translate(cx, cy);
  if (el.rotate) ctx.rotate((el.rotate * Math.PI) / 180);
  ctx.translate(-cx, -cy);
  const done = fn(ctx);
  if (done instanceof Promise) {
    return done.finally(() => ctx.restore());
  }
  ctx.restore();
}

function drawElement(ctx: Ctx, el: LabelElement, opts: DrawOptions) {
  switch (el.type) {
    case "text":
      withElement(ctx, el, (c) => drawText(c, el, opts));
      return;
    case "barcode":
      withElement(ctx, el, (c) => drawBarcode(c, el, opts));
      return;
    case "qrcode":
      withElement(ctx, el, (c) => drawQr(c, el, opts));
      return;
    case "image":
      withElement(ctx, el, (c) => drawImage(c, el, opts));
      return;
    case "rect":
      withElement(ctx, el, (c) => drawRect(c, el));
      return;
    case "line":
      withElement(ctx, el, (c) => drawLine(c, el));
      return;
    case "table":
      withElement(ctx, el, (c) => drawTable(c, el, opts));
      return;
    default:
      return;
  }
}

function drawText(ctx: Ctx, el: TextElement, opts: DrawOptions) {
  const sizeMm = el.fontSize * PT_TO_MM;
  const pad = el.padding ?? 0;
  const boxW = Math.max(0.5, el.w - pad * 2);
  const boxH = Math.max(0.5, el.h - pad * 2);
  if (el.background && el.background !== "transparent") {
    ctx.fillStyle = el.background;
    ctx.fillRect(el.x, el.y, el.w, el.h);
  }
  ctx.font = fontSpec(el, sizeMm);
  ctx.fillStyle = el.color || "#111111";
  ctx.letterSpacing = `${(el.letterSpacing || 0) * (sizeMm / el.fontSize)}px`;

  const text = interpolate(el.text, opts.values);
  const lines = wrapLines(ctx, text, boxW, el.wrap);
  const lh = sizeMm * (el.lineHeight || 1.2);
  const total = lines.length * lh;
  const x0 = el.x + pad;
  const y0 = el.y + pad + alignY(boxH, total, el.valign);

  lines.forEach((line, i) => {
    const w = ctx.measureText(line).width;
    const x = x0 + alignX(boxW, w, el.align);
    const y = y0 + i * lh + (lh - sizeMm) / 2;
    ctx.fillText(line, x, y);
    if (el.underline) {
      ctx.fillRect(x, y + sizeMm * 1.05, w, Math.max(0.15, sizeMm * 0.06));
    }
  });
  ctx.letterSpacing = "0px";
}

function drawBarcode(ctx: Ctx, el: BarcodeElement, opts: DrawOptions) {
  const value = interpolate(el.value, opts.values);
  const textH = el.showText ? el.textSize * 1.6 : 0;
  const barH = Math.max(2, el.h - textH);
  const canvas = barcodeCanvas(
    value,
    el.format,
    el.w * opts.pxPerMm * 2,
    barH * opts.pxPerMm,
  );
  if (!canvas) {
    ctx.strokeStyle = "#d64545";
    ctx.lineWidth = 0.2;
    ctx.strokeRect(el.x, el.y, el.w, el.h);
    return;
  }
  const wMm = canvas.width / opts.pxPerMm;
  const drawW = Math.min(el.w, wMm);
  const x = el.x + (el.w - drawW) / 2;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(canvas, x, el.y, drawW, barH);
  if (el.showText) {
    const sizeMm = el.textSize * PT_TO_MM;
    ctx.font = `400 ${sizeMm}px "Segoe UI", Arial, sans-serif`;
    ctx.fillStyle = "#000";
    const w = ctx.measureText(value).width;
    ctx.fillText(value, el.x + (el.w - w) / 2, el.y + barH + (textH - sizeMm) / 2);
  }
}

function drawQr(ctx: Ctx, el: QrElement, opts: DrawOptions) {
  const value = interpolate(el.value, opts.values);
  const sizePx = Math.max(el.w, el.h) * opts.pxPerMm;
  const canvas = getQr(value, el.level, sizePx);
  if (!canvas) {
    ctx.strokeStyle = "#d64545";
    ctx.lineWidth = 0.2;
    ctx.strokeRect(el.x, el.y, el.w, el.h);
    return;
  }
  const s = Math.min(el.w, el.h) - (el.quiet || 0) * 2;
  const x = el.x + (el.w - s) / 2;
  const y = el.y + (el.h - s) / 2;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(canvas, x, y, s, s);
}

function drawImage(ctx: Ctx, el: ImageElement, opts: DrawOptions) {
  void opts;
  const img = getImage(el.src);
  if (!img) {
    ctx.strokeStyle = "#c9ced6";
    ctx.setLineDash([1, 1]);
    ctx.lineWidth = 0.2;
    ctx.strokeRect(el.x, el.y, el.w, el.h);
    ctx.setLineDash([]);
    return;
  }
  const iw = img.naturalWidth;
  const ih = img.naturalHeight;
  let w = el.w;
  let h = el.h;
  if (el.fit !== "stretch") {
    const s = el.fit === "cover" ? Math.max(el.w / iw, el.h / ih) : Math.min(el.w / iw, el.h / ih);
    w = iw * s;
    h = ih * s;
  }
  const x = el.x + (el.w - w) / 2;
  const y = el.y + (el.h - h) / 2;
  ctx.save();
  ctx.beginPath();
  ctx.rect(el.x, el.y, el.w, el.h);
  ctx.clip();
  ctx.drawImage(img, x, y, w, h);
  ctx.restore();
}

function drawRect(ctx: Ctx, el: RectElement) {
  ctx.beginPath();
  if (el.radius > 0) {
    const r = Math.min(el.radius, Math.min(el.w, el.h) / 2);
    ctx.roundRect(el.x, el.y, el.w, el.h, r);
  } else {
    ctx.rect(el.x, el.y, el.w, el.h);
  }
  if (el.inverted) {
    ctx.fillStyle = "#111111";
    ctx.fill();
    return;
  }
  if (el.fill && el.fill !== "transparent" && el.fill !== "none") {
    ctx.fillStyle = el.fill;
    ctx.fill();
  }
  if (el.strokeWidth > 0 && el.stroke !== "transparent") {
    ctx.strokeStyle = el.stroke || "#111111";
    ctx.lineWidth = el.strokeWidth;
    ctx.stroke();
  }
}

function drawLine(ctx: Ctx, el: LineElement) {
  ctx.strokeStyle = el.stroke || "#111111";
  ctx.lineWidth = Math.max(0.1, el.strokeWidth);
  ctx.beginPath();
  ctx.moveTo(el.x, el.y + el.h / 2);
  ctx.lineTo(el.x + el.w, el.y + el.h / 2);
  ctx.stroke();
}

function drawTable(ctx: Ctx, el: TableElement, opts: DrawOptions) {
  const rows = tableRows(el, opts.values);
  const totalW = el.columns.reduce((s, c) => s + c.width, 0) || 1;
  const xs: number[] = [0];
  for (const c of el.columns) xs.push(xs[xs.length - 1] + (c.width / totalW) * el.w);
  const hh = el.headerHeight;
  const rh = el.rowHeight;
  const totalH = Math.min(el.h, hh + rh * rows.length);

  ctx.save();
  ctx.beginPath();
  ctx.rect(el.x, el.y, el.w, el.h);
  ctx.clip();

  // header background
  if (el.headerBg && el.headerBg !== "transparent") {
    ctx.fillStyle = el.headerBg;
    ctx.fillRect(el.x, el.y, el.w, hh);
  }
  if (el.striped) {
    ctx.fillStyle = "rgba(0,0,0,0.035)";
    rows.forEach((_, i) => {
      if (i % 2 === 1) ctx.fillRect(el.x, el.y + hh + i * rh, el.w, rh);
    });
  }

  const sizeMm = el.fontSize * PT_TO_MM;
  ctx.font = `400 ${sizeMm}px "Microsoft YaHei", sans-serif`;
  ctx.textBaseline = "middle";

  const cellText = (txt: string, x: number, y: number, w: number, h: number, bold = false) => {
    ctx.font = `${bold ? 600 : 400} ${sizeMm}px "Microsoft YaHei", sans-serif`;
    ctx.fillStyle = "#111111";
    let t = txt;
    const pad = 0.6;
    while (t.length > 1 && ctx.measureText(t).width > w - pad * 2) t = t.slice(0, -1);
    if (t !== txt && t.length > 1) t = t.slice(0, -1) + "…";
    ctx.fillText(t, x + pad, y + h / 2);
  };

  el.columns.forEach((col, i) => {
    cellText(col.title, el.x + xs[i], el.y, xs[i + 1] - xs[i], hh, true);
  });

  rows.forEach((row, r) => {
    const y = el.y + hh + r * rh;
    if (y + rh > el.y + totalH + 0.01) return;
    el.columns.forEach((col, i) => {
      const raw = row[col.field];
      cellText(raw === undefined || raw === null ? "" : String(raw), el.x + xs[i], y, xs[i + 1] - xs[i], rh);
    });
  });

  if (el.borderWidth > 0) {
    ctx.strokeStyle = "#111111";
    ctx.lineWidth = el.borderWidth;
    ctx.beginPath();
    const bottom = el.y + Math.min(totalH, hh + rh * rows.length);
    ctx.rect(el.x, el.y, el.w, bottom - el.y);
    for (let i = 1; i < xs.length - 1; i++) {
      ctx.moveTo(el.x + xs[i], el.y);
      ctx.lineTo(el.x + xs[i], bottom);
    }
    ctx.moveTo(el.x, el.y + hh);
    ctx.lineTo(el.x + el.w, el.y + hh);
    for (let r = 1; r <= rows.length; r++) {
      const y = el.y + hh + r * rh;
      if (y < bottom) {
        ctx.moveTo(el.x, y);
        ctx.lineTo(el.x + el.w, y);
      }
    }
    ctx.stroke();
  }
  ctx.restore();
  ctx.textBaseline = "top";
}

/** raster → 1-bit packed rows, for ZPL ^GFA / TSPL BITMAP */
export function toMonochrome(canvas: HTMLCanvasElement, threshold = 170) {
  const { width, height } = canvas;
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  const data = ctx.getImageData(0, 0, width, height).data;
  const bytesPerRow = Math.ceil(width / 8);
  const out = new Uint8Array(bytesPerRow * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const a = data[i + 3] / 255;
      const lum =
        (0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]) * a +
        255 * (1 - a);
      if (lum < threshold) {
        out[y * bytesPerRow + (x >> 3)] |= 0x80 >> (x & 7);
      }
    }
  }
  return { bytes: out, bytesPerRow, width, height };
}

export function bytesToHex(bytes: Uint8Array) {
  let s = "";
  const table = "0123456789ABCDEF";
  for (let i = 0; i < bytes.length; i++) {
    s += table[bytes[i] >> 4] + table[bytes[i] & 15];
  }
  return s;
}
