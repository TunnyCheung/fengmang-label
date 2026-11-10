import type { LabelElement, TableElement, Variable } from "@/types";

export type Values = Record<string, unknown>;

const pad = (n: number, len: number) => String(n).padStart(len, "0");

export function resolveValues(
  vars: Variable[],
  index = 0,
  overrides: Values = {},
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const v of vars) {
    if (!v.key) continue;
    if (v.kind === "sequence") {
      const seq = v.seq ?? { start: 1, step: 1, pad: 4 };
      out[v.key] = pad(seq.start + seq.step * index, seq.pad || 1);
    } else if (v.kind === "date") {
      const d = new Date();
      out[v.key] = `${d.getFullYear()}-${pad(d.getMonth() + 1, 2)}-${pad(d.getDate(), 2)}`;
    } else {
      out[v.key] = v.sample ?? "";
    }
  }
  for (const [k, val] of Object.entries(overrides)) {
    if (val !== undefined && val !== null) out[k] = String(val);
  }
  return out;
}

export function interpolate(text: string, values: Record<string, unknown>): string {
  if (!text) return "";
  return text.replace(/\{\{\s*([\w.-]+)\s*\}\}/g, (_, key: string) => {
    const v = values[key];
    return v === undefined || v === null ? "" : String(v);
  });
}

export function tableRows(el: TableElement, values: Record<string, unknown>) {
  const raw = el.source ? values[el.source] : undefined;
  if (Array.isArray(raw)) {
    return raw.slice(0, Math.max(1, el.rows)) as Record<string, unknown>[];
  }
  return Array.from({ length: Math.max(1, el.rows) }, () => ({}) as Record<string, unknown>);
}

export function elementText(el: LabelElement, values: Record<string, unknown>): string {
  switch (el.type) {
    case "text":
      return interpolate(el.text, values);
    case "barcode":
    case "qrcode":
      return interpolate(el.value, values);
    default:
      return "";
  }
}
