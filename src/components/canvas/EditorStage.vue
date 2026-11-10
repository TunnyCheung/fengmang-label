<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from "vue";
import { useDesigner } from "@/stores/designer";
import { useData } from "@/stores/data";
import { MM_PER_INCH, clamp, round } from "@/core/units";
import type { LabelElement, TextElement } from "@/types";
import LabelCanvas from "./LabelCanvas.vue";

const design = useDesigner();
const data = useData();

const scroll = ref<HTMLDivElement | null>(null);
const sheet = ref<HTMLDivElement | null>(null);
const editing = ref<{ id: string; value: string } | null>(null);
const editRef = ref<HTMLTextAreaElement | null>(null);
const guides = ref<{ x: number[]; y: number[] }>({ x: [], y: [] });
const marquee = ref<{ x: number; y: number; w: number; h: number } | null>(null);

const pxPerMm = computed(() => (96 / MM_PER_INCH) * design.zoom);
const W = computed(() => design.doc.paper.width * pxPerMm.value);
const H = computed(() => design.doc.paper.height * pxPerMm.value);

const tickStep = computed(() => (design.zoom < 0.9 ? 20 : design.zoom > 2.4 ? 5 : 10));
const ticksX = computed(() => {
  const out: number[] = [];
  for (let x = 0; x <= design.doc.paper.width + 0.01; x += tickStep.value) out.push(round(x, 1));
  return out;
});
const ticksY = computed(() => {
  const out: number[] = [];
  for (let y = 0; y <= design.doc.paper.height + 0.01; y += tickStep.value) out.push(round(y, 1));
  return out;
});

type Handle = "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w";
const HANDLES: Handle[] = ["nw", "n", "ne", "e", "se", "s", "sw", "w"];

interface DragState {
  mode: "move" | "resize" | "marquee";
  startMm: { x: number; y: number };
  orig: { id: string; x: number; y: number; w: number; h: number }[];
  handle?: Handle;
  primary: string;
  moved: boolean;
}
let drag: DragState | null = null;

const rectPx = (el: { x: number; y: number; w: number; h: number }) => ({
  left: `${el.x * pxPerMm.value}px`,
  top: `${el.y * pxPerMm.value}px`,
  width: `${el.w * pxPerMm.value}px`,
  height: `${Math.max(el.h, 0.4) * pxPerMm.value}px`,
});

function toMm(ev: PointerEvent | DragEvent) {
  const box = sheet.value!.getBoundingClientRect();
  return {
    x: (ev.clientX - box.left) / pxPerMm.value,
    y: (ev.clientY - box.top) / pxPerMm.value,
  };
}

function hitTest(pt: { x: number; y: number }): LabelElement | null {
  const list = [...design.doc.elements].reverse();
  for (const el of list) {
    if (el.hidden) continue;
    if (
      pt.x >= el.x - 0.4 &&
      pt.x <= el.x + el.w + 0.4 &&
      pt.y >= el.y - 0.4 &&
      pt.y <= el.y + el.h + 0.4
    ) {
      return el;
    }
  }
  return null;
}

function onStageDown(ev: PointerEvent) {
  if (editing.value) {
    editing.value = null;
  }
  if (ev.button !== 0) return;
  const mm = toMm(ev);
  const hit = hitTest(mm);

  if (!hit) {
    if (!ev.shiftKey) design.select([]);
    drag = {
      mode: "marquee",
      startMm: mm,
      orig: [],
      primary: "",
      moved: false,
    };
    marquee.value = { x: mm.x, y: mm.y, w: 0, h: 0 };
    bind();
    return;
  }

  const isSelected = design.selection.includes(hit.id);
  if (ev.shiftKey) {
    design.select([hit.id], true);
  } else if (!isSelected) {
    design.select([hit.id]);
  }
  if (hit.locked || design.selection.length === 0) return;

  design.mark();
  drag = {
    mode: "move",
    startMm: mm,
    orig: design.selected.map((el) => ({ id: el.id, x: el.x, y: el.y, w: el.w, h: el.h })),
    primary: hit.id,
    moved: false,
  };
  bind();
}

function onHandleDown(ev: PointerEvent, handle: Handle) {
  ev.stopPropagation();
  const el = design.single;
  if (!el || el.locked) return;
  const mm = toMm(ev);
  design.mark();
  drag = {
    mode: "resize",
    startMm: mm,
    orig: [{ id: el.id, x: el.x, y: el.y, w: el.w, h: el.h }],
    handle,
    primary: el.id,
    moved: false,
  };
  bind();
}

