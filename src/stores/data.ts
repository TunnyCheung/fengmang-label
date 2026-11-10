import { defineStore } from "pinia";
import { computed, ref } from "vue";
import { useDesigner } from "./designer";
import { resolveValues } from "@/core/resolve";

export interface DataRow {
  [key: string]: string;
}

export const useData = defineStore("data", () => {
  const design = useDesigner();
  const snap = ref(true);
  const recordIndex = ref(0);
  const overrides = ref<Record<string, string>>({});
  const rows = ref<DataRow[]>([]);
  const sourceName = ref("");

  const previewValues = computed<Record<string, unknown>>(() => {
    const base = resolveValues(design.doc.variables, recordIndex.value, overrides.value);
    const row = rows.value[recordIndex.value];
    if (row) {
      for (const [k, v] of Object.entries(row)) {
        if (k && v !== "") base[k] = v;
      }
    }
    return { ...base, __row: row ?? {} };
  });

  const total = computed(() => Math.max(1, rows.value.length));

  function parseCsv(text: string): DataRow[] {
    const clean = text.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
    const lines: string[][] = [];
    let field = "";
    let row: string[] = [];
    let quoted = false;
    for (let i = 0; i < clean.length; i++) {
      const ch = clean[i];
      if (quoted) {
        if (ch === '"' && clean[i + 1] === '"') {
          field += '"';
          i++;
        } else if (ch === '"') {
          quoted = false;
        } else {
          field += ch;
        }
      } else if (ch === '"') {
        quoted = true;
      } else if (ch === "," || ch === "\t") {
        row.push(field);
        field = "";
      } else if (ch === "\n") {
        row.push(field);
        lines.push(row);
        row = [];
        field = "";
      } else {
        field += ch;
      }
    }
    if (field || row.length) {
      row.push(field);
      lines.push(row);
    }
    const nonEmpty = lines.filter((l) => l.some((c) => c.trim() !== ""));
    if (!nonEmpty.length) return [];
    const header = nonEmpty[0].map((h, i) => h.trim() || `列${i + 1}`);
    return nonEmpty.slice(1).map((cells) => {
      const obj: DataRow = {};
      header.forEach((h, i) => (obj[h] = (cells[i] ?? "").trim()));
      return obj;
    });
  }

  function importCsv(name: string, text: string) {
    const parsed = parseCsv(text);
    if (!parsed.length) throw new Error("没有解析到数据行");
    rows.value = parsed;
    sourceName.value = name;
    recordIndex.value = 0;
    const first = parsed[0];
    for (const key of Object.keys(first)) {
      const existing = design.doc.variables.find((v) => v.key === key);
      if (!existing) {
        design.doc.variables.push({
          key,
          label: key,
          sample: first[key],
          kind: "text",
        });
      } else if (!existing.sample) {
        existing.sample = first[key];
      }
    }
  }

  function clearRows() {
    rows.value = [];
    sourceName.value = "";
    recordIndex.value = 0;
  }

  function setOverride(key: string, value: string) {
    overrides.value = { ...overrides.value, [key]: value };
  }

  return {
    snap,
    recordIndex,
    overrides,
    rows,
    sourceName,
    previewValues,
    total,
    importCsv,
    clearRows,
    setOverride,
  };
});
