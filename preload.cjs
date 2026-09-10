const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  getDesktopSources: () => ipcRenderer.invoke('get-desktop-sources'),
  getMediaAccessStatus: (mediaType) => ipcRenderer.invoke('get-media-access-status', mediaType),
  toggleFullscreen: () => ipcRenderer.send('toggle-fullscreen'),
});