function bind() {
  window.addEventListener("pointermove", onMove);
  window.addEventListener("pointerup", onUp, { once: true });
}

function snapAxis(
  value: number,
  size: number,
  others: number[],
  limit: number,
): { value: number; guide?: number } {
  const edges = [0, size / 2, size];
  let best: { d: number; value: number; guide: number } | null = null;
  for (const target of others) {
    for (const edge of edges) {
      const delta = target - (value + edge);
      if (Math.abs(delta) <= limit && (!best || Math.abs(delta) < Math.abs(best.d))) {
        best = { d: delta, value: value + delta, guide: target };
      }
    }
  }
  return best ? { value: best.value, guide: best.guide } : { value };
}

function onMove(ev: PointerEvent) {
  if (!drag) return;
  const mm = toMm(ev);
  const dx = mm.x - drag.startMm.x;
  const dy = mm.y - drag.startMm.y;
  if (Math.abs(dx) > 0.15 || Math.abs(dy) > 0.15) drag.moved = true;

  if (drag.mode === "marquee") {
    marquee.value = {
      x: Math.min(drag.startMm.x, mm.x),
      y: Math.min(drag.startMm.y, mm.y),
      w: Math.abs(dx),
      h: Math.abs(dy),
    };
    return;
  }

  if (drag.mode === "resize") {
    const orig = drag.orig[0];
    const el = design.doc.elements.find((e) => e.id === orig.id);
    if (!el) return;
    let { x, y, w, h } = orig;
    const hd = drag.handle!;
    if (hd.includes("e")) w = orig.w + dx;
    if (hd.includes("s")) h = orig.h + dy;
    if (hd.includes("w")) {
      w = orig.w - dx;
      x = orig.x + dx;
    }
    if (hd.includes("n")) {
      h = orig.h - dy;
      y = orig.y + dy;
    }
    if (w < 2) {
      if (hd.includes("w")) x = orig.x + orig.w - 2;
      w = 2;
    }
    if (h < 1.5) {
      if (hd.includes("n")) y = orig.y + orig.h - 1.5;
      h = 1.5;
    }
    el.x = round(x, 1);
    el.y = round(y, 1);
    el.w = round(w, 1);
    el.h = round(h, 1);
    return;
  }

  // move
  const primary = drag.orig.find((o) => o.id === drag!.primary);
  if (!primary) return;
  let nx = round(primary.x + dx, 1);
  let ny = round(primary.y + dy, 1);
  const gx: number[] = [];
  const gy: number[] = [];

  if (data.snap) {
    const othersX: number[] = [0, design.doc.paper.width / 2, design.doc.paper.width];
    const othersY: number[] = [0, design.doc.paper.height / 2, design.doc.paper.height];
    for (const el of design.doc.elements) {
      if (drag.orig.some((o) => o.id === el.id)) continue;
      othersX.push(el.x, el.x + el.w / 2, el.x + el.w);
      othersY.push(el.y, el.y + el.h / 2, el.y + el.h);
    }
    const sx = snapAxis(nx, primary.w, othersX, 1.2 / design.zoom);
    const sy = snapAxis(ny, primary.h, othersY, 1.2 / design.zoom);
    if (sx.guide !== undefined) {
      nx = round(sx.value, 2);
      gx.push(sx.guide);
    }
    if (sy.guide !== undefined) {
      ny = round(sy.value, 2);
      gy.push(sy.guide);
    }
    if (!sx.guide && !sy.guide) {
      nx = Math.round(nx);
      ny = Math.round(ny);
    }
  } else {
    nx = Math.round(nx);
    ny = Math.round(ny);
  }
  guides.value = { x: gx, y: gy };

  for (const o of drag.orig) {
    const el = design.doc.elements.find((e) => e.id === o.id);
    if (!el || el.locked) continue;
    el.x = round(o.x + (nx - primary.x), 2);
    el.y = round(o.y + (ny - primary.y), 2);
  }
}

function onUp() {
  window.removeEventListener("pointermove", onMove);
  if (!drag) return;
  if (drag.mode === "marquee" && marquee.value) {
    const m = marquee.value;
    if (m.w > 0.6 && m.h > 0.6) {
      const ids = design.doc.elements
        .filter(
          (el) =>
            !el.hidden &&
            el.x < m.x + m.w &&
            el.x + el.w > m.x &&
            el.y < m.y + m.h &&
            el.y + el.h > m.y,
        )
        .map((el) => el.id);
      design.select(ids);
    }
  } else if (drag.moved) {
    design.commit();
  }
  drag = null;
  marquee.value = null;
  guides.value = { x: [], y: [] };
}

