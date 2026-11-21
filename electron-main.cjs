const { app, BrowserWindow, shell, powerSaveBlocker, ipcMain, desktopCapturer, systemPreferences, protocol } = require('electron');
const path = require('path');
const fs = require('fs');

protocol.registerSchemesAsPrivileged([
  {
    scheme: 'app',
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
      stream: true,
    },
  },
]);

let mainWindow;
let powerId;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.cjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.wasm': 'application/wasm',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.glb': 'model/gltf-binary',
  '.gltf': 'model/gltf+json',
  '.hdr': 'application/octet-stream',
};

function registerAppProtocol() {
  const distDir = path.resolve(__dirname, 'dist');

  protocol.handle('app', async (request) => {
    try {
      const reqUrl = new URL(request.url);
      let relPath = decodeURIComponent(reqUrl.pathname || '/').replace(/^\/+/, '');
      if (!relPath) relPath = 'index.html';

      let filePath = path.resolve(distDir, relPath);
      if (filePath !== distDir && !filePath.startsWith(distDir + path.sep)) {
        return new Response('Forbidden', { status: 403 });
      }

      let isValidFile = false;
      try {
        const st = await fs.promises.stat(filePath);
        isValidFile = st.isFile();
      } catch {
        isValidFile = false;
      }

      if (!isValidFile) {
        if (!path.extname(relPath)) {
          filePath = path.join(distDir, 'index.html');
        } else {
          return new Response('Not Found', {
            status: 404,
            headers: { 'Content-Type': 'text/plain; charset=utf-8' },
          });
        }
      }

      const ext = path.extname(filePath).toLowerCase();
      const mimeType = MIME_TYPES[ext] || 'application/octet-stream';
      const content = await fs.promises.readFile(filePath);

      return new Response(content, {
        status: 200,
        headers: {
          'Content-Type': mimeType,
          'Cache-Control': 'no-store',
        },
      });
    } catch (err) {
      console.error('[app:// protocol error]', err);
      return new Response('Internal Server Error', { status: 500 });
    }
  });
}

let ipcRegistered = false;
function registerIpcHandlers() {
  if (ipcRegistered) return;
  ipcRegistered = true;

  ipcMain.handle('get-media-access-status', async (_event, mediaType) => {
    if (process.platform === 'darwin') {
      const status = systemPreferences.getMediaAccessStatus(mediaType);
      return status === 'granted';
    }
    return true;
  });

  ipcMain.on('toggle-fullscreen', () => {
    if (mainWindow) {
      const isFullScreen = mainWindow.isFullScreen();
      mainWindow.setFullScreen(!isFullScreen);
    }
  });

  ipcMain.handle('open-external', async (_event, url) => {
    if (url && typeof url === 'string') {
      await shell.openExternal(url);
      return true;
    }
    return false;
  });

  ipcMain.handle('get-desktop-sources', async () => {
    try {
      const sources = await desktopCapturer.getSources({
        types: ['window', 'screen'],
        thumbnailSize: { width: 150, height: 150 },
        fetchWindowIcons: true,
      });
      return sources.map((s) => ({
        id: s.id,
        name: s.name,
        thumbnail: s.thumbnail.toDataURL(),
      }));
    } catch (err) {
      console.error('Error fetching desktop sources:', err);
      return [];
    }
  });
}

