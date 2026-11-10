<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref, watch } from "vue";
import type { TemplateDoc } from "@/types";
import { drawDoc } from "@/render/draw";
import { MM_PER_INCH } from "@/core/units";

const props = withDefaults(
  defineProps<{
    doc: TemplateDoc;
    values: Record<string, unknown>;
    pxPerMm: number;
    transparent?: boolean;
  }>(),
  { transparent: false },
);

const canvas = ref<HTMLCanvasElement | null>(null);
let raf = 0;
let alive = true;

const cssW = () => props.doc.paper.width * props.pxPerMm;
const cssH = () => props.doc.paper.height * props.pxPerMm;

function paint() {
  const el = canvas.value;
  if (!el) return;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = Math.max(1, Math.round(cssW() * dpr));
  const h = Math.max(1, Math.round(cssH() * dpr));
  if (el.width !== w || el.height !== h) {
    el.width = w;
    el.height = h;
  }
  el.style.width = `${cssW()}px`;
  el.style.height = `${cssH()}px`;
  const ctx = el.getContext("2d");
  if (!ctx) return;
  const { pending } = drawDoc(ctx, props.doc, {
    pxPerMm: props.pxPerMm * dpr,
    values: props.values,
    transparent: props.transparent,
  });
  pending.then(() => {
    if (!alive) return;
  });
}

function schedule() {
  cancelAnimationFrame(raf);
  raf = requestAnimationFrame(paint);
}

watch(() => [props.doc, props.values, props.pxPerMm, props.transparent], schedule, {
  deep: true,
});

onMounted(() => {
  paint();
  window.addEventListener("resize", schedule);
});
onBeforeUnmount(() => {
  alive = false;
  cancelAnimationFrame(raf);
  window.removeEventListener("resize", schedule);
});

defineExpose({
  repaint: schedule,
  toCanvas(pxPerMm: number, transparent = false) {
    const out = document.createElement("canvas");
    out.width = Math.max(1, Math.round(props.doc.paper.width * pxPerMm));
    out.height = Math.max(1, Math.round(props.doc.paper.height * pxPerMm));
    const ctx = out.getContext("2d")!;
    const { pending } = drawDoc(ctx, props.doc, {
      pxPerMm,
      values: props.values,
      transparent,
    });
    return { canvas: out, done: pending };
  },
  dpiCanvas(dpi: number) {
    return this.toCanvas(dpi / MM_PER_INCH, false);
  },
});
</script>

<template>
  <canvas ref="canvas" class="label-canvas" />
</template>

<style scoped>
.label-canvas {
  display: block;
  background: #fff;
  image-rendering: -webkit-optimize-contrast;
}
</style>