function onDblClick(ev: MouseEvent) {
  const mm = toMm(ev as unknown as PointerEvent);
  const hit = hitTest(mm);
  if (!hit || hit.type !== "text") return;
  design.select([hit.id]);
  editing.value = { id: hit.id, value: hit.text };
  nextTick(() => {
    editRef.value?.focus();
    editRef.value?.select();
  });
}

function commitEdit() {
  const cur = editing.value;
  if (!cur) return;
  const el = design.doc.elements.find((e) => e.id === cur.id) as TextElement | undefined;
  if (el && el.text !== cur.value) design.update(el.id, { text: cur.value });
  editing.value = null;
}

function onDrop(ev: DragEvent) {
  ev.preventDefault();
  const type = ev.dataTransfer?.getData("application/x-label-element") as LabelElement["type"];
  if (!type) return;
  const mm = toMm(ev);
  design.addElement(type, { x: mm.x - 6, y: mm.y - 4 });
}

onBeforeUnmount(() => window.removeEventListener("pointermove", onMove));

const zoomPct = computed(() => Math.round(design.zoom * 100));
function zoomBy(f: number) {
  design.zoom = clamp(round(design.zoom * f, 2), 0.25, 8);
}
function fitZoom(width: number, height: number) {
  const pw = (design.doc.paper.width * 96) / MM_PER_INCH;
  const ph = (design.doc.paper.height * 96) / MM_PER_INCH;
  return clamp(round(Math.min((width - 110) / pw, (height - 110) / ph), 2), 0.25, 8);
}
let fitted: number | null = null;
let resizeTimer = 0;
function fit() {
  const box = scroll.value;
  if (!box) return;
  design.zoom = fitZoom(box.clientWidth, box.clientHeight);
  fitted = design.zoom;
}
defineExpose({ fit });

let observer: ResizeObserver | null = null;
onMounted(() => {
  observer = new ResizeObserver(() => {
    const box = scroll.value;
    if (!box) return;
    if (fitted === null || Math.abs(design.zoom - fitted) > 0.002) {
      fitted = null;
      return;
    }
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(() => {
      const el = scroll.value;
      if (!el || fitted === null) return;
      const z = fitZoom(el.clientWidth, el.clientHeight);
      if (z !== fitted) {
        design.zoom = z;
        fitted = z;
      }
    }, 140);
  });
  if (scroll.value) observer.observe(scroll.value);
});
onBeforeUnmount(() => {
  observer?.disconnect();
  window.clearTimeout(resizeTimer);
});
</script>

