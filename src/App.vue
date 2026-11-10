<script setup lang="ts">
import { onMounted, onBeforeUnmount } from "vue";
import { useDesigner } from "@/stores/designer";
import { useSettings } from "@/stores/settings";
import { useUi } from "@/stores/ui";
import GalleryView from "@/views/GalleryView.vue";
import DesignerView from "@/views/DesignerView.vue";
import PrintDialog from "@/components/dialogs/PrintDialog.vue";
import HelpDialog from "@/components/dialogs/HelpDialog.vue";
import Toasts from "@/components/ui/Toasts.vue";

const design = useDesigner();
const settings = useSettings();
const ui = useUi();

function onKey(e: KeyboardEvent) {
  const mod = e.ctrlKey || e.metaKey;
  if (mod && e.key.toLowerCase() === "p") {
    e.preventDefault();
    if (design.view === "design") ui.printOpen = true;
    return;
  }
  if (e.key === "F1") {
    e.preventDefault();
    ui.helpOpen = true;
  }
}

onMounted(() => {
  settings.refreshPrinters();
  window.addEventListener("keydown", onKey);
  if (!settings.onboarded) {
    window.setTimeout(() => (ui.helpOpen = true), 500);
  }
});
onBeforeUnmount(() => window.removeEventListener("keydown", onKey));
</script>

<template>
  <GalleryView v-if="design.view === 'gallery'" />
  <DesignerView v-else />
  <PrintDialog v-if="ui.printOpen" @close="ui.printOpen = false" />
  <HelpDialog
    v-if="ui.helpOpen"
    @close="ui.helpOpen = false; settings.markOnboarded()"
  />
  <Toasts />
  <div id="print-root" />
</template>
