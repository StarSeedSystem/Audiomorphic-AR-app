const { app, BrowserWindow, shell, powerSaveBlocker, ipcMain, desktopCapturer, systemPreferences } = require('electron');
const path = require('path');
const http = require('http');
const fs = require('fs');

let mainWindow;
let powerId;
let server;

// Simple local server to handle Firebase OAuth origins (file:// doesn't work)
function startLocalServer() {
  return new Promise((resolve) => {
    const port = 3000;
    server = http.createServer((req, res) => {
      let filePath = path.join(__dirname, 'dist', req.url === '/' ? 'index.html' : req.url);
      
      // Basic SPA support: if file doesn't exist, serve index.html
      if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
         filePath = path.join(__dirname, 'dist', 'index.html');
      }

      const extname = path.extname(filePath);
      let contentType = 'text/html';
      switch (extname) {
        case '.js': contentType = 'text/javascript'; break;
        case '.css': contentType = 'text/css'; break;
        case '.json': contentType = 'application/json'; break;
        case '.png': contentType = 'image/png'; break;
        case '.jpg': contentType = 'image/jpg'; break;
        case '.svg': contentType = 'image/svg+xml'; break;
      }

      fs.readFile(filePath, (error, content) => {
        if (error) {
          res.writeHead(500);
          res.end('Error: ' + error.code);
        } else {
          res.writeHead(200, { 'Content-Type': contentType });
          res.end(content, 'utf-8');
        }
      });
    });

    server.listen(port, '127.0.0.1', () => {
      console.log(`Server running at http://127.0.0.1:${port}/`);
      resolve(`http://127.0.0.1:${port}/`);
    });
  });
}

