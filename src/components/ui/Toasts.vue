<script setup lang="ts">
import { useUi } from "@/stores/ui";
import Icon from "./Icon.vue";

const ui = useUi();
const icon = (k: string) =>
  k === "ok" ? "check" : k === "error" ? "alert" : k === "warn" ? "alert" : "info";
</script>

<template>
  <div class="toasts">
    <TransitionGroup name="toast">
      <div v-for="t in ui.toasts" :key="t.id" class="toast" :class="t.kind" @click="ui.dismiss(t.id)">
        <span class="ic"><Icon :name="icon(t.kind)" :size="14" /></span>
        <span class="txt">{{ t.text }}</span>
      </div>
    </TransitionGroup>
  </div>
</template>

<style scoped>
.toasts {
  position: fixed;
  left: 50%;
  bottom: 64px;
  transform: translateX(-50%);
  display: flex;
  flex-direction: column-reverse;
  gap: 8px;
  z-index: 300;
  pointer-events: none;
}
.toast {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 9px 14px 9px 11px;
  border-radius: 999px;
  background: #1b1e24;
  color: #fff;
  font-size: 12.5px;
  box-shadow: var(--sh-pop);
  pointer-events: auto;
  cursor: default;
  max-width: 520px;
}
.ic { display: flex; color: #9aa3b2; }
.toast.ok .ic { color: #4ade80; }
.toast.error .ic { color: #ff7b72; }
.toast.warn .ic { color: #fbbf24; }
.txt { white-space: pre-wrap; }
.toast-enter-active, .toast-leave-active { transition: all 0.2s cubic-bezier(0.2, 0.9, 0.3, 1); }
.toast-enter-from, .toast-leave-to { opacity: 0; transform: translateY(8px) scale(0.96); }
</style>
