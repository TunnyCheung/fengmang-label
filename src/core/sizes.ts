export interface SizePreset {
  w: number;
  h: number;
  name: string;
}

/** 覆盖内置模板用到的全部尺寸，外加常见标准规格 */
export const SIZE_PRESETS: SizePreset[] = [
  { w: 40, h: 10, name: "40 × 10 封口贴" },
  { w: 30, h: 15, name: "30 × 15 线缆标签" },
  { w: 50, h: 20, name: "50 × 20 资产标签" },
  { w: 40, h: 25, name: "40 × 25 双联标" },
  { w: 40, h: 30, name: "40 × 30 商品价签" },
  { w: 45, h: 30, name: "45 × 30 图书价签" },
  { w: 50, h: 30, name: "50 × 30 食品标签" },
  { w: 60, h: 40, name: "60 × 40 库位 / 称重" },
  { w: 70, h: 40, name: "70 × 40 固定资产卡" },
  { w: 50, h: 50, name: "50 × 50 促销贴" },
  { w: 70, h: 50, name: "70 × 50 批次 / 合格证" },
  { w: 80, h: 60, name: "80 × 60 通用大标" },
  { w: 60, h: 80, name: "60 × 80 商品标" },
  { w: 54, h: 90, name: "54 × 90 工牌" },
  { w: 50, h: 90, name: "50 × 90 服装吊牌" },
  { w: 100, h: 100, name: "100 × 100 箱唛" },
  { w: 76, h: 130, name: "76 × 130 电子面单" },
  { w: 100, h: 150, name: "100 × 150 快递面单" },
  { w: 100, h: 180, name: "100 × 180 大面单" },
];

export const sizeKey = (w: number, h: number) => `${w}x${h}`;

export function findPreset(w: number, h: number) {
  return SIZE_PRESETS.find((p) => p.w === w && p.h === h) ?? null;
}
