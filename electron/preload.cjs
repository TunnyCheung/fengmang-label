const { contextBridge, ipcRenderer } = require('electron');

function readArg(prefix, fallback) {
  const argv = Array.isArray(process.argv) ? process.argv : [];
  const hit = argv.find((item) => typeof item === 'string' && item.startsWith(prefix));
  return hit ? hit.slice(prefix.length) : fallback;
}

contextBridge.exposeInMainWorld('labelcraft', {
  listPrinters: () => ipcRenderer.invoke('printers:list'),
  printLabel: (req) => ipcRenderer.invoke('print:label', req),
  printSystem: (opts) => ipcRenderer.invoke('print:system', opts),
  saveFile: (opts) => ipcRenderer.invoke('file:save', opts),
  readTextFile: (opts) => ipcRenderer.invoke('file:open', opts),
  windowControls: {
    minimize: () => ipcRenderer.invoke('window:minimize'),
    toggleMaximize: () => ipcRenderer.invoke('window:toggle-maximize'),
    close: () => ipcRenderer.invoke('window:close'),
    isMaximized: () => ipcRenderer.invoke('window:is-maximized'),
    onMaximizedChange: (cb) => {
      const handler = (_event, value) => cb(Boolean(value));
      ipcRenderer.on('window:maximized-changed', handler);
      return () => ipcRenderer.removeListener('window:maximized-changed', handler);
    },
  },
  platform: readArg('--labelcraft-platform=', process.platform || 'unknown'),
  version: readArg('--labelcraft-version=', '0.0.0'),
});
