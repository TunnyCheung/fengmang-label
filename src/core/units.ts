export const MM_PER_INCH = 25.4;

export const mmToPx = (mm: number, scale = 1) => (mm * 96) / MM_PER_INCH * scale;
export const pxToMm = (px: number, scale = 1) => (px * MM_PER_INCH) / 96 / scale;
export const mmToDots = (mm: number, dpi: number) => Math.round((mm * dpi) / MM_PER_INCH);
export const dotsToMm = (dots: number, dpi: number) => (dots * MM_PER_INCH) / dpi;

export const clamp = (v: number, min: number, max: number) =>
  Math.min(max, Math.max(min, v));

export const round = (v: number, digits = 2) => {
  const p = 10 ** digits;
  return Math.round(v * p) / p;
};

export const mm = (v: number) => `${round(v, 2)}mm`;
