<script setup lang="ts">
import { ref } from "vue";
import { useDesigner } from "@/stores/designer";
import { useData } from "@/stores/data";
import { useUi } from "@/stores/ui";
import { elementLabel } from "@/core/template";
import type { ElementType, LabelElement } from "@/types";
import Icon from "@/components/ui/Icon.vue";
import DataPanel from "./DataPanel.vue";

const design = useDesigner();
const data = useData();
const ui = useUi();
const tab = ref<"elements" | "layers" | "data">("elements");

const palette: { type: ElementType; icon: string; label: string; hint: string }[] = [
  { type: "text", icon: "type", label: "文字", hint: "标题、品名、地址" },
  { type: "barcode", icon: "barcode", label: "条码", hint: "Code128 / EAN13" },
  { type: "qrcode", icon: "qr", label: "二维码", hint: "跳转、追溯" },
  { type: "table", icon: "table", label: "表格", hint: "明细、多列数据" },
  { type: "image", icon: "image", label: "图片", hint: "Logo、图示" },
  { type: "rect", icon: "square", label: "矩形", hint: "边框、色块" },
  { type: "line", icon: "line", label: "线条", hint: "分隔、下划线" },
];

function add(type: ElementType) {
  design.addElement(type);
  tab.value = "elements";
}

function onDragStart(e: DragEvent, type: ElementType) {
  e.dataTransfer?.setData("application/x-label-element", type);
  if (e.dataTransfer) e.dataTransfer.effectAllowed = "copy";
}

const iconOf = (el: LabelElement) =>
  ({ text: "type", barcode: "barcode", qrcode: "qr", image: "image", rect: "square", line: "line", table: "table" })[
    el.type
  ];

const layers = () => [...design.doc.elements].reverse();

function toggle(el: LabelElement, key: "hidden" | "locked") {
  design.update(el.id, { [key]: !el[key] } as Partial<LabelElement>);
}
</script>

<template>
  <aside class="panel">
    <div class="tabs">
      <button :class="{ on: tab === 'elements' }" @click="tab = 'elements'">元素</button>
      <button :class="{ on: tab === 'layers' }" @click="tab = 'layers'">图层</button>
      <button :class="{ on: tab === 'data' }" @click="tab = 'data'">数据</button>
    </div>

    <div v-if="tab === 'elements'" class="pane">
      <div class="hint-row">
        <span class="eyebrow">添加到画布</span>
        <span class="tip-text">拖拽或点击</span>
      </div>
      <div class="grid">
        <button
          v-for="p in palette"
          :key="p.type"
          class="item"
          draggable="true"
          @click="add(p.type)"
          @dragstart="onDragStart($event, p.type)"
        >
          <span class="ic"><Icon :name="p.icon" :size="17" /></span>
          <span class="lb">{{ p.label }}</span>
          <span class="hb">{{ p.hint }}</span>
        </button>
      </div>

      <div class="divider" />
      <div class="section">
        <div class="hint-row">
          <span class="eyebrow">排版</span>
        </div>
        <div class="align-row">
          <button class="btn ghost sm icon" title="左对齐" @click="design.align('left')"><Icon name="alignLeft" :size="15" /></button>
          <button class="btn ghost sm icon" title="水平居中" @click="design.align('hcenter')"><Icon name="alignCenterH" :size="15" /></button>
          <button class="btn ghost sm icon" title="右对齐" @click="design.align('right')"><Icon name="alignRight" :size="15" /></button>
          <span class="vsep" />
          <button class="btn ghost sm icon" title="顶对齐" @click="design.align('top')"><Icon name="alignTop" :size="15" /></button>
          <button class="btn ghost sm icon" title="垂直居中" @click="design.align('vcenter')"><Icon name="alignMiddleV" :size="15" /></button>
          <button class="btn ghost sm icon" title="底对齐" @click="design.align('bottom')"><Icon name="alignBottom" :size="15" /></button>
        </div>
        <div class="align-row">
          <button class="btn ghost sm" title="水平等距" @click="design.distribute('h')">
            <Icon name="distributeH" :size="14" /> 水平等距
          </button>
          <button class="btn ghost sm" title="垂直等距" @click="design.distribute('v')">
            <Icon name="distributeV" :size="14" /> 垂直等距
          </button>
        </div>
        <label class="snap">
          <input v-model="data.snap" type="checkbox" />
          <span>拖动时自动吸附对齐</span>
        </label>
      </div>

      <div class="divider" />
      <div class="section">
        <div class="hint-row">
          <span class="eyebrow">当前选中</span>
        </div>
        <div v-if="!design.selection.length" class="none">未选中元素</div>
        <div v-else class="sel-list">
          <button
            v-for="el in design.selected"
            :key="el.id"
            class="sel-item"
            @click="design.select([el.id])"
          >
            <Icon :name="iconOf(el)" :size="13" />
            <span>{{ elementLabel(el) }}</span>
          </button>
        </div>
      </div>
    </div>

    <div v-else-if="tab === 'layers'" class="pane layers">
      <div class="hint-row">
        <span class="eyebrow">图层（上 → 下）</span>
        <span class="tip-text">{{ design.doc.elements.length }}</span>
      </div>
      <div v-if="!design.doc.elements.length" class="none">还没有元素，从「元素」里添加</div>
      <div v-else class="layer-list">
        <div
          v-for="el in layers()"
          :key="el.id"
          class="layer"
          :class="{ on: design.selection.includes(el.id), dim: el.hidden }"
          @click="design.select([el.id], $event.shiftKey)"
        >
          <span class="lic"><Icon :name="iconOf(el)" :size="13" /></span>
          <span class="lname">{{ elementLabel(el) }}</span>
          <button class="act" :title="el.hidden ? '显示' : '隐藏'" @click.stop="toggle(el, 'hidden')">
            <Icon :name="el.hidden ? 'x' : 'eye'" :size="12" />
          </button>
          <button class="act" :title="el.locked ? '解锁' : '锁定'" @click.stop="toggle(el, 'locked')">
            <Icon :name="el.locked ? 'lock' : 'unlock'" :size="12" />
          </button>
        </div>
      </div>
      <div v-if="design.single" class="order">
        <button class="btn sm" @click="design.reorder(design.single.id, 'top')">置顶</button>
        <button class="btn sm" @click="design.reorder(design.single.id, 'up')">上移</button>
        <button class="btn sm" @click="design.reorder(design.single.id, 'down')">下移</button>
        <button class="btn sm" @click="design.reorder(design.single.id, 'bottom')">置底</button>
      </div>
    </div>

    <DataPanel v-else />
  </aside>
