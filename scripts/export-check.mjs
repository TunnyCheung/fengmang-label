import { chromium } from "playwright-core";
import fs from "node:fs/promises";
const browser = await chromium.launch({ executablePath: "C:\\Users\\Administrator\\AppData\\Local\\ms-playwright\\chromium-1248\\chrome-win64\\chrome.exe" });
const page = await browser.newPage({ viewport: { width: 1440, height: 920 } });
await page.addInitScript(() => localStorage.clear());
await page.goto("http://localhost:5178/", { waitUntil: "networkidle" });
await page.waitForTimeout(800);
await page.keyboard.press("Escape");
await page.waitForTimeout(400);
await page.locator(".card", { hasText: "仓储库位" }).first().click();
await page.waitForTimeout(900);
await page.locator(".topbar button", { hasText: "打印" }).click();
await page.waitForTimeout(700);
const dl = page.waitForEvent("download");
await page.locator("button", { hasText: "导出 ZPL" }).click();
const d = await dl;
const zpl = await fs.readFile(await d.path(), "utf8");
await fs.writeFile("../shots/label.zpl", zpl);
console.log("zpl chars:", zpl.length, "| head:", zpl.slice(0, 80).replace(/\n/g, " "));
const res = await fetch("https://api.labelary.com/v1/printers/8dpmm/labels/2.36x1.57/0/", {
  method: "POST",
  headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "image/png" },
  body: zpl,
});
console.log("labelary:", res.status, res.headers.get("content-type"));
const buf = Buffer.from(await res.arrayBuffer());
await fs.writeFile("../shots/labelary-real.png", buf);
console.log("png bytes:", buf.length);
await browser.close();
