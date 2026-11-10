export type Category =
  | "logistics"
  | "warehouse"
  | "retail"
  | "food"
  | "office"
  | "industrial";

export type ElementType =
  | "text"
  | "barcode"
  | "qrcode"
  | "image"
  | "rect"
  | "line"
  | "table";

export type BarcodeFormat = "code128" | "ean13" | "code39" | "itf14";
export type Align = "left" | "center" | "right";
export type VAlign = "top" | "middle" | "bottom";

export interface BaseElement {
  id: string;
  type: ElementType;
  name?: string;
  x: number;
  y: number;
  w: number;
  h: number;
  rotate: number;
  locked?: boolean;
  hidden?: boolean;
}

export interface TextElement extends BaseElement {
  type: "text";
  text: string;
  fontFamily: string;
  fontSize: number;
  fontWeight: number;
  italic?: boolean;
  underline?: boolean;
  align: Align;
  valign: VAlign;
  color: string;
  lineHeight: number;
  letterSpacing: number;
  wrap: boolean;
  background?: string;
  padding: number;
}

export interface BarcodeElement extends BaseElement {
  type: "barcode";
  format: BarcodeFormat;
  value: string;
  showText: boolean;
  textSize: number;
}

export interface QrElement extends BaseElement {
  type: "qrcode";
  value: string;
  level: "L" | "M" | "Q" | "H";
  quiet: number;
}

export interface ImageElement extends BaseElement {
  type: "image";
  src: string;
  fit: "contain" | "cover" | "stretch";
  threshold: number;
}

export interface RectElement extends BaseElement {
  type: "rect";
  fill: string;
  stroke: string;
  strokeWidth: number;
  radius: number;
  inverted?: boolean;
}

export interface LineElement extends BaseElement {
  type: "line";
  stroke: string;
  strokeWidth: number;
}

export interface TableColumn {
  title: string;
  field: string;
  width: number;
}

export interface TableElement extends BaseElement {
  type: "table";
  columns: TableColumn[];
  rows: number;
  rowHeight: number;
  headerHeight: number;
  fontSize: number;
  borderWidth: number;
  headerBg: string;
  striped: boolean;
  source?: string;
}

export type LabelElement =
  | TextElement
  | BarcodeElement
  | QrElement
  | ImageElement
  | RectElement
  | LineElement
  | TableElement;

export interface Variable {
  key: string;
  label: string;
  sample: string;
  kind: "text" | "number" | "date" | "sequence";
  seq?: { start: number; step: number; pad: number };
}

export interface Paper {
  width: number;
  height: number;
  gap: number;
  dpi: number;
  continuous: boolean;
  background: string;
}

export interface PrintDefaults {
  language: "auto" | "zpl" | "tspl";
  speed: number;
  density: number;
  offset: number;
  copies: number;
}

export interface TemplateDoc {
  schema: 1;
  id: string;
  name: string;
  category: Category;
  desc?: string;
  paper: Paper;
  variables: Variable[];
  elements: LabelElement[];
  print: PrintDefaults;
  updatedAt?: number;
}

export interface PrinterInfo {
  name: string;
  displayName: string;
  description?: string;
  isDefault: boolean;
  status?: number;
  options?: Record<string, unknown>;
}

export type PrintTarget = "system" | "label" | "pdf" | "png" | "zpl";
