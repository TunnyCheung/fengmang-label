import { defineStore } from "pinia";
import { computed, ref, watch } from "vue";
import { useDesigner } from "./designer";
import { resolveValues } from "@/core/resolve";
import { uid } from "@/core/id";

export interface BatchRow {
  id: string;
  cells: Record<string, string>;
}

interface ParsedTable {
  columns: string[];
  rows: string[][];
}

const LS = "labelcraft.batch.v1";
const MAX_ROWS = 5000;
const COPIES_HEADER = /^(份数|数量|张数|copies|copy|qty|quantity|count)$/i;

interface Persisted {
  sourceName: string;
  columns: string[];
  rows: BatchRow[];
  mapping: Record<string, string>;
  copiesColumn: string;
  selected: string[];
}

function load(): Partial<Persisted> {
  try {
    const raw = localStorage.getItem(LS);
    return raw ? (JSON.parse(raw) as Partial<Persisted>) : {};
  } catch {
    return {};
  }
}

export function parseTable(text: string): ParsedTable {
  const clean = text.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const firstLine = clean.split("\n").find((line) => line.trim() !== "") ?? "";
  const delimiter = firstLine.includes("\t") ? "\t" : ",";

  const rawRows: string[][] = [];
  let row: string[] = [];
  let field = "";
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
    } else if (ch === delimiter) {
      row.push(field);
      field = "";
    } else if (ch === "\n") {
      row.push(field);
      rawRows.push(row);
      row = [];
      field = "";
    } else {
      field += ch;
    }
  }
  if (field || row.length) {
    row.push(field);
    rawRows.push(row);
  }

  const filled = rawRows.filter((cells) => cells.some((cell) => cell.trim() !== ""));
  if (!filled.length) return { columns: [], rows: [] };

  const seen = new Map<string, number>();
  const columns = filled[0].map((name, index) => {
    const base = name.trim() || `列${index + 1}`;
    const count = (seen.get(base) ?? 0) + 1;
    seen.set(base, count);
    return count > 1 ? `${base}_${count}` : base;
  });

  return {
    columns,
    rows: filled.slice(1).map((cells) => columns.map((_, index) => (cells[index] ?? "").trim())),
  };
}

