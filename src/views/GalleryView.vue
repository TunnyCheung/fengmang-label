<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { useDesigner } from "@/stores/designer";
import { useSettings } from "@/stores/settings";
import { useUi } from "@/stores/ui";
import { CATEGORY_LABEL, CATEGORY_ORDER, clone } from "@/core/template";
import { TEMPLATES } from "@/templates";
import type { Category, TemplateDoc } from "@/types";
import AppRail from "@/components/layout/AppRail.vue";
import WindowControls from "@/components/layout/WindowControls.vue";
import Icon from "@/components/ui/Icon.vue";
import LabelCanvas from "@/components/canvas/LabelCanvas.vue";

const design = useDesigner();
const settings = useSettings();
const ui = useUi();

const tab = ref<"templates" | "library">("templates");
const cat = ref<Category | "all">("all");
const q = ref("");
const searchRef = ref<HTMLInputElement | null>(null);

const all = computed(() => (tab.value === "library" ? design.library : TEMPLATES));

const list = computed(() => {
  const kw = q.value.trim().toLowerCase();
  return all.value.filter((t) => {
    if (cat.value !== "all" && t.category !== cat.value) return false;
    if (!kw) return true;
    return (
      t.name.toLowerCase().includes(kw) ||
      (t.desc ?? "").toLowerCase().includes(kw) ||
      t.variables.some((v) => v.label.toLowerCase().includes(kw) || v.key.toLowerCase().includes(kw))
    );
  });
});

const counts = computed(() => {
  const map: Record<string, number> = { all: all.value.length };
  for (const t of all.value) map[t.category] = (map[t.category] ?? 0) + 1;
  return map;
});

function use(t: TemplateDoc) {
  design.open(clone(t));
  ui.toast(`已应用「${t.name}」，双击文字即可修改`, "ok");
}

function blank() {
  design.openBlank();
  ui.toast("已新建空白标签，左侧添加元素开始设计");
}

const PREVIEW_W = 210;
const PREVIEW_H = 148;
function scale(t: TemplateDoc) {
  return Math.min(PREVIEW_W / t.paper.width, PREVIEW_H / t.paper.height);
}
function previewValues(t: TemplateDoc) {
  const out: Record<string, string> = {};
  for (const v of t.variables) out[v.key] = v.kind === "sequence" ? v.sample : v.sample;
  return out;
}

const hero = computed(() => TEMPLATES.filter((t) => ["tpl_waybill_100x150", "tpl_bin_60x40", "tpl_price_40x30"].includes(t.id)));
const heroScale = (t: TemplateDoc) =>
  t.paper.height >= 100 ? 1 : t.paper.width >= 50 ? 1.55 : 2.2;

function onKey(e: KeyboardEvent) {
  const el = e.target as HTMLElement | null;
  const typing = el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA");
  if (e.key === "/" && !typing) {
    e.preventDefault();
    searchRef.value?.focus();
  }
}
onMounted(() => window.addEventListener("keydown", onKey));
onBeforeUnmount(() => window.removeEventListener("keydown", onKey));
</script>

