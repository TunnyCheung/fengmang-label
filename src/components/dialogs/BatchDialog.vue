<script setup lang="ts">
import { computed, ref } from "vue";
import { useData } from "@/stores/data";
import { useDesigner } from "@/stores/designer";
import { useUi } from "@/stores/ui";
import Icon from "@/components/ui/Icon.vue";

const emit = defineEmits<{ close: [] }>();

const data = useData();
const design = useDesigner();
const ui = useUi();

const fileRef = ref<HTMLInputElement | null>(null);
const pasting = ref(false);
const pasteText = ref("");

const unmapped = computed(
  () =>
    data.columns.filter(
      (column) => column !== data.copiesColumn && !data.mapping[column],
    ).length,
);

const mappedCount = computed(
  () =>
    data.columns.filter(
      (column) => column !== data.copiesColumn && data.mapping[column],
    ).length,
);

const allVisibleSelected = computed(
  () =>
    data.filteredRows.length > 0 &&
    data.filteredRows.every((row) => data.selected.includes(row.id)),
);

const plannedCopies = computed(() =>
  data.rows.reduce((total, row) => total + data.copiesFor(row.id, 1), 0),
);

const unmappedVars = computed(() => {
  const used = new Set(Object.values(data.mapping).filter(Boolean));
  return design.doc.variables.filter((item) => item.kind !== "sequence" && !used.has(item.key));
});

const indexById = computed(() => {
  const map = new Map<string, number>();
  data.rows.forEach((row, index) => map.set(row.id, index + 1));
  return map;
});

function applyText(name: string, text: string) {
  try {
    const count = data.importText(name, text);
    ui.toast(`已导入 ${count} 条数据，请检查列映射`, "ok");
    pasting.value = false;
    pasteText.value = "";
  } catch (err) {
    ui.toast((err as Error).message, "error");
  }
}

async function pickFile() {
  if (window.labelcraft) {
    const res = await window.labelcraft.readTextFile({
      filters: [{ name: "数据文件", extensions: ["csv", "txt", "tsv"] }],
    });
    if (res.ok && res.text) applyText(res.name ?? "数据", res.text);
    return;
  }
  fileRef.value?.click();
}

async function onFile(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (!file) return;
  applyText(file.name, await file.text());
  (event.target as HTMLInputElement).value = "";
}

function pasteImport() {
  if (!pasteText.value.trim()) {
    ui.toast("先粘贴表格内容", "error");
    return;
  }
  applyText("粘贴导入", pasteText.value);
}

function selectRow(id: string) {
  const index = data.rows.findIndex((row) => row.id === id);
  if (index >= 0) data.recordIndex = index;
}

function toggleAll() {
  if (allVisibleSelected.value) {
    const visible = new Set(data.filteredRows.map((row) => row.id));
    data.selected = data.selected.filter((id) => !visible.has(id));
  } else {
    data.selectAll([...new Set([...data.selected, ...data.filteredRows.map((row) => row.id)])]);
  }
}

function createField(column: string) {
  let key = column.replace(/[^\w\u4e00-\u9fa5]+/g, "_").replace(/^_+|_+$/g, "") || "field";
  const base = key;
  let index = 2;
  while (design.doc.variables.some((v) => v.key === key)) key = `${base}${index++}`;
  design.addVariable({ key, label: column, sample: data.rows[0]?.cells[column] ?? "" });
  data.setMapping(column, key);
}

function onMap(column: string, event: Event) {
  const value = (event.target as HTMLSelectElement).value;
  if (value === "__new__") {
    createField(column);
    return;
  }
  data.setMapping(column, value);
}

function removeSelected() {
  if (!data.selected.length) return;
  data.deleteRows([...data.selected]);
  ui.toast("已删除选中行", "ok");
}

function duplicateSelected() {
  const ids = [...data.selected];
  for (const id of ids) data.duplicateRow(id);
  data.clearSelection();
  if (ids.length) ui.toast(`已复制 ${ids.length} 行`, "ok");
}

function printSelected() {
  ui.batchOpen = false;
  ui.printOpen = true;
}
</script>

