import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import { AppDatabase } from './db.js';

let mainWindow: BrowserWindow | null = null;
let db: AppDatabase;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1080,
    minHeight: 700,
    backgroundColor: '#0E1A24',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  const isDev = process.env.VITE_DEV_SERVER_URL !== undefined;
  if (isDev) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL!);
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function registerIpcHandlers() {
  // Projects
  ipcMain.handle('db:getProjects', () => db.getProjects());
  ipcMain.handle('db:getProject', (_, id: string) => db.getProject(id) || null);
  ipcMain.handle('db:createProject', (_, data) => db.createProject(data));
  ipcMain.handle('db:updateProject', (_, id: string, updates) => db.updateProject(id, updates) || null);
  ipcMain.handle('db:duplicateProject', (_, id: string) => db.duplicateProject(id) || null);
  ipcMain.handle('db:deleteProject', (_, id: string) => db.deleteProject(id));

  // Panels
  ipcMain.handle('db:getPanels', (_, projectId: string) => db.getPanels(projectId));
  ipcMain.handle('db:getPanel', (_, id: string) => db.getPanel(id) || null);
  ipcMain.handle('db:createPanel', (_, data) => db.createPanel(data));
  ipcMain.handle('db:updatePanel', (_, id: string, updates) => db.updatePanel(id, updates) || null);
  ipcMain.handle('db:deletePanel', (_, id: string) => db.deletePanel(id));

  // Circuits
  ipcMain.handle('db:getCircuits', (_, panelId: string) => db.getCircuits(panelId));
  ipcMain.handle('db:createCircuit', (_, data) => db.createCircuit(data));
  ipcMain.handle('db:updateCircuit', (_, id: string, updates) => db.updateCircuit(id, updates) || null);
  ipcMain.handle('db:deleteCircuit', (_, id: string) => db.deleteCircuit(id));

  // Settings
  ipcMain.handle('db:getSettings', () => db.getSettings());
  ipcMain.handle('db:setSetting', (_, key: string, value: string) => db.setSetting(key, value));

  // Cable Catalogue
  ipcMain.handle('db:getCableCatalogue', (_, tableKey?: string, manufacturer?: string) => db.getCableCatalogue(tableKey, manufacturer));
  ipcMain.handle('db:saveCableCatalogueEntry', (_, entry) => db.saveCableCatalogueEntry(entry));
  ipcMain.handle('db:deleteCableCatalogueEntry', (_, id: number) => db.deleteCableCatalogueEntry(id));
  ipcMain.handle('db:importCableCatalogue', (_, entries: any[]) => db.importCableCatalogue(entries));
}

app.whenReady().then(() => {
  db = new AppDatabase();
  registerIpcHandlers();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
