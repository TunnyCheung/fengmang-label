<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from "vue";
import { useDesigner } from "@/stores/designer";
import { useData } from "@/stores/data";
import { useSettings } from "@/stores/settings";
import { useUi } from "@/stores/ui";
import { CATEGORY_LABEL } from "@/core/template";
import EditorStage from "@/components/canvas/EditorStage.vue";
import LeftPanel from "@/components/panels/LeftPanel.vue";
import PropertyPanel from "@/components/panels/PropertyPanel.vue";
import BatchDialog from "@/components/dialogs/BatchDialog.vue";
import Icon from "@/components/ui/Icon.vue";
import WindowControls from "@/components/layout/WindowControls.vue";

const design = useDesigner();
const data = useData();
const settings = useSettings();
const ui = useUi();
const stage = ref<InstanceType<typeof EditorStage> | null>(null);

function isTyping(e: Event) {
  const el = e.target as HTMLElement | null;
  if (!el) return false;
  return (
    el.tagName === "INPUT" ||
    el.tagName === "TEXTAREA" ||
    el.tagName === "SELECT" ||
    el.isContentEditable
  );
}

function onKey(e: KeyboardEvent) {
  if (isTyping(e)) return;
  const mod = e.ctrlKey || e.metaKey;
  const k = e.key.toLowerCase();

  if (mod && k === "z") {
    e.preventDefault();
    if (e.shiftKey) design.redo();
    else design.undo();
    return;
  }
  if (mod && k === "y") {
    e.preventDefault();
    design.redo();
    return;
  }
  if (mod && k === "d") {
    e.preventDefault();
    design.duplicate();
    return;
  }
  if (mod && k === "s") {
    e.preventDefault();
    save();
    return;
  }
  if (mod && k === "a") {
    e.preventDefault();
    design.select(design.doc.elements.map((el) => el.id));
    return;
  }
  if (e.key === "Delete" || e.key === "Backspace") {
    if (design.selection.length) {
      e.preventDefault();
      design.remove();
    }
    return;
  }
  if (e.key === "Escape") {
    design.select([]);
    ui.printOpen = false;
    return;
  }
  if (e.key.startsWith("Arrow")) {
    if (!design.selection.length) return;
    e.preventDefault();
    const step = e.shiftKey ? 2 : 0.5;
    if (e.key === "ArrowLeft") design.nudge(-step, 0);
    if (e.key === "ArrowRight") design.nudge(step, 0);
    if (e.key === "ArrowUp") design.nudge(0, -step);
    if (e.key === "ArrowDown") design.nudge(0, step);
  }
}

function save() {
  design.saveToLibrary();
  ui.toast(`已保存「${design.doc.name}」到我的模板`, "ok");
}

function printBatch() {
  data.selectAll(data.rows.map((row) => row.id));
  ui.printOpen = true;
}

function back() {
  if (design.dirty) {
    design.saveToLibrary();
  }
  design.closeDesigner();
}

onMounted(() => {
  window.addEventListener("keydown", onKey);
  requestAnimationFrame(() => stage.value?.fit());
});
onBeforeUnmount(() => window.removeEventListener("keydown", onKey));
</script>

<template>
  <div class="designer">
    <header class="topbar" :class="{ 'has-controls': settings.desktop }">
      <button class="btn ghost icon" title="返回模板" @click="back">
        <Icon name="chevronLeft" :size="17" />
      </button>

      <div class="doc">
        <input
          class="name"
          :value="design.doc.name"
          spellcheck="false"
          @change="design.rename(($event.target as HTMLInputElement).value)"
        />
        <div class="meta">
          <span class="pill">{{ CATEGORY_LABEL[design.doc.category] }}</span>
          <span class="tnum">{{ design.doc.paper.width }}×{{ design.doc.paper.height }} mm</span>
          <i />
          <span class="tnum">{{ design.doc.paper.dpi }} dpi</span>
          <i />
          <span>{{ design.doc.elements.length }} 元素</span>
          <span v-if="design.dirty" class="dirty" title="有未保存的修改" />
        </div>
      </div>

      <div class="spacer" />

      <div class="group">
        <button class="btn ghost icon" :disabled="!design.canUndo" title="撤销 Ctrl+Z" @click="design.undo()">
          <Icon name="undo" :size="15" />
        </button>
        <button class="btn ghost icon" :disabled="!design.canRedo" title="重做 Ctrl+Shift+Z" @click="design.redo()">
          <Icon name="redo" :size="15" />
        </button>
      </div>
      <div class="sep" />
      <button class="btn" @mousedown.prevent="design.saveToLibrary(); ui.toast('已保存到我的模板', 'ok')">
        <Icon name="save" :size="14" /> 保存
      </button>
      <button
        class="btn batch-entry"
        :class="{ active: data.rows.length }"
        title="导入并管理批量数据"
        @click="ui.batchOpen = true"
      >
        <Icon name="table" :size="14" /> 批量
        <span v-if="data.rows.length" class="count tnum">{{ data.rows.length }}</span>
      </button>
      <button class="btn primary" @click="ui.printOpen = true">
        <Icon name="printer" :size="14" /> 打印
      </button>
      <WindowControls />
    </header>

    <div v-if="data.rows.length" class="batch-bar">
      <Icon name="table" :size="13" />
      <b>批量数据</b>
      <span class="bb-file">{{ data.sourceName || "未命名" }}</span>
      <span class="bb-dot" />
      <span class="tnum">{{ data.rows.length }} 条</span>
      <span class="bb-dot" />
      <span class="tnum">预览第 {{ data.recordIndex + 1 }} 条</span>
      <div class="bb-nav">
        <button
          :disabled="data.recordIndex <= 0"
          @click="data.recordIndex = Math.max(0, data.recordIndex - 1)"
        >
          <Icon name="chevronLeft" :size="12" />
        </button>
        <button
          :disabled="data.recordIndex >= data.rows.length - 1"
          @click="data.recordIndex = Math.min(data.rows.length - 1, data.recordIndex + 1)"
        >
          <Icon name="chevronRight" :size="12" />
        </button>
      </div>
      <div class="spacer" />
      <button class="btn ghost sm" @click="printBatch">
        <Icon name="printer" :size="13" /> 打印全部
      </button>
      <button class="btn sm" @click="ui.batchOpen = true">
        <Icon name="sliders" :size="13" /> 管理 / 映射
      </button>
    </div>

    <div class="body">
      <LeftPanel />
      <EditorStage ref="stage" />
      <PropertyPanel />
    </div>

    <BatchDialog v-if="ui.batchOpen" @close="ui.batchOpen = false" />
  </div>
