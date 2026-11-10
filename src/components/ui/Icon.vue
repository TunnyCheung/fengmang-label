<script setup lang="ts">
import { computed } from "vue";

const props = withDefaults(
  defineProps<{ name: string; size?: number; stroke?: number }>(),
  { size: 16, stroke: 1.7 },
);

const P: Record<string, string> = {
  templates: "M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z",
  pen: "M4.5 19.5l4.2-1 9.3-9.3-3.2-3.2-9.3 9.3-1 4.2zM13.6 7.1l3.2 3.2",
  printer: "M7 8V3.5h10V8M7 17H4.5V8h15v9H17M7 13h10v7.5H7z",
  sliders: "M4 7h10M18 7h2M4 17h2M10 17h10M15 4v6M8 14v6",
  plus: "M12 5v14M5 12h14",
  undo: "M9 14L4 9l5-5M4 9h9.5a5.5 5.5 0 010 11H9",
  redo: "M15 14l5-5-5-5M20 9h-9.5a5.5 5.5 0 000 11H15",
  trash: "M4 6.5h16M9.5 6.5V3.5h5v3M6.5 6.5l1 14h9l1-14M10 10v7M14 10v7",
  copy: "M8.5 8.5h11v11h-11zM4.5 15.5v-11h11",
  layers: "M12 3.5l8.5 4.5-8.5 4.5L3.5 8zM3.5 12.5L12 17l8.5-4.5M3.5 16.8L12 21.3l8.5-4.5",
  type: "M5 6.5V4.5h14v2M12 4.5v15M8.5 19.5h7",
  barcode: "M4 5v14M7 5v14M10.5 5v14M13 5v14M17 5v14M20 5v14",
  qr: "M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h2.5v2.5H14zM19.5 14H20v1.5M14 19.5h1.5M17.5 17.5H20V20h-2.5z",
  image: "M3.5 4.5h17v15h-17zM8 10a1.6 1.6 0 100-3.2A1.6 1.6 0 008 10zM3.5 16.5l5-5 4.5 4.5 3-3 4.5 4.5",
  square: "M4 4h16v16H4z",
  line: "M4 12h16",
  table: "M3.5 4.5h17v15h-17zM3.5 10h17M3.5 14.5h17M9.5 4.5v15M15 4.5v15",
  search: "M11 18.5a7.5 7.5 0 100-15 7.5 7.5 0 000 15zM16.5 16.5l4 4",
  x: "M6 6l12 12M18 6L6 18",
  check: "M4.5 12.5l5 5 10-11",
  download: "M12 3.5v12M7 10.5l5 5 5-5M4 20.5h16",
  upload: "M12 20.5v-12M7 13.5l5-5 5 5M4 3.5h16",
  eye: "M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12zM12 15a3 3 0 100-6 3 3 0 000 6z",
  save: "M5 3.5h11l3.5 3.5v13.5h-14.5zM8 3.5v5.5h7V3.5M8 20.5V14h8v6.5",
  chevronLeft: "M14.5 6l-6 6 6 6",
  chevronRight: "M9.5 6l6 6-6 6",
  chevronDown: "M6 9.5l6 6 6-6",
  more: "M6 12h.01M12 12h.01M18 12h.01",
  lock: "M6.5 10.5h11v9h-11zM8.5 10.5V7a3.5 3.5 0 017 0v3.5",
  unlock: "M6.5 10.5h11v9h-11zM8.5 10.5V7a3.5 3.5 0 016.6-1.6",
  magnet: "M6 4.5v7a6 6 0 0012 0v-7M6 8.5h4M14 8.5h4",
  alignLeft: "M4 4v16M8 8h12M8 16h8",
  alignCenterH: "M12 4v16M6 8h12M8 16h8",
  alignRight: "M20 4v16M4 8h12M8 16h8",
  alignTop: "M4 4h16M8 8v12M16 8v8",
  alignMiddleV: "M4 12h16M8 6v12M16 8v8",
  alignBottom: "M4 20h16M8 4v12M16 8v8",
  distributeH: "M4 4v16M20 4v16M9 8h6v8H9z",
  distributeV: "M4 4h16M4 20h16M8 9h8v6H8z",
  grid: "M4 9h16M4 15h16M9 4v16M15 4v16",
  file: "M6 3.5h7l5 5v12H6zM13 3.5V9h5",
  folder: "M3.5 6.5h6l2 2.5h9v11h-17z",
  refresh: "M20 12a8 8 0 10-2.6 5.9M20 5.5V12h-6",
  info: "M12 21a9 9 0 100-18 9 9 0 000 18zM12 11v5.5M12 7.8h.01",
  alert: "M12 3.5L21 20H3zM12 9.5v4.5M12 17.2h.01",
  bolt: "M13.5 3L5 13.5h5L9.5 21 19 10.5h-5.5z",
  crop: "M6.5 3v14.5H21M3 6.5h14.5V21",
  rotate: "M20 12a8 8 0 10-3 6.2M20 5v6h-6",
  text: "M4 6.5h16M4 6.5V4.5M20 6.5V4.5M12 4.5v15M9 19.5h6",
  star: "M12 3.8l2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8L3.5 10l5.9-.9z",
  arrowRight: "M4 12h15M14 7l5 5-5 5",
  sparkle: "M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8zM18 15l.9 2.1 2.1.9-2.1.9L18 21l-.9-2.1-2.1-.9 2.1-.9z",
  snap: "M4 8V4h4M20 8V4h-4M4 16v4h4M20 16v4h-4M8 12h8",
  minimize: "M5 12h14",
  maximize: "M5.5 5.5h13v13h-13z",
  restore: "M8 8h10.5v10.5H8zM5.5 15.5V5.5H16",
};

const d = computed(() => P[props.name] ?? P.square);
</script>

<template>
  <svg
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    fill="none"
    :stroke-width="stroke"
    stroke="currentColor"
    stroke-linecap="round"
    stroke-linejoin="round"
    class="icon"
    aria-hidden="true"
  >
    <path :d="d" />
  </svg>
</template>

<style scoped>
.icon { display: block; flex: none; }
</style>
