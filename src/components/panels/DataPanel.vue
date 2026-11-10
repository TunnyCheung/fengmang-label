<script setup lang="ts">
import { ref } from "vue";
import { useDesigner } from "@/stores/designer";
import { useData } from "@/stores/data";
import { useUi } from "@/stores/ui";
import Icon from "@/components/ui/Icon.vue";

const design = useDesigner();
const data = useData();
const ui = useUi();
const fileRef = ref<HTMLInputElement | null>(null);

async function pickFile() {
  if (window.labelcraft) {
    const res = await window.labelcraft.readTextFile({
      filters: [{ name: "数据文件", extensions: ["csv", "txt", "tsv"] }],
    });
    if (res.ok && res.text) {
      try {
        data.importCsv(res.name ?? "数据", res.text);
        ui.toast(`已导入 ${data.rows.length} 行数据`, "ok");
      } catch (err) {
        ui.toast((err as Error).message, "error");
      }
    }
    return;
  }
  fileRef.value?.click();
}

async function onFile(e: Event) {
  const f = (e.target as HTMLInputElement).files?.[0];
  if (!f) return;
  const text = await f.text();
  try {
    data.importCsv(f.name, text);
    ui.toast(`已导入 ${data.rows.length} 行数据`, "ok");
  } catch (err) {
    ui.toast((err as Error).message, "error");
  }
  (e.target as HTMLInputElement).value = "";
}

function move(delta: number) {
  const next = data.recordIndex + delta;
  data.recordIndex = Math.max(0, Math.min(data.total - 1, next));
}
</script>

<template>
  <div class="pane">
    <div class="hint-row">
      <span class="eyebrow">变量字段</span>
      <button class="btn ghost sm icon" title="新增字段" @click="design.addVariable()">
        <Icon name="plus" :size="14" />
      </button>
    </div>
      <p class="lead">
        在文字里用 <code v-text="'{{key}}'"></code> 插入字段。改下面的示例值，画布会同步预览。
      </p>

    <div class="vars">
      <div v-for="v in design.doc.variables" :key="v.key" class="var">
        <div class="var-head">
          <input
            class="k"
            :value="v.key"
            spellcheck="false"
            @change="design.updateVariable(v.key, { key: ($event.target as HTMLInputElement).value })"
          />
          <select
            class="kind"
            :value="v.kind"
            @change="design.updateVariable(v.key, { kind: ($event.target as HTMLSelectElement).value as any })"
          >
            <option value="text">文本</option>
            <option value="number">数字</option>
            <option value="date">日期</option>
            <option value="sequence">流水号</option>
          </select>
          <button class="del" title="删除字段" @click="design.removeVariable(v.key)">
            <Icon name="x" :size="12" />
          </button>
        </div>
        <input
          class="input sm"
          :value="v.sample"
          placeholder="示例值"
          @input="design.updateVariable(v.key, { sample: ($event.target as HTMLInputElement).value })"
        />
        <div v-if="v.kind === 'sequence'" class="seq">
          <label>起始 <input class="input sm tnum" type="number" :value="v.seq?.start ?? 1"
            @change="design.updateVariable(v.key, { seq: { ...(v.seq ?? { start: 1, step: 1, pad: 4 }), start: Number(($event.target as HTMLInputElement).value) } })" /></label>
          <label>步长 <input class="input sm tnum" type="number" :value="v.seq?.step ?? 1"
            @change="design.updateVariable(v.key, { seq: { ...(v.seq ?? { start: 1, step: 1, pad: 4 }), step: Number(($event.target as HTMLInputElement).value) } })" /></label>
          <label>位数 <input class="input sm tnum" type="number" :value="v.seq?.pad ?? 4"
            @change="design.updateVariable(v.key, { seq: { ...(v.seq ?? { start: 1, step: 1, pad: 4 }), pad: Number(($event.target as HTMLInputElement).value) } })" /></label>
        </div>
      </div>
      <div v-if="!design.doc.variables.length" class="none">还没有字段，点右上角 + 添加</div>
    </div>

    <div class="divider" />

    <div class="hint-row">
      <span class="eyebrow">批量数据</span>
      <span class="tip-text">CSV / TSV</span>
    </div>
    <div v-if="!data.rows.length" class="drop" @click="pickFile">
      <Icon name="upload" :size="16" />
      <div>
        <b>导入表格数据</b>
        <span>首行为列名，可批量预览与打印</span>
      </div>
    </div>
    <template v-else>
      <div class="file">
        <Icon name="file" :size="14" />
        <span class="fname">{{ data.sourceName }}</span>
        <button class="del" @click="data.clearRows()"><Icon name="x" :size="12" /></button>
      </div>
      <div class="record">
        <button class="btn sm icon" :disabled="data.recordIndex <= 0" @click="move(-1)">
          <Icon name="chevronLeft" :size="14" />
        </button>
        <div class="rc tnum">
          第 <b>{{ data.recordIndex + 1 }}</b> / {{ data.rows.length }} 条
        </div>
        <button class="btn sm icon" :disabled="data.recordIndex >= data.total - 1" @click="move(1)">
          <Icon name="chevronRight" :size="14" />
        </button>
      </div>
      <button class="btn sm" style="width: 100%" @click="pickFile">
        <Icon name="refresh" :size="13" /> 重新导入
      </button>
    </template>

    <input ref="fileRef" type="file" accept=".csv,.txt,.tsv" hidden @change="onFile" />
  </div>