</template>

<style scoped>
.designer { display: flex; flex-direction: column; height: 100%; background: var(--bg); }
.topbar {
  height: var(--topbar-h);
  flex: none;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0 0 0 8px;
  background: var(--surface);
  border-bottom: 1px solid var(--line);
  z-index: 20;
  -webkit-app-region: drag;
}
.topbar :deep(button),
.topbar :deep(input),
.topbar :deep(select) { -webkit-app-region: no-drag; }
.topbar:not(.has-controls) { padding-right: 12px; }
.doc { display: flex; flex-direction: column; gap: 1px; min-width: 0; margin-left: 2px; }
.name {
  border: 1px solid transparent;
  background: none;
  border-radius: 5px;
  padding: 1px 5px;
  margin-left: -5px;
  font-size: 13px;
  font-weight: 620;
  letter-spacing: -0.01em;
  width: 250px;
  height: 22px;
  transition: background 0.12s, border-color 0.12s;
}
.name:hover { background: var(--surface-2); }
.name:focus { background: #fff; border-color: var(--accent); box-shadow: 0 0 0 3px var(--accent-soft); }
.meta {
  display: flex;
  align-items: center;
  gap: 7px;
  padding-left: 0;
  font-size: 10.5px;
  color: var(--ink-4);
}
.meta i { width: 2.5px; height: 2.5px; border-radius: 50%; background: #d3d8df; }
.pill {
  padding: 0 5px;
  border-radius: 3px;
  background: #f0f2f5;
  color: var(--ink-3);
  font-size: 9.5px;
  line-height: 14px;
}
.dirty { width: 5px; height: 5px; border-radius: 50%; background: var(--accent); }
.spacer { flex: 1; }
.group { display: flex; gap: 1px; }
.sep { width: 1px; height: 18px; background: var(--line); margin: 0 4px; }
.batch-entry.active { border-color: var(--accent-line); color: var(--accent-ink); background: var(--accent-soft); }
.batch-entry .count {
  min-width: 17px;
  height: 17px;
  padding: 0 4px;
  border-radius: 9px;
  background: var(--accent);
  color: #fff;
  font-size: 10px;
  line-height: 17px;
  text-align: center;
}
.batch-bar {
  flex: none;
  display: flex;
  align-items: center;
  gap: 7px;
  height: 34px;
  padding: 0 10px 0 13px;
  background: #f2f6ff;
  border-bottom: 1px solid #dbe4f5;
  color: var(--ink-3);
  font-size: 11.5px;
}
.batch-bar b { color: var(--accent-ink); font-weight: 600; }
.batch-bar :deep(svg) { color: var(--accent); }
.bb-file {
  max-width: 220px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--ink-3);
}
.bb-dot { width: 2.5px; height: 2.5px; border-radius: 50%; background: #b9c7e2; }
.bb-nav { display: flex; gap: 1px; margin-left: 2px; }
.bb-nav button {
  display: flex;
  padding: 2px;
  border-radius: 4px;
  color: var(--ink-3);
}
.bb-nav button:hover:not(:disabled) { background: #e4ecfb; color: var(--accent-ink); }
.bb-nav button:disabled { opacity: 0.35; }
.body { flex: 1; min-height: 0; display: flex; }
</style>