<template>
  <div class="gallery">
    <AppRail :tab="tab" @tab="tab = $event; cat = 'all'" />

    <main class="main">
      <header class="topbar" :class="{ 'has-controls': settings.desktop }">
        <div class="title">
          <h1>锋芒标签打印</h1>
          <span class="tag">FENGMANG LABEL</span>
        </div>
        <div class="spacer" />
        <div class="search">
          <Icon name="search" :size="14" />
          <input ref="searchRef" v-model="q" placeholder="搜索模板、字段……" spellcheck="false" />
          <kbd v-if="!q">/</kbd>
          <button v-else class="clr" @click="q = ''"><Icon name="x" :size="12" /></button>
        </div>
        <button class="btn" @click="ui.helpOpen = true">
          <Icon name="info" :size="14" /> 使用说明
        </button>
        <button class="btn primary" @click="blank">
          <Icon name="plus" :size="14" /> 空白标签
        </button>
        <WindowControls />
      </header>

      <div class="scroll">
        <section v-if="tab === 'templates'" class="hero">
          <div class="hero-copy">
            <div class="eyebrow">从模板开始</div>
            <h2>选一个模板，改几个字就能打印</h2>
            <p>
              覆盖物流、仓储、零售、食品、办公、工业六类场景。所有版式都可以自由修改，
              尺寸、字段、排版随你调整，改完直接出标签。
            </p>
            <div class="hero-facts">
              <span><b>{{ TEMPLATES.length }}</b> 套模板</span>
              <i />
              <span><b>6</b> 类场景</span>
              <i />
              <span>无需联网 · 本地保存</span>
            </div>
            <div class="hero-batch">
              <Icon name="table" :size="13" />
              <span><b>支持批量</b>：CSV / Excel 粘贴导入 → 映射字段 → 按份数批量打印</span>
            </div>
          </div>
          <div class="hero-art" aria-hidden="true">
            <div v-for="(t, i) in hero" :key="t.id" class="float" :class="`f${i}`">
              <LabelCanvas
                :doc="t"
                :values="previewValues(t)"
                :px-per-mm="heroScale(t)"
              />
            </div>
          </div>
        </section>

        <div class="filters">
          <div class="chips">
            <button
              class="chip"
              :class="{ on: cat === 'all' }"
              @click="cat = 'all'"
            >全部 <span>{{ counts.all }}</span></button>
            <button
              v-for="c in CATEGORY_ORDER"
              :key="c"
              class="chip"
              :class="{ on: cat === c }"
              @click="cat = c"
            >{{ CATEGORY_LABEL[c] }} <span>{{ counts[c] ?? 0 }}</span></button>
          </div>
          <div class="count">{{ list.length }} 个模板</div>
        </div>

        <div v-if="list.length" class="grid">
          <button v-for="t in list" :key="t.id" class="card" @click="use(t)">
            <div class="preview">
              <LabelCanvas :doc="t" :values="previewValues(t)" :px-per-mm="scale(t)" />
              <div class="cat">{{ CATEGORY_LABEL[t.category] }}</div>
              <div class="use">使用此模板 <Icon name="arrowRight" :size="13" /></div>
            </div>
            <div class="meta">
              <div class="name">{{ t.name }}</div>
              <div class="desc">{{ t.desc }}</div>
              <div class="spec tnum">
                {{ t.paper.width }} × {{ t.paper.height }} mm
                <span class="dot" />
                {{ t.variables.length }} 个字段
                <span class="dot" />
                {{ t.elements.length }} 个元素
              </div>
            </div>
          </button>
        </div>

        <div v-else class="empty">
          <div class="empty-ic"><Icon name="folder" :size="26" /></div>
          <h3>{{ tab === "library" ? "还没有保存过标签" : "没有匹配的模板" }}</h3>
          <p v-if="tab === 'library'">在设计器里点「保存」，就会出现在这里，方便下次直接套用。</p>
          <p v-else>换个关键词，或者从「空白标签」开始自己画。</p>
          <button v-if="tab === 'library'" class="btn primary" @click="blank">新建标签</button>
          <button v-else class="btn" @click="q = ''; cat = 'all'">清空筛选</button>
        </div>

        <footer class="foot">
          <span>模板为本地内置，点击即可套用</span>
          <i />
          <span>打印支持 ZPL / TSPL 标签机与系统打印</span>
          <i />
          <span>v0.1</span>
        </footer>
      </div>
    </main>
  </div>
</template>

<style scoped>
.gallery { display: flex; height: 100%; background: var(--surface); }
.main { flex: 1; min-width: 0; display: flex; flex-direction: column; }

