<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useDesigner } from "@/stores/designer";
import { useData } from "@/stores/data";
import { useSettings } from "@/stores/settings";
import { useUi } from "@/stores/ui";
import { MM_PER_INCH } from "@/core/units";
import { resolveValues } from "@/core/resolve";
import Icon from "@/components/ui/Icon.vue";
import LabelCanvas from "@/components/canvas/LabelCanvas.vue";
import SizeSelect from "@/components/ui/SizeSelect.vue";

const design = useDesigner();
const data = useData();
const settings = useSettings();
const ui = useUi();
const emit = defineEmits<{ close: [] }>();

const mode = ref<"label" | "system" | "export">(settings.desktop ? "label" : "export");
const copies = ref(settings.copies);
const printer = ref(settings.printer);
const busy = ref(false);
const error = ref("");
const allRows = ref(false);
const advanced = ref(false);
const density = ref(settings.density);
const speed = ref(settings.speed);
const offset = ref(settings.offset);
const stage = ref<InstanceType<typeof LabelCanvas> | null>(null);

const jobCount = computed(() => (allRows.value ? Math.max(1, data.rows.length) : 1));
const paper = computed(() => design.doc.paper);
const previewScale = computed(() => {
  const w = 330;
  const h = 300;
  return Math.min(w / paper.value.width, h / paper.value.height);
});
const labelPrinters = computed(() =>
  settings.printers.filter((p) => {
    const n = `${p.name} ${p.displayName}`.toLowerCase();
    return /tsc|zebra|zpl|gprinter|佳博|汉印|hprt|得力|deli|芯烨|xprinter|label|标签/.test(n);
  }),
);

const printerLooksLabel = computed(() => {
  const n = `${printer.value}`.toLowerCase();
  if (!n) return false;
  return /tsc|zebra|zpl|gprinter|佳博|汉印|hprt|得力|deli|芯烨|xprinter|label|标签|godex|argox/.test(n);
});

function resolveLanguage(): "zpl" | "tspl" {
  const fixed = design.doc.print.language;
  if (fixed === "zpl" || fixed === "tspl") return fixed;
  const n = `${printer.value}`.toLowerCase();
  if (/tsc|tspl|gprinter|佳博|汉印|hprt|得力|deli|芯烨|xprinter|godex|argox/i.test(n)) return "tspl";
  return "zpl";
}

function valuesFor(index: number) {
  const base = resolveValues(design.doc.variables, index, data.overrides);
  const row = data.rows[index];
  if (row) for (const [k, v] of Object.entries(row)) if (k && v !== "") base[k] = v;
  return base;
}

async function ensureReady() {
  if (mode.value === "label" && !window.labelcraft) {
    throw new Error("当前是浏览器预览模式，标签直打需要在桌面端运行");
  }
  if (mode.value === "label" && !printer.value) {
    throw new Error("请先选择一台标签打印机");
  }
}

async function run() {
  error.value = "";
  busy.value = true;
  try {
    await ensureReady();
    settings.copies = copies.value;
    settings.density = density.value;
    settings.speed = speed.value;
    settings.offset = offset.value;
    settings.printer = printer.value;
    if (mode.value !== "export") settings.mode = mode.value;
    settings.save();

    if (mode.value === "label") {
      const { buildLabelCommands } = await import("@/print");
      const lang = resolveLanguage();
      const chunks: string[] = [];
      for (let i = 0; i < jobCount.value; i++) {
        const values = valuesFor(i);
        chunks.push(
          await buildLabelCommands(design.doc, values, lang, {
            dpi: design.doc.paper.dpi,
            density: density.value,
            speed: speed.value,
            offset: offset.value,
            copies: copies.value,
          }),
        );
      }
      const res = await window.labelcraft!.printLabel({
        printer: printer.value,
        language: lang,
        commands: chunks.join("\n"),
        jobName: design.doc.name,
      });
      if (!res.ok) throw new Error(res.error || "打印失败");
      ui.toast(`已发送 ${jobCount.value} 个标签任务到「${printer.value}」`, "ok");
      close();
      return;
    }

    if (mode.value === "system") {
      await renderToPrintRoot(0);
      await waitForPrintImage();
      const res = await window.labelcraft?.printSystem({
        printer: printer.value || undefined,
        copies: copies.value,
        pageSize: { width: paper.value.width, height: paper.value.height },
      });
      if (res && !res.ok) throw new Error(res.error || "系统打印失败");
      ui.toast("已发送到系统打印队列", "ok");
      close();
      return;
    }

    // export
    const canvas = stage.value!.toCanvas(paper.value.dpi / MM_PER_INCH, false).canvas;
    const dataUrl = canvas.toDataURL("image/png");
    if (window.labelcraft) {
      const base64 = dataUrl.split(",")[1];
      const r = await window.labelcraft.saveFile({
        defaultName: `${design.doc.name}-${paper.value.dpi}dpi.png`,
        filters: [{ name: "PNG 图片", extensions: ["png"] }],
        data: base64,
        encoding: "base64",
      });
      if (r.ok) ui.toast("图片已导出", "ok");
    } else {
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `${design.doc.name}.png`;
      a.click();
    }
    close();
  } catch (e) {
    error.value = (e as Error).message;
  } finally {
    busy.value = false;
  }
}

