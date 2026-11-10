import type { Category, TemplateDoc } from "@/types";
import {
  assetTag,
  binLabel,
  cableTag,
  cartonMark,
  foodLabel,
  hangTag,
  palletLabel,
  priceTag,
  waybill,
} from "./presets/core";
import { EXTRA_TEMPLATES } from "./presets/extra";

export const TEMPLATES: TemplateDoc[] = [
  waybill,
  binLabel,
  priceTag,
  cartonMark,
  foodLabel,
  assetTag,
  palletLabel,
  hangTag,
  cableTag,
  ...EXTRA_TEMPLATES,
];

export const byCategory = (category: Category | "all") =>
  category === "all" ? TEMPLATES : TEMPLATES.filter((t) => t.category === category);

export const findTemplate = (id: string) => TEMPLATES.find((t) => t.id === id) ?? null;