async function createWindow() {
  const userAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 960,
    minHeight: 540,
    fullscreen: true,
    autoHideMenuBar: true,
    frame: true,
    title: 'Audiomorphic',
    backgroundColor: '#050505',
    icon: path.join(__dirname, 'build', 'icon.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.cjs'),
      webSecurity: true,
    },
  });

  mainWindow.setFullScreen(true);

  mainWindow.webContents.on('before-input-event', (event, input) => {
    if ((input.key === 'F11' || (input.key === 'Escape' && mainWindow.isFullScreen())) && input.type === 'keyDown') {
      mainWindow.setFullScreen(!mainWindow.isFullScreen());
      event.preventDefault();
    }
  });

  mainWindow.webContents.setUserAgent(userAgent);
  powerId = powerSaveBlocker.start('prevent-display-sleep');

  // Clear stale Service Workers and Cache Storage so updated builds load cleanly offline
  mainWindow.webContents.session.clearCache().catch(() => {});
  mainWindow.webContents.session.clearStorageData({ storages: ['serviceworkers', 'cachestorage'] }).catch(() => {});

  let didFallbackToFile = false;
  mainWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL) => {
    if (!didFallbackToFile && errorCode !== -3 && validatedURL && validatedURL.startsWith('app://')) {
      didFallbackToFile = true;
      console.warn(`[Audiomorphic] app:// failed (${errorCode}: ${errorDescription}), falling back to local file.`);
      mainWindow.loadFile(path.join(__dirname, 'dist', 'index.html')).catch(() => {});
    }
  });

  mainWindow.loadURL('app://audiomorphic/index.html', { userAgent });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    const isAuthPopup =
      url.includes('firebaseapp.com') ||
      url.includes('accounts.google.com') ||
      url.includes('googleapis.com') ||
      url.includes('firebase.google.com') ||
      url.includes('auth.google.com') ||
      url.includes('supabase.co');

    if (isAuthPopup) {
      return {
        action: 'allow',
        overrideBrowserWindowOptions: {
          autoHideMenuBar: true,
          webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
          },
        },
      };
    }

    const isLocalOrigin =
      url.startsWith('app://') ||
      url.startsWith('file://') ||
      url.includes('localhost') ||
      url.includes('127.0.0.1');

    if (url.startsWith('http') && !isLocalOrigin) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });

  mainWindow.webContents.on('will-navigate', (event, url) => {
    const isLocalOrigin =
      url.startsWith('app://') ||
      url.startsWith('file://') ||
      url.includes('localhost') ||
      url.includes('127.0.0.1');
    const isAuthRedirect =
      url.includes('firebaseapp.com') ||
      url.includes('accounts.google.com') ||
      url.includes('googleapis.com') ||
      url.includes('firebase.googleapis.com') ||
      url.includes('supabase.co');

    if (url.startsWith('http') && !isLocalOrigin && !isAuthRedirect) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });

  const allowedPermissions = [
    'media', 'camera', 'microphone', 'display-capture', 'notifications',
    'speaker-selection', 'audio-capture', 'video-capture', 'midi', 'midi-sysex',
    'pointerLock', 'fullscreen', 'window-management', 'device-info', 'background-sync',
    'accessibility-events',
  ];

  mainWindow.webContents.session.setPermissionRequestHandler((_webContents, permission, callback) => {
    callback(allowedPermissions.includes(permission));
  });

  mainWindow.webContents.session.setPermissionCheckHandler((_webContents, permission) => {
    return allowedPermissions.includes(permission);
  });

  if (mainWindow.webContents.session.on) {
    mainWindow.webContents.session.on('select-audio-output', (_event, audioOutputDevices, callback) => {
      callback(audioOutputDevices[0]?.deviceId || '');
    });
  }

  if (mainWindow.webContents.session.setDisplayMediaRequestHandler) {
    mainWindow.webContents.session.setDisplayMediaRequestHandler((_request, callback) => {
      desktopCapturer.getSources({ types: ['screen', 'window'] })
        .then((sources) => {
          if (sources.length > 0) {
            callback({ video: sources[0], audio: 'loopback' });
          } else {
            callback({});
          }
        })
        .catch((err) => {
          console.error('DisplayMedia handler error:', err);
          callback({});
        });
    });
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
    if (powerId && powerSaveBlocker.isStarted(powerId)) {
      powerSaveBlocker.stop(powerId);
    }
  });
}

// Enable WebXR, hardware acceleration and autoplay policies
app.commandLine.appendSwitch('enable-webxr');
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');
app.commandLine.appendSwitch('enable-features', 'WebXR,WebXRIncubations,AudioServiceOutOfProcess,SpeakerSelection,WebRTCPipeWireCapturer,VaapiVideoDecoder');

if (process.platform === 'linux') {
  app.commandLine.appendSwitch('alsa-output-device', 'default');
  app.commandLine.appendSwitch('enable-audio-service-sandbox');
  app.commandLine.appendSwitch('enable-raw-audio-capture');
  app.commandLine.appendSwitch('ozone-platform-hint', 'auto');
}

app.whenReady().then(async () => {
  registerAppProtocol();
  registerIpcHandlers();

  if (process.platform === 'darwin') {
    try {
      const micStatus = systemPreferences.getMediaAccessStatus('microphone');
      if (micStatus !== 'granted') {
        await systemPreferences.askForMediaAccess('microphone');
      }
      const camStatus = systemPreferences.getMediaAccessStatus('camera');
      if (camStatus !== 'granted') {
        await systemPreferences.askForMediaAccess('camera');
      }
      const screenStatus = systemPreferences.getMediaAccessStatus('screen');
      console.log('Screen Recording Access Status:', screenStatus);
    } catch (err) {
      console.error('SystemPreferences error:', err);
    }
  }

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
