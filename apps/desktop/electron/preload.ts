import { contextBridge, ipcRenderer, clipboard } from 'electron';
import type { ElectronAPI } from './ipc.js';

const api: ElectronAPI = {
  // Projects
  getProjects: () => ipcRenderer.invoke('db:getProjects'),
  getProject: (id: string) => ipcRenderer.invoke('db:getProject', id),
  createProject: (data) => ipcRenderer.invoke('db:createProject', data),
  updateProject: (id, updates) => ipcRenderer.invoke('db:updateProject', id, updates),
  duplicateProject: (id) => ipcRenderer.invoke('db:duplicateProject', id),
  deleteProject: (id) => ipcRenderer.invoke('db:deleteProject', id),

  // Panels
  getPanels: (projectId) => ipcRenderer.invoke('db:getPanels', projectId),
  getPanel: (id) => ipcRenderer.invoke('db:getPanel', id),
  createPanel: (data) => ipcRenderer.invoke('db:createPanel', data),
  updatePanel: (id, updates) => ipcRenderer.invoke('db:updatePanel', id, updates),
  deletePanel: (id) => ipcRenderer.invoke('db:deletePanel', id),

  // Circuits
  getCircuits: (panelId) => ipcRenderer.invoke('db:getCircuits', panelId),
  createCircuit: (data) => ipcRenderer.invoke('db:createCircuit', data),
  updateCircuit: (id, updates) => ipcRenderer.invoke('db:updateCircuit', id, updates),
  deleteCircuit: (id) => ipcRenderer.invoke('db:deleteCircuit', id),

  // Settings
  getSettings: () => ipcRenderer.invoke('db:getSettings'),
  setSetting: (key, value) => ipcRenderer.invoke('db:setSetting', key, value),

  // Cable Catalogue
  getCableCatalogue: (tableKey, manufacturer) => ipcRenderer.invoke('db:getCableCatalogue', tableKey, manufacturer),
  saveCableCatalogueEntry: (entry) => ipcRenderer.invoke('db:saveCableCatalogueEntry', entry),
  deleteCableCatalogueEntry: (id) => ipcRenderer.invoke('db:deleteCableCatalogueEntry', id),
  importCableCatalogue: (entries) => ipcRenderer.invoke('db:importCableCatalogue', entries),

  // Native Utilities
  copyToClipboard: async (text: string) => {
    clipboard.writeText(text);
    return true;
  }
};

contextBridge.exposeInMainWorld('electronAPI', api);
