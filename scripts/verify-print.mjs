import assert from "node:assert/strict";
import { mkdir, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { build } from "esbuild";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const tmp = path.join(root, ".verify-print");
const outfile = path.join(tmp, "print.mjs");

try {
  await mkdir(tmp, { recursive: true });
  await build({
    entryPoints: [path.join(root, "src/print/index.ts")],
    bundle: true,
    format: "esm",
    platform: "node",
    outfile,
    alias: { "@": path.join(root, "src") },
    external: ["qrcode", "jsbarcode"],
    logLevel: "silent",
  });

  const { emitTspl, emitZpl } = await import(pathToFileURL(outfile).href);

  const doc = {
    schema: 1,
    id: "verify",
    name: "verify",
    category: "logistics",
    paper: {
      width: 40,
      height: 30,
      gap: 2,
      dpi: 203,
      continuous: false,
      background: "#ffffff",
    },
    variables: [],
    elements: [
      {
        id: "t1",
        type: "text",
        text: "HELLO",
        x: 2,
        y: 2,
        w: 20,
        h: 8,
        rotate: 0,
      },
      {
        id: "b1",
        type: "barcode",
        format: "code128",
        value: "123456",
        x: 2,
        y: 12,
        w: 30,
        h: 10,
        rotate: 0,
      },
      {
        id: "r1",
        type: "rect",
        fill: "#ffffff",
        stroke: "#000000",
        strokeWidth: 0.3,
        radius: 0,
        x: 2,
        y: 24,
        w: 36,
        h: 4,
        rotate: 0,
      },
    ],
    print: { language: "zpl", speed: 4, density: 8, offset: 0, copies: 1 },
  };

  const sample = new Uint8Array(16);
  for (let y = 0; y < 16; y++) sample[y] = y % 2 === 0 ? 0x81 : 0x7e;
  const bits = () => ({
    bytes: sample,
    bytesPerRow: 1,
    width: 8,
    height: 16,
  });
  const opts = { dpi: 203, copies: 2 };

  const zpl = emitZpl(doc, {}, bits, opts);
  const tspl = emitTspl(doc, {}, bits, opts);

  assert.ok(zpl.startsWith("^XA\n"), "ZPL must start with ^XA");
  assert.ok(zpl.endsWith("^XZ"), "ZPL must end with ^XZ");
  assert.ok(zpl.includes("^PW"), "ZPL must contain ^PW");
  assert.ok(zpl.includes("^LL"), "ZPL must contain ^LL");
  assert.ok(zpl.includes("^LH0,0"), "ZPL must contain ^LH0,0");
  assert.ok(zpl.includes("^CI28"), "ZPL must contain ^CI28");
  assert.ok(zpl.includes("^PQ2"), "ZPL must contain ^PQ2");
  assert.ok(zpl.includes("^GB"), "ZPL rect must use ^GB");

  const gfa = zpl.match(/\^GFA,(\d+),(\d+),(\d+),([0-9A-F]+)\^FS/g);
  assert.equal(
    gfa?.length,
    2,
    `ZPL should emit 2 bitmaps, got:\n${zpl.slice(0, 400)}`,
  );
  for (const line of gfa) {
    const m = line.match(/\^GFA,(\d+),(\d+),(\d+),([0-9A-F]+)\^FS/);
    const hex = m[4];
    assert.equal(hex.length % 2, 0, "ZPL hex length must be even");
    assert.equal(hex, hex.toUpperCase(), "ZPL hex must be uppercase");
    assert.equal(Number(m[1]), hex.length / 2, "^GFA total bytes mismatch");
    assert.equal(Number(m[2]), hex.length / 2, "^GFA byte count mismatch");
    assert.equal(Number(m[3]), 1, "^GFA bytes-per-row mismatch");
    assert.equal(hex.length / 2, 16, "^GFA data must be 8x16 bytes");
  }

  assert.ok(tspl.startsWith("SIZE 40 mm,30 mm"), "TSPL must start with SIZE");
  assert.ok(tspl.includes("GAP 2 mm,0"), "TSPL must contain GAP");
  assert.ok(tspl.includes("DIRECTION 1"), "TSPL must contain DIRECTION 1");
  assert.ok(tspl.includes("CLS"), "TSPL must contain CLS");
  assert.ok(tspl.endsWith("PRINT 2,1"), "TSPL must end with PRINT 2,1");
  assert.ok(tspl.includes("BAR "), "TSPL rect must use BAR");

  const bitmap = tspl.match(/^BITMAP (\d+),(\d+),(\d+),(\d+),0,([0-9A-F]+)$/gm);
  assert.equal(bitmap?.length, 2, "TSPL should emit 2 bitmaps");
  for (const line of bitmap) {
    const m = line.match(/^BITMAP (\d+),(\d+),(\d+),(\d+),0,([0-9A-F]+)$/);
    const hex = m[5];
    assert.equal(hex.length % 2, 0, "TSPL hex length must be even");
    assert.equal(hex, hex.toUpperCase(), "TSPL hex must be uppercase");
    assert.equal(Number(m[3]), 1, "TSPL widthBytes mismatch");
    assert.equal(Number(m[4]), 16, "TSPL height mismatch");
    assert.equal(hex.length / 2, Number(m[3]) * Number(m[4]));
  }

  console.log("PASS zpl: ^XA/^XZ/^GFA/^PQ, 2 bitmaps, byte counts exact");
  console.log("PASS tspl: SIZE/BITMAP/PRINT, widthBytes 8-bit aligned");
  console.log(`ZPL sample: ${zpl.slice(0, 200).replace(/\n/g, "\\n")}`);
  console.log(`TSPL sample: ${tspl.slice(0, 160).replace(/\n/g, "\\n")}`);
} finally {
  await rm(tmp, { recursive: true, force: true });
}
