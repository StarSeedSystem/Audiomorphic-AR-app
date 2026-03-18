const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  toggleFullScreen: () => ipcRenderer.send('toggle-fullscreen'),
  onFullScreenChange: (callback) => ipcRenderer.on('fullscreen-change', (event, isFullscreen) => callback(isFullscreen))
});