.topbar {
  height: 58px;
  flex: none;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 0 0 22px;
  border-bottom: 1px solid var(--line);
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(10px);
  -webkit-app-region: drag;
}
.topbar :deep(button),
.topbar :deep(input),
.topbar :deep(select),
.topbar .search { -webkit-app-region: no-drag; }
.topbar:not(.has-controls) { padding-right: 22px; }
.title { display: flex; align-items: baseline; gap: 8px; }
.title h1 { font-size: 15px; font-weight: 650; letter-spacing: -0.01em; margin: 0; }
.tag {
  font-size: 9.5px;
  font-weight: 600;
  letter-spacing: 0.08em;
  color: var(--ink-4);
  text-transform: uppercase;
}
.spacer { flex: 1; }
.search {
  display: flex;
  align-items: center;
  gap: 7px;
  width: 268px;
  height: 30px;
  padding: 0 8px 0 9px;
  border: 1px solid var(--line);
  border-radius: var(--r-md);
  color: var(--ink-3);
  background: var(--surface-2);
  transition: border-color 0.12s, box-shadow 0.12s, background 0.12s;
}
.search:focus-within {
  border-color: var(--accent);
  background: #fff;
  box-shadow: 0 0 0 3px var(--accent-soft);
}
.search input {
  flex: 1;
  min-width: 0;
  border: none;
  background: none;
  font-size: 12.5px;
  color: var(--ink);
}
.search input::placeholder { color: var(--ink-4); }
.search kbd {
  font-family: var(--mono);
  font-size: 9.5px;
  color: var(--ink-4);
  border: 1px solid var(--line);
  border-bottom-width: 2px;
  border-radius: 4px;
  padding: 0 4px;
  line-height: 14px;
  background: #fff;
}
.clr { color: var(--ink-4); display: flex; padding: 2px; border-radius: 4px; }
.clr:hover { background: #eceff3; color: var(--ink-2); }

.scroll { flex: 1; overflow: auto; padding: 0 22px 30px; }

.hero {
  position: relative;
  display: flex;
  align-items: center;
  gap: 30px;
  margin: 18px 0 6px;
  padding: 22px 26px;
  border-radius: var(--r-xl);
  background:
    radial-gradient(120% 140% at 100% 0%, #eaf0ff 0%, rgba(234, 240, 255, 0) 55%),
    linear-gradient(180deg, #fbfcfe, #f7f9fc);
  border: 1px solid #e8ecf2;
  overflow: hidden;
  min-height: 174px;
}
.hero-copy { position: relative; z-index: 2; max-width: 520px; }
.hero-copy h2 {
  margin: 6px 0 8px;
  font-size: 22px;
  line-height: 1.25;
  font-weight: 680;
  letter-spacing: -0.02em;
}
.hero-copy p { margin: 0; font-size: 12.5px; line-height: 1.65; color: var(--ink-3); max-width: 460px; }
.hero-facts {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 14px;
  font-size: 11.5px;
  color: var(--ink-3);
}
.hero-facts b { color: var(--ink); font-weight: 650; font-variant-numeric: tabular-nums; }
.hero-facts i { width: 3px; height: 3px; border-radius: 50%; background: #c9ced6; }
.hero-batch {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-top: 12px;
  padding: 4px 9px 4px 7px;
  border-radius: 6px;
  background: var(--accent-soft);
  border: 1px solid var(--accent-line);
  color: var(--accent-ink);
  font-size: 11px;
}
.hero-batch b { font-weight: 650; }

.hero-art {
  position: absolute;
  right: 14px;
  top: 50%;
  width: 300px;
  height: 190px;
  transform: translateY(-50%);
  pointer-events: none;
}
.float {
  position: absolute;
  background: #fff;
  border-radius: 3px;
  box-shadow: 0 16px 30px -14px rgba(20, 30, 50, 0.35), 0 2px 6px rgba(20, 30, 50, 0.08);
  overflow: hidden;
  outline: 1px solid rgba(0, 0, 0, 0.05);
}
.float :deep(canvas) { display: block; }
.float.f0 { left: 0; top: 14px; transform: rotate(-7deg); }
.float.f1 { left: 104px; top: 66px; transform: rotate(3deg); z-index: 2; }
.float.f2 { left: 188px; top: 24px; transform: rotate(8deg); }

.filters {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 20px 0 14px;
}
.chips { display: flex; flex-wrap: wrap; gap: 6px; flex: 1; }
.chip {
  height: 27px;
  padding: 0 10px;
  border-radius: 999px;
  border: 1px solid var(--line);
  background: #fff;
  color: var(--ink-2);
  font-size: 11.5px;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  transition: all 0.12s;
}
.chip span { color: var(--ink-4); font-size: 10px; font-variant-numeric: tabular-nums; }
.chip:hover { border-color: var(--line-2); background: var(--surface-2); }
.chip.on {
  background: var(--ink);
  border-color: var(--ink);
  color: #fff;
}
.chip.on span { color: rgba(255, 255, 255, 0.55); }
.count { font-size: 11px; color: var(--ink-4); white-space: nowrap; }

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(248px, 1fr));
  gap: 14px;
}
.card {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  text-align: left;
  border: 1px solid var(--line);
  border-radius: var(--r-lg);
  background: #fff;
  overflow: hidden;
  transition: transform 0.16s cubic-bezier(0.2, 0.9, 0.3, 1), box-shadow 0.16s, border-color 0.16s;
}
.card:hover {
  transform: translateY(-2px);
  border-color: #cfd8e6;
  box-shadow: 0 14px 30px -16px rgba(20, 30, 50, 0.3), 0 2px 8px rgba(20, 30, 50, 0.04);
}
.preview {
  position: relative;
  height: 190px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 14px;
  background:
    linear-gradient(0deg, rgba(0, 0, 0, 0.012), rgba(0, 0, 0, 0.012)),
    repeating-conic-gradient(#f4f5f7 0 25%, #eef0f3 0 50%) 0 0 / 12px 12px;
  border-bottom: 1px solid var(--line);
}
.preview :deep(canvas) {
  flex: none;
  margin: auto;
  box-shadow: 0 5px 16px -5px rgba(20, 30, 50, 0.26);
  border-radius: 2px;
}
.cat {
  position: absolute;
  left: 9px;
  top: 9px;
  padding: 2px 7px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.92);
  border: 1px solid rgba(0, 0, 0, 0.06);
  font-size: 10px;
  color: var(--ink-2);
  backdrop-filter: blur(6px);
}
.use {
  position: absolute;
  right: 9px;
  bottom: 9px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 9px;
  border-radius: 999px;
  background: var(--ink);
  color: #fff;
  font-size: 10.5px;
  opacity: 0;
  transform: translateY(4px);
  transition: all 0.16s;
}
.card:hover .use { opacity: 1; transform: none; }

.meta { padding: 10px 12px 11px; }
.name { font-size: 13px; font-weight: 600; letter-spacing: -0.01em; }
.desc {
  margin-top: 2px;
  font-size: 11px;
  color: var(--ink-3);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.spec {
  margin-top: 7px;
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 10.5px;
  color: var(--ink-4);
}
.dot { width: 2.5px; height: 2.5px; border-radius: 50%; background: #ccd2da; }

.empty {
  padding: 70px 0;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}
.empty-ic {
  width: 52px;
  height: 52px;
  border-radius: 15px;
  display: grid;
  place-items: center;
  background: var(--surface-2);
  border: 1px solid var(--line);
  color: var(--ink-4);
  margin-bottom: 8px;
}
.empty h3 { margin: 0; font-size: 14px; font-weight: 600; }
.empty p { margin: 0 0 12px; font-size: 12px; color: var(--ink-3); }

.foot {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 34px 0 6px;
  font-size: 10.5px;
  color: var(--ink-4);
}
.foot i { width: 2.5px; height: 2.5px; border-radius: 50%; background: #d2d7de; }
</style>
