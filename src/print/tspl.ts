import type {
  LabelElement,
  LineElement,
  RectElement,
  TemplateDoc,
} from "@/types";
import { mmToDots } from "@/core/units";
import type { BitImage, BitProvider, EmitOptions } from "./zpl";

const HEX = "0123456789ABCDEF";

function toHex(bytes: Uint8Array): string {
  let s = "";
  for (let i = 0; i < bytes.length; i++) {
    s += HEX[bytes[i] >> 4] + HEX[bytes[i] & 15];
  }
  return s;
}

function packImage(img: BitImage): {
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

function fmtMm(v: number): string {
  return String(Math.round(v * 100) / 100);
}

export function emitTspl(
  doc: TemplateDoc,
  values: Record<string, unknown>,
  bits: BitProvider,
  opts: EmitOptions,
): string {
  void values;
  const dpi = opts.dpi;
  const offset = opts.offset ?? doc.print.offset ?? 0;
  const offsetDots = mmToDots(offset, dpi);
  const copies = Math.max(1, Math.round(opts.copies ?? doc.print.copies ?? 1));

  const out: string[] = [
    `SIZE ${fmtMm(doc.paper.width)} mm,${fmtMm(doc.paper.height)} mm`,
    `GAP ${fmtMm(doc.paper.gap)} mm,0`,
    "DIRECTION 1",
    "CLS",
    // SET OFFSET uses dots; applying it globally avoids adding the offset to every element.
    `SET OFFSET ${offsetDots},${offsetDots}`,
  ];

  if (opts.whole) {
    const img = packImage(opts.whole);
    out.push(`BITMAP 0,0,${img.widthBytes},${img.height},0,${toHex(img.bytes)}`);
    out.push(`PRINT ${copies},1`);
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
          out.push(`BAR ${x},${y},${thickness},${Math.max(1, h)}`);
        } else {
          out.push(`BAR ${x},${y},${Math.max(1, w)},${thickness}`);
        }
        continue;
      }

      const w = Math.max(1, mmToDots(el.w, dpi));
      const h = Math.max(1, mmToDots(el.h, dpi));
      if (isFilled(el.fill)) {
        out.push(`BAR ${x},${y},${w},${h}`);
      } else {
        const stroke = Math.max(1, mmToDots(el.strokeWidth, dpi));
        if (stroke >= Math.min(w, h)) {
          out.push(`BAR ${x},${y},${w},${h}`);
        } else {
          out.push(`BAR ${x},${y},${w},${stroke}`);
          out.push(`BAR ${x},${y + h - stroke},${w},${stroke}`);
          out.push(`BAR ${x},${y},${stroke},${h}`);
          out.push(`BAR ${x + w - stroke},${y},${stroke},${h}`);
        }
      }
      continue;
    }

    const img = packImage(bits(el));
    out.push(
      `BITMAP ${x},${y},${img.widthBytes},${img.height},0,${toHex(img.bytes)}`,
    );
  }

  out.push(`PRINT ${copies},1`);
  return out.join("\n");
}
