import type { PrinterInfo } from "./index";

export interface PrintLabelRequest {
  printer: string;
  language: "zpl" | "tspl";
  commands: string;
  jobName?: string;
}

export interface PrintResult {
  ok: boolean;
  error?: string;
  jobId?: string;
}

export interface LabelCraftApi {
  listPrinters(): Promise<PrinterInfo[]>;
  printLabel(req: PrintLabelRequest): Promise<PrintResult>;
  printSystem(opts: {
    printer?: string;
    copies?: number;
    pageSize?: { width: number; height: number };
  }): Promise<PrintResult>;
  saveFile(opts: {
    defaultName: string;
    filters?: { name: string; extensions: string[] }[];
    data: string;
    encoding?: "utf8" | "base64";
  }): Promise<{ ok: boolean; path?: string; canceled?: boolean }>;
  readTextFile(opts: {
    filters?: { name: string; extensions: string[] }[];
  }): Promise<{ ok: boolean; name?: string; text?: string; canceled?: boolean }>;
  windowControls: {
    minimize(): Promise<{ ok: boolean }>;
    toggleMaximize(): Promise<{ ok: boolean; maximized?: boolean }>;
    close(): Promise<{ ok: boolean }>;
    isMaximized(): Promise<{ ok: boolean; maximized?: boolean }>;
    onMaximizedChange(cb: (maximized: boolean) => void): () => void;
  };
  platform: string;
  version: string;
}

declare global {
  interface Window {
    labelcraft?: LabelCraftApi;
  }
}

export {};
