import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

export interface ProjectRecord {
  id: string;
  name: string;
  code: string;
  client: string;
  engineer: string;
  created_at: string;
  updated_at: string;
}

export interface PanelRecord {
  id: string;
  project_id: string;
  name: string;
  panel_type: string;
  system_type: string;
  voltage: number;
  raw_load: number;
  load_unit: string;
  pf: number;
  demand_factor: number;
  conductor: string;
  insulation: string;
  cable_form: string;
  install_method: string;
  cable_length: number;
  vdrop_max: number;
  derate: number;
  isc?: number;
  fclear?: number;
  fed_from_id?: string | null;
  parallel_runs?: number;
  demand_factors?: string;
  created_at: string;
  updated_at: string;
}

export interface CircuitRecord {
  id: string;
  panel_id: string;
  circuit_number: number;
  name: string;
  load_val: number;
  load_unit: string;
  pf: number;
  phase: string;
  length_m: number;
  conductor: string;
  insulation: string;
  load_type?: string;
  install_method?: string;
  cable_type?: string;
  starter_type?: string;
  created_at: string;
  updated_at: string;
}

export interface CableCatalogueRecord {
  id: number;
  manufacturer: string;
  table_key: string;
  size_mm2: number;
  ground_amp: number;
  duct_amp: number;
  air_amp: number;
  dia_mm: number;
  resistance: number;
  reactance: number;
}

export class AppDatabase {
  private db: Database.Database;

  constructor(dbPath?: string) {
    let resolvedPath = dbPath;
    if (!resolvedPath) {
      let userDataDir = process.cwd();
      try {
        const electron = require('electron');
        if (electron && electron.app && typeof electron.app.getPath === 'function') {
          userDataDir = electron.app.getPath('userData');
        }
      } catch {
        // Running in Node environment outside of electron runtime
      }

      if (!fs.existsSync(userDataDir)) {
        fs.mkdirSync(userDataDir, { recursive: true });
      }
      resolvedPath = path.join(userDataDir, 'panel_analyzer.db');
    }

    this.db = new Database(resolvedPath);
    this.db.pragma('journal_mode = WAL');
    this.initSchema();
    this.seedCatalogue();
  }

