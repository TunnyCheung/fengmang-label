import { defineStore } from "pinia";
import { computed, ref, shallowRef } from "vue";
import type {
  LabelElement,
  TemplateDoc,
  Variable,
} from "@/types";
import { clone, createDoc, createElement } from "@/core/template";
import { uid } from "@/core/id";
import { clamp, round } from "@/core/units";

const LS_DOC = "labelcraft.doc.v1";
const LS_LIB = "labelcraft.library.v1";

function loadJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export const useDesigner = defineStore("designer", () => {
  const doc = ref<TemplateDoc>(loadJson(LS_DOC, createDoc()));
  const selection = ref<string[]>([]);
  const zoom = ref(1);
  const view = ref<"gallery" | "design">("gallery");
  const dirty = ref(false);
  const library = ref<TemplateDoc[]>(loadJson<TemplateDoc[]>(LS_LIB, []));

  const past = shallowRef<string[]>([]);
  const future = shallowRef<string[]>([]);
  let pending: string | null = null;
  let lastKey = "";
  let lastAt = 0;
  let saveTimer: number | undefined;

  const selected = computed(() =>
    doc.value.elements.filter((el) => selection.value.includes(el.id)),
  );
  const single = computed(() => (selected.value.length === 1 ? selected.value[0] : null));
  const canUndo = computed(() => past.value.length > 0);
  const canRedo = computed(() => future.value.length > 0);

  const snap = () => JSON.stringify(doc.value);

  function persist() {
    window.clearTimeout(saveTimer);
    saveTimer = window.setTimeout(() => {
      localStorage.setItem(LS_DOC, JSON.stringify(doc.value));
      dirty.value = false;
    }, 250);
  }

  function mark() {
    if (pending === null) pending = snap();
  }

  function commit(coalesce?: string) {
    const now = Date.now();
    const current = snap();
    if (pending !== null && pending !== current) {
      if (!coalesce || coalesce !== lastKey || now - lastAt > 700) {
        past.value = [...past.value.slice(-59), pending];
        future.value = [];
      }
      lastKey = coalesce ?? "";
      lastAt = now;
    }
    pending = null;
    dirty.value = true;
    persist();
  }

  function mutate(fn: () => void, coalesce?: string) {
    mark();
    fn();
    commit(coalesce);
  }

  function undo() {
    const prev = past.value[past.value.length - 1];
    if (!prev) return;
    future.value = [...future.value, snap()];
    past.value = past.value.slice(0, -1);
    doc.value = JSON.parse(prev) as TemplateDoc;
    pruneSelection();
    persist();
  }

  function redo() {
    const next = future.value[future.value.length - 1];
    if (!next) return;
    past.value = [...past.value, snap()];
    future.value = future.value.slice(0, -1);
    doc.value = JSON.parse(next) as TemplateDoc;
    pruneSelection();
    persist();
  }

  function pruneSelection() {
    const ids = new Set(doc.value.elements.map((el) => el.id));
    selection.value = selection.value.filter((id) => ids.has(id));
  }

  function open(template: TemplateDoc) {
    doc.value = clone(template);
    doc.value.id = template.id;
    selection.value = [];
    past.value = [];
    future.value = [];
    view.value = "design";
    dirty.value = false;
    localStorage.setItem(LS_DOC, JSON.stringify(doc.value));
  }

  function openBlank() {
    open(createDoc("未命名标签", 60, 40));
  }

  function closeDesigner() {
    view.value = "gallery";
    selection.value = [];
  }

  function select(ids: string[], additive = false) {
    if (additive) {
      const set = new Set(selection.value);
      for (const id of ids) {
        if (set.has(id)) set.delete(id);
        else set.add(id);
      }
      selection.value = [...set];
    } else {
      selection.value = [...ids];
    }
  }

  function addElement(type: LabelElement["type"], at?: { x: number; y: number }) {
    const p = doc.value.paper;
    const el = createElement(
      type,
      at ? round(clamp(at.x, 0, p.width - 8), 1) : 4,
      at ? round(clamp(at.y, 0, p.height - 6), 1) : 4,
    );
    const maxW = Math.max(8, p.width - el.x - 2);
    const maxH = Math.max(4, p.height - el.y - 2);
    el.w = Math.min(el.w, maxW);
    el.h = Math.min(el.h, maxH);
    mutate(() => {
      doc.value.elements.push(el);
      selection.value = [el.id];
    });
    return el;
  }

  function update(id: string, patch: Partial<LabelElement>, coalesce?: string) {
    mutate(() => {
      const el = doc.value.elements.find((e) => e.id === id);
      if (el) Object.assign(el, patch);
    }, coalesce ?? `update:${id}`);
  }

  function updatePaper(patch: Partial<TemplateDoc["paper"]>, coalesce?: string) {
    mutate(() => {
      Object.assign(doc.value.paper, patch);
    }, coalesce ?? "paper");
  }

  function remove(ids = selection.value) {
    if (!ids.length) return;
    mutate(() => {
      doc.value.elements = doc.value.elements.filter((el) => !ids.includes(el.id));
      selection.value = selection.value.filter((id) => !ids.includes(id));
    });
  }

  function duplicate(ids = selection.value) {
    if (!ids.length) return;
    mutate(() => {
      const copies = doc.value.elements
        .filter((el) => ids.includes(el.id))
        .map((el) => ({ ...clone(el), id: uid(el.type), x: el.x + 2, y: el.y + 2 }));
      doc.value.elements.push(...copies);
      selection.value = copies.map((c) => c.id);
    });
  }

  function reorder(id: string, dir: "up" | "down" | "top" | "bottom") {
    mutate(() => {
      const list = doc.value.elements;
      const i = list.findIndex((e) => e.id === id);
      if (i < 0) return;
      const [el] = list.splice(i, 1);
      const target =
        dir === "up" ? Math.min(list.length, i + 1)
        : dir === "down" ? Math.max(0, i - 1)
        : dir === "top" ? list.length
        : 0;
      list.splice(target, 0, el);
    });
  }

  function nudge(dx: number, dy: number) {
    if (!selection.value.length) return;
    mutate(() => {
      for (const el of doc.value.elements) {
        if (!selection.value.includes(el.id) || el.locked) continue;
        el.x = round(clamp(el.x + dx, -el.w + 2, doc.value.paper.width - 2), 2);
        el.y = round(clamp(el.y + dy, -el.h + 2, doc.value.paper.height - 2), 2);
      }
    }, "nudge");
  }

  function align(mode: "left" | "hcenter" | "right" | "top" | "vcenter" | "bottom") {
    const list = selected.value.filter((e) => !e.locked);
    if (!list.length) return;
    const W = doc.value.paper.width;
    const H = doc.value.paper.height;
    mutate(() => {
      if (list.length === 1) {
        const el = list[0];
        if (mode === "left") el.x = 0;
        if (mode === "right") el.x = W - el.w;
        if (mode === "hcenter") el.x = round((W - el.w) / 2, 2);
        if (mode === "top") el.y = 0;
        if (mode === "bottom") el.y = H - el.h;
        if (mode === "vcenter") el.y = round((H - el.h) / 2, 2);
        return;
      }
      const minX = Math.min(...list.map((e) => e.x));
      const maxX = Math.max(...list.map((e) => e.x + e.w));
      const minY = Math.min(...list.map((e) => e.y));
      const maxY = Math.max(...list.map((e) => e.y + e.h));
      for (const el of list) {
        if (mode === "left") el.x = minX;
        if (mode === "right") el.x = maxX - el.w;
        if (mode === "hcenter") el.x = round((minX + maxX - el.w) / 2, 2);
        if (mode === "top") el.y = minY;
        if (mode === "bottom") el.y = maxY - el.h;
        if (mode === "vcenter") el.y = round((minY + maxY - el.h) / 2, 2);
      }
    });
  }

  function distribute(axis: "h" | "v") {
    const list = selected.value.filter((e) => !e.locked);
    if (list.length < 3) return;
    mutate(() => {
      const sorted = [...list].sort((a, b) => (axis === "h" ? a.x - b.x : a.y - b.y));
      const first = sorted[0];
      const last = sorted[sorted.length - 1];
      const gap =
        axis === "h"
          ? (last.x + last.w - first.x - sorted.reduce((s, e) => s + e.w, 0)) / (sorted.length - 1)
          : (last.y + last.h - first.y - sorted.reduce((s, e) => s + e.h, 0)) / (sorted.length - 1);
      let cursor = axis === "h" ? first.x : first.y;
      for (const el of sorted) {
        if (axis === "h") {
          el.x = round(cursor, 2);
          cursor += el.w + gap;
        } else {
          el.y = round(cursor, 2);
          cursor += el.h + gap;
        }
      }
    });
  }

  function addVariable(v?: Partial<Variable>) {
    mutate(() => {
      doc.value.variables.push({
        key: v?.key ?? `field${doc.value.variables.length + 1}`,
        label: v?.label ?? `字段${doc.value.variables.length + 1}`,
        sample: v?.sample ?? "",
        kind: v?.kind ?? "text",
        seq: v?.seq,
      });
    });
  }

  function updateVariable(key: string, patch: Partial<Variable>) {
    mutate(() => {
      const v = doc.value.variables.find((x) => x.key === key);
      if (v) Object.assign(v, patch);
    }, `var:${key}`);
  }

  function removeVariable(key: string) {
    mutate(() => {
      doc.value.variables = doc.value.variables.filter((v) => v.key !== key);
    });
  }

  function rename(name: string) {
    mutate(() => {
      doc.value.name = name;
    }, "rename");
  }

  function saveToLibrary() {
    const copy = clone(doc.value);
    copy.updatedAt = Date.now();
    const i = library.value.findIndex((t) => t.id === copy.id);
    if (i >= 0) library.value[i] = copy;
    else library.value = [copy, ...library.value];
    localStorage.setItem(LS_LIB, JSON.stringify(library.value));
    dirty.value = false;
  }

  function removeFromLibrary(id: string) {
    library.value = library.value.filter((t) => t.id !== id);
    localStorage.setItem(LS_LIB, JSON.stringify(library.value));
  }

  function importDoc(raw: unknown) {
    const next = raw as TemplateDoc;
    if (!next || !next.paper || !Array.isArray(next.elements)) {
      throw new Error("模板文件格式不正确");
    }
    open({ ...createDoc(), ...next, id: uid("tpl") });
  }

  return {
    doc,
    selection,
    selected,
    single,
    zoom,
    view,
    dirty,
    library,
    canUndo,
    canRedo,
    mark,
    commit,
    mutate,
    undo,
    redo,
    open,
    openBlank,
    closeDesigner,
    select,
    addElement,
    update,
    updatePaper,
    remove,
    duplicate,
    reorder,
    nudge,
    align,
    distribute,
    addVariable,
    updateVariable,
    removeVariable,
    rename,
    saveToLibrary,
    removeFromLibrary,
    importDoc,
  };
});
