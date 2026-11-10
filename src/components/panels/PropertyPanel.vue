<script setup lang="ts">
import { computed, ref } from "vue";
import { useDesigner } from "@/stores/designer";
import { elementLabel } from "@/core/template";
import type {
  BarcodeElement,
  ImageElement,
  LabelElement,
  LineElement,
  QrElement,
  RectElement,
  TableElement,
  TextElement,
} from "@/types";
import Icon from "@/components/ui/Icon.vue";
import SizeSelect from "@/components/ui/SizeSelect.vue";

const design = useDesigner();
const fileRef = ref<HTMLInputElement | null>(null);

const el = computed(() => design.single);
const typeName = computed(() => {
  const t = el.value?.type;
  return (
    { text: "文字", barcode: "条码", qrcode: "二维码", image: "图片", rect: "矩形", line: "线条", table: "表格" } as Record<
      string,
      string
    >
  )[t ?? ""] ?? "";
});

function up(patch: Partial<LabelElement>, key?: string) {
  if (!el.value) return;
  design.update(el.value.id, patch, key);
}
const num = (e: Event) => Number((e.target as HTMLInputElement).value);
const str = (e: Event) => (e.target as HTMLInputElement).value;

const fonts = [
  "Microsoft YaHei",
  "SimHei",
  "SimSun",
  "KaiTi",
  "Consolas",
  "Arial",
  "Impact",
  "Georgia",
];

async function pickImage() {
  const f = fileRef.value?.files?.[0];
  if (!f) return;
  const reader = new FileReader();
  reader.onload = () => up({ src: String(reader.result) } as Partial<ImageElement>);
  reader.readAsDataURL(f);
  fileRef.value!.value = "";
}

function insertVar(key: string) {
  if (!el.value || el.value.type !== "text") return;
  const t = el.value as TextElement;
  design.update(t.id, { text: `${t.text}{{${key}}}` }, "insert-var");
}

const tableEl = computed(() => (el.value?.type === "table" ? (el.value as TableElement) : null));
const overflowCount = computed(() => {
  const W = design.doc.paper.width;
  const H = design.doc.paper.height;
  return design.doc.elements.filter(
    (e) => !e.hidden && (e.x + e.w > W + 0.05 || e.y + e.h > H + 0.05),
  ).length;
});
function patchCol(i: number, patch: Partial<{ title: string; field: string; width: number }>) {
  const t = tableEl.value;
  if (!t) return;
  const cols = t.columns.map((c, idx) => (idx === i ? { ...c, ...patch } : c));
  up({ columns: cols } as Partial<TableElement>);
}
</script>