</template>

<style scoped>
.panel {
  width: var(--left-w);
  flex: none;
  background: var(--surface);
  border-right: 1px solid var(--line);
  display: flex;
  flex-direction: column;
  min-height: 0;
}
.tabs {
  display: flex;
  gap: 2px;
  padding: 8px 8px 0;
  border-bottom: 1px solid var(--line);
}
.tabs button {
  flex: 1;
  height: 30px;
  font-size: 13px;
  color: var(--ink-3);
  border-radius: 5px 5px 0 0;
  position: relative;
  font-weight: 500;
}
.tabs button:hover { color: var(--ink); background: var(--surface-2); }
.tabs button.on { color: var(--ink); font-weight: 600; }
.tabs button.on::after {
  content: "";
  position: absolute;
  left: 8px;
  right: 8px;
  bottom: -1px;
  height: 2px;
  background: var(--ink);
  border-radius: 2px 2px 0 0;
}
.pane { padding: 12px; overflow: auto; flex: 1; }
.hint-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 9px; }
.hint-row .eyebrow { font-size: 11px; }
.tip-text { font-size: 11px; color: var(--ink-4); }
.grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
.item {
  display: flex;
  flex-direction: column;
  gap: 1px;
  padding: 10px 10px 9px;
  border: 1px solid var(--line);
  border-radius: var(--r-md);
  background: #fff;
  text-align: left;
  transition: all 0.12s;
}
.item:hover {
  border-color: var(--accent-line);
  background: var(--accent-soft);
  transform: translateY(-0.5px);
}
.item:active { transform: none; }
.ic { color: var(--ink-2); display: flex; }
.item:hover .ic { color: var(--accent-ink); }
.lb { font-size: 13.5px; font-weight: 550; margin-top: 4px; }
.hb { font-size: 10.5px; color: var(--ink-4); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.section { display: flex; flex-direction: column; gap: 4px; }
.align-row { display: flex; align-items: center; gap: 1px; margin-bottom: 2px; }
.vsep { width: 1px; height: 16px; background: var(--line); margin: 0 4px; }
.snap {
  display: flex;
  align-items: center;
  gap: 7px;
  margin-top: 8px;
  font-size: 12.5px;
  color: var(--ink-2);
  cursor: pointer;
  user-select: none;
}
.snap input { accent-color: var(--accent); width: 14px; height: 14px; }
.none { font-size: 12.5px; color: var(--ink-4); padding: 6px 2px; }
.sel-list { display: flex; flex-direction: column; gap: 2px; }
.sel-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 7px;
  border-radius: 5px;
  font-size: 12.5px;
  color: var(--ink-2);
  text-align: left;
}
.sel-item:hover { background: var(--surface-2); }

.layers { display: flex; flex-direction: column; }
.layer-list { display: flex; flex-direction: column; gap: 1px; flex: 1; }
.layer {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 6px;
  border-radius: 5px;
  font-size: 12.5px;
  color: var(--ink-2);
  cursor: pointer;
  user-select: none;
}
.layer:hover { background: var(--surface-2); }
.layer.on { background: var(--accent-soft); color: var(--accent-ink); }
.layer.dim { opacity: 0.42; }
.lic { display: flex; color: inherit; opacity: 0.75; }
.lname { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.act { display: none; color: var(--ink-3); padding: 1px; border-radius: 3px; }
.layer:hover .act, .layer.on .act { display: flex; }
.act:hover { background: rgba(0, 0, 0, 0.06); color: var(--ink); }
.order { display: grid; grid-template-columns: repeat(4, 1fr); gap: 4px; padding-top: 8px; border-top: 1px solid var(--line); margin-top: 8px; }
.order .btn { padding: 0 4px; font-size: 11.5px; }
</style>
