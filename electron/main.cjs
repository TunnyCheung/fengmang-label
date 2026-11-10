const { app, BrowserWindow, dialog, ipcMain, session } = require('electron');
const { execFile } = require('node:child_process');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { promisify } = require('node:util');

const execFileAsync = promisify(execFile);

const RAWPRINT_SCRIPT = app.isPackaged
  ? path.join(process.resourcesPath, 'rawprint.ps1')
  : path.join(__dirname, 'rawprint.ps1');
const APP_ICON = path.join(__dirname, 'icon.ico');
const APP_TITLE = '锋芒标签打印';

app.setName(APP_TITLE);

let mainWindow = null;

function windowFor(event) {
  return BrowserWindow.fromWebContents(event.sender) || mainWindow;
}

function isTrustedSender(event) {
  return Boolean(mainWindow && !mainWindow.isDestroyed() && event.sender === mainWindow.webContents);
}

function handle(channel, fn, fallback) {
  ipcMain.handle(channel, (event, ...args) => {
    if (!isTrustedSender(event)) {
      return typeof fallback === "function" ? fallback() : { ok: false, error: "未授权的调用来源" };
    }
    return fn(event, ...args);
  });
}

function isTrueFlag(value) {
  return value === true || value === 'true' || value === 1 || value === '1';
}

function toStatus(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : undefined;
}

function normalizeFilters(filters) {
  if (!Array.isArray(filters)) return undefined;
  const list = filters
    .filter((item) => item && typeof item.name === 'string' && Array.isArray(item.extensions))
    .map((item) => ({
      name: item.name,
      extensions: item.extensions.filter((ext) => typeof ext === 'string' && ext.length > 0),
    }))
    .filter((item) => item.extensions.length > 0);
  return list.length > 0 ? list : undefined;
}

function safeSegment(value) {
  return String(value || '')
    .replace(/[^\w.-]+/g, '-')
    .replace(/^[-.]+|[-.]+$/g, '')
    .slice(0, 32) || 'label';
}

function parseJsonLine(text) {
  const lines = String(text || '')
    .trim()
    .split(/\r?\n/)
    .filter(Boolean);
  for (let i = lines.length - 1; i >= 0; i -= 1) {
    try {
      const parsed = JSON.parse(lines[i].replace(/^\uFEFF/, ''));
      if (parsed && typeof parsed === 'object') return parsed;
    } catch {
      continue;
    }
  }
  return null;
}

async function sendRawFile(printer, filePath) {
  const args = [
    '-NoProfile',
    '-NonInteractive',
    '-ExecutionPolicy',
    'Bypass',
    '-File',
    RAWPRINT_SCRIPT,
    '-Printer',
    printer,
    '-File',
    filePath,
  ];
  try {
    const { stdout } = await execFileAsync('powershell.exe', args, {
      encoding: 'utf8',
      timeout: 30000,
      windowsHide: true,
    });
    return { parsed: parseJsonLine(stdout), detail: '' };
  } catch (err) {
    return {
      parsed: parseJsonLine(err.stdout),
      detail: String(err.stderr || err.message || '').trim(),
    };
  }
}