<template>
  <aside class="panel">
    <header class="head">
      <template v-if="el">
        <span class="badge">{{ typeName }}</span>
        <span class="ttl">{{ elementLabel(el) }}</span>
        <button class="btn ghost sm icon" title="复制 Ctrl+D" @click="design.duplicate()">
          <Icon name="copy" :size="13" />
        </button>
        <button class="btn ghost sm icon danger" title="删除 Delete" @click="design.remove()">
          <Icon name="trash" :size="13" />
        </button>
      </template>
      <template v-else>
        <span class="badge alt">画布</span>
        <span class="ttl">标签与纸张</span>
      </template>
    </header>

    <div class="body">
      <template v-if="!el">
        <section>
          <div class="sec-title">标签尺寸</div>
          <label class="fld" style="margin-bottom: 7px">
            <span>常用尺寸</span>
            <SizeSelect />
          </label>
          <div class="grid2">
            <label class="fld"><span>宽度 mm</span>
              <input class="input tnum" type="number" step="0.5" :value="design.doc.paper.width"
                @change="design.updatePaper({ width: Math.max(10, num($event)) }, 'pw')" /></label>
            <label class="fld"><span>高度 mm</span>
              <input class="input tnum" type="number" step="0.5" :value="design.doc.paper.height"
                @change="design.updatePaper({ height: Math.max(5, num($event)) }, 'ph')" /></label>
            <label class="fld"><span>间隙 mm</span>
              <input class="input tnum" type="number" step="0.5" :value="design.doc.paper.gap"
                @change="design.updatePaper({ gap: Math.max(0, num($event)) }, 'gap')" /></label>
            <label class="fld"><span>分辨率</span>
              <select class="input" :value="design.doc.paper.dpi"
                @change="design.updatePaper({ dpi: num($event) })">
                <option :value="203">203 dpi</option>
                <option :value="300">300 dpi</option>
                <option :value="600">600 dpi</option>
              </select></label>
          </div>
          <div v-if="overflowCount" class="tip warn" style="margin-top: 8px">
            <Icon name="alert" :size="13" />
            <span>有 {{ overflowCount }} 个元素超出纸张，打印时会被裁切。可调大尺寸或移动元素。</span>
          </div>
          <label class="check">
            <input type="checkbox" :checked="design.doc.paper.continuous"
              @change="design.updatePaper({ continuous: ($event.target as HTMLInputElement).checked })" />
            <span>连续纸（不定位间隙）</span>
          </label>
        </section>

        <section>
          <div class="sec-title">外观</div>
          <label class="fld"><span>底色</span>
            <div class="color">
              <input type="color" :value="design.doc.paper.background"
                @input="design.updatePaper({ background: str($event) }, 'bg')" />
              <input class="input mono" :value="design.doc.paper.background"
                @change="design.updatePaper({ background: str($event) }, 'bg')" />
            </div>
          </label>
        </section>

        <section>
          <div class="sec-title">打印</div>
          <label class="fld"><span>标签指令</span>
            <select class="input" :value="design.doc.print.language"
              @change="design.mutate(() => (design.doc.print.language = ($event.target as HTMLSelectElement).value as any))">
              <option value="auto">自动识别打印机</option>
              <option value="zpl">ZPL（Zebra 系）</option>
              <option value="tspl">TSPL（TSC / 佳博系）</option>
            </select>
          </label>
          <div class="grid2">
            <label class="fld"><span>浓度 0–15</span>
              <input class="input tnum" type="number" min="0" max="15" :value="design.doc.print.density"
                @change="design.mutate(() => (design.doc.print.density = num($event)))" /></label>
            <label class="fld"><span>速度 1–14</span>
              <input class="input tnum" type="number" min="1" max="14" :value="design.doc.print.speed"
                @change="design.mutate(() => (design.doc.print.speed = num($event)))" /></label>
          </div>
        </section>

        <div class="tip">
          <Icon name="info" :size="13" />
          <span>选中画布上的元素，可在这里改内容、字体和位置。</span>
        </div>
      </template>

      <template v-else>
        <section>
          <div class="sec-title">位置与尺寸</div>
          <div class="grid2">
            <label class="fld"><span>X (mm)</span>
              <input class="input tnum" type="number" step="0.5" :value="el.x" @change="up({ x: num($event) }, 'x')" /></label>
            <label class="fld"><span>Y (mm)</span>
              <input class="input tnum" type="number" step="0.5" :value="el.y" @change="up({ y: num($event) }, 'y')" /></label>
            <label class="fld"><span>宽 (mm)</span>
              <input class="input tnum" type="number" step="0.5" min="2" :value="el.w" @change="up({ w: Math.max(2, num($event)) }, 'w')" /></label>
            <label class="fld"><span>高 (mm)</span>
              <input class="input tnum" type="number" step="0.5" min="1" :value="el.h" @change="up({ h: Math.max(1, num($event)) }, 'h')" /></label>
          </div>
          <div class="grid2">
            <label class="fld"><span>旋转 °</span>
              <input class="input tnum" type="number" step="90" :value="el.rotate" @change="up({ rotate: num($event) })" /></label>
            <label class="fld"><span>锁定</span>
              <button class="btn" :class="{ on: el.locked }" @click="up({ locked: !el.locked })">
                <Icon :name="el.locked ? 'lock' : 'unlock'" :size="13" />
                {{ el.locked ? "已锁定" : "未锁定" }}
              </button></label>
          </div>
        </section>

        <!-- TEXT -->
        <section v-if="el.type === 'text'">
          <div class="sec-title">文字内容</div>
          <textarea class="input area" rows="3" :value="(el as TextElement).text"
            @input="up({ text: str($event) } as Partial<TextElement>, 'text')" />
          <div v-if="design.doc.variables.length" class="chips">
            <span class="chips-lb">插入字段</span>
            <button v-for="v in design.doc.variables" :key="v.key" class="chip" @click="insertVar(v.key)">
              + {{ v.label || v.key }}
            </button>
          </div>

          <div class="sec-title">字体</div>
          <label class="fld"><span>字体</span>
            <select class="input" :value="(el as TextElement).fontFamily"
              @change="up({ fontFamily: str($event) } as Partial<TextElement>)">
              <option v-for="f in fonts" :key="f" :value="f">{{ f }}</option>
            </select></label>
          <div class="grid2">
            <label class="fld"><span>字号 pt</span>
              <input class="input tnum" type="number" step="0.5" min="4" max="72" :value="(el as TextElement).fontSize"
                @change="up({ fontSize: Math.min(72, Math.max(4, num($event))) } as Partial<TextElement>, 'fs')" /></label>
            <label class="fld"><span>字重</span>
              <select class="input" :value="(el as TextElement).fontWeight"
                @change="up({ fontWeight: num($event) } as Partial<TextElement>)">
                <option :value="400">常规</option>
                <option :value="500">中等</option>
                <option :value="600">半粗</option>
                <option :value="700">加粗</option>
                <option :value="800">特粗</option>
              </select></label>
          </div>
          <div class="grid2">
            <label class="fld"><span>行距</span>
              <input class="input tnum" type="number" step="0.05" :value="(el as TextElement).lineHeight"
                @change="up({ lineHeight: Math.max(0.8, num($event)) } as Partial<TextElement>, 'lh')" /></label>
            <label class="fld"><span>字间距</span>
              <input class="input tnum" type="number" step="0.05" :value="(el as TextElement).letterSpacing"
                @change="up({ letterSpacing: num($event) } as Partial<TextElement>, 'ls')" /></label>
          </div>
          <div class="grid2">
            <label class="fld"><span>水平对齐</span>
              <div class="seg">
                <button :class="{ on: (el as TextElement).align === 'left' }" @click="up({ align: 'left' } as any)">左</button>
                <button :class="{ on: (el as TextElement).align === 'center' }" @click="up({ align: 'center' } as any)">中</button>
                <button :class="{ on: (el as TextElement).align === 'right' }" @click="up({ align: 'right' } as any)">右</button>
              </div></label>
            <label class="fld"><span>垂直对齐</span>
              <div class="seg">
                <button :class="{ on: (el as TextElement).valign === 'top' }" @click="up({ valign: 'top' } as any)">上</button>
                <button :class="{ on: (el as TextElement).valign === 'middle' }" @click="up({ valign: 'middle' } as any)">中</button>
                <button :class="{ on: (el as TextElement).valign === 'bottom' }" @click="up({ valign: 'bottom' } as any)">下</button>
              </div></label>
          </div>
          <label class="fld"><span>文字颜色</span>
            <div class="color">
              <input type="color" :value="(el as TextElement).color"
                @input="up({ color: str($event) } as Partial<TextElement>, 'c')" />
              <input class="input mono" :value="(el as TextElement).color"
                @change="up({ color: str($event) } as Partial<TextElement>)" />
            </div>
          </label>
          <div class="checks">
            <label class="check"><input type="checkbox" :checked="(el as TextElement).wrap"
              @change="up({ wrap: ($event.target as HTMLInputElement).checked } as any)" /><span>自动换行</span></label>
            <label class="check"><input type="checkbox" :checked="(el as TextElement).underline"
              @change="up({ underline: ($event.target as HTMLInputElement).checked } as any)" /><span>下划线</span></label>
          </div>
        </section>

        <!-- BARCODE -->
        <section v-if="el.type === 'barcode'">
          <div class="sec-title">条码</div>
          <label class="fld"><span>码制</span>
            <select class="input" :value="(el as BarcodeElement).format"
              @change="up({ format: str($event) } as any)">
              <option value="code128">Code 128（通用）</option>
              <option value="ean13">EAN-13（商品）</option>
              <option value="code39">Code 39</option>
              <option value="itf14">ITF-14（箱码）</option>
            </select></label>
          <label class="fld"><span>内容</span>
            <input class="input mono" :value="(el as BarcodeElement).value"
              @input="up({ value: str($event) } as any, 'bv')" /></label>
          <div class="grid2">
            <label class="fld"><span>文字大小 pt</span>
              <input class="input tnum" type="number" step="0.2" :value="(el as BarcodeElement).textSize"
                @change="up({ textSize: num($event) } as any, 'bts')" /></label>
            <label class="fld"><span>显示文字</span>
              <button class="btn" @click="up({ showText: !(el as BarcodeElement).showText } as any)">
                {{ (el as BarcodeElement).showText ? "显示" : "隐藏" }}
              </button></label>
          </div>
          <div class="tip warn"><Icon name="alert" :size="13" /><span>EAN-13 需要 12–13 位数字，位数不符会显示红框。</span></div>
        </section>

        <!-- QR -->
        <section v-if="el.type === 'qrcode'">
          <div class="sec-title">二维码</div>
          <label class="fld"><span>内容</span>
            <textarea class="input area" rows="3" :value="(el as QrElement).value"
              @input="up({ value: str($event) } as any, 'qv')" /></label>
          <div class="grid2">
            <label class="fld"><span>容错级别</span>
              <select class="input" :value="(el as QrElement).level" @change="up({ level: str($event) } as any)">
                <option value="L">L · 7%</option>
                <option value="M">M · 15%</option>
                <option value="Q">Q · 25%</option>
                <option value="H">H · 30%</option>
              </select></label>
            <label class="fld"><span>静区 mm</span>
              <input class="input tnum" type="number" step="0.5" min="0" :value="(el as QrElement).quiet"
                @change="up({ quiet: Math.max(0, num($event)) } as any)" /></label>
          </div>
        </section>

        <!-- IMAGE -->
        <section v-if="el.type === 'image'">
          <div class="sec-title">图片</div>
          <button class="btn" style="width: 100%" @click="fileRef?.click()">
            <Icon name="upload" :size="13" /> {{ (el as ImageElement).src ? "更换图片" : "选择图片" }}
          </button>
          <input ref="fileRef" type="file" accept="image/*" hidden @change="pickImage" />
          <div class="img-prev" v-if="(el as ImageElement).src">
            <img :src="(el as ImageElement).src" alt="preview" />
            <button class="del" @click="up({ src: '' } as any)"><Icon name="trash" :size="12" /></button>
          </div>
          <label class="fld"><span>填充方式</span>
            <select class="input" :value="(el as ImageElement).fit" @change="up({ fit: str($event) } as any)">
              <option value="contain">完整显示</option>
              <option value="cover">裁剪填满</option>
              <option value="stretch">拉伸变形</option>
            </select></label>
          <label class="fld"><span>黑白阈值 {{ (el as ImageElement).threshold }}</span>
            <input type="range" min="60" max="230" :value="(el as ImageElement).threshold"
              @input="up({ threshold: num($event) } as any, 'th')" class="range" /></label>
        </section>

        <!-- RECT -->
        <section v-if="el.type === 'rect'">
          <div class="sec-title">形状</div>
          <label class="fld"><span>填充</span>
            <div class="color">
              <input type="color" :value="(el as RectElement).fill === 'transparent' ? '#ffffff' : (el as RectElement).fill"
                @input="up({ fill: str($event) } as any, 'fill')" />
              <input class="input mono" :value="(el as RectElement).fill"
                @change="up({ fill: str($event) } as any)" />
              <button class="btn sm" @click="up({ fill: 'transparent' } as any)">无</button>
            </div>
          </label>
          <label class="fld"><span>描边</span>
            <div class="color">
              <input type="color" :value="(el as RectElement).stroke"
                @input="up({ stroke: str($event) } as any, 'stroke')" />
              <input class="input mono" :value="(el as RectElement).stroke"
                @change="up({ stroke: str($event) } as any)" />
            </div>
          </label>
          <div class="grid2">
            <label class="fld"><span>描边粗细 mm</span>
              <input class="input tnum" type="number" step="0.1" min="0" :value="(el as RectElement).strokeWidth"
                @change="up({ strokeWidth: Math.max(0, num($event)) } as any, 'sw')" /></label>
            <label class="fld"><span>圆角 mm</span>
              <input class="input tnum" type="number" step="0.5" min="0" :value="(el as RectElement).radius"
                @change="up({ radius: Math.max(0, num($event)) } as any, 'rad')" /></label>
          </div>
          <label class="check"><input type="checkbox" :checked="(el as RectElement).inverted"
            @change="up({ inverted: ($event.target as HTMLInputElement).checked } as any)" /><span>实心黑块（反白文字底）</span></label>
        </section>

        <!-- LINE -->
        <section v-if="el.type === 'line'">
          <div class="sec-title">线条</div>
          <label class="fld"><span>颜色</span>
            <div class="color">
              <input type="color" :value="(el as LineElement).stroke"
                @input="up({ stroke: str($event) } as any, 'lc')" />
              <input class="input mono" :value="(el as LineElement).stroke"
                @change="up({ stroke: str($event) } as any)" />
            </div>
          </label>
          <label class="fld"><span>粗细 mm</span>
            <input class="input tnum" type="number" step="0.1" min="0.1" :value="(el as LineElement).strokeWidth"
              @change="up({ strokeWidth: Math.max(0.1, num($event)) } as any, 'lw')" /></label>
        </section>

        <!-- TABLE -->
        <section v-if="tableEl">
          <div class="sec-title">表格</div>
          <div class="cols">
            <div v-for="(c, i) in tableEl.columns" :key="i" class="col">
              <input class="input sm" :value="c.title" placeholder="表头" @input="patchCol(i, { title: str($event) })" />
              <input class="input sm mono" :value="c.field" placeholder="字段" @input="patchCol(i, { field: str($event) })" />
              <input class="input sm tnum" type="number" :value="c.width" @input="patchCol(i, { width: num($event) })" />
              <button class="del" @click="up({ columns: tableEl.columns.filter((_, idx) => idx !== i) } as any)">
                <Icon name="x" :size="11" />
              </button>
            </div>
            <button class="btn sm" @click="up({ columns: [...tableEl.columns, { title: '新列', field: 'field', width: 30 }] } as any)">
              <Icon name="plus" :size="12" /> 添加列
            </button>
          </div>
          <div class="grid2">
            <label class="fld"><span>数据行数</span>
              <input class="input tnum" type="number" min="1" max="30" :value="tableEl.rows"
                @change="up({ rows: Math.max(1, num($event)) } as any)" /></label>
            <label class="fld"><span>行高 mm</span>
              <input class="input tnum" type="number" step="0.5" :value="tableEl.rowHeight"
                @change="up({ rowHeight: Math.max(2, num($event)) } as any)" /></label>
            <label class="fld"><span>表头高 mm</span>
              <input class="input tnum" type="number" step="0.5" :value="tableEl.headerHeight"
                @change="up({ headerHeight: Math.max(2, num($event)) } as any)" /></label>
            <label class="fld"><span>字号 pt</span>
              <input class="input tnum" type="number" step="0.5" :value="tableEl.fontSize"
                @change="up({ fontSize: num($event) } as any)" /></label>
          </div>
          <label class="fld"><span>数据源字段（数组）</span>
            <input class="input mono" :value="tableEl.source ?? ''" placeholder="如 items"
              @input="up({ source: str($event) } as any, 'src')" /></label>
          <div class="checks">
            <label class="check"><input type="checkbox" :checked="tableEl.striped"
              @change="up({ striped: ($event.target as HTMLInputElement).checked } as any)" /><span>斑马纹</span></label>
          </div>
        </section>
      </template>
    </div>
  </aside>
