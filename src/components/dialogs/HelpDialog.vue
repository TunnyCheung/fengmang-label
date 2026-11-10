<script setup lang="ts">
import { onBeforeUnmount, onMounted } from "vue";
import Icon from "@/components/ui/Icon.vue";

const emit = defineEmits<{ close: [] }>();

function onKey(e: KeyboardEvent) {
  if (e.key === "Escape") emit("close");
}
onMounted(() => window.addEventListener("keydown", onKey));
onBeforeUnmount(() => window.removeEventListener("keydown", onKey));

const shortcuts = [
  ["Ctrl / ⌘ + Z", "撤销"],
  ["Ctrl / ⌘ + Shift + Z", "重做"],
  ["Ctrl / ⌘ + D", "复制选中元素"],
  ["Ctrl / ⌘ + A", "全选"],
  ["Ctrl / ⌘ + S", "保存到我的模板"],
  ["Ctrl / ⌘ + P", "打印"],
  ["Delete", "删除选中"],
  ["方向键", "微调 0.5 mm（Shift 为 2 mm）"],
  ["Shift + 点击", "多选"],
  ["按住空白拖动", "框选"],
  ["双击文字", "直接编辑内容"],
];
</script>

<template>
  <div class="backdrop" @mousedown.self="$emit('close')">
    <div class="dialog">
      <header class="head">
        <div>
          <h3>三步做出一张标签</h3>
          <p>不用懂排版，也不用装驱动以外的任何东西</p>
        </div>
        <button class="btn ghost icon" @click="$emit('close')"><Icon name="x" :size="16" /></button>
      </header>

      <div class="steps">
        <div class="step">
          <span class="no">1</span>
          <b>选模板</b>
          <p>在模板库里点一张最接近的，直接套用。尺寸、颜色、字段都能改。</p>
        </div>
        <div class="step">
          <span class="no">2</span>
          <b>改内容</b>
          <p>双击画布上的文字直接改；也可以在「数据」里改示例值，或导入 CSV 批量套。</p>
        </div>
        <div class="step">
          <span class="no">3</span>
          <b>打印</b>
          <p>选标签机直打（ZPL / TSPL），或走系统打印；没有设备时先导出 PNG 看效果。</p>
        </div>
      </div>

      <div class="grid">
        <section>
          <div class="sec-title">快捷键</div>
          <div class="keys">
            <div v-for="[k, v] in shortcuts" :key="k" class="key-row">
              <kbd>{{ k }}</kbd>
              <span>{{ v }}</span>
            </div>
          </div>
        </section>
        <section>
          <div class="sec-title">常见问题</div>
          <div class="faq">
            <details open>
              <summary>打印出来位置偏了？</summary>
              <p>先在打印对话框的「高级参数」里调纵向偏移（一般 ±1–2 mm），再用打印机自带的测纸功能校准一次。</p>
            </details>
            <details>
              <summary>中文显示成方块？</summary>
              <p>本应用把文字转成位图发送，不依赖打印机字库，正常情况下不会出现方块。如果仍然异常，检查是否选了「系统打印」且驱动缺少中文字体。</p>
            </details>
            <details>
              <summary>怎么批量打一百张？</summary>
              <p>在「数据」里导入 CSV，首行是字段名，然后打印时勾选「全部数据」，软件会逐行生成标签。</p>
            </details>
            <details>
              <summary>支持哪些打印机？</summary>
              <p>ZPL（Zebra 系）、TSPL（TSC、佳博、汉印、得力、芯烨等）；其他机型可以用系统打印按图片输出。</p>
            </details>
          </div>
        </section>
      </div>

      <footer class="foot">
        <span>提示：按 <kbd>Ctrl</kbd> + <kbd>P</kbd> 随时打印</span>
        <button class="btn primary" @click="$emit('close')">开始使用</button>
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
  z-index: 210;
  display: grid;
  place-items: center;
}
.dialog {
  width: 760px;
  max-width: calc(100vw - 60px);
  max-height: calc(100vh - 60px);
  overflow: auto;
  background: var(--surface);
  border-radius: var(--r-xl);
  box-shadow: var(--sh-pop);
}
.head { display: flex; align-items: flex-start; padding: 20px 20px 4px; }
.head h3 { margin: 0; font-size: 17px; font-weight: 650; letter-spacing: -0.02em; }
.head p { margin: 3px 0 0; font-size: 12px; color: var(--ink-3); }
.head .btn { margin-left: auto; }
.steps { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; padding: 16px 20px 4px; }
.step { padding: 12px; border: 1px solid var(--line); border-radius: var(--r-md); background: var(--surface-2); }
.no {
  display: inline-grid;
  place-items: center;
  width: 20px;
  height: 20px;
  border-radius: 6px;
  background: var(--ink);
  color: #fff;
  font-size: 10.5px;
  font-weight: 600;
  margin-bottom: 8px;
}
.step b { display: block; font-size: 12.5px; }
.step p { margin: 3px 0 0; font-size: 11px; line-height: 1.6; color: var(--ink-3); }
.grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; padding: 16px 20px 4px; }
.sec-title { font-size: 10px; font-weight: 600; letter-spacing: 0.07em; text-transform: uppercase; color: var(--ink-4); margin-bottom: 8px; }
.keys { display: flex; flex-direction: column; gap: 5px; }
.key-row { display: flex; align-items: center; justify-content: space-between; gap: 10px; font-size: 11.5px; color: var(--ink-2); }
kbd {
  font-family: var(--mono);
  font-size: 10px;
  border: 1px solid var(--line);
  border-bottom-width: 2px;
  border-radius: 4px;
  padding: 1px 5px;
  background: var(--surface-2);
  white-space: nowrap;
}
.faq details { border-bottom: 1px solid var(--line); padding: 7px 0; }
.faq details:last-child { border-bottom: none; }
.faq summary { font-size: 11.5px; font-weight: 500; cursor: pointer; color: var(--ink-2); }
.faq p { margin: 5px 0 2px; font-size: 11px; line-height: 1.65; color: var(--ink-3); }
.foot { display: flex; align-items: center; justify-content: space-between; padding: 14px 20px; border-top: 1px solid var(--line); margin-top: 14px; background: var(--surface-2); }
.foot span { font-size: 11px; color: var(--ink-4); }
.foot kbd { margin: 0 2px; }
</style>
