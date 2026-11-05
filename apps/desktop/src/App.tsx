import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { SidebarTree } from './components/SidebarTree.js';
import { ProjectListView } from './views/ProjectListView.js';
import { ProjectDashboardView } from './views/ProjectDashboardView.js';
import { PanelEditorView } from './views/PanelEditorView.js';
import { SingleMotorView } from './views/SingleMotorView.js';
import { CombinationLoadsView } from './views/CombinationLoadsView.js';
import { RoomACView } from './views/RoomACView.js';
import { ProjectValidationView } from './views/ProjectValidationView.js';
import { SettingsView } from './views/SettingsView.js';
import { analyzeDistributionHierarchy } from '@panel-analyzer/engine';
import type { ProjectRecord, PanelRecord, CircuitRecord } from '../../electron/db.js';

import { type Language } from './i18n.js';
import { exportProjectToJson, parseProjectJson } from './utils/projectJson.js';
import './theme.css';

// Fallback in-memory storage for web browser preview or development
const createMockApi = () => {
  let mockProjects: ProjectRecord[] = [
    {
      id: 'proj-demo',
      name: 'Commercial Office Tower - Phase 1',
      code: 'COT-2026',
      client: 'Al-Ahly Real Estate',
      engineer: 'Senior Electrical Designer',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  ];

  let mockPanels: PanelRecord[] = [
    {
      id: 'panel-demo',
      project_id: 'proj-demo',
      name: 'Main HVAC & Power Board (MDB-01)',
      panel_type: 'power',
      system_type: '3pn',
      voltage: 380,
      raw_load: 62,
      load_unit: 'kva',
      pf: 0.9,
      demand_factor: 1.0,
      conductor: 'cu',
      insulation: 'xlpe',
      cable_form: 'single',
      install_method: 'ground',
      cable_length: 30,
      vdrop_max: 3.0,
      derate: 0.80,
      isc: 10,
      fclear: 0.1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  ];

  let mockCircuits: CircuitRecord[] = [
    {
      id: 'circ-1',
      panel_id: 'panel-demo',
      circuit_number: 1,
      name: 'Chiller-1 (Motor-Compressor)',
      load_val: 24,
      load_unit: 'kva',
      pf: 0.88,
      phase: '3P',
      length_m: 35,
      conductor: 'cu',
      insulation: 'xlpe',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 'circ-2',
      panel_id: 'panel-demo',
      circuit_number: 2,
      name: 'AHU-1 Fan & Motor',
      load_val: 7.5,
      load_unit: 'kw',
      pf: 0.85,
      phase: 'L1',
      length_m: 25,
      conductor: 'cu',
      insulation: 'xlpe',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  ];

  let mockCatalogue: any[] = [
    { id: 1, manufacturer: 'Elsewedy Cables', table_key: 'cu_xlpe_1core', size_mm2: 25, ground_amp: 148, duct_amp: 118, air_amp: 140, dia_mm: 13.5, resistance: 0.927, reactance: 0.08 },
    { id: 2, manufacturer: 'Elsewedy Cables', table_key: 'cu_xlpe_1core', size_mm2: 35, ground_amp: 178, duct_amp: 142, air_amp: 170, dia_mm: 14.8, resistance: 0.669, reactance: 0.08 },
    { id: 3, manufacturer: 'Elsewedy Cables', table_key: 'cu_xlpe_1core', size_mm2: 50, ground_amp: 211, duct_amp: 169, air_amp: 206, dia_mm: 16.5, resistance: 0.494, reactance: 0.08 },
    { id: 4, manufacturer: 'Elsewedy Cables', table_key: 'cu_xlpe_4core', size_mm2: 25, ground_amp: 133, duct_amp: 104, air_amp: 127, dia_mm: 27.5, resistance: 0.927, reactance: 0.08 },
    { id: 5, manufacturer: 'Elsewedy Cables', table_key: 'cu_xlpe_4core', size_mm2: 35, ground_amp: 159, duct_amp: 125, air_amp: 157, dia_mm: 30.5, resistance: 0.669, reactance: 0.08 }
  ];

  let mockSettings: Record<string, string> = {
    default_voltage: '380',
    default_derate: '0.80',
    default_vdrop: '3.0'
  };

  return {
    getProjects: async () => [...mockProjects],
    getProject: async (id: string) => mockProjects.find(p => p.id === id) || null,
    createProject: async (data: any) => {
      const now = new Date().toISOString();
      const p = { ...data, created_at: now, updated_at: now };
      mockProjects.unshift(p);
      return p;
    },
    updateProject: async (id: string, updates: any) => {
      const idx = mockProjects.findIndex(p => p.id === id);
      if (idx >= 0) {
        mockProjects[idx] = { ...mockProjects[idx], ...updates, updated_at: new Date().toISOString() };
        return mockProjects[idx];
      }
      return null;
    },
    deleteProject: async (id: string) => {
      mockProjects = mockProjects.filter(p => p.id !== id);
      mockPanels = mockPanels.filter(p => p.project_id !== id);
      return true;
    },
    duplicateProject: async (id: string) => {
      const src = mockProjects.find(p => p.id === id);
      if (!src) return null;
      const newId = 'proj-' + Date.now();
      const dup: ProjectRecord = {
        ...src,
        id: newId,
        name: `${src.name} (Copy)`,
        code: `${src.code || ''}-COPY`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      mockProjects.unshift(dup);
      return dup;
    },
    getPanels: async (projectId: string) => mockPanels.filter(p => p.project_id === projectId),
    getPanel: async (id: string) => mockPanels.find(p => p.id === id) || null,
    createPanel: async (data: any) => {
      const now = new Date().toISOString();
      const panel = { ...data, created_at: now, updated_at: now };
      mockPanels.push(panel);
      return panel;
    },
    updatePanel: async (id: string, updates: any) => {
      const idx = mockPanels.findIndex(p => p.id === id);
      if (idx >= 0) {
        mockPanels[idx] = { ...mockPanels[idx], ...updates, updated_at: new Date().toISOString() };
        return mockPanels[idx];
      }
      return null;
    },
    deletePanel: async (id: string) => {
      mockPanels = mockPanels.filter(p => p.id !== id);
      mockCircuits = mockCircuits.filter(c => c.panel_id !== id);
      return true;
    },
    getCircuits: async (panelId: string) => mockCircuits.filter(c => c.panel_id === panelId),
    createCircuit: async (data: any) => {
      const now = new Date().toISOString();
      const circ = { ...data, created_at: now, updated_at: now };
      mockCircuits.push(circ);
      return circ;
    },
    updateCircuit: async (id: string, updates: any) => {
      const idx = mockCircuits.findIndex(c => c.id === id);
      if (idx >= 0) {
        mockCircuits[idx] = { ...mockCircuits[idx], ...updates, updated_at: new Date().toISOString() };
        return mockCircuits[idx];
      }
      return null;
    },
    deleteCircuit: async (id: string) => {
      mockCircuits = mockCircuits.filter(c => c.id !== id);
      return true;
    },
    getSettings: async () => ({ ...mockSettings }),
    setSetting: async (key: string, value: string) => {
      mockSettings[key] = value;
    },
    getCableCatalogue: async (tableKey?: string, manufacturer?: string) => {
      return mockCatalogue.filter(c => {
        if (tableKey && c.table_key !== tableKey) return false;
        if (manufacturer && c.manufacturer !== manufacturer) return false;
        return true;
      });
    },
    saveCableCatalogueEntry: async (entry: any) => {
      if (entry.id) {
        const idx = mockCatalogue.findIndex(c => c.id === entry.id);
        if (idx >= 0) {
          mockCatalogue[idx] = { ...entry };
          return mockCatalogue[idx];
        }
      }
      const newEntry = { ...entry, id: Date.now() };
      mockCatalogue.push(newEntry);
      return newEntry;
    },
    deleteCableCatalogueEntry: async (id: number) => {
      mockCatalogue = mockCatalogue.filter(c => c.id !== id);
      return true;
    },
    importCableCatalogue: async (entries: any[]) => {
      let count = 0;
      for (const e of entries) {
        const newEntry = { ...e, id: Date.now() + count };
        mockCatalogue.push(newEntry);
        count++;
      }
      return count;
    },
    copyToClipboard: async (text: string) => {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(text);
        return true;
      }
      return false;
    }
  };
};

const api = window.electronAPI || createMockApi();

export type AppView =
  | 'project_list'
  | 'project_dashboard'
  | 'panel_editor'
  | 'project_validation'
  | 'single_mc'
  | 'combo_loads'
  | 'room_ac'
  | 'settings';

export const App: React.FC = () => {
  const [view, setView] = useState<AppView>('project_list');
  const [lang, setLang] = useState<Language>('en');
  const [projects, setProjects] = useState<ProjectRecord[]>([]);
  const [currentProject, setCurrentProject] = useState<ProjectRecord | null>(null);
  const [panels, setPanels] = useState<PanelRecord[]>([]);
  const [activePanelId, setActivePanelId] = useState<string | null>(null);
  const [circuitsMap, setCircuitsMap] = useState<Record<string, CircuitRecord[]>>({});
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [toast, setToast] = useState<string | null>(null);

  // Hierarchy Analysis for Load Propagation
  const hierarchyResult = useMemo(() => {
    const nodes = panels.map(p => ({
      id: p.id,
      name: p.name,
      fedFromId: p.fed_from_id,
      directDemandKva: p.raw_load || 0
    }));
    return analyzeDistributionHierarchy(nodes);
  }, [panels]);


  // Sync document direction with language
  useEffect(() => {
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
  }, [lang]);

  const toggleLanguage = () => {
    setLang(prev => (prev === 'en' ? 'ar' : 'en'));
  };

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  // Load projects on startup
  const loadProjects = useCallback(async () => {
    const list = await api.getProjects();
    setProjects(list);
    return list;
  }, []);

  const loadPanelsAndCircuits = useCallback(async (projectId: string) => {
    const panelList = await api.getPanels(projectId);
    setPanels(panelList);

    const cMap: Record<string, CircuitRecord[]> = {};
    for (const p of panelList) {
      cMap[p.id] = await api.getCircuits(p.id);
    }
    setCircuitsMap(cMap);
  }, []);

  useEffect(() => {
    loadProjects().then(list => {
      if (list.length > 0) {
        setCurrentProject(list[0]);
        loadPanelsAndCircuits(list[0].id);
      }
    });

    api.getSettings().then(s => setSettings(s));
  }, [loadProjects, loadPanelsAndCircuits]);

  // Project Actions
  const handleOpenProject = async (projectId: string) => {
    const p = await api.getProject(projectId);
    if (p) {
      setCurrentProject(p);
      await loadPanelsAndCircuits(p.id);
      setView('project_dashboard');
    }
  };

  const handleCreateProject = async (data: { name: string; code: string; client: string; engineer: string }) => {
    const newProj = await api.createProject({
      id: 'proj-' + Date.now(),
      ...data
    });
    await loadProjects();
    await handleOpenProject(newProj.id);
    showToast(`Created project "${newProj.name}"`);
  };

  const handleDuplicateProject = async (id: string) => {
    const dup = await api.duplicateProject(id);
    if (dup) {
      await loadProjects();
      showToast(`Duplicated project "${dup.name}"`);
    }
  };

  const handleDeleteProject = async (id: string) => {
    await api.deleteProject(id);
    await loadProjects();
    if (currentProject?.id === id) {
      setCurrentProject(null);
      setPanels([]);
      setCircuitsMap({});
      setView('project_list');
    }
    showToast('Project deleted');
  };

  const handleUpdateProject = async (id: string, updates: Partial<ProjectRecord>) => {
    const updated = await api.updateProject(id, updates);
    if (updated) {
      setCurrentProject(updated);
      await loadProjects();
      showToast('Project details saved');
    }
  };

  // Panel Actions
  const handleSelectPanel = (panelId: string) => {
    setActivePanelId(panelId);
    setView('panel_editor');
  };

  const handleCreatePanel = async () => {
    if (!currentProject) return;
    const count = panels.length + 1;
    const newPanel = await api.createPanel({
      id: 'panel-' + Date.now(),
      project_id: currentProject.id,
      name: `Distribution Board (DB-${count < 10 ? '0' + count : count})`,
      panel_type: 'power',
      system_type: '3pn',
      voltage: 380,
      raw_load: 25,
      load_unit: 'kva',
      pf: 0.85,
      demand_factor: 1.0,
      conductor: 'cu',
      insulation: 'xlpe',
      cable_form: 'single',
      install_method: 'ground',
      cable_length: 30,
      vdrop_max: 3.0,
      derate: 0.80,
      isc: 10,
      fclear: 0.1
    });

    await loadPanelsAndCircuits(currentProject.id);
    setActivePanelId(newPanel.id);
    setView('panel_editor');
    showToast(`Created panel "${newPanel.name}"`);
  };

  const handleUpdatePanel = async (panelId: string, updates: Partial<PanelRecord>) => {
    await api.updatePanel(panelId, updates);
    if (currentProject) {
      await loadPanelsAndCircuits(currentProject.id);
    }
  };

  const handleDeletePanel = async (panelId: string) => {
    await api.deletePanel(panelId);
    if (currentProject) {
      await loadPanelsAndCircuits(currentProject.id);
    }
    if (activePanelId === panelId) {
      setActivePanelId(null);
      setView('project_dashboard');
    }
    showToast('Panel removed');
  };

  // Circuit Actions
  const handleAddCircuit = async (panelId: string, circuitData?: Omit<CircuitRecord, 'id' | 'created_at' | 'updated_at'>) => {
    const existing = circuitsMap[panelId] || [];
    const num = existing.length + 1;
    const phaseOrder = ['L1', 'L2', 'L3'];
    const phase = phaseOrder[(num - 1) % 3];

    const data = circuitData || {
      panel_id: panelId,
      circuit_number: num,
      name: `Circuit-${num}`,
      load_val: 4.0,
      load_unit: 'kva',
      pf: 0.85,
      phase,
      length_m: 20,
      conductor: 'cu',
      insulation: 'xlpe'
    };

    await api.createCircuit({
      id: 'circ-' + Date.now() + '-' + num,
      ...data
    });

    if (currentProject) {
      await loadPanelsAndCircuits(currentProject.id);
    }
    setActivePanelId(panelId);
    setView('panel_editor');
    showToast('Added branch circuit');
  };

  const handleUpdateCircuit = async (circuitId: string, updates: Partial<CircuitRecord>) => {
    await api.updateCircuit(circuitId, updates);
    if (currentProject) {
      await loadPanelsAndCircuits(currentProject.id);
    }
  };

  const handleDeleteCircuit = async (circuitId: string) => {
    await api.deleteCircuit(circuitId);
    if (currentProject) {
      await loadPanelsAndCircuits(currentProject.id);
    }
    showToast('Circuit removed');
  };

  const handleCopyText = async (text: string) => {
    await api.copyToClipboard(text);
    showToast('Copied AutoCAD tag to clipboard!');
  };

  const handleUpdateSetting = async (key: string, value: string) => {
    await api.setSetting(key, value);
    const updated = await api.getSettings();
    setSettings(updated);
    showToast('Settings saved');
  };

  // Export / Import JSON Project
  const handleExportProjectJson = () => {
    if (!currentProject) return;
    const allCircuits: CircuitRecord[] = [];
    Object.values(circuitsMap).forEach(list => allCircuits.push(...list));
    exportProjectToJson(currentProject, panels, allCircuits);
    showToast('Project JSON exported');
  };

  const handleImportProjectJson = async (file: File) => {
    try {
      const text = await file.text();
      const parsed = parseProjectJson(text);

      const newProjId = 'proj-' + Date.now();
      const newProj = await api.createProject({
        ...parsed.project,
        id: newProjId,
        name: `${parsed.project.name} (Imported)`
      });

      const panelIdMap: Record<string, string> = {};
      for (const p of parsed.panels) {
        const newPid = 'panel-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5);
        panelIdMap[p.id] = newPid;
        await api.createPanel({
          ...p,
          id: newPid,
          project_id: newProjId
        });
      }

      for (const c of parsed.circuits) {
        const mappedPid = panelIdMap[c.panel_id];
        if (mappedPid) {
          await api.createCircuit({
            ...c,
            id: 'circ-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5),
            panel_id: mappedPid
          });
        }
      }

      await loadProjects();
      await handleOpenProject(newProjId);
      showToast('Project JSON imported successfully!');
    } catch (err: any) {
      console.error(err);
      showToast(`Import failed: ${err.message || 'Invalid format'}`);
    }
  };

  const activePanel = panels.find(p => p.id === activePanelId) || panels[0] || null;

  return (
    <div style={{ display: 'flex', width: '100vw', height: '100vh', overflow: 'hidden' }} dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      {/* Left Sidebar Hierarchy Tree */}
      <SidebarTree
        currentProject={currentProject}
        panels={panels}
        circuits={circuitsMap}
        activePanelId={activePanel ? activePanel.id : null}
        currentView={view}
        lang={lang}
        onToggleLang={toggleLanguage}
        onSelectProjectList={() => setView('project_list')}
        onSelectDashboard={() => setView('project_dashboard')}
        onSelectValidation={() => setView('project_validation')}
        onSelectPanel={handleSelectPanel}
        onSelectSingleMC={() => setView('single_mc')}
        onSelectComboLoads={() => setView('combo_loads')}
        onSelectRoomAC={() => setView('room_ac')}
        onSelectSettings={() => setView('settings')}
        onCreatePanel={handleCreatePanel}
        onAddCircuit={(pid) => handleAddCircuit(pid)}
        onExportProjectJson={handleExportProjectJson}
        onImportProjectJson={handleImportProjectJson}
      />

      {/* Main Content Workspace */}
      <div style={{ flex: 1, height: '100%', overflow: 'hidden', position: 'relative' }}>
        {view === 'project_list' && (
          <ProjectListView
            projects={projects}
            onOpenProject={handleOpenProject}
            onCreateProject={handleCreateProject}
            onDuplicateProject={handleDuplicateProject}
            onDeleteProject={handleDeleteProject}
          />
        )}

        {view === 'project_dashboard' && currentProject && (
          <ProjectDashboardView
            project={currentProject}
            panels={panels}
            circuits={circuitsMap}
            onOpenPanel={handleSelectPanel}
            onCreatePanel={handleCreatePanel}
            onDeletePanel={handleDeletePanel}
            onUpdateProject={handleUpdateProject}
          />
        )}

        {view === 'panel_editor' && activePanel && (
          <PanelEditorView
            project={currentProject}
            panel={activePanel}
            allPanels={panels}
            circuits={circuitsMap[activePanel.id] || []}
            inheritedLoadKva={hierarchyResult.loadMap[activePanel.id]?.inheritedDemandKva || 0}
            settings={settings}
            lang={lang}
            onUpdatePanel={handleUpdatePanel}
            onAddCircuit={(c) => handleAddCircuit(activePanel.id, c)}
            onUpdateCircuit={handleUpdateCircuit}
            onDeleteCircuit={handleDeleteCircuit}
            onCopyText={handleCopyText}
          />
        )}

        {view === 'project_validation' && currentProject && (
          <ProjectValidationView
            project={currentProject}
            panels={panels}
            circuits={circuitsMap}
            onSelectPanel={handleSelectPanel}
          />
        )}


        {view === 'single_mc' && (
          <SingleMotorView lang={lang} />
        )}

        {view === 'combo_loads' && (
          <CombinationLoadsView lang={lang} />
        )}

        {view === 'room_ac' && (
          <RoomACView lang={lang} />
        )}

        {view === 'settings' && (
          <SettingsView
            settings={settings}
            onUpdateSetting={handleUpdateSetting}
            lang={lang}
          />
        )}

        {/* Global Toast Notification */}
        {toast && (
          <div className="toast-container" style={{
            position: 'absolute',
            bottom: '24px',
            right: lang === 'rtl' ? 'auto' : '24px',
            left: lang === 'rtl' ? '24px' : 'auto',
            background: 'var(--teal)',
            color: '#06201D',
            padding: '10px 18px',
            borderRadius: 'var(--radius)',
            fontWeight: 700,
            fontSize: '13px',
            boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
            zIndex: 9999,
            animation: 'fade 0.2s ease'
          }}>
            {toast}
          </div>
        )}
      </div>
    </div>
  );
};
