const { app, BrowserWindow } = require('electron');
const path = require('path');

// 1. Start your Express server (server.js)
require('./server.js');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    title: "CodeWix",
    icon: path.join(__dirname, 'favicon.ico'), // 👈 Uses your new 256x256 icon
    autoHideMenuBar: true,                     // 👈 Hides the File/Edit/View menu bar
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  // 2. Wait 1 second for the Express server to start, then load the app
  setTimeout(() => {
    mainWindow.loadURL('http://localhost:5500');
  }, 1000);

  mainWindow.on('closed', function () {
    mainWindow = null;
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', function () {
  if (mainWindow === null) {
    createWindow();
  }
});