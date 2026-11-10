import fs from "node:fs/promises";
import path from "node:path";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { rcedit } from "rcedit";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = path.join(root, "release", "FengmangLabel-win32-x64");
const electronDist = path.join(root, "node_modules", "electron", "dist");

if (!existsSync(path.join(root, "dist", "index.html"))) {
  console.error("缺少 dist/index.html，请先运行 npm run build");
  process.exit(1);
}
if (!existsSync(path.join(electronDist, "electron.exe"))) {
  console.error("缺少 electron 运行时，请先 npm install");
  process.exit(1);
}

console.log("→ 清理输出目录");
await fs.rm(outDir, { recursive: true, force: true });
await fs.mkdir(outDir, { recursive: true });

console.log("→ 复制 Electron 运行时");
await fs.cp(electronDist, outDir, { recursive: true });
const exePath = path.join(outDir, "锋芒标签打印.exe");
await fs.rename(path.join(outDir, "electron.exe"), exePath);

console.log("→ 写入 exe 图标与版本信息");
await rcedit(exePath, {
  icon: path.join(root, "electron", "icon.ico"),
  "version-string": {
    ProductName: "锋芒标签打印",
    FileDescription: "锋芒标签打印",
    CompanyName: "锋芒标签打印",
    OriginalFilename: "锋芒标签打印.exe",
  },
  "file-version": "0.1.0.0",
  "product-version": "0.1.0.0",
});

console.log("→ 写入应用资源");
const appDir = path.join(outDir, "resources", "app");
await fs.mkdir(appDir, { recursive: true });
await fs.cp(path.join(root, "dist"), path.join(appDir, "dist"), { recursive: true });
await fs.cp(path.join(root, "electron"), path.join(appDir, "electron"), { recursive: true });
await fs.copyFile(path.join(root, "package.json"), path.join(appDir, "package.json"));
await fs.copyFile(
  path.join(root, "electron", "rawprint.ps1"),
  path.join(outDir, "resources", "rawprint.ps1"),
);

await fs.writeFile(
  path.join(outDir, "使用说明.txt"),
  [
    "锋芒标签打印 0.1.0（免安装版）",
    "",
    "1. 双击 锋芒标签打印.exe 启动。",
    "2. 从模板库点一张标签，改内容后点“打印”。",
    "3. 标签机请选择“标签机直打”，普通打印机选“系统打印”。",
    "",
    "说明：",
    "- 本目录可整体复制到任意位置，不要只拷贝 exe。",
    "- 标签机需先在 Windows 中安装驱动。",
    "- 打印记录与模板保存在本机用户目录，不上传网络。",
  ].join("\r\n"),
  "utf8",
);

const size = await dirSize(outDir);
console.log(`\n✓ 打包完成：${outDir}`);
console.log(`  体积：${(size / 1024 / 1024).toFixed(1)} MB`);

async function dirSize(dir) {
  let total = 0;
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) total += await dirSize(p);
    else total += (await fs.stat(p)).size;
  }
  return total;
}