</template>

<style scoped>
.pane { padding: 12px; overflow: auto; flex: 1; }
.hint-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 9px; }
.hint-row .eyebrow { font-size: 11px; }
.tip-text { font-size: 11px; color: var(--ink-4); }
.lead { margin: 0 0 10px; font-size: 12px; line-height: 1.6; color: var(--ink-3); }
.lead code {
  font-family: var(--mono);
  font-size: 11px;
  background: #f2f4f7;
  border: 1px solid var(--line);
  border-radius: 3px;
  padding: 0 3px;
}
.vars { display: flex; flex-direction: column; gap: 6px; }
.divider { margin: 16px 0 12px; }
.var {
  border: 1px solid var(--line);
  border-radius: var(--r-md);
  padding: 6px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  background: var(--surface-2);
}
.var-head { display: flex; gap: 4px; align-items: center; }
.k {
  flex: 1;
  min-width: 0;
  height: 24px;
  border: 1px solid transparent;
  background: none;
  border-radius: 4px;
  font-family: var(--mono);
  font-size: 12px;
  padding: 0 5px;
  color: var(--ink);
}
.k:hover { background: #fff; border-color: var(--line); }
.k:focus { background: #fff; border-color: var(--accent); }
.kind {
  height: 24px;
  border: 1px solid var(--line);
  border-radius: 4px;
  background: #fff;
  font-size: 11.5px;
  padding: 0 3px;
  color: var(--ink-2);
}
.del { color: var(--ink-4); display: flex; padding: 2px; border-radius: 3px; }
.del:hover { background: #eceff3; color: var(--danger); }
.input.sm { height: 28px; font-size: 12px; }
.seq { display: grid; grid-template-columns: repeat(3, 1fr); gap: 4px; }
.seq label { display: flex; flex-direction: column; gap: 2px; font-size: 10.5px; color: var(--ink-4); }
.none { font-size: 12.5px; color: var(--ink-4); padding: 6px 2px; }
.drop {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 12px 10px;
  border: 1px dashed var(--line-2);
  border-radius: var(--r-md);
  color: var(--ink-3);
  cursor: pointer;
  transition: all 0.12s;
}
.drop:hover { border-color: var(--accent-line); background: var(--accent-soft); color: var(--accent-ink); }
.drop b { display: block; font-size: 12.5px; font-weight: 550; color: var(--ink); }
.drop span { font-size: 11px; color: var(--ink-4); }
.file {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 8px;
  border-radius: var(--r-sm);
  background: var(--surface-2);
  border: 1px solid var(--line);
  font-size: 12px;
  color: var(--ink-2);
  margin-bottom: 6px;
}
.fname { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.record { display: flex; align-items: center; gap: 6px; margin-bottom: 6px; }
.rc { flex: 1; text-align: center; font-size: 12px; color: var(--ink-3); }
.rc b { color: var(--ink); }
</style>
