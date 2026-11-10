import type { Align, TextElement, VAlign } from "@/types";

const CJK = /[\u2E80-\u9FFF\uF900-\uFAFF\uFF00-\uFFEF]/;

function tokenize(text: string): string[] {
  const out: string[] = [];
  let buf = "";
  for (const ch of text) {
    if (ch === " ") {
      if (buf) out.push(buf);
      buf = "";
      out.push(" ");
    } else if (CJK.test(ch)) {
      if (buf) out.push(buf);
      buf = "";
      out.push(ch);
    } else {
      buf += ch;
    }
  }
  if (buf) out.push(buf);
  return out;
}

export function wrapLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  wrap: boolean,
): string[] {
  const paragraphs = text.split("\n");
  if (!wrap) return paragraphs;
  const lines: string[] = [];
  for (const para of paragraphs) {
    if (!para) {
      lines.push("");
      continue;
    }
    const tokens = tokenize(para);
    let line = "";
    for (const token of tokens) {
      const test = line + token;
      if (line && ctx.measureText(test).width > maxWidth) {
        lines.push(line.replace(/\s+$/, ""));
        line = token === " " ? "" : token;
      } else {
        line = test;
      }
    }
    lines.push(line.replace(/\s+$/, ""));
  }
  return lines;
}

export function alignX(width: number, content: number, align: Align) {
  if (align === "center") return (width - content) / 2;
  if (align === "right") return width - content;
  return 0;
}

export function alignY(height: number, content: number, valign: VAlign) {
  if (valign === "middle") return (height - content) / 2;
  if (valign === "bottom") return height - content;
  return 0;
}

export function fontSpec(el: TextElement, sizeMm: number) {
  const style = el.italic ? "italic " : "";
  return `${style}${el.fontWeight || 400} ${sizeMm}px "${el.fontFamily}", "Microsoft YaHei", sans-serif`;
}