async function exportZpl() {
  busy.value = true;
  error.value = "";
  try {
    const { buildLabelCommands } = await import("@/print");
    const zpl = await buildLabelCommands(design.doc, valuesFor(0), "zpl", {
      dpi: paper.value.dpi,
      density: density.value,
      speed: speed.value,
      offset: offset.value,
      copies: copies.value,
    });
    if (window.labelcraft) {
      const r = await window.labelcraft.saveFile({
        defaultName: `${design.doc.name}.zpl`,
        filters: [{ name: "ZPL 指令", extensions: ["zpl"] }],
        data: zpl,
      });
      if (r.ok) ui.toast("ZPL 已导出，可直接发给打印机", "ok");
    } else {
      const blob = new Blob([zpl], { type: "text/plain" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `${design.doc.name}.zpl`;
      a.click();
    }
  } catch (e) {
    error.value = (e as Error).message;
  } finally {
    busy.value = false;
  }
}

async function renderToPrintRoot(index: number) {
  const root = document.getElementById("print-root");
  if (!root) return;
  const canvas = stage.value!.toCanvas(paper.value.dpi / MM_PER_INCH, false).canvas;
  root.innerHTML = `<img src="${canvas.toDataURL("image/png")}" style="width:${paper.value.width}mm;height:${paper.value.height}mm;display:block" />`;
  const style = document.createElement("style");
  style.id = "print-page-style";
  style.textContent = `@page { size: ${paper.value.width}mm ${paper.value.height}mm; margin: 0 }`;
  document.head.appendChild(style);
}

async function waitForPrintImage() {
  const img = document.querySelector<HTMLImageElement>("#print-root img");
  if (!img) return;
  try {
    await img.decode();
  } catch {
    /* ignore decode failures */
  }
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
}

function cleanupPrintRoot() {
  const root = document.getElementById("print-root");
  if (root) root.innerHTML = "";
  document.getElementById("print-page-style")?.remove();
}

onMounted(() => {
  if (!settings.printers.length) settings.refreshPrinters();
  if (settings.mode) mode.value = settings.desktop ? settings.mode : "export";
});

function close() {
  cleanupPrintRoot();
  emit("close");
}
</script>

<template>
  <div class="backdrop" @mousedown.self="close">
    <div class="dialog">
      <header class="head">
        <div class="ht">
          <h3>打印标签</h3>
          <p>{{ design.doc.name }} · {{ paper.width }}×{{ paper.height }} mm · {{ paper.dpi }} dpi</p>
        </div>
        <button class="btn ghost icon" @click="close"><Icon name="x" :size="16" /></button>
      </header>

      <div class="content">
        <div class="left">
          <div class="seg modes">
            <button :class="{ on: mode === 'label' }" @click="mode = 'label'">标签机直打</button>
            <button :class="{ on: mode === 'system' }" @click="mode = 'system'">系统打印</button>
            <button :class="{ on: mode === 'export' }" @click="mode = 'export'">导出图片</button>
          </div>

          <div v-if="mode === 'label'" class="mode-note">
            <Icon name="bolt" :size="13" />
            <span>把模板转成打印机原生指令（ZPL / TSPL），走 RAW 通道直出，速度最快、位置最准。</span>
          </div>
          <div v-else-if="mode === 'system'" class="mode-note">
            <Icon name="printer" :size="13" />
            <span>按图片送到系统打印队列，纸张会设为标签实际尺寸（不缩放），适合普通打印机或虚拟 PDF 打印机。</span>
          </div>
          <div v-else class="mode-note">
            <Icon name="download" :size="13" />
            <span>导出 {{ paper.dpi }} dpi 的 PNG，可直接发工厂或插进文档。</span>
          </div>

          <label class="fld">
            <span>打印机</span>
            <select v-model="printer" class="input">
              <option value="">自动 / 系统默认</option>
              <option v-for="p in (mode === 'label' ? (labelPrinters.length ? labelPrinters : settings.printers) : settings.printers)"
                :key="p.name" :value="p.name">{{ p.displayName }}</option>
            </select>
          </label>

          <div v-if="!settings.desktop" class="tip warn">
            <Icon name="alert" :size="13" />
            <span>当前在浏览器中预览，未连接桌面端。可以导出图片，标签直打请在桌面应用里操作。</span>
          </div>
          <div v-else-if="!settings.printers.length" class="tip warn">
            <Icon name="alert" :size="13" />
            <span>没有检测到打印机，请先在系统中安装标签机驱动。</span>
          </div>
          <div v-else-if="mode === 'label' && printer && !printerLooksLabel" class="tip warn">
            <Icon name="alert" :size="13" />
            <span>「{{ printer }}」看起来不是标签机。直接发 RAW 指令可能没有输出，可以改用「系统打印」或先「导出图片」。</span>
          </div>

          <div class="row">
            <label class="fld grow">
              <span>标签尺寸 <i class="mini">不缩放</i></span>
              <SizeSelect />
            </label>
            <label class="fld copies">
              <span>份数</span>
              <div class="stepper">
                <button @click="copies = Math.max(1, copies - 1)">−</button>
                <input v-model.number="copies" class="tnum" type="number" min="1" max="999" />
                <button @click="copies = Math.min(999, copies + 1)">+</button>
              </div>
            </label>
          </div>

          <label v-if="data.rows.length > 1" class="fld">
            <span>数据范围</span>
            <button class="btn" :class="{ on: allRows }" @click="allRows = !allRows">
              {{ allRows ? `全部 ${data.rows.length} 条` : "仅当前 1 条" }}
            </button>
          </label>

          <button class="adv-toggle" @click="advanced = !advanced">
            <Icon :name="advanced ? 'chevronDown' : 'chevronRight'" :size="12" />
            高级参数（浓度 / 速度 / 偏移）
          </button>
          <div v-if="advanced" class="adv">
            <label class="fld"><span>浓度 {{ density }}</span>
              <input v-model.number="density" class="range" type="range" min="0" max="15" /></label>
            <label class="fld"><span>速度 {{ speed }}</span>
              <input v-model.number="speed" class="range" type="range" min="1" max="14" /></label>
            <label class="fld"><span>纵向偏移 {{ offset }} mm</span>
              <input v-model.number="offset" class="range" type="range" min="-5" max="5" step="0.5" /></label>
          </div>

          <div v-if="error" class="err"><Icon name="alert" :size="13" /><span>{{ error }}</span></div>
        </div>

        <div class="right">
          <div class="pv-head">
            <span class="eyebrow">打印预览</span>
            <span class="pv-meta tnum">1 : 1 比例渲染</span>
          </div>
          <div class="pv">
            <LabelCanvas
              ref="stage"
              :doc="design.doc"
              :values="data.previewValues"
              :px-per-mm="previewScale"
            />
          </div>
          <div class="pv-foot tnum">
            {{ paper.width }} × {{ paper.height }} mm
            <i />
            {{ paper.dpi }} dpi
            <i />
            {{ copies * jobCount }} 张
          </div>
        </div>
      </div>

      <footer class="foot">
        <button class="btn ghost" @click="exportZpl" :disabled="busy">
          <Icon name="download" :size="13" /> 导出 ZPL
        </button>
        <div class="spacer" />
        <button class="btn" @click="close">取消</button>
        <button class="btn primary" :disabled="busy" @click="run">
          <Icon :name="mode === 'export' ? 'download' : 'printer'" :size="14" />
          {{ busy ? "处理中…" : mode === "export" ? "导出 PNG" : "开始打印" }}
        </button>
      </footer>
    </div>
  </div>
</template>

<style scoped>
.backdrop {
  position: fixed;
  inset: 0;
  background: rgba(14, 17, 22, 0.42);
  backdrop-filter: blur(3px);
  z-index: 200;
  display: grid;
  place-items: center;
  animation: fade 0.14s ease;
}
@keyframes fade { from { opacity: 0; } }
.dialog {
  width: 820px;
  max-width: calc(100vw - 60px);
  max-height: calc(100vh - 60px);
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
.ht h3 { margin: 0; font-size: 15px; font-weight: 650; letter-spacing: -0.01em; }
.ht p { margin: 2px 0 0; font-size: 11px; color: var(--ink-4); }
.head .btn { margin-left: auto; }
.content { display: flex; min-height: 0; flex: 1; }
.left { width: 400px; flex: none; padding: 16px 18px; display: flex; flex-direction: column; gap: 10px; overflow: auto; }
.right {
  flex: 1;
  background: var(--bg);
  border-left: 1px solid var(--line);
  padding: 14px;
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.modes { margin-bottom: 2px; }
.modes button { height: 28px; font-size: 12px; }
.mode-note {
  display: flex;
  gap: 6px;
  padding: 8px 10px;
  border-radius: var(--r-md);
  background: var(--surface-2);
  border: 1px solid var(--line);
  font-size: 11px;
  line-height: 1.55;
  color: var(--ink-3);
}
.mode-note :deep(svg) { margin-top: 1px; color: var(--ink-4); }
.row { display: flex; gap: 10px; }
.row > .fld { flex: 1; }
.row > .grow { flex: 1 1 auto; min-width: 0; }
.row > .copies { flex: 0 0 132px; }
.mini {
  font-style: normal;
  font-size: 9.5px;
  font-weight: 400;
  color: var(--ink-4);
  border: 1px solid var(--line);
  border-radius: 3px;
  padding: 0 4px;
  margin-left: 3px;
  line-height: 14px;
}
.stepper {
  display: flex;
  height: 30px;
  border: 1px solid var(--line);
  border-radius: var(--r-sm);
  overflow: hidden;
}
.stepper button { width: 30px; background: var(--surface-2); color: var(--ink-2); font-size: 15px; }
.stepper button:hover { background: #eceff3; }
.stepper input {
  flex: 1;
  width: 100%;
  min-width: 0;
  border: none;
  text-align: center;
  font-size: 12.5px;
  -moz-appearance: textfield;
}
.stepper input::-webkit-outer-spin-button, .stepper input::-webkit-inner-spin-button { -webkit-appearance: none; }
.btn.on { background: var(--accent-soft); border-color: var(--accent-line); color: var(--accent-ink); }
.adv-toggle {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  color: var(--ink-3);
  padding: 2px 0;
  width: fit-content;
}
.adv-toggle:hover { color: var(--ink); }
.adv { display: flex; flex-direction: column; gap: 8px; padding: 10px; background: var(--surface-2); border-radius: var(--r-md); border: 1px solid var(--line); }
.range { width: 100%; accent-color: var(--accent); }
.err { display: flex; gap: 6px; padding: 8px 10px; border-radius: var(--r-sm); background: var(--danger-soft); color: #a32a2a; font-size: 11.5px; }
.pv-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
.pv-meta { font-size: 10px; color: var(--ink-4); }
.pv {
  flex: 1;
  display: grid;
  place-items: center;
  background: #fff;
  border: 1px solid var(--line);
  border-radius: var(--r-md);
  overflow: auto;
  padding: 12px;
}
.pv :deep(canvas) { box-shadow: 0 6px 20px -8px rgba(20, 30, 50, 0.28); border-radius: 2px; }
.pv-foot { display: flex; align-items: center; justify-content: center; gap: 7px; font-size: 10.5px; color: var(--ink-4); padding-top: 10px; }
.pv-foot i { width: 2.5px; height: 2.5px; border-radius: 50%; background: #d2d7de; }
.foot { display: flex; align-items: center; gap: 8px; padding: 12px 16px; border-top: 1px solid var(--line); background: var(--surface-2); }
.spacer { flex: 1; }
</style>