async function createWindow() {
  const url = await startLocalServer();
  
  // Set a common browser User-Agent to prevent Google from blocking the "embedded" browser
  const userAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
  
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 960,
    minHeight: 540,
    fullscreen: true,
    autoHideMenuBar: true,
    frame: true,
    title: "Audiomorphic",
    backgroundColor: '#050505',
    icon: path.join(__dirname, 'build', 'icon.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.cjs'),
      webSecurity: true 
    },
  });

  // Launch in fullscreen to cover all elements including top bar and taskbars
  mainWindow.setFullScreen(true);

  // Support F11 and Escape shortcut to toggle true borderless fullscreen
  mainWindow.webContents.on('before-input-event', (event, input) => {
    if ((input.key === 'F11' || (input.key === 'Escape' && mainWindow.isFullScreen())) && input.type === 'keyDown') {
      mainWindow.setFullScreen(!mainWindow.isFullScreen());
      event.preventDefault();
    }
  });

  // Apply User-Agent to the current session
  mainWindow.webContents.setUserAgent(userAgent);

  // Keep screen active
  powerId = powerSaveBlocker.start('prevent-display-sleep');

  // Load the Local Server URL
  mainWindow.loadURL(url, { userAgent });

  // Open any target="_blank" or window.open in default OS browser (e.g., Stripe links)
  // EXCEPT: Allow Firebase auth popups to open within Electron
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    const isFirebaseAuth = url.includes('firebaseapp.com') || 
                           url.includes('accounts.google.com') || 
                           url.includes('googleapis.com') ||
                           url.includes('firebase.google.com') ||
                           url.includes('auth.google.com');
    
    if (isFirebaseAuth) {
      return { 
        action: 'allow',
        overrideBrowserWindowOptions: {
          autoHideMenuBar: true,
          webPreferences: {
            nodeIntegration: false,
            contextIsolation: true
          }
        }
      };
    }
    
    if (url.startsWith('http') && !url.includes('localhost') && !url.includes('127.0.0.1')) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });

  // Prevent main window from navigating away. Redirect to OS browser instead.
  // EXCEPT: Allow Firebase auth redirects to pass through for Google login
  mainWindow.webContents.on('will-navigate', (event, url) => {
    const isLocalhost = url.includes('localhost') || url.includes('127.0.0.1');
    const isFirebaseAuth = url.includes('firebaseapp.com') || 
                           url.includes('accounts.google.com') || 
                           url.includes('googleapis.com') ||
                           url.includes('firebase.googleapis.com');
    
    if (url.startsWith('http') && !isLocalhost && !isFirebaseAuth) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });

  // Permissions: Allow media, inputs and output routing (speakers/bluetooth/audio interfaces)
  const allowedPermissions = [
    'media', 'camera', 'microphone', 'display-capture', 'notifications',
    'speaker-selection', 'audio-capture', 'video-capture', 'midi', 'midi-sysex',
    'pointerLock', 'fullscreen', 'window-management', 'device-info', 'background-sync',
    'accessibility-events'
  ];

  mainWindow.webContents.session.setPermissionRequestHandler((webContents, permission, callback) => {
    if (allowedPermissions.includes(permission)) {
      console.log(`Granting permission: ${permission}`);
      callback(true);
    } else {
      console.log(`Denying permission: ${permission}`);
      callback(false);
    }
  });
  
  mainWindow.webContents.session.setPermissionCheckHandler((webContents, permission) => {
    return allowedPermissions.includes(permission);
  });

  // Handle audio output device routing for PulseAudio/ALSA/PipeWire/CoreAudio/WASAPI
  if (mainWindow.webContents.session.on) {
    mainWindow.webContents.session.on('select-audio-output', (event, audioOutputDevices, callback) => {
      callback(audioOutputDevices[0]?.deviceId || '');
    });
  }

  // Display media request handler for desktop and system audio loopback capture (Wayland/PipeWire/X11)
  if (mainWindow.webContents.session.setDisplayMediaRequestHandler) {
    mainWindow.webContents.session.setDisplayMediaRequestHandler((request, callback) => {
      desktopCapturer.getSources({ types: ['screen', 'window'] }).then((sources) => {
        if (sources.length > 0) {
          callback({ video: sources[0], audio: 'loopback' });
        } else {
          callback({});
        }
      }).catch((err) => {
        console.error('DisplayMedia handler error:', err);
        callback({});
      });
    });
  }

  // Handle media access status check
  ipcMain.handle('get-media-access-status', async (event, mediaType) => {
    if (process.platform === 'darwin') {
      const status = systemPreferences.getMediaAccessStatus(mediaType);
      return status === 'granted';
    }
    return true; // Not macOS
  });

  ipcMain.on('toggle-fullscreen', () => {
    if (mainWindow) {
      const isFullScreen = mainWindow.isFullScreen();
      mainWindow.setFullScreen(!isFullScreen);
    }
  });

  // Handle system audio/desktop capture
  ipcMain.handle('get-desktop-sources', async () => {
    try {
      const sources = await desktopCapturer.getSources({ 
        types: ['window', 'screen'], 
        thumbnailSize: { width: 150, height: 150 },
        fetchWindowIcons: true 
      });
      return sources.map(s => ({
        id: s.id,
        name: s.name,
        thumbnail: s.thumbnail.toDataURL()
      }));
    } catch (err) {
      console.error('Error fetching desktop sources:', err);
      return [];
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
    if (server) server.close();
    if (powerId && powerSaveBlocker.isStarted(powerId)) {
        powerSaveBlocker.stop(powerId);
    }
  });
}

// Enable WebXR, hardware acceleration and autoplay policies
app.commandLine.appendSwitch('enable-webxr');
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');
app.commandLine.appendSwitch('enable-features', 'WebXR,WebXRIncubations,AudioServiceOutOfProcess,SpeakerSelection,WebRTCPipeWireCapturer,VaapiVideoDecoder');

// Linux-specific audio & display architecture (PulseAudio, ALSA, PipeWire, Wayland, X11)
if (process.platform === 'linux') {
  app.commandLine.appendSwitch('alsa-output-device', 'default');
  app.commandLine.appendSwitch('enable-audio-service-sandbox');
  app.commandLine.appendSwitch('enable-raw-audio-capture');
  app.commandLine.appendSwitch('ozone-platform-hint', 'auto');
}

app.whenReady().then(async () => {
  // Explicitly ask for microphone, camera, and screen permissions on macOS
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
