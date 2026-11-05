/**
 * Cable Catalogue CSV & JSON Import/Export Utilities
 */

import type { CableCatalogueEntry } from './types.js';

export function exportCatalogueToCsv(entries: CableCatalogueEntry[]): string {
  const headers = [
    'manufacturer',
    'tableKey',
    'sizeMm2',
    'groundAmp',
    'ductAmp',
    'airAmp',
    'diaMm',
    'resistance',
    'reactance'
  ];

  const rows = entries.map(e => [
    `"${(e.manufacturer || 'Elsewedy Cables').replace(/"/g, '""')}"`,
    e.tableKey,
    e.sizeMm2,
    e.groundAmp,
    e.ductAmp,
    e.airAmp,
    e.diaMm,
    e.resistance !== undefined ? e.resistance : 0,
    e.reactance !== undefined ? e.reactance : 0.08
  ].join(','));

  return [headers.join(','), ...rows].join('\r\n') + '\r\n';
}

export function parseCatalogueFromCsv(csvText: string): CableCatalogueEntry[] {
  const lines = csvText.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
  const entries: CableCatalogueEntry[] = [];

  for (let i = 1; i < lines.length; i++) {
    // Basic CSV line splitting supporting quoted strings
    const row: string[] = [];
    let inQuotes = false;
    let curr = '';

    for (let j = 0; j < lines[i].length; j++) {
      const char = lines[i][j];
      if (char === '"' && (j === 0 || lines[i][j - 1] !== '\\')) {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        row.push(curr.trim());
        curr = '';
      } else {
        curr += char;
      }
    }
    row.push(curr.trim());

    if (row.length < 7) continue;

    const getVal = (colName: string, fallbackIdx: number): string => {
      const idx = headers.indexOf(colName);
      if (idx >= 0 && idx < row.length) return row[idx].replace(/^"|"$/g, '');
      if (fallbackIdx < row.length) return row[fallbackIdx].replace(/^"|"$/g, '');
      return '';
    };

    const manufacturer = getVal('manufacturer', 0) || 'Elsewedy Cables';
    const tableKey = getVal('tableKey', 1);
    const sizeMm2 = parseFloat(getVal('sizeMm2', 2));
    const groundAmp = parseFloat(getVal('groundAmp', 3));
    const ductAmp = parseFloat(getVal('ductAmp', 4));
    const airAmp = parseFloat(getVal('airAmp', 5));
    const diaMm = parseFloat(getVal('diaMm', 6));
    const resStr = getVal('resistance', 7);
    const reactStr = getVal('reactance', 8);

    if (tableKey && !isNaN(sizeMm2) && !isNaN(airAmp)) {
      entries.push({
        manufacturer,
        tableKey,
        sizeMm2,
        groundAmp: isNaN(groundAmp) ? airAmp : groundAmp,
        ductAmp: isNaN(ductAmp) ? airAmp : ductAmp,
        airAmp,
        diaMm: isNaN(diaMm) ? 10 : diaMm,
        resistance: resStr && !isNaN(parseFloat(resStr)) ? parseFloat(resStr) : 0,
        reactance: reactStr && !isNaN(parseFloat(reactStr)) ? parseFloat(reactStr) : 0.08
      });
    }
  }

  return entries;
}

export function exportCatalogueToJson(entries: CableCatalogueEntry[]): string {
  return JSON.stringify(entries, null, 2);
}

export function parseCatalogueFromJson(jsonText: string): CableCatalogueEntry[] {
  try {
    const data = JSON.parse(jsonText);
    if (!Array.isArray(data)) return [];

    return data
      .filter((item: any) => item && item.tableKey && typeof item.sizeMm2 === 'number')
      .map((item: any) => ({
        id: item.id,
        manufacturer: item.manufacturer || 'Elsewedy Cables',
        tableKey: String(item.tableKey),
        sizeMm2: Number(item.sizeMm2),
        groundAmp: Number(item.groundAmp || item.airAmp || 0),
        ductAmp: Number(item.ductAmp || item.airAmp || 0),
        airAmp: Number(item.airAmp || 0),
        diaMm: Number(item.diaMm || 10),
        resistance: Number(item.resistance || 0),
        reactance: Number(item.reactance || 0.08)
      }));
  } catch {
    return [];
  }
}
