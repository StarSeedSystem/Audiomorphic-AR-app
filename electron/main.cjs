const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, '../audiomorphic-ar.png')
  });

  // Load the app
  if (app.isPackaged) {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  } else {
    mainWindow.loadURL('http://localhost:5173');
  }
  // Open DevTools if needed
  // mainWindow.webContents.openDevTools();
}

app.whenReady().then(() => {
  // Handle permissions
  app.on('web-contents-created', (event, contents) => {
    contents.session.setPermissionCheckHandler((webContents, permission) => {
      if (permission === 'media') return true;
      return false;
    });
    contents.session.setPermissionRequestHandler((webContents, permission, callback) => {
      if (permission === 'media') return callback(true);
      callback(false);
    });
  });

  ipcMain.on('toggle-fullscreen', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win) {
      const isFullscreen = !win.isFullScreen();
      win.setFullScreen(isFullscreen);
      event.reply('fullscreen-change', isFullscreen);
    }
  });

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