<template>
  <div class="stage">
    <div ref="scroll" class="scroll">
      <div class="area">
        <div class="board">
          <div class="corner" />
          <div class="ruler h" :style="{ width: `${W}px` }">
            <span
              v-for="t in ticksX"
              :key="`x${t}`"
              class="tick"
              :style="{ left: `${t * pxPerMm}px` }"
            >{{ t }}</span>
          </div>
          <div class="ruler v" :style="{ height: `${H}px` }">
            <span
              v-for="t in ticksY"
              :key="`y${t}`"
              class="tick"
              :style="{ top: `${t * pxPerMm}px` }"
            >{{ t }}</span>
          </div>

          <div class="cell" @dragover.prevent @drop="onDrop">
            <div
              class="sheet-wrap"
              :style="{ width: `${W}px`, height: `${H}px`, paddingBottom: `${design.doc.paper.gap * pxPerMm}px` }"
            >
              <div
                ref="sheet"
                class="sheet"
                :style="{ width: `${W}px`, height: `${H}px` }"
                @pointerdown="onStageDown"
                @dblclick="onDblClick"
              >
                <LabelCanvas :doc="design.doc" :values="data.previewValues" :px-per-mm="pxPerMm" />
                <div v-if="!design.doc.elements.length" class="blank-hint">
                  <div class="bh-ic">
                    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                      <rect x="3" y="3" width="18" height="18" rx="2.5" stroke-dasharray="3 3" />
                      <path d="M12 8.5v7M8.5 12h7" stroke-linecap="round" />
                    </svg>
                  </div>
                  <b>空白标签</b>
                  <span>从左侧拖入文字、条码或二维码，或直接套用一个模板</span>
                  <button class="btn sm" @pointerdown.stop @click.stop="design.closeDesigner()">
                    去选模板
                  </button>
                </div>
              </div>

              <div class="overlay" :style="{ width: `${W}px`, height: `${H}px` }">
                <template v-for="el in design.doc.elements" :key="el.id">
                  <div
                    v-if="design.selection.includes(el.id) && !el.hidden"
                    class="sel"
                    :class="{ locked: el.locked }"
                    :style="rectPx(el)"
                  >
                    <i
                      v-for="h in HANDLES"
                      :key="h"
                      class="handle"
                      :class="h"
                      @pointerdown="onHandleDown($event, h)"
                    />
                    <span class="badge">{{ round(el.w, 1) }} × {{ round(el.h, 1) }} mm</span>
                  </div>
                </template>

                <div
                  v-if="marquee"
                  class="marquee"
                  :style="{
                    left: `${marquee.x * pxPerMm}px`,
                    top: `${marquee.y * pxPerMm}px`,
                    width: `${marquee.w * pxPerMm}px`,
                    height: `${marquee.h * pxPerMm}px`,
                  }"
                />

                <div
                  v-for="(g, i) in guides.x"
                  :key="`gx${i}`"
                  class="guide v"
                  :style="{ left: `${g * pxPerMm}px` }"
                />
                <div
                  v-for="(g, i) in guides.y"
                  :key="`gy${i}`"
                  class="guide h"
                  :style="{ top: `${g * pxPerMm}px` }"
                />

                <textarea
                  v-if="editing"
                  ref="editRef"
                  v-model="editing.value"
                  class="inline-edit"
                  :style="(() => {
                    const el = design.doc.elements.find((e) => e.id === editing!.id);
                    return el ? rectPx(el) : {};
                  })()"
                  @blur="commitEdit"
                  @keydown.esc="editing = null"
                  @keydown.ctrl.enter="commitEdit"
                />
              </div>
            </div>
            <div class="paper-meta tnum">
              {{ design.doc.paper.width }} × {{ design.doc.paper.height }} mm
              <span class="dot" />
              {{ design.doc.paper.dpi }} dpi
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="zoom">
      <button class="btn ghost sm icon" title="缩小" @click="zoomBy(1 / 1.2)">−</button>
      <button class="pct tnum" title="实际大小" @click="design.zoom = 1">{{ zoomPct }}%</button>
      <button class="btn ghost sm icon" title="放大" @click="zoomBy(1.2)">+</button>
      <span class="zoom-sep" />
      <button class="btn ghost sm" @click="fit">适应窗口</button>
    </div>
  </div>
</template>

<style scoped>
.stage {
  position: relative;
  flex: 1;
  min-width: 0;
  min-height: 0;
  background: var(--bg);
  background-image: radial-gradient(circle at 1px 1px, rgba(20, 24, 32, 0.07) 1px, transparent 0);
  background-size: 16px 16px;
}
.scroll {
  position: absolute;
  inset: 0;
  overflow: auto;
}
.scroll::-webkit-scrollbar {
  width: 10px;
  height: 10px;
}
.scroll::-webkit-scrollbar-thumb {
  background: #c7ced9;
  border: 3px solid transparent;
  background-clip: content-box;
  border-radius: 6px;
}
.scroll::-webkit-scrollbar-thumb:hover {
  background: #aab4c2;
  border: 3px solid transparent;
  background-clip: content-box;
}
.scroll::-webkit-scrollbar-track,
.scroll::-webkit-scrollbar-corner {
  background: transparent;
}
.area {
  display: flex;
  min-width: 100%;
  min-height: 100%;
  padding: 22px;
  box-sizing: border-box;
}
.board {
  margin: auto;
  display: grid;
  grid-template-columns: 26px max-content;
  grid-template-rows: 22px max-content;
  gap: 0 4px;
  align-content: center;
}
.corner { grid-column: 1; grid-row: 1; }
.ruler {
  position: relative;
  color: var(--ink-4);
  font-size: 9px;
  font-variant-numeric: tabular-nums;
  user-select: none;
}
.ruler.h {
  grid-column: 2;
  grid-row: 1;
  border-bottom: 1px solid transparent;
}
.ruler.v {
  grid-column: 1;
  grid-row: 2;
}
.ruler .tick {
  position: absolute;
  color: #9aa1ab;
}
.ruler.h .tick { top: 4px; transform: translateX(-50%); }
.ruler.h .tick::after {
  content: "";
  position: absolute;
  left: 50%;
  top: 12px;
  width: 1px;
  height: 4px;
  background: #c9ced6;
}
.ruler.v .tick { left: 6px; transform: translateY(-50%); }
.ruler.v .tick::after {
  content: "";
  position: absolute;
  top: 50%;
  left: -6px;
  height: 1px;
  width: 3px;
  background: #c9ced6;
}

