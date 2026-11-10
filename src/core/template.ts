import type {
  Category,
  ElementType,
  LabelElement,
  Paper,
  TemplateDoc,
  Variable,
} from "@/types";
import { uid } from "./id";

export const CATEGORY_LABEL: Record<Category, string> = {
  logistics: "物流快递",
  warehouse: "仓储库位",
  retail: "零售价签",
  food: "食品生鲜",
  office: "办公资产",
  industrial: "工业制造",
};

export const CATEGORY_ORDER: Category[] = [
  "logistics",
  "warehouse",
  "retail",
  "food",
  "office",
  "industrial",
];

export const defaultPaper = (width = 60, height = 40): Paper => ({
  width,
  height,
  gap: 2,
  dpi: 203,
  continuous: false,
  background: "#ffffff",
});

export const createDoc = (
  name = "未命名标签",
  width = 60,
  height = 40,
  category: Category = "warehouse",
): TemplateDoc => ({
  schema: 1,
  id: uid("tpl"),
  name,
  category,
  paper: defaultPaper(width, height),
  variables: [],
  elements: [],
  print: { language: "auto", speed: 4, density: 8, offset: 0, copies: 1 },
});

export const createVariable = (key = "", sample = ""): Variable => ({
  key,
  label: key,
  sample,
  kind: "text",
});

const base = (type: ElementType, x: number, y: number, w: number, h: number) => ({
  id: uid(type),
  type,
  x,
  y,
  w,
  h,
  rotate: 0,
});

export function createElement(
  type: "text",
  x?: number,
  y?: number,
  w?: number,
  h?: number,
): LabelElement;
export function createElement(
  type: ElementType,
  x?: number,
  y?: number,
  w?: number,
  h?: number,
): LabelElement;
export function createElement(
  type: ElementType,
  x = 4,
  y = 4,
  w = 30,
  h = 8,
): LabelElement {
  switch (type) {
    case "text":
      return {
        ...base("text", x, y, w, h),
        type: "text",
        name: "文本",
        text: "双击编辑文字",
        fontFamily: "Microsoft YaHei",
        fontSize: 9,
        fontWeight: 400,
        align: "left",
        valign: "middle",
        color: "#111111",
        lineHeight: 1.3,
        letterSpacing: 0,
        wrap: true,
        padding: 0.4,
      } as LabelElement;
    case "barcode":
      return {
        ...base("barcode", x, y, w, 14),
        type: "barcode",
        name: "条码",
        format: "code128",
        value: "{{code}}",
        showText: true,
        textSize: 2.6,
      } as LabelElement;
    case "qrcode":
      return {
        ...base("qrcode", x, y, 18, 18),
        type: "qrcode",
        name: "二维码",
        value: "{{code}}",
        level: "M",
        quiet: 0,
      } as LabelElement;
    case "image":
      return {
        ...base("image", x, y, 18, 12),
        type: "image",
        name: "图片",
        src: "",
        fit: "contain",
        threshold: 160,
      } as LabelElement;
    case "rect":
      return {
        ...base("rect", x, y, w, h),
        type: "rect",
        name: "矩形",
        fill: "transparent",
        stroke: "#111111",
        strokeWidth: 0.3,
        radius: 0,
      } as LabelElement;
    case "line":
      return {
        ...base("line", x, y, w, 0),
        type: "line",
        name: "线条",
        stroke: "#111111",
        strokeWidth: 0.3,
      } as LabelElement;
    case "table":
      return {
        ...base("table", x, y, w, 24),
        type: "table",
        name: "表格",
        columns: [
          { title: "品名", field: "name", width: 55 },
          { title: "数量", field: "qty", width: 45 },
        ],
        rows: 3,
        rowHeight: 5,
        headerHeight: 5,
        fontSize: 7.5,
        borderWidth: 0.25,
        headerBg: "#f2f2f2",
        striped: true,
      } as LabelElement;
    default:
      throw new Error(`unknown element ${type}`);
  }
}

export const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v)) as T;

export const elementLabel = (el: LabelElement) => {
  switch (el.type) {
    case "text": {
      const plain = el.text.replace(/\{\{\s*([\w.-]+)\s*\}\}/g, "$1").replace(/\s+/g, " ").trim();
      return plain.slice(0, 16) || "文本";
    }
    case "barcode":
      return el.value.replace(/\{\{\s*([\w.-]+)\s*\}\}/g, "$1").slice(0, 16) || "条码";
    case "qrcode":
      return el.value.replace(/\{\{\s*([\w.-]+)\s*\}\}/g, "$1").slice(0, 16) || "二维码";
    case "image":
      return "图片";
    case "rect":
      return "矩形";
    case "line":
      return "线条";
    case "table":
      return "表格";
  }
};