function registerIpc() {
  handle('app:version', () => {
    try {
      return { ok: true, version: app.getVersion() };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  });

  handle('app:platform', () => {
    try {
      return { ok: true, platform: process.platform };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  });

  handle('printers:list', async (event) => {
    try {
      const win = windowFor(event);
      if (!win) return [];
      const printers = await win.webContents.getPrintersAsync();
      const hasDefault = printers.some((p) => isTrueFlag((p.options || {})['printer-is-default']));
      return printers.map((printer, index) => {
        const options = printer.options || {};
        return {
          name: printer.name,
          displayName: printer.description || printer.name,
          description: printer.description,
          isDefault:
            isTrueFlag(options['printer-is-default']) || (!hasDefault && index === 0),
          status: toStatus(options['printer-state']),
          options,
        };
      });
    } catch (err) {
      console.error('[printers:list]', err);
      return [];
    }
  }, () => []);

  handle('print:label', async (_event, req) => {
    let filePath = '';
    try {
      const printer = req && typeof req.printer === 'string' ? req.printer.trim() : '';
      const commands = req && typeof req.commands === 'string' ? req.commands : '';
      if (!printer) return { ok: false, error: '未指定打印机' };
      if (!commands) return { ok: false, error: '打印指令为空' };

      const ext = req && req.language === 'tspl' ? '.tspl' : '.zpl';
      const stamp = Date.now();
      filePath = path.join(
        os.tmpdir(),
        `fengmang-${safeSegment(req.jobName)}-${process.pid}-${stamp}${ext}`,
      );
      await fs.writeFile(filePath, commands, 'utf8');

      const { parsed, detail } = await sendRawFile(printer, filePath);
      if (parsed && parsed.ok) {
        return {
          ok: true,
          jobId: parsed.jobId === undefined || parsed.jobId === null ? undefined : String(parsed.jobId),
        };
      }
      return {
        ok: false,
        error: (parsed && parsed.error) || detail || '打印任务发送失败',
      };
    } catch (err) {
      console.error('[print:label]', err);
      return { ok: false, error: err.message };
    } finally {
      if (filePath) {
        await fs.unlink(filePath).catch(() => {});
      }
    }
  });

  handle('print:system', async (event, opts) => {
    try {
      const win = windowFor(event);
      if (!win) return { ok: false, error: '窗口不可用' };

      const options = {
        silent: true,
        printBackground: true,
        margins: { marginType: 'none' },
      };
      const deviceName = opts && typeof opts.printer === 'string' ? opts.printer.trim() : '';
      if (deviceName) options.deviceName = deviceName;
      const copies = Math.floor(Number(opts && opts.copies));
      if (Number.isFinite(copies) && copies > 0) options.copies = Math.min(copies, 999);

      // Pin the physical page to the label size (microns) so the driver does not
      // fall back to A4 and blow the artwork up.
      const pageSize = opts && opts.pageSize;
      const pw = Number(pageSize && pageSize.width);
      const ph = Number(pageSize && pageSize.height);
      if (Number.isFinite(pw) && pw > 0 && Number.isFinite(ph) && ph > 0) {
        const width = Math.min(pw, 2000);
        const height = Math.min(ph, 2000);
        options.pageSize = { width: Math.round(width * 1000), height: Math.round(height * 1000) };
        options.scaleFactor = 100;
      }

      return await new Promise((resolve) => {
        win.webContents.print(options, (success, failureReason) => {
          if (success) resolve({ ok: true });
          else resolve({ ok: false, error: failureReason || '系统打印失败' });
        });
      });
    } catch (err) {
      console.error('[print:system]', err);
      return { ok: false, error: err.message };
    }
  });

  handle('file:save', async (event, opts) => {
    try {
      const win = windowFor(event);
      const defaultName = opts && typeof opts.defaultName === 'string' ? opts.defaultName : 'label';
      const options = { defaultPath: defaultName };
      const filters = normalizeFilters(opts && opts.filters);
      if (filters) options.filters = filters;

      const result = win
        ? await dialog.showSaveDialog(win, options)
        : await dialog.showSaveDialog(options);
      if (result.canceled || !result.filePath) return { ok: false, canceled: true };

      const data = opts && opts.data !== undefined && opts.data !== null ? String(opts.data) : '';
      if (opts && opts.encoding === 'base64') {
        await fs.writeFile(result.filePath, Buffer.from(data, 'base64'));
      } else {
        await fs.writeFile(result.filePath, data, 'utf8');
      }
      return { ok: true, path: result.filePath, canceled: false };
    } catch (err) {
      console.error('[file:save]', err);
      return { ok: false, error: err.message };
    }
  });

  handle('file:open', async (event, opts) => {
    try {
      const win = windowFor(event);
      const options = { properties: ['openFile'] };
      const filters = normalizeFilters(opts && opts.filters);
      if (filters) options.filters = filters;

      const result = win
        ? await dialog.showOpenDialog(win, options)
        : await dialog.showOpenDialog(options);
      if (result.canceled || !result.filePaths || result.filePaths.length === 0) {
        return { ok: false, canceled: true };
      }

      const filePath = result.filePaths[0];
      const text = await fs.readFile(filePath, 'utf8');
      return { ok: true, name: path.basename(filePath), text, canceled: false };
    } catch (err) {
      console.error('[file:open]', err);
      return { ok: false, error: err.message };
    }
  });

  handle('window:minimize', (event) => {
    try {
      const win = windowFor(event);
      if (win) win.minimize();
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  });

  handle('window:toggle-maximize', (event) => {
    try {
      const win = windowFor(event);
      if (!win) return { ok: false, error: '窗口不可用' };
      if (win.isMaximized()) win.unmaximize();
      else win.maximize();
      return { ok: true, maximized: win.isMaximized() };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  });

  handle('window:close', (event) => {
    try {
      const win = windowFor(event);
      if (win) win.close();
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  });

  handle('window:is-maximized', (event) => {
    try {
      const win = windowFor(event);
      return { ok: true, maximized: win ? win.isMaximized() : false };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1152,
    height: 920,
    minWidth: 1024,
    minHeight: 720,
    backgroundColor: '#f3f4f6',
    title: APP_TITLE,
    icon: APP_ICON,
    frame: false,
    thickFrame: true,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webviewTag: false,
      devTools: !app.isPackaged,
      additionalArguments: [
        `--labelcraft-platform=${process.platform}`,
        `--labelcraft-version=${app.getVersion()}`,
      ],
    },
  });

  mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (url !== mainWindow.webContents.getURL()) event.preventDefault();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  const pushMaximized = () => {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    mainWindow.webContents.send('window:maximized-changed', mainWindow.isMaximized());
  };
  mainWindow.on('maximize', pushMaximized);
  mainWindow.on('unmaximize', pushMaximized);

  const devServerUrl = process.env.VITE_DEV_SERVER_URL;
  if (devServerUrl) {
    mainWindow.loadURL(devServerUrl);
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

const gotLock = app.requestSingleInstanceLock();

if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (!mainWindow) return;
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  });

  app.whenReady().then(() => {
    app.setAppUserModelId('com.fengmang.labelprint');
    session.defaultSession.setPermissionRequestHandler((_wc, _permission, callback) => callback(false));
    registerIpc();
    createWindow();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
  });
}
