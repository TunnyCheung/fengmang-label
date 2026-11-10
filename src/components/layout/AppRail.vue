<script setup lang="ts">
import { computed } from "vue";
import { useDesigner } from "@/stores/designer";
import { useUi } from "@/stores/ui";
import Icon from "@/components/ui/Icon.vue";

const design = useDesigner();
const ui = useUi();
const props = defineProps<{ tab: "templates" | "library" }>();

const items = computed(() => [
  { key: "templates", icon: "templates", label: "模板" },
  { key: "library", icon: "folder", label: "我的" },
] as const);
</script>

<template>
  <aside class="rail">
    <div class="brand" title="锋芒标签打印">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <path
          d="M3.6 4.8h8.9l7.1 7.1v6.7a1.6 1.6 0 0 1-1.6 1.6H3.6A1.6 1.6 0 0 1 2 18.6V6.4a1.6 1.6 0 0 1 1.6-1.6z"
          fill="currentColor"
        />
        <rect x="5.1" y="7.6" width="6.1" height="1.7" rx="0.85" fill="#2F6BFF" />
        <rect x="5.1" y="11.4" width="1.5" height="4.6" rx="0.5" fill="#2F6BFF" />
        <rect x="7.6" y="11.4" width="0.9" height="4.6" rx="0.45" fill="#2F6BFF" />
        <rect x="9.5" y="11.4" width="1.5" height="4.6" rx="0.5" fill="#2F6BFF" />
      </svg>
    </div>

    <nav class="nav">
      <button
        v-for="it in items"
        :key="it.key"
        class="nav-btn"
        :class="{ on: props.tab === it.key }"
        :title="it.label"
        @click="design.closeDesigner(); $emit('tab', it.key)"
      >
        <Icon :name="it.icon" :size="19" />
        <span>{{ it.label }}</span>
      </button>
    </nav>

    <div class="spacer" />

    <button class="nav-btn" title="快捷键与帮助" @click="ui.helpOpen = true">
      <Icon name="info" :size="19" />
    </button>
    <div class="ver">0.1</div>
  </aside>
</template>

<style scoped>
.rail {
  width: var(--rail-w);
  flex: none;
  background: var(--surface);
  border-right: 1px solid var(--line);
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 12px 0 10px;
  gap: 4px;
}
.brand {
  width: 34px;
  height: 34px;
  display: grid;
  place-items: center;
  border-radius: 9px;
  color: #fff;
  background: linear-gradient(160deg, #3b76ff, #2350d8);
  box-shadow: 0 3px 10px -3px rgba(47, 107, 255, 0.45);
  margin-bottom: 14px;
  -webkit-app-region: drag;
}
.nav { display: flex; flex-direction: column; gap: 3px; }
.nav-btn {
  width: 44px;
  padding: 7px 0 5px;
  border-radius: 8px;
  color: var(--ink-3);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  font-size: 9.5px;
  transition: background 0.12s, color 0.12s;
}
.nav-btn:hover { background: #f1f4f8; color: var(--ink); }
.nav-btn.on { background: var(--accent-soft); color: var(--accent-ink); }
.spacer { flex: 1; }
.ver {
  font-size: 9px;
  color: var(--ink-4);
  margin-top: 8px;
  font-variant-numeric: tabular-nums;
}
</style>
