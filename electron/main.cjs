const { app, BrowserWindow, Menu } = require('electron');
const path = require('path');

// Ensure production environment so static assets and configuration align correctly
process.env.NODE_ENV = 'production';

// Determine directory holding clinical database files
let clinicDataDir = process.cwd();
try {
  if (process.env.PORTABLE_EXECUTABLE_DIR) {
    // Specifically handle Electron Builder's portable target
    clinicDataDir = process.env.PORTABLE_EXECUTABLE_DIR;
  } else if (app.isPackaged) {
    clinicDataDir = path.dirname(app.getPath('exe'));
  } else {
    clinicDataDir = process.cwd();
  }
  process.env.CLINIC_DATA_DIR = clinicDataDir;
  console.log('Using robust writeable storage directory alongside exe:', process.env.CLINIC_DATA_DIR);
} catch (e) {
  console.warn('Unable to retrieve exe/userData path, defaulting to cwd:', e);
}

// Start the embedded Express background API & database server
try {
  const serverPath = path.join(__dirname, '..', 'dist', 'server.cjs');
  console.log('Bootstrapping embedded background database server at:', serverPath);
  require(serverPath);
} catch (err) {
  console.error('Failed to boot embedded database server:', err);
}

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 720,
    show: false, // Show once ready to avoid white flash
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    // Optional placeholder icon configuration
    icon: path.join(__dirname, 'icon.png')
  });

  // Load the application via the local embedded server
  const loadURL = () => {
    mainWindow.loadURL('http://localhost:3000').catch((err) => {
      console.log('Local server is booting up, retrying load in 500ms...');
      setTimeout(loadURL, 500);
    });
  };
  loadURL();

  // Hide the default operating system menu bar for a clean, professional view
  Menu.setApplicationMenu(null);
  mainWindow.setMenuBarVisibility(false);

  mainWindow.once('ready-to-show', () => {
    mainWindow.maximize();
    mainWindow.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Ensure single instance lock so multiple windows don't conflict
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(() => {
    createWindow();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
      }
    });
  });
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