  private initSchema() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS projects (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        code TEXT NOT NULL,
        client TEXT DEFAULT '',
        engineer TEXT DEFAULT '',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS panels (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        name TEXT NOT NULL,
        panel_type TEXT DEFAULT 'lighting',
        system_type TEXT DEFAULT '3pn',
        voltage REAL DEFAULT 380,
        raw_load REAL DEFAULT 62,
        load_unit TEXT DEFAULT 'kva',
        pf REAL DEFAULT 0.9,
        demand_factor REAL DEFAULT 1.0,
        conductor TEXT DEFAULT 'cu',
        insulation TEXT DEFAULT 'xlpe',
        cable_form TEXT DEFAULT 'single',
        install_method TEXT DEFAULT 'ground',
        cable_length REAL DEFAULT 30,
        vdrop_max REAL DEFAULT 3.0,
        derate REAL DEFAULT 0.80,
        isc REAL DEFAULT 0,
        fclear REAL DEFAULT 0.1,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS circuits (
        id TEXT PRIMARY KEY,
        panel_id TEXT NOT NULL,
        circuit_number INTEGER NOT NULL,
        name TEXT NOT NULL,
        load_val REAL DEFAULT 5,
        load_unit TEXT DEFAULT 'kva',
        pf REAL DEFAULT 0.9,
        phase TEXT DEFAULT 'L1',
        length_m REAL DEFAULT 20,
        conductor TEXT DEFAULT 'cu',
        insulation TEXT DEFAULT 'xlpe',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (panel_id) REFERENCES panels(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS cable_catalogue (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        table_key TEXT NOT NULL,
        size_mm2 REAL NOT NULL,
        ground_amp REAL NOT NULL,
        duct_amp REAL NOT NULL,
        air_amp REAL NOT NULL,
        dia_mm REAL NOT NULL
      );

      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
    `);

    // Safe SQLite migrations for Phase 3 and Phase 4
    try { this.db.exec("ALTER TABLE panels ADD COLUMN fed_from_id TEXT DEFAULT NULL"); } catch {}
    try { this.db.exec("ALTER TABLE panels ADD COLUMN parallel_runs INTEGER DEFAULT 1"); } catch {}
    try { this.db.exec("ALTER TABLE panels ADD COLUMN demand_factors TEXT DEFAULT ''"); } catch {}

    try { this.db.exec("ALTER TABLE circuits ADD COLUMN load_type TEXT DEFAULT 'socket'"); } catch {}
    try { this.db.exec("ALTER TABLE circuits ADD COLUMN install_method TEXT DEFAULT 'air'"); } catch {}
    try { this.db.exec("ALTER TABLE circuits ADD COLUMN cable_type TEXT DEFAULT 'cu_xlpe'"); } catch {}
    try { this.db.exec("ALTER TABLE circuits ADD COLUMN starter_type TEXT DEFAULT 'dol'"); } catch {}

    // Safe SQLite migrations for Phase 7 (Cable Catalogue)
    try { this.db.exec("ALTER TABLE cable_catalogue ADD COLUMN manufacturer TEXT DEFAULT 'Elsewedy Cables'"); } catch {}
    try { this.db.exec("ALTER TABLE cable_catalogue ADD COLUMN resistance REAL DEFAULT 0"); } catch {}
    try { this.db.exec("ALTER TABLE cable_catalogue ADD COLUMN reactance REAL DEFAULT 0.08"); } catch {}
  }


  private seedCatalogue() {
    const count = this.db.prepare('SELECT COUNT(*) as cnt FROM cable_catalogue').get() as { cnt: number };
    if (count.cnt > 0) return;

    try {
      const cablesPath = path.resolve(__dirname, '../../packages/data/src/cables.json');
      if (fs.existsSync(cablesPath)) {
        const cablesData = JSON.parse(fs.readFileSync(cablesPath, 'utf8'));
        const insert = this.db.prepare(`
          INSERT INTO cable_catalogue (table_key, size_mm2, ground_amp, duct_amp, air_amp, dia_mm)
          VALUES (?, ?, ?, ?, ?, ?)
        `);

        const insertMany = this.db.transaction((data: any) => {
          for (const [tableKey, sizes] of Object.entries(data)) {
            for (const [sizeStr, r] of Object.entries(sizes as any)) {
              const rating = r as any;
              insert.run(tableKey, parseFloat(sizeStr), rating.ground, rating.duct, rating.air, rating.dia);
            }
          }
        });

        insertMany(cablesData);
      }
    } catch (e) {
      console.warn('Could not seed cable catalogue from JSON:', e);
    }
  }

  // Projects CRUD
  public getProjects(): ProjectRecord[] {
    return this.db.prepare('SELECT * FROM projects ORDER BY updated_at DESC').all() as ProjectRecord[];
  }

  public getProject(id: string): ProjectRecord | undefined {
    return this.db.prepare('SELECT * FROM projects WHERE id = ?').get(id) as ProjectRecord | undefined;
  }

  public createProject(project: Omit<ProjectRecord, 'created_at' | 'updated_at'>): ProjectRecord {
    const now = new Date().toISOString();
    const fullProject: ProjectRecord = { ...project, created_at: now, updated_at: now };
    this.db.prepare(`
      INSERT INTO projects (id, name, code, client, engineer, created_at, updated_at)
      VALUES (@id, @name, @code, @client, @engineer, @created_at, @updated_at)
    `).run(fullProject);

    // Create a default panel for the new project
    this.createPanel({
      id: 'panel-' + Date.now(),
      project_id: project.id,
      name: 'Main Distribution Panel (MDP)',
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
      fclear: 0.1
    });

    return fullProject;
  }

  public updateProject(id: string, updates: Partial<ProjectRecord>): ProjectRecord | undefined {
    const existing = this.getProject(id);
    if (!existing) return undefined;

    const updated: ProjectRecord = {
      ...existing,
      ...updates,
      updated_at: new Date().toISOString()
    };

    this.db.prepare(`
      UPDATE projects SET name = @name, code = @code, client = @client, engineer = @engineer, updated_at = @updated_at
      WHERE id = @id
    `).run(updated);

    return updated;
  }

  public duplicateProject(id: string): ProjectRecord | undefined {
    const existing = this.getProject(id);
    if (!existing) return undefined;

    const newId = 'proj-' + Date.now();
    const newProject: ProjectRecord = {
      ...existing,
      id: newId,
      name: `${existing.name} (Copy)`,
      code: `${existing.code}-COPY`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    this.db.prepare(`
      INSERT INTO projects (id, name, code, client, engineer, created_at, updated_at)
      VALUES (@id, @name, @code, @client, @engineer, @created_at, @updated_at)
    `).run(newProject);

    // Duplicate panels
    const panels = this.getPanels(id);
    for (const p of panels) {
      const newPanelId = 'panel-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
      this.createPanel({
        ...p,
        id: newPanelId,
        project_id: newId
      });

      // Duplicate circuits
      const circuits = this.getCircuits(p.id);
      for (const c of circuits) {
        this.createCircuit({
          ...c,
          id: 'circ-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
          panel_id: newPanelId
        });
      }
    }

    return newProject;
  }

  public deleteProject(id: string): boolean {
    const res = this.db.prepare('DELETE FROM projects WHERE id = ?').run(id);
    return res.changes > 0;
  }

  // Panels CRUD
  public getPanels(projectId: string): PanelRecord[] {
    return this.db.prepare('SELECT * FROM panels WHERE project_id = ? ORDER BY created_at ASC').all(projectId) as PanelRecord[];
  }

  public getPanel(id: string): PanelRecord | undefined {
    return this.db.prepare('SELECT * FROM panels WHERE id = ?').get(id) as PanelRecord | undefined;
  }

  public createPanel(panel: Omit<PanelRecord, 'created_at' | 'updated_at'>): PanelRecord {
    const now = new Date().toISOString();
    const fullPanel: PanelRecord = {
      fed_from_id: null,
      parallel_runs: 1,
      demand_factors: '',
      ...panel,
      created_at: now,
      updated_at: now
    };
    this.db.prepare(`
      INSERT INTO panels (
        id, project_id, name, panel_type, system_type, voltage, raw_load, load_unit, pf,
        demand_factor, conductor, insulation, cable_form, install_method, cable_length,
        vdrop_max, derate, isc, fclear, fed_from_id, parallel_runs, demand_factors, created_at, updated_at
      ) VALUES (
        @id, @project_id, @name, @panel_type, @system_type, @voltage, @raw_load, @load_unit, @pf,
        @demand_factor, @conductor, @insulation, @cable_form, @install_method, @cable_length,
        @vdrop_max, @derate, @isc, @fclear, @fed_from_id, @parallel_runs, @demand_factors, @created_at, @updated_at
      )
    `).run(fullPanel);
    return fullPanel;
  }

  public updatePanel(id: string, updates: Partial<PanelRecord>): PanelRecord | undefined {
    const existing = this.getPanel(id);
    if (!existing) return undefined;

    const updated: PanelRecord = {
      ...existing,
      ...updates,
      updated_at: new Date().toISOString()
    };

    this.db.prepare(`
      UPDATE panels SET
        name = @name, panel_type = @panel_type, system_type = @system_type, voltage = @voltage,
        raw_load = @raw_load, load_unit = @load_unit, pf = @pf, demand_factor = @demand_factor,
        conductor = @conductor, insulation = @insulation, cable_form = @cable_form,
        install_method = @install_method, cable_length = @cable_length, vdrop_max = @vdrop_max,
        derate = @derate, isc = @isc, fclear = @fclear, fed_from_id = @fed_from_id,
        parallel_runs = @parallel_runs, demand_factors = @demand_factors, updated_at = @updated_at
      WHERE id = @id
    `).run(updated);

    // Also update parent project's updated_at
    this.db.prepare('UPDATE projects SET updated_at = ? WHERE id = ?').run(updated.updated_at, updated.project_id);

    return updated;
  }

  public deletePanel(id: string): boolean {
    const res = this.db.prepare('DELETE FROM panels WHERE id = ?').run(id);
    return res.changes > 0;
  }

  // Circuits CRUD
  public getCircuits(panelId: string): CircuitRecord[] {
    return this.db.prepare('SELECT * FROM circuits WHERE panel_id = ? ORDER BY circuit_number ASC').all(panelId) as CircuitRecord[];
  }

  public createCircuit(circuit: Omit<CircuitRecord, 'created_at' | 'updated_at'>): CircuitRecord {
    const now = new Date().toISOString();
    const fullCircuit: CircuitRecord = {
      load_type: 'socket',
      install_method: 'air',
      cable_type: 'cu_xlpe',
      starter_type: 'dol',
      ...circuit,
      created_at: now,
      updated_at: now
    };
    this.db.prepare(`
      INSERT INTO circuits (
        id, panel_id, circuit_number, name, load_val, load_unit, pf, phase, length_m, conductor, insulation,
        load_type, install_method, cable_type, starter_type, created_at, updated_at
      ) VALUES (
        @id, @panel_id, @circuit_number, @name, @load_val, @load_unit, @pf, @phase, @length_m, @conductor, @insulation,
        @load_type, @install_method, @cable_type, @starter_type, @created_at, @updated_at
      )
    `).run(fullCircuit);
    return fullCircuit;
  }

  public updateCircuit(id: string, updates: Partial<CircuitRecord>): CircuitRecord | undefined {
    const existing = this.db.prepare('SELECT * FROM circuits WHERE id = ?').get(id) as CircuitRecord | undefined;
    if (!existing) return undefined;

    const updated: CircuitRecord = { ...existing, ...updates, updated_at: new Date().toISOString() };
    this.db.prepare(`
      UPDATE circuits SET
        circuit_number = @circuit_number, name = @name, load_val = @load_val, load_unit = @load_unit,
        pf = @pf, phase = @phase, length_m = @length_m, conductor = @conductor, insulation = @insulation,
        load_type = @load_type, install_method = @install_method, cable_type = @cable_type, starter_type = @starter_type,
        updated_at = @updated_at
      WHERE id = @id
    `).run(updated);

    return updated;
  }

  public deleteCircuit(id: string): boolean {
    const res = this.db.prepare('DELETE FROM circuits WHERE id = ?').run(id);
    return res.changes > 0;
  }


  // Settings
  public getSettings(): Record<string, string> {
    const rows = this.db.prepare('SELECT key, value FROM settings').all() as { key: string; value: string }[];
    const map: Record<string, string> = {};
    for (const r of rows) map[r.key] = r.value;
    return map;
  }

  public setSetting(key: string, value: string): void {
    this.db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(key, value);
  }

  // Cable Catalogue CRUD & Bulk Import
  public getCableCatalogue(tableKey?: string, manufacturer?: string): CableCatalogueRecord[] {
    let query = 'SELECT * FROM cable_catalogue';
    const params: any[] = [];
    const conditions: string[] = [];

    if (tableKey) {
      conditions.push('table_key = ?');
      params.push(tableKey);
    }
    if (manufacturer) {
      conditions.push('manufacturer = ?');
      params.push(manufacturer);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    query += ' ORDER BY table_key ASC, size_mm2 ASC';
    return this.db.prepare(query).all(...params) as CableCatalogueRecord[];
  }

  public saveCableCatalogueEntry(entry: Omit<CableCatalogueRecord, 'id'> & { id?: number }): CableCatalogueRecord {
    if (entry.id) {
      this.db.prepare(`
        UPDATE cable_catalogue SET
          manufacturer = @manufacturer,
          table_key = @table_key,
          size_mm2 = @size_mm2,
          ground_amp = @ground_amp,
          duct_amp = @duct_amp,
          air_amp = @air_amp,
          dia_mm = @dia_mm,
          resistance = @resistance,
          reactance = @reactance
        WHERE id = @id
      `).run(entry);
      return entry as CableCatalogueRecord;
    } else {
      const res = this.db.prepare(`
        INSERT INTO cable_catalogue (manufacturer, table_key, size_mm2, ground_amp, duct_amp, air_amp, dia_mm, resistance, reactance)
        VALUES (@manufacturer, @table_key, @size_mm2, @ground_amp, @duct_amp, @air_amp, @dia_mm, @resistance, @reactance)
      `).run({
        manufacturer: entry.manufacturer || 'Elsewedy Cables',
        table_key: entry.table_key,
        size_mm2: entry.size_mm2,
        ground_amp: entry.ground_amp,
        duct_amp: entry.duct_amp,
        air_amp: entry.air_amp,
        dia_mm: entry.dia_mm,
        resistance: entry.resistance || 0,
        reactance: entry.reactance || 0.08
      });
      return { ...entry, id: Number(res.lastInsertRowid) } as CableCatalogueRecord;
    }
  }

  public deleteCableCatalogueEntry(id: number): boolean {
    const res = this.db.prepare('DELETE FROM cable_catalogue WHERE id = ?').run(id);
    return res.changes > 0;
  }

  public importCableCatalogue(entries: any[]): number {
    const insert = this.db.prepare(`
      INSERT INTO cable_catalogue (manufacturer, table_key, size_mm2, ground_amp, duct_amp, air_amp, dia_mm, resistance, reactance)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    let count = 0;
    const tx = this.db.transaction((items: any[]) => {
      for (const item of items) {
        insert.run(
          item.manufacturer || 'Elsewedy Cables',
          item.tableKey || item.table_key,
          Number(item.sizeMm2 || item.size_mm2),
          Number(item.groundAmp || item.ground_amp || 0),
          Number(item.ductAmp || item.duct_amp || 0),
          Number(item.airAmp || item.air_amp || 0),
          Number(item.diaMm || item.dia_mm || 10),
          Number(item.resistance || 0),
          Number(item.reactance || 0.08)
        );
        count++;
      }
    });

    tx(entries);
    return count;
  }
}
