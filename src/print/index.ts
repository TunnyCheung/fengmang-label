import type { LabelElement, TemplateDoc } from "@/types";
import { elementBits, labelBytes, renderRaster } from "@/render/raster";
import { emitTspl } from "./tspl";
import { emitZpl } from "./zpl";
import type { BitImage, BitProvider, EmitOptions } from "./zpl";

export type { BitImage, BitProvider, EmitOptions } from "./zpl";
export { emitTspl } from "./tspl";
export { emitZpl } from "./zpl";

export async function buildLabelCommands(
  doc: TemplateDoc,
  values: Record<string, unknown>,
  language: "auto" | "zpl" | "tspl",
  opts: EmitOptions,
): Promise<string> {
  const raster = await renderRaster(doc, values, opts.dpi);
  const whole = labelBytes(raster);
  const cache = new WeakMap<LabelElement, BitImage>();
  const bits: BitProvider = (el) => {
    let img = cache.get(el);
    if (!img) {
      const cut = elementBits(raster, el);
      img = {
        bytes: cut.bytes,
        bytesPerRow: cut.bytesPerRow,
        width: cut.width,
        height: cut.height,
      };
      cache.set(el, img);
    }
    return img;
  };

  const resolved =
    language === "auto"
      ? doc.print.language === "auto"
        ? "zpl"
        : doc.print.language
      : language;

  return resolved === "tspl"
    ? emitTspl(doc, values, bits, { ...opts, whole })
    : emitZpl(doc, values, bits, { ...opts, whole });
}