<template>
  <div class="backdrop" @mousedown.self="emit('close')">
    <div class="dialog">
      <header class="head">
        <div class="ht">
          <h3>批量数据</h3>
          <p>
            {{ data.rows.length }} 条记录 · 已映射 {{ mappedCount }} 列
            <template v-if="data.copiesColumn"> · 份数列「{{ data.copiesColumn }}」</template>
          </p>
        </div>
        <button class="btn ghost icon" title="关闭" @click="emit('close')">
          <Icon name="x" :size="16" />
        </button>
      </header>

      <div class="toolbar">
        <button class="btn sm" @click="pickFile">
          <Icon name="upload" :size="13" /> 导入 CSV
        </button>
        <button class="btn sm" :class="{ on: pasting }" @click="pasting = !pasting">
          <Icon name="file" :size="13" /> 粘贴 Excel
        </button>
        <span class="sep" />
        <button class="btn sm" :disabled="!data.columns.length" @click="data.addRow()">
          <Icon name="plus" :size="13" /> 添加行
        </button>
        <button class="btn sm" :disabled="!data.selected.length" @click="duplicateSelected">
          <Icon name="copy" :size="13" /> 复制
        </button>
        <button class="btn sm danger" :disabled="!data.selected.length" @click="removeSelected">
          <Icon name="trash" :size="13" /> 删除
        </button>
        <div class="spacer" />
        <label class="search">
          <Icon name="search" :size="13" />
          <input v-model="data.search" placeholder="搜索数据…" spellcheck="false" />
        </label>
      </div>

      <div v-if="pasting" class="paste">
        <textarea
          v-model="pasteText"
          spellcheck="false"
          placeholder="从 Excel 选中整块区域（含表头）复制，粘贴到这里。列之间用 Tab 或逗号分隔。"
        />
        <div class="paste-foot">
          <span>支持 Tab / 逗号分隔，首行为列名</span>
          <button class="btn sm" @click="pasting = false">取消</button>
          <button class="btn sm primary" @click="pasteImport">解析并导入</button>
        </div>
      </div>

      <div v-if="data.columns.length && unmapped" class="notice">
        <Icon name="alert" :size="13" />
        <span>{{ unmapped }} 列还没有对应字段，这些列的数据不会出现在标签上。可在表头下方选择字段或新建字段。</span>
      </div>
      <div v-if="unmappedVars.length" class="notice info">
        <Icon name="info" :size="13" />
        <span>
          模板字段 {{ unmappedVars.slice(0, 6).map((item) => item.key).join("、") }}{{ unmappedVars.length > 6 ? " 等" : "" }}
          没有取数，会沿用示例值。
        </span>
      </div>

      <div v-if="!data.columns.length" class="empty">
        <div class="empty-ic"><Icon name="table" :size="26" /></div>
        <b>还没有批量数据</b>
        <span>导入 CSV，或从 Excel 复制整块表格粘贴进来；数据只保存在本机。</span>
        <div class="empty-actions">
          <button class="btn primary" @click="pickFile"><Icon name="upload" :size="14" /> 导入 CSV</button>
          <button class="btn" @click="pasting = true"><Icon name="file" :size="14" /> 粘贴 Excel 数据</button>
        </div>
      </div>

      <div v-else class="grid-wrap">
        <table class="grid">
          <thead>
            <tr>
              <th class="pick">
                <input type="checkbox" :checked="allVisibleSelected" @change="toggleAll" />
              </th>
              <th class="idx">#</th>
              <th v-for="column in data.columns" :key="column" class="col">
                <div class="col-name" :title="column">{{ column }}</div>
                <select class="map" :value="data.mapping[column] ?? ''" @change="onMap(column, $event)">
                  <option value="">未映射</option>
                  <option v-for="v in design.doc.variables" :key="v.key" :value="v.key">{{ v.key }}</option>
                  <option value="__new__">＋ 新建字段</option>
                </select>
                <div v-if="column === data.copiesColumn" class="copies-tag">份数列</div>
              </th>
              <th class="state" />
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="row in data.filteredRows"
              :key="row.id"
              :class="{
                on: data.rows[data.recordIndex]?.id === row.id,
                bad: data.issues[row.id]?.length,
              }"
              @click="selectRow(row.id)"
            >
              <td class="pick" @click.stop>
                <input
                  type="checkbox"
                  :checked="data.selected.includes(row.id)"
                  @change="data.toggleSelect(row.id)"
                />
              </td>
              <td class="idx tnum">{{ indexById.get(row.id) }}</td>
              <td v-for="column in data.columns" :key="column" class="col">
                <input
                  class="cell"
                  :value="row.cells[column]"
                  spellcheck="false"
                  @click.stop
                  @change="data.updateCell(row.id, column, ($event.target as HTMLInputElement).value)"
                />
              </td>
              <td class="state">
                <span
                  v-if="data.issues[row.id]?.length"
                  class="issue"
                  :title="data.issues[row.id].join('\n')"
                >
                  <Icon name="alert" :size="13" />
                </span>
              </td>
            </tr>
          </tbody>
        </table>
        <div v-if="!data.filteredRows.length" class="no-match">没有匹配「{{ data.search }}」的数据</div>
      </div>

      <footer class="foot">
        <label class="copies">
          <span>份数列</span>
          <select
            class="input sm"
            :value="data.copiesColumn"
            @change="data.copiesColumn = ($event.target as HTMLSelectElement).value"
          >
            <option value="">不指定（打印时统一份数）</option>
            <option v-for="column in data.columns" :key="column" :value="column">{{ column }}</option>
          </select>
        </label>
        <span class="sum tnum">已选 {{ data.selected.length }} · 份数合计 {{ plannedCopies }}</span>
        <div class="spacer" />
        <button class="btn" :disabled="!data.selected.length" @click="printSelected">
          <Icon name="printer" :size="13" /> 打印选中
        </button>
        <button class="btn primary" @click="emit('close')">完成</button>
      </footer>

      <input ref="fileRef" type="file" accept=".csv,.txt,.tsv" hidden @change="onFile" />
    </div>
  </div>
