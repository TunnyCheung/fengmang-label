import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (relative) => readFileSync(path.join(root, relative), 'utf8');

function interfaceBody(source, name) {
  const start = source.indexOf(`interface ${name}`);
  if (start < 0) return null;
  const open = source.indexOf('{', start);
  if (open < 0) return null;
  let depth = 0;
  for (let i = open; i < source.length; i += 1) {
    if (source[i] === '{') depth += 1;
    else if (source[i] === '}') {
      depth -= 1;
      if (depth === 0) return source.slice(open + 1, i);
    }
  }
  return null;
}

function collectMatches(source, regex, group = 1) {
  const out = [];
  for (const match of source.matchAll(regex)) out.push(match[group]);
  return out;
}

const problems = [];
const rows = [];

const dts = read('src/types/global.d.ts');
const preload = read('electron/preload.cjs');
const main = read('electron/main.cjs');

const apiBody = interfaceBody(dts, 'LabelCraftApi');
if (!apiBody) problems.push('global.d.ts: interface LabelCraftApi not found');

const body = apiBody || '';
const apiMethods = collectMatches(body, /^\s{2}([A-Za-z_$][\w$]*)\s*\(/gm);
const apiProps = collectMatches(body, /^\s{2}([A-Za-z_$][\w$]*)\s*:\s*string\s*;/gm);

const mainChannels = collectMatches(main, /(?:ipcMain\.)?handle\(\s*['"]([^'"]+)['"]/g);
const duplicateChannels = mainChannels.filter((name, index) => mainChannels.indexOf(name) !== index);
if (duplicateChannels.length > 0) {
  problems.push(`main.cjs: duplicated ipcMain.handle channel(s): ${[...new Set(duplicateChannels)].join(', ')}`);
}

if (apiMethods.length === 0) problems.push('global.d.ts: no methods parsed from LabelCraftApi');

for (const method of apiMethods) {
  const invokePattern = new RegExp(
    `${method}\\s*:\\s*\\([^)]*\\)\\s*=>\\s*ipcRenderer\\.invoke\\(\\s*(['"])([^'"]+)\\1`,
  );
  const match = preload.match(invokePattern);
  const channel = match ? match[2] : '';
  const handled = channel ? mainChannels.includes(channel) : false;

  if (!match) problems.push(`preload.cjs: ${method} does not call ipcRenderer.invoke("<channel>")`);
  else if (!handled) problems.push(`main.cjs: no ipcMain.handle for "${channel}" (used by ${method})`);

  rows.push({
    method,
    channel: channel || '(missing)',
    handled,
    ok: Boolean(match) && handled,
  });
}

for (const prop of ['platform', 'version']) {
  const exposed = new RegExp(`${prop}\\s*:`).test(preload);
  if (!exposed) problems.push(`preload.cjs: string property "${prop}" is not exposed`);
}

for (const prop of apiProps) {
  if (!['platform', 'version'].includes(prop)) {
    problems.push(`global.d.ts: unexpected string property "${prop}" in LabelCraftApi`);
  }
}
if (!apiProps.includes('platform') || !apiProps.includes('version')) {
  problems.push('global.d.ts: expected string properties platform and version');
}

const usedChannels = rows.map((row) => row.channel).filter((name) => name !== '(missing)');
const extraChannels = mainChannels.filter((name) => !usedChannels.includes(name));
const windowChannels = extraChannels.filter((name) => name.startsWith('window:'));
for (const name of windowChannels) {
  if (!preload.includes(`ipcRenderer.invoke('${name}')`)) {
    problems.push(`preload.cjs: windowControls does not invoke "${name}"`);
  }
}
const unknownExtras = extraChannels.filter(
  (name) => !name.startsWith('app:') && !name.startsWith('window:'),
);
if (unknownExtras.length > 0) {
  problems.push(`main.cjs: handle(s) not used by preload and not app:* channels: ${unknownExtras.join(', ')}`);
}

const pad = (value, width) => String(value).padEnd(width, ' ');
const rule = '-'.repeat(72);

console.log('LabelCraft Electron contract check');
console.log(rule);
console.log(`${pad('method', 16)}${pad('preload invoke', 20)}${pad('main handle', 20)}result`);
console.log(rule);
for (const row of rows) {
  console.log(
    `${pad(row.method, 16)}${pad(row.channel, 20)}${pad(row.handled ? row.channel : '(missing)', 20)}${row.ok ? 'PASS' : 'FAIL'}`,
  );
}
console.log(rule);
console.log(`api methods: ${apiMethods.join(', ') || '(none)'}`);
console.log(`string props: ${apiProps.join(', ') || '(none)'}`);
console.log(`ipcMain.handle channels: ${mainChannels.join(', ') || '(none)'}`);
if (extraChannels.length > 0) console.log(`app-level extras: ${extraChannels.join(', ')}`);
console.log(rule);

if (problems.length > 0) {
  console.log(`RESULT: FAIL (${problems.length})`);
  for (const problem of problems) console.log(`  - ${problem}`);
  process.exit(1);
}

console.log(`RESULT: PASS (${rows.length}/${apiMethods.length} methods mapped 1:1)`);
