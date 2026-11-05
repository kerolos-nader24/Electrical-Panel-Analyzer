import type { ProjectRecord, PanelRecord, CircuitRecord } from './db.js';

export interface ElectronAPI {
  // Projects
  getProjects: () => Promise<ProjectRecord[]>;
  getProject: (id: string) => Promise<ProjectRecord | null>;
  createProject: (data: Omit<ProjectRecord, 'created_at' | 'updated_at'>) => Promise<ProjectRecord>;
  updateProject: (id: string, updates: Partial<ProjectRecord>) => Promise<ProjectRecord | null>;
  duplicateProject: (id: string) => Promise<ProjectRecord | null>;
  deleteProject: (id: string) => Promise<boolean>;

  // Panels
  getPanels: (projectId: string) => Promise<PanelRecord[]>;
  getPanel: (id: string) => Promise<PanelRecord | null>;
  createPanel: (data: Omit<PanelRecord, 'created_at' | 'updated_at'>) => Promise<PanelRecord>;
  updatePanel: (id: string, updates: Partial<PanelRecord>) => Promise<PanelRecord | null>;
  deletePanel: (id: string) => Promise<boolean>;

  // Circuits
  getCircuits: (panelId: string) => Promise<CircuitRecord[]>;
  createCircuit: (data: Omit<CircuitRecord, 'created_at' | 'updated_at'>) => Promise<CircuitRecord>;
  updateCircuit: (id: string, updates: Partial<CircuitRecord>) => Promise<CircuitRecord | null>;
  deleteCircuit: (id: string) => Promise<boolean>;

  // Settings
  getSettings: () => Promise<Record<string, string>>;
  setSetting: (key: string, value: string) => Promise<void>;

  // Cable Catalogue
  getCableCatalogue: (tableKey?: string, manufacturer?: string) => Promise<any[]>;
  saveCableCatalogueEntry: (entry: any) => Promise<any>;
  deleteCableCatalogueEntry: (id: number) => Promise<boolean>;
  importCableCatalogue: (entries: any[]) => Promise<number>;

  // Native Utilities
  copyToClipboard: (text: string) => Promise<boolean>;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}