</template>

<style scoped>
.backdrop {
  position: fixed;
  inset: 0;
  background: rgba(14, 17, 22, 0.42);
  backdrop-filter: blur(3px);
  z-index: 210;
  display: grid;
  place-items: center;
  animation: fade 0.14s ease;
}
@keyframes fade { from { opacity: 0; } }
.dialog {
  width: 1040px;
  max-width: calc(100vw - 48px);
  height: min(720px, calc(100vh - 60px));
  background: var(--surface);
  border-radius: var(--r-xl);
  box-shadow: var(--sh-pop);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  animation: pop 0.18s cubic-bezier(0.2, 0.9, 0.3, 1);
}
@keyframes pop { from { opacity: 0; transform: translateY(10px) scale(0.985); } }
.head {
  display: flex;
  align-items: flex-start;
  padding: 16px 16px 12px 20px;
  border-bottom: 1px solid var(--line);
}
.ht h3 { margin: 0; font-size: 15px; font-weight: 650; }
.ht p { margin: 3px 0 0; font-size: 11px; color: var(--ink-4); }
.head .btn { margin-left: auto; }
.toolbar {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 16px;
  border-bottom: 1px solid var(--line);
  background: var(--surface-2);
}
.sep { width: 1px; height: 18px; background: var(--line); margin: 0 4px; }
.spacer { flex: 1; }
.btn.danger { color: #b4382f; }
.btn.danger:hover:not(:disabled) { background: var(--danger-soft); border-color: #f0c8c2; }
.search {
  display: flex;
  align-items: center;
  gap: 5px;
  height: 28px;
  padding: 0 8px;
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--r-sm);
  color: var(--ink-4);
  width: 190px;
}
.search input {
  flex: 1;
  min-width: 0;
  border: none;
  background: none;
  font-size: 12px;
  color: var(--ink);
}
.paste {
  padding: 12px 16px;
  border-bottom: 1px solid var(--line);
  background: #fbfcfe;
}
.paste textarea {
  width: 100%;
  height: 110px;
  resize: vertical;
  border: 1px solid var(--line);
  border-radius: var(--r-sm);
  padding: 9px 10px;
  font-family: var(--mono);
  font-size: 11.5px;
  line-height: 1.5;
  outline: none;
}
.paste textarea:focus { border-color: var(--accent); box-shadow: 0 0 0 3px rgba(47, 107, 255, 0.12); }
.paste-foot { display: flex; align-items: center; gap: 8px; margin-top: 8px; }
.paste-foot span { flex: 1; font-size: 11px; color: var(--ink-4); }
.notice {
  display: flex;
  gap: 7px;
  align-items: flex-start;
  margin: 10px 16px 0;
  padding: 8px 10px;
  border-radius: var(--r-sm);
  background: var(--warn-soft, #fff7e6);
  border: 1px solid #f3e0b8;
  color: #7a5a14;
  font-size: 11.5px;
  line-height: 1.55;
}
.notice.info {
  background: var(--accent-soft);
  border-color: var(--accent-line);
  color: var(--accent-ink);
}
.grid-wrap { flex: 1; min-height: 0; overflow: auto; margin: 10px 16px; border: 1px solid var(--line); border-radius: var(--r-md); }
.grid { width: 100%; border-collapse: separate; border-spacing: 0; font-size: 12px; }
.grid thead th {
  position: sticky;
  top: 0;
  z-index: 2;
  background: var(--surface-2);
  border-bottom: 1px solid var(--line);
  padding: 6px 6px;
  text-align: left;
  vertical-align: top;
  font-weight: 500;
}
.grid th.pick, .grid td.pick { width: 30px; text-align: center; }
.grid th.idx, .grid td.idx { width: 44px; color: var(--ink-4); text-align: right; padding-right: 8px; }
.grid th.state, .grid td.state { width: 26px; }
.grid td {
  border-bottom: 1px solid var(--line);
  padding: 2px 6px;
  background: var(--surface);
}
.grid tbody tr { cursor: default; }
.grid tbody tr:hover td { background: #fafbfd; }
.grid tbody tr.on td { background: var(--accent-soft); }
.grid tbody tr.bad td.idx { color: #b4382f; font-weight: 600; }
.col-name {
  max-width: 150px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 11.5px;
  color: var(--ink-2);
}
.map {
  margin-top: 3px;
  width: 100%;
  max-width: 150px;
  height: 22px;
  border: 1px solid var(--line);
  border-radius: 4px;
  background: #fff;
  font-size: 11px;
  color: var(--ink-3);
  padding: 0 2px;
}
.map:focus { border-color: var(--accent); outline: none; }
.copies-tag {
  margin-top: 2px;
  font-size: 9.5px;
  color: #7a5a14;
  background: #fff3d6;
  border-radius: 3px;
  padding: 0 4px;
  width: fit-content;
}
.cell {
  width: 100%;
  min-width: 90px;
  height: 26px;
  border: 1px solid transparent;
  border-radius: 4px;
  background: none;
  padding: 0 5px;
  font-size: 12px;
  color: var(--ink);
}
.cell:hover { border-color: var(--line); background: #fff; }
.cell:focus { border-color: var(--accent); background: #fff; outline: none; }
.issue { color: #c9821a; display: inline-flex; }
.no-match { padding: 24px; text-align: center; font-size: 12px; color: var(--ink-4); }
.empty { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; text-align: center; padding: 30px; }
.empty-ic { color: #c2c9d3; }
.empty b { font-size: 14px; }
.empty span { font-size: 12px; color: var(--ink-4); max-width: 360px; line-height: 1.6; }
.empty-actions { display: flex; gap: 8px; margin-top: 8px; }
.foot {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 16px;
  border-top: 1px solid var(--line);
  background: var(--surface-2);
}
.copies { display: flex; align-items: center; gap: 6px; font-size: 11.5px; color: var(--ink-3); }
.copies .input.sm { height: 26px; width: 190px; font-size: 11.5px; }
.sum { font-size: 11.5px; color: var(--ink-3); }
</style>