.cell { grid-column: 2; grid-row: 2; }
.sheet-wrap { position: relative; }
.sheet {
  position: relative;
  background: #fff;
  box-shadow: var(--sh-3);
  border-radius: 2px;
  touch-action: none;
  cursor: default;
}
.blank-hint {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 5px;
  pointer-events: none;
  color: var(--ink-3);
  text-align: center;
  padding: 12px;
}
.bh-ic { color: #c2c9d3; }
.blank-hint b { font-size: 12.5px; color: var(--ink-2); font-weight: 600; }
.blank-hint span { font-size: 10.5px; color: var(--ink-4); max-width: 190px; line-height: 1.5; }
.blank-hint .btn { pointer-events: auto; margin-top: 4px; }
.overlay {
  position: absolute;
  inset: 0;
  pointer-events: none;
}
.sel {
  position: absolute;
  border: 1.5px solid var(--accent);
  pointer-events: none;
  border-radius: 1px;
}
.sel.locked { border-color: var(--warn); border-style: dashed; }
.handle {
  position: absolute;
  width: 7px;
  height: 7px;
  background: #fff;
  border: 1.5px solid var(--accent);
  border-radius: 2px;
  pointer-events: auto;
  box-shadow: 0 1px 2px rgba(16, 20, 28, 0.2);
}
.handle.nw { left: -4px; top: -4px; cursor: nwse-resize; }
.handle.n { left: 50%; top: -4px; margin-left: -3.5px; cursor: ns-resize; }
.handle.ne { right: -4px; top: -4px; cursor: nesw-resize; }
.handle.e { right: -4px; top: 50%; margin-top: -3.5px; cursor: ew-resize; }
.handle.se { right: -4px; bottom: -4px; cursor: nwse-resize; }
.handle.s { left: 50%; bottom: -4px; margin-left: -3.5px; cursor: ns-resize; }
.handle.sw { left: -4px; bottom: -4px; cursor: nesw-resize; }
.handle.w { left: -4px; top: 50%; margin-top: -3.5px; cursor: ew-resize; }
.badge {
  position: absolute;
  left: 0;
  bottom: -19px;
  padding: 1px 5px;
  background: var(--accent);
  color: #fff;
  font-size: 9.5px;
  border-radius: 3px;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
  opacity: 0.92;
}
.marquee {
  position: absolute;
  background: rgba(47, 107, 255, 0.08);
  border: 1px solid var(--accent);
}
.guide {
  position: absolute;
  background: #ff3d8b;
  pointer-events: none;
}
.guide.v { top: -8px; bottom: -8px; width: 1px; }
.guide.h { left: -8px; right: -8px; height: 1px; }

.inline-edit {
  position: absolute;
  pointer-events: auto;
  border: 1.5px solid var(--accent);
  outline: none;
  resize: none;
  padding: 2px;
  font-family: "Microsoft YaHei", sans-serif;
  font-size: 12px;
  line-height: 1.3;
  background: #fff;
  border-radius: 2px;
  box-shadow: 0 0 0 3px rgba(47, 107, 255, 0.14);
}

.paper-meta {
  margin-top: 12px;
  text-align: center;
  font-size: 10.5px;
  color: var(--ink-4);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
}
.paper-meta .dot { width: 3px; height: 3px; border-radius: 50%; background: var(--ink-4); }

.zoom {
  position: absolute;
  right: 16px;
  bottom: 14px;
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 3px;
  background: rgba(255, 255, 255, 0.92);
  backdrop-filter: blur(8px);
  border: 1px solid var(--line);
  border-radius: var(--r-md);
  box-shadow: var(--sh-2);
}
.zoom .pct {
  min-width: 46px;
  height: 27px;
  font-size: 11.5px;
  color: var(--ink-2);
  border-radius: var(--r-sm);
}
.zoom .pct:hover { background: var(--surface-2); }
.zoom-sep { width: 1px; height: 16px; background: var(--line); margin: 0 3px; }
</style>
