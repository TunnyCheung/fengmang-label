<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from "vue";
import Icon from "@/components/ui/Icon.vue";

const api = typeof window !== "undefined" ? window.labelcraft?.windowControls : undefined;
const maximized = ref(false);
let off: (() => void) | undefined;

onMounted(async () => {
  if (!api) return;
  const res = await api.isMaximized();
  maximized.value = Boolean(res?.maximized);
  off = api.onMaximizedChange((value) => {
    maximized.value = value;
  });
});

onBeforeUnmount(() => off?.());

function minimize() {
  void api?.minimize();
}

async function toggle() {
  const res = await api?.toggleMaximize();
  if (res) maximized.value = Boolean(res.maximized);
}

function close() {
  void api?.close();
}
</script>

<template>
  <div v-if="api" class="wc">
    <button class="wbtn" title="最小化" @click="minimize">
      <Icon name="minimize" :size="14" :stroke="1.4" />
    </button>
    <button class="wbtn" :title="maximized ? '向下还原' : '最大化'" @click="toggle">
      <Icon :name="maximized ? 'restore' : 'maximize'" :size="13" :stroke="1.4" />
    </button>
    <button class="wbtn close" title="关闭" @click="close">
      <Icon name="x" :size="14" :stroke="1.5" />
    </button>
  </div>
</template>

<style scoped>
.wc {
  display: flex;
  align-self: stretch;
  flex: none;
  margin-left: 10px;
  border-left: 1px solid var(--line);
  -webkit-app-region: no-drag;
}
.wbtn {
  width: 46px;
  height: 100%;
  display: grid;
  place-items: center;
  color: var(--ink-2);
  transition: background 0.1s, color 0.1s;
}
.wbtn:hover { background: #eef0f4; color: var(--ink); }
.wbtn:active { background: #e4e7ec; }
.wbtn.close:hover { background: #e5484d; color: #fff; }
.wbtn.close:active { background: #d13c41; }
</style>
