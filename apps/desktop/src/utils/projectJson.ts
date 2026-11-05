import type { ProjectRecord, PanelRecord, CircuitRecord } from '../../electron/db.js';

export interface ProjectExportData {
  version: string;
  exported_at: string;
  project: ProjectRecord;
  panels: PanelRecord[];
  circuits: CircuitRecord[];
}

/**
 * Downloads a project export file in JSON format.
 */
export function exportProjectToJson(
  project: ProjectRecord,
  panels: PanelRecord[],
  circuits: CircuitRecord[]
) {
  const data: ProjectExportData = {
    version: '1.0.0',
    exported_at: new Date().toISOString(),
    project,
    panels,
    circuits
  };

  const jsonStr = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const safeName = (project.code || project.name || 'project').replace(/[^a-zA-Z0-9_-]/g, '_');
  link.href = url;
  link.download = `${safeName}_export.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Parses and validates a project JSON string.
 */
export function parseProjectJson(jsonStr: string): ProjectExportData {
  const parsed = JSON.parse(jsonStr);
  if (!parsed.project || !parsed.project.name) {
    throw new Error('Invalid project JSON: Missing project metadata.');
  }
  return {
    version: parsed.version || '1.0.0',
    exported_at: parsed.exported_at || new Date().toISOString(),
    project: parsed.project,
    panels: Array.isArray(parsed.panels) ? parsed.panels : [],
    circuits: Array.isArray(parsed.circuits) ? parsed.circuits : []
  };
}
