import JsBarcode from "jsbarcode";
import QRCode from "qrcode";
import type { BarcodeFormat } from "@/types";

const FORMAT: Record<BarcodeFormat, string> = {
  code128: "CODE128",
  ean13: "EAN13",
  code39: "CODE39",
  itf14: "ITF14",
};

const barCache = new Map<string, HTMLCanvasElement>();
const qrCache = new Map<string, HTMLCanvasElement>();

export function barcodeCanvas(
  value: string,
  format: BarcodeFormat,
  maxWidthPx: number,
  heightPx: number,
): HTMLCanvasElement | null {
  if (!value) return null;
  const key = `${format}|${value}|${Math.round(maxWidthPx)}|${Math.round(heightPx)}`;
  const hit = barCache.get(key);
  if (hit) return hit;

  const probe = document.createElement("canvas");
  let modules = 0;
  try {
    JsBarcode(probe, value, {
      format: FORMAT[format],
      width: 1,
      height: 10,
      margin: 0,
      displayValue: false,
      valid: (ok: boolean) => {
        if (!ok) modules = 0;
      },
    });
  } catch {
    return null;
  }
  // JsBarcode draws with width=1 → canvas width equals module count.
  modules = probe.width;
  if (!modules) return null;

  const modulePx = Math.max(1, Math.floor(maxWidthPx / modules));
  const canvas = document.createElement("canvas");
  try {
    JsBarcode(canvas, value, {
      format: FORMAT[format],
      width: modulePx,
      height: Math.max(8, Math.round(heightPx)),
      margin: 0,
      displayValue: false,
      background: "#ffffff",
      lineColor: "#000000",
    });
  } catch {
    // invalid checksum / digit count → fall back to Code128 so the label still prints
    try {
      JsBarcode(canvas, value, {
        format: "CODE128",
        width: modulePx,
        height: Math.max(8, Math.round(heightPx)),
        margin: 0,
        displayValue: false,
        background: "#ffffff",
        lineColor: "#000000",
      });
    } catch {
      return null;
    }
  }
  if (barCache.size > 200) barCache.clear();
  barCache.set(key, canvas);
  return canvas;
}

export async function qrCanvas(
  value: string,
  level: "L" | "M" | "Q" | "H",
  sizePx: number,
): Promise<HTMLCanvasElement | null> {
  if (!value) return null;
  const size = Math.max(8, Math.round(sizePx));
  const key = `${value}|${level}|${size}`;
  const hit = qrCache.get(key);
  if (hit) return hit;
  try {
    const canvas = document.createElement("canvas");
    await QRCode.toCanvas(canvas, value, {
      errorCorrectionLevel: level,
      margin: 0,
      width: size,
      color: { dark: "#000000", light: "#ffffff" },
    });
    if (qrCache.size > 200) qrCache.clear();
    qrCache.set(key, canvas);
    return canvas;
  } catch {
    return null;
  }
}

/** cache-only accessor — used by the synchronous paint pass */
export function getQr(value: string, level: "L" | "M" | "Q" | "H", sizePx: number) {
  return qrCache.get(`${value}|${level}|${Math.max(8, Math.round(sizePx))}`) ?? null;
}

const imgCache = new Map<string, HTMLImageElement>();

export function loadImage(src: string): Promise<HTMLImageElement | null> {
  if (!src) return Promise.resolve(null);
  const hit = imgCache.get(src);
  if (hit && hit.complete) return Promise.resolve(hit);
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      imgCache.set(src, img);
      resolve(img);
    };
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

export function getImage(src: string) {
  const hit = imgCache.get(src);
  return hit && hit.complete && hit.naturalWidth > 0 ? hit : null;
}