</template>

<style scoped>
.panel {
  width: var(--right-w);
  flex: none;
  background: var(--surface);
  border-left: 1px solid var(--line);
  display: flex;
  flex-direction: column;
  min-height: 0;
}
.head {
  height: 44px;
  flex: none;
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 0 10px 0 12px;
  border-bottom: 1px solid var(--line);
}
.badge {
  padding: 1px 6px;
  border-radius: 4px;
  background: var(--accent-soft);
  color: var(--accent-ink);
  font-size: 9.5px;
  font-weight: 600;
  letter-spacing: 0.02em;
}
.badge.alt { background: #f0f2f5; color: var(--ink-3); }
.ttl {
  flex: 1;
  font-size: 12.5px;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.body { flex: 1; overflow: auto; padding: 4px 12px 24px; }
section { padding: 12px 0; border-bottom: 1px solid var(--line); }
section:last-of-type { border-bottom: none; }
.sec-title {
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  color: var(--ink-4);
  margin-bottom: 8px;
}
.grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 7px; margin-bottom: 7px; }
.fld { display: flex; flex-direction: column; gap: 4px; }
.fld > span { font-size: 10.5px; color: var(--ink-3); }
.input.tnum { font-variant-numeric: tabular-nums; }
.area { resize: vertical; min-height: 54px; line-height: 1.5; font-size: 12px; }
.checks { display: flex; gap: 12px; margin-top: 6px; }
.check {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11.5px;
  color: var(--ink-2);
  cursor: pointer;
  user-select: none;
  margin-top: 8px;
}
.check input { accent-color: var(--accent); width: 13px; height: 13px; }
.color { display: flex; gap: 5px; align-items: center; }
.color input[type="color"] {
  width: 30px;
  height: 30px;
  padding: 2px;
  border: 1px solid var(--line);
  border-radius: var(--r-sm);
  background: #fff;
  cursor: pointer;
}
.color .input { flex: 1; font-size: 11px; }
.chips { display: flex; flex-wrap: wrap; gap: 4px; align-items: center; margin-top: 6px; }
.chips-lb { font-size: 10px; color: var(--ink-4); }
.chip {
  padding: 2px 7px;
  border-radius: 999px;
  background: var(--surface-2);
  border: 1px solid var(--line);
  font-size: 10px;
  color: var(--ink-2);
}
.chip:hover { border-color: var(--accent-line); color: var(--accent-ink); background: var(--accent-soft); }
.range { width: 100%; accent-color: var(--accent); }
.img-prev { position: relative; margin: 8px 0; border: 1px solid var(--line); border-radius: var(--r-sm); padding: 6px; background: var(--surface-2); }
.img-prev img { display: block; max-width: 100%; max-height: 90px; margin: 0 auto; }
.img-prev .del { position: absolute; top: 4px; right: 4px; background: #fff; border: 1px solid var(--line); border-radius: 4px; padding: 3px; color: var(--ink-3); }
.cols { display: flex; flex-direction: column; gap: 3px; margin-bottom: 8px; }
.col { display: grid; grid-template-columns: 1fr 1fr 46px 20px; gap: 3px; align-items: center; }
.input.sm { height: 25px; font-size: 11px; padding: 0 5px; }
.del { color: var(--ink-4); display: flex; justify-content: center; }
.del:hover { color: var(--danger); }
.btn.on { border-color: var(--accent); color: var(--accent-ink); background: var(--accent-soft); }
.tip { margin-top: 12px; }
</style>
