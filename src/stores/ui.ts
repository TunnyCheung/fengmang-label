import { defineStore } from "pinia";
import { ref } from "vue";

export interface Toast {
  id: number;
  kind: "info" | "ok" | "warn" | "error";
  text: string;
}

let seq = 0;

export const useUi = defineStore("ui", () => {
  const printOpen = ref(false);
  const batchOpen = ref(false);
  const helpOpen = ref(false);
  const aboutOpen = ref(false);
  const toasts = ref<Toast[]>([]);

  function toast(text: string, kind: Toast["kind"] = "info", ms = 2600) {
    const id = ++seq;
    toasts.value = [...toasts.value, { id, kind, text }];
    window.setTimeout(() => {
      toasts.value = toasts.value.filter((t) => t.id !== id);
    }, ms);
  }

  function dismiss(id: number) {
    toasts.value = toasts.value.filter((t) => t.id !== id);
  }

  return { printOpen, batchOpen, helpOpen, aboutOpen, toasts, toast, dismiss };
});
