<script setup lang="ts">
import { computed } from "vue";
import { useDesigner } from "@/stores/designer";
import { SIZE_PRESETS, findPreset, sizeKey } from "@/core/sizes";

const design = useDesigner();
const paper = computed(() => design.doc.paper);
const preset = computed(() => findPreset(paper.value.width, paper.value.height));
const value = computed(() => (preset.value ? sizeKey(preset.value.w, preset.value.h) : "custom"));

function onChange(e: Event) {
  const raw = (e.target as HTMLSelectElement).value;
  if (raw === "custom") return;
  const [w, h] = raw.split("x").map(Number);
  if (!Number.isFinite(w) || !Number.isFinite(h)) return;
  design.updatePaper({ width: w, height: h }, "size");
}
</script>

<template>
  <select class="input" :value="value" @change="onChange">
    <option value="custom">
      {{ preset ? "自定义尺寸…" : `${paper.width} × ${paper.height} mm（自定义）` }}
    </option>
    <option v-for="p in SIZE_PRESETS" :key="`${p.w}x${p.h}`" :value="`${p.w}x${p.h}`">
      {{ p.name }}
    </option>
  </select>
</template>
