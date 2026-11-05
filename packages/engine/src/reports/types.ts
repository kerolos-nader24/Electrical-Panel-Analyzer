/**
 * Engineering Reports & BOQ Types
 */

export interface BoqItem {
  category: 'breaker' | 'cable' | 'conduit' | 'accessory';
  item: string;
  specification: string;
  unit: 'pcs' | 'm';
  quantity: number;
  notes?: string;
}

export interface PanelBoq {
  panelName: string;
  breakers: BoqItem[];
  cables: BoqItem[];
  conduits: BoqItem[];
  totalCableMeters: number;
  totalConduitMeters: number;
}

export interface FormulaDerivationStep {
  step: number;
  title: string;
  standardRef: string;
  formulaStr: string;
  substitutedStr: string;
  resultStr: string;
  passed?: boolean;
}

export interface DerivationInputs {
  panelName: string;
  voltage: number;
  systemType: string;
  isThreePhase: boolean;
  loadKva: number;
  pf: number;
  lengthM: number;
  deratingK: number;
  vdropMax: number;
  iscKa: number;
  fclearSec: number;
  conductor: 'cu' | 'al';
  insulation: 'xlpe' | 'pvc';

  // Calculated values
  Ib: number;
  In: number;
  cableSize: number;
  cableAmpacity: number;
  actualIz: number;
  vDropV: number;
  vDropPct: number;
  sMinSc: number;
  scK: number;
  conduitSize: number;
  conduitFillPct: number;
  neutralSize: number;
  eccSize: number;
  cadTag: string;
}
