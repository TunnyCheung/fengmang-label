import type {
  BarcodeElement,
  Category,
  LabelElement,
  LineElement,
  QrElement,
  RectElement,
  TableElement,
  TemplateDoc,
  TextElement,
  Variable,
} from "@/types";
import { uid } from "@/core/id";
import { createElement } from "@/core/template";

const pick = <T,>(v: Partial<T>, d: T): T => ({ ...d, ...v });

export function text(
  x: number,
  y: number,
  w: number,
  h: number,
  content: string,
  opts: Partial<TextElement> = {},
): TextElement {
  return pick(opts, {
    ...(createElement("text", x, y, w, h) as TextElement),
    id: uid("tx"),
    x,
    y,
    w,
    h,
    text: content,
  });
}

export function bar(
  x: number,
  y: number,
  w: number,
  h: number,
  value: string,
  opts: Partial<BarcodeElement> = {},
): BarcodeElement {
  return pick(opts, {
    ...(createElement("barcode", x, y, w, h) as BarcodeElement),
    id: uid("bc"),
    x,
    y,
    w,
    h,
    value,
  });
}

export function qr(
  x: number,
  y: number,
  size: number,
  value: string,
  opts: Partial<QrElement> = {},
): QrElement {
  return pick(opts, {
    ...(createElement("qrcode", x, y, size, size) as QrElement),
    id: uid("qr"),
    x,
    y,
    w: size,
    h: size,
    value,
  });
}

export function box(
  x: number,
  y: number,
  w: number,
  h: number,
  opts: Partial<RectElement> = {},
): RectElement {
  return pick(opts, {
    ...(createElement("rect", x, y, w, h) as RectElement),
    id: uid("rc"),
    x,
    y,
    w,
    h,
  });
}

export function rule(x: number, y: number, w: number, opts: Partial<LineElement> = {}): LineElement {
  return pick(opts, {
    ...(createElement("line", x, y, w, 0) as LineElement),
    id: uid("ln"),
    x,
    y,
    w,
    h: 0,
  });
}

export function table(
  x: number,
  y: number,
  w: number,
  opts: Partial<TableElement> = {},
): TableElement {
  return pick(opts, {
    ...(createElement("table", x, y, w, 24) as TableElement),
    id: uid("tb"),
    x,
    y,
    w,
  });
}

export function v(key: string, label: string, sample: string, extra: Partial<Variable> = {}): Variable {
  return { key, label, sample, kind: "text", ...extra };
}

export function seq(key: string, label: string, start = 1, pad = 4): Variable {
  return {
    key,
    label,
    sample: String(start).padStart(pad, "0"),
    kind: "sequence",
    seq: { start, step: 1, pad },
  };
}

interface TplInput {
  id: string;
  name: string;
  desc: string;
  category: Category;
  w: number;
  h: number;
  vars: Variable[];
  elements: LabelElement[];
  gap?: number;
  dpi?: number;
  tags?: string[];
}

export function tpl(input: TplInput): TemplateDoc {
  return {
    schema: 1,
    id: input.id,
    name: input.name,
    category: input.category,
    desc: input.desc,
    paper: {
      width: input.w,
      height: input.h,
      gap: input.gap ?? 2,
      dpi: input.dpi ?? 203,
      continuous: false,
      background: "#ffffff",
    },
    variables: input.vars,
    elements: input.elements,
    print: { language: "auto", speed: 4, density: 8, offset: 0, copies: 1 },
  };
}

export const INK = "#111111";
export const MUTED = "#5b6068";
