import { defineStore } from "pinia";
import { computed, ref } from "vue";
import type { PrinterInfo } from "@/types";

const LS = "labelcraft.settings.v1";

interface Persisted {
  printer: string;
  mode: "system" | "label";
  copies: number;
  speed: number;
  density: number;
  offset: number;
  language: "auto" | "zpl" | "tspl";
  onboarded: boolean;
}

const fallback: Persisted = {
  printer: "",
  mode: "label",
  copies: 1,
  speed: 4,
  density: 8,
  offset: 0,
  language: "auto",
  onboarded: false,
};

function load(): Persisted {
  try {
    return { ...fallback, ...(JSON.parse(localStorage.getItem(LS) || "{}") as Partial<Persisted>) };
  } catch {
    return { ...fallback };
  }
}

export const useSettings = defineStore("settings", () => {
  const saved = load();
  const printer = ref(saved.printer);
  const mode = ref(saved.mode);
  const copies = ref(saved.copies);
  const speed = ref(saved.speed);
  const density = ref(saved.density);
  const offset = ref(saved.offset);
  const language = ref(saved.language);
  const onboarded = ref(saved.onboarded);
  const printers = ref<PrinterInfo[]>([]);
  const desktop = ref(false);

  const currentPrinter = computed(
    () => printers.value.find((p) => p.name === printer.value) ?? null,
  );

  function save() {
    const payload: Persisted = {
      printer: printer.value,
      mode: mode.value,
      copies: copies.value,
      speed: speed.value,
      density: density.value,
      offset: offset.value,
      language: language.value,
      onboarded: onboarded.value,
    };
    localStorage.setItem(LS, JSON.stringify(payload));
  }

  async function refreshPrinters() {
    const api = window.labelcraft;
    if (!api) {
      desktop.value = false;
      printers.value = [];
      return;
    }
    desktop.value = true;
    printers.value = await api.listPrinters();
    if (!printer.value) {
      const def = printers.value.find((p) => p.isDefault) ?? printers.value[0];
      if (def) printer.value = def.name;
    }
    save();
  }

  function markOnboarded() {
    onboarded.value = true;
    save();
  }

  return {
    printer,
    mode,
    copies,
    speed,
    density,
    offset,
    language,
    onboarded,
    printers,
    desktop,
    currentPrinter,
    save,
    refreshPrinters,
    markOnboarded,
  };
});
