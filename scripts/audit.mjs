import { chromium } from "playwright-core";
const browser = await chromium.launch({ executablePath: "C:\\Users\\Administrator\\AppData\\Local\\ms-playwright\\chromium-1248\\chrome-win64\\chrome.exe" });
const page = await browser.newPage({ viewport: { width: 1440, height: 920 } });
const errs = [];
page.on("pageerror", (e) => errs.push(e.message));
await page.goto("http://localhost:5178/", { waitUntil: "networkidle" });
const res = await page.evaluate(async () => {
  const { TEMPLATES } = await import("/src/templates/index.ts");
  const out = [];
  for (const t of TEMPLATES) {
    const W = t.paper.width, H = t.paper.height;
    const issues = [];
    for (const el of t.elements) {
      if (el.x < -0.01 || el.y < -0.01) issues.push(`${el.type} negative pos ${el.x},${el.y}`);
      if (el.x + el.w > W + 0.01) issues.push(`${el.type} overflows right ${(el.x+el.w).toFixed(1)}>${W}`);
      if (el.y + el.h > H + 0.01) issues.push(`${el.type} overflows bottom ${(el.y+el.h).toFixed(1)}>${H}`);
    }
    out.push({ name: t.name, size: `${W}x${H}`, els: t.elements.length, issues });
  }
  return out;
});
for (const r of res) console.log((r.issues.length ? "FAIL " : "ok   ") + r.name.padEnd(10) + " " + r.size + "  " + r.issues.join(" | "));
console.log("pageerrors:", errs);
await browser.close();
