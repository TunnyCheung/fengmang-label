import type {
  LabelElement,
  LineElement,
  RectElement,
  TemplateDoc,
} from "@/types";
import { mmToDots } from "@/core/units";

export interface BitImage {
  bytes: Uint8Array;
  bytesPerRow: number;
  width: number;
  height: number;
}

export type BitProvider = (el: LabelElement) => BitImage;

export interface EmitOptions {
  dpi: number;
  speed?: number;
  density?: number;
  offset?: number;
  copies?: number;
  /**
   * Paint the whole label as one image. Preferred: it keeps white-on-black
   * (inverted) artwork intact, which per-element bitmaps cannot express.
   */
  whole?: BitImage;
}

const HEX = "0123456789ABCDEF";

function toHex(bytes: Uint8Array): string {
  let s = "";
  for (let i = 0; i < bytes.length; i++) {
    s += HEX[bytes[i] >> 4] + HEX[bytes[i] & 15];
  }
  return s;
}

function clampInt(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Math.round(v)));
}

/** Normalize to 8-bit aligned rows so both the byte count and hex length are exact. */
function packedRows(img: BitImage): {
  bytes: Uint8Array;
  widthBytes: number;
  height: number;
} {
  const widthBytes = Math.max(1, Math.ceil(img.width / 8));
  const height = Math.max(1, img.height);
  const size = widthBytes * height;
  if (img.bytesPerRow === widthBytes && img.bytes.length === size) {
    return { bytes: img.bytes, widthBytes, height };
  }
  const out = new Uint8Array(size);
  const srcStride = Math.max(widthBytes, img.bytesPerRow || widthBytes);
  for (let y = 0; y < height; y++) {
    const start = y * srcStride;
    out.set(img.bytes.subarray(start, start + widthBytes), y * widthBytes);
  }
  return { bytes: out, widthBytes, height };
}

function isFilled(fill: string): boolean {
  const f = fill.trim().toLowerCase();
  return !(
    f === "" ||
    f === "transparent" ||
    f === "none" ||
    f === "white" ||
    f === "#fff" ||
    f === "#ffffff"
  );
}

function isNative(el: LabelElement): el is RectElement | LineElement {
  if (el.type !== "rect" && el.type !== "line") return false;
  return Math.abs(el.rotate % 360) < 0.001;
}

export function emitZpl(
  doc: TemplateDoc,
  values: Record<string, unknown>,
  bits: BitProvider,
  opts: EmitOptions,
): string {
  void values;
  const dpi = opts.dpi;
  const width = Math.max(1, mmToDots(doc.paper.width, dpi));
  const height = Math.max(1, mmToDots(doc.paper.height, dpi));
  const offset = opts.offset ?? doc.print.offset ?? 0;
  const offsetX = mmToDots(offset, dpi);
  const offsetY = mmToDots(offset, dpi);
  const speed = clampInt(opts.speed ?? doc.print.speed ?? 4, 1, 14);
  const density = clampInt(opts.density ?? doc.print.density ?? 8, 0, 15);
  const copies = Math.max(1, Math.round(opts.copies ?? doc.print.copies ?? 1));

  const out: string[] = [
    "^XA",
    `^PW${width}`,
    `^LL${height}`,
    `^LH${offsetX},${offsetY}`,
    "^CI28",
    `^MD${density}`,
    `^PR${speed}`,
    `^PQ${copies}`,
  ];

  if (opts.whole) {
    const img = packedRows(opts.whole);
    const hex = toHex(img.bytes);
    out.push(`^FO0,0^GFA,${img.bytes.length},${img.bytes.length},${img.widthBytes},${hex}^FS`);
    out.push("^XZ");
    return out.join("\n");
  }

  for (const el of doc.elements) {
    if (el.hidden) continue;
    const x = mmToDots(el.x, dpi);
    const y = mmToDots(el.y, dpi);

    if (isNative(el)) {
      if (el.type === "line") {
        const w = mmToDots(el.w, dpi);
        const h = mmToDots(el.h, dpi);
        const thickness = Math.max(1, mmToDots(el.strokeWidth, dpi));
        if (h > w) {
          out.push(
            `^FO${x},${y}^GB${thickness},${Math.max(1, h)},${thickness}^FS`,
          );
        } else {
          out.push(
            `^FO${x},${y}^GB${Math.max(1, w)},1,${thickness}^FS`,
          );
        }
        continue;
      }

      const w = Math.max(1, mmToDots(el.w, dpi));
      const h = Math.max(1, mmToDots(el.h, dpi));
      const stroke = Math.max(1, mmToDots(el.strokeWidth, dpi));
      const thickness = isFilled(el.fill) ? Math.min(w, h) : stroke;
      out.push(`^FO${x},${y}^GB${w},${h},${thickness}^FS`);
      continue;
    }

    const img = packedRows(bits(el));
    const hex = toHex(img.bytes);
    const total = img.bytes.length;
    out.push(
      `^FO${x},${y}^GFA,${total},${total},${img.widthBytes},${hex}^FS`,
    );
  }

  out.push("^XZ");
  return out.join("\n");
}
