export interface CircuitExportRow {
  circuitNumber: number;
  name: string;
  phase: string;
  loadVal: number;
  loadUnit: string;
  pf: number;
  lengthM: number;
  breakerA: number;
  cableMm2: number;
}

export interface PhaseStats {
  l1Kva: number;
  l2Kva: number;
  l3Kva: number;
  totalKva: number;
  imbalancePct: number;
}

/**
 * Escapes a CSV cell per RFC 4180.
 */
function escapeCsvCell(val: string | number): string {
  const str = String(val ?? '');
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Generates and triggers download of a panel schedule CSV.
 */
export function exportPanelScheduleToCsv(
  panelName: string,
  rows: CircuitExportRow[],
  stats: PhaseStats
) {
  const headers = [
    'Circuit #',
    'Description',
    'Phase',
    'Load',
    'Unit',
    'Power Factor',
    'Length (m)',
    'Breaker (A)',
    'Cable Size (mm²)'
  ];

  const csvLines: string[] = [];
  csvLines.push(`Panel Schedule: ${escapeCsvCell(panelName)}`);
  csvLines.push(`Exported: ${new Date().toISOString()}`);
  csvLines.push('');
  csvLines.push(headers.map(escapeCsvCell).join(','));

  for (const r of rows) {
    csvLines.push([
      r.circuitNumber,
      r.name,
      r.phase,
      r.loadVal,
      r.loadUnit,
      r.pf,
      r.lengthM,
      r.breakerA,
      r.cableMm2
    ].map(escapeCsvCell).join(','));
  }

  csvLines.push('');
  csvLines.push('Phase Balancing Summary');
  csvLines.push(`Phase L1 Load (kVA),${stats.l1Kva.toFixed(2)}`);
  csvLines.push(`Phase L2 Load (kVA),${stats.l2Kva.toFixed(2)}`);
  csvLines.push(`Phase L3 Load (kVA),${stats.l3Kva.toFixed(2)}`);
  csvLines.push(`Total Connected Load (kVA),${stats.totalKva.toFixed(2)}`);
  csvLines.push(`Phase Imbalance (%),${stats.imbalancePct.toFixed(1)}%`);

  const csvContent = csvLines.join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const safeName = panelName.replace(/[^a-zA-Z0-9_-]/g, '_');
  link.href = url;
  link.download = `${safeName}_schedule.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