export const useData = defineStore("data", () => {
  const design = useDesigner();
  const saved = load();

  const snap = ref(true);
  const recordIndex = ref(0);
  const overrides = ref<Record<string, string>>({});
  const rows = ref<BatchRow[]>(Array.isArray(saved.rows) ? saved.rows : []);
  const columns = ref<string[]>(Array.isArray(saved.columns) ? saved.columns : []);
  const mapping = ref<Record<string, string>>(saved.mapping ?? {});
  const copiesColumn = ref(saved.copiesColumn ?? "");
  const sourceName = ref(saved.sourceName ?? "");
  const selected = ref<string[]>(
    Array.isArray(saved.selected)
      ? saved.selected.filter((id) => rows.value.some((item) => item.id === id))
      : [],
  );
  const search = ref("");

  if (recordIndex.value >= rows.value.length) recordIndex.value = 0;

  function valuesForRow(row: BatchRow | undefined, index: number) {
    const base = resolveValues(design.doc.variables, index, overrides.value);
    if (row) {
      for (const [column, key] of Object.entries(mapping.value)) {
        if (!key) continue;
        const value = row.cells[column];
        if (value !== undefined) base[key] = value;
      }
    }
    return { ...base, __row: row?.cells ?? {} };
  }

  const previewValues = computed(() => valuesForRow(rows.value[recordIndex.value], recordIndex.value));
  const total = computed(() => Math.max(1, rows.value.length));

  const filteredRows = computed(() => {
    const needle = search.value.trim().toLowerCase();
    if (!needle) return rows.value;
    return rows.value.filter((row) =>
      Object.values(row.cells).some((value) => value.toLowerCase().includes(needle)),
    );
  });

  const issues = computed<Record<string, string[]>>(() => {
    const out: Record<string, string[]> = {};
    const add = (id: string, message: string) => {
      if (!out[id]) out[id] = [];
      if (!out[id].includes(message)) out[id].push(message);
    };

    for (const row of rows.value) {
      for (const [column, key] of Object.entries(mapping.value)) {
        if (key && !(row.cells[column] ?? "").trim()) add(row.id, `「${column}」为空`);
      }
    }

    const uniqueKeys = new Set<string>();
    for (const el of design.doc.elements) {
      if (el.type !== "barcode" && el.type !== "qrcode") continue;
      for (const match of el.value.matchAll(/\{\{\s*([\w.-]+)\s*\}\}/g)) uniqueKeys.add(match[1]);
    }

    const check = (signatureOf: (row: BatchRow) => string, label: string) => {
      const seen = new Map<string, string[]>();
      for (const row of rows.value) {
        const signature = signatureOf(row);
        if (!signature) continue;
        const list = seen.get(signature) ?? [];
        list.push(row.id);
        seen.set(signature, list);
      }
      for (const [value, ids] of seen) {
        if (ids.length < 2) continue;
        for (const id of ids) add(id, `${label}「${value.split("\u0001").join(" / ")}」重复`);
      }
    };

    const uniqueColumns = Object.entries(mapping.value).filter(
      ([column, key]) => key && uniqueKeys.has(key) && column !== copiesColumn.value,
    );
    if (uniqueColumns.length) {
      for (const [column] of uniqueColumns) {
        check((row) => (row.cells[column] ?? "").trim(), column);
      }
    } else {
      const mappedColumns = Object.entries(mapping.value).filter(
        ([column, key]) => key && column !== copiesColumn.value,
      );
      if (mappedColumns.length) {
        check(
          (row) => mappedColumns.map(([column]) => (row.cells[column] ?? "").trim()).join("\u0001"),
          "整行",
        );
      }
    }
    return out;
  });

  function autoMap(cols: string[]) {
    const result: Record<string, string> = {};
    for (const column of cols) {
      const hit = design.doc.variables.find(
        (item) =>
          item.key.toLowerCase() === column.toLowerCase() ||
          item.label.toLowerCase() === column.toLowerCase(),
      );
      result[column] = hit ? hit.key : "";
    }
    return result;
  }

  function importTable(name: string, cols: string[], raw: string[][]) {
    if (!cols.length || !raw.length) throw new Error("没有解析到数据行");
    if (raw.length > MAX_ROWS) {
      throw new Error(`一次最多导入 ${MAX_ROWS} 行，请拆分文件后分批打印`);
    }
    columns.value = [...cols];
    rows.value = raw.map((cells) => ({
      id: uid("row"),
      cells: Object.fromEntries(cols.map((column, index) => [column, (cells[index] ?? "").trim()])),
    }));
    sourceName.value = name;
    recordIndex.value = 0;
    selected.value = [];
    mapping.value = autoMap(cols);
    copiesColumn.value =
      cols.find(
        (column) =>
          COPIES_HEADER.test(column) &&
          !design.doc.variables.some(
            (item) =>
              item.key.toLowerCase() === column.toLowerCase() ||
              item.label.toLowerCase() === column.toLowerCase(),
          ),
      ) ?? "";
  }

  function importText(name: string, text: string) {
    const parsed = parseTable(text);
    importTable(name, parsed.columns, parsed.rows);
    return parsed.rows.length;
  }

  function clearRows() {
    rows.value = [];
    columns.value = [];
    mapping.value = {};
    copiesColumn.value = "";
    sourceName.value = "";
    selected.value = [];
    recordIndex.value = 0;
  }

  function setMapping(column: string, key: string) {
    if (key) {
      for (const [other, mapped] of Object.entries(mapping.value)) {
        if (mapped === key && other !== column) mapping.value[other] = "";
      }
    }
    mapping.value[column] = key;
  }

  function addRow() {
    if (!columns.value.length) return;
    rows.value.push({
      id: uid("row"),
      cells: Object.fromEntries(columns.value.map((column) => [column, ""])),
    });
  }

  function duplicateRow(id: string) {
    const index = rows.value.findIndex((row) => row.id === id);
    if (index < 0) return;
    const source = rows.value[index];
    rows.value.splice(index + 1, 0, { id: uid("row"), cells: { ...source.cells } });
  }

  function deleteRows(ids: string[]) {
    if (!ids.length) return;
    const drop = new Set(ids);
    rows.value = rows.value.filter((row) => !drop.has(row.id));
    selected.value = selected.value.filter((id) => !drop.has(id));
    if (recordIndex.value >= rows.value.length) recordIndex.value = Math.max(0, rows.value.length - 1);
  }

  function updateCell(id: string, column: string, value: string) {
    const row = rows.value.find((item) => item.id === id);
    if (row) row.cells[column] = value;
  }

  function toggleSelect(id: string) {
    selected.value = selected.value.includes(id)
      ? selected.value.filter((item) => item !== id)
      : [...selected.value, id];
  }

  function selectAll(ids: string[]) {
    selected.value = [...ids];
  }

  function clearSelection() {
    selected.value = [];
  }

  function copiesFor(id: string, fallback: number) {
    if (!copiesColumn.value) return fallback;
    const row = rows.value.find((item) => item.id === id);
    const value = Math.floor(Number(row?.cells[copiesColumn.value]));
    return Number.isFinite(value) && value > 0 ? Math.min(value, 999) : fallback;
  }

  function setOverride(key: string, value: string) {
    overrides.value = { ...overrides.value, [key]: value };
  }

  let saveTimer = 0;
  watch(
    [rows, columns, mapping, copiesColumn, sourceName, selected],
    () => {
      window.clearTimeout(saveTimer);
      saveTimer = window.setTimeout(() => {
        const payload: Persisted = {
          sourceName: sourceName.value,
          columns: columns.value,
          rows: rows.value,
          mapping: mapping.value,
          copiesColumn: copiesColumn.value,
          selected: selected.value,
        };
        try {
          localStorage.setItem(LS, JSON.stringify(payload));
        } catch {
          /* 超出本地存储配额时保留内存中的数据 */
        }
      }, 400);
    },
    { deep: true },
  );

  return {
    snap,
    recordIndex,
    overrides,
    rows,
    columns,
    mapping,
    copiesColumn,
    sourceName,
    selected,
    search,
    previewValues,
    filteredRows,
    issues,
    total,
    valuesForRow,
    importTable,
    importText,
    clearRows,
    setMapping,
    addRow,
    duplicateRow,
    deleteRows,
    updateCell,
    toggleSelect,
    selectAll,
    clearSelection,
    copiesFor,
    setOverride,
  };
});
