import { asAmps, asMm2, asVolts, asPercentage, type Amps, type mm2 } from '../types/units.js';
import type { CableForm, ConductorMaterial, InstallationMethod, InsulationType, SelectedCable, SystemType } from '../types/common.js';
import { CABLES, type CableCatalogue } from '@panel-analyzer/data';
import { calculateVoltageDrop, type VoltageDropResult } from '../voltageDrop/index.js';


export interface ProtectionCheckResult {
  pass: boolean;
  passIbIn: boolean;
  passInIz: boolean;
  Ib: number;
  In: number;
  Iz: number;
}

export interface CableWithVdropResult {
  cable: SelectedCable;
  ampacitySelected: SelectedCable;
  vDrop: VoltageDropResult;
  steppedUp: boolean;
}

/**
 * Derives the Elsewedy catalogue table key string from cable properties.
 */
export function getCableTableKey(
  conductor: ConductorMaterial,
  insulation: InsulationType,
  form: CableForm,
  systemType: SystemType
): string {
  const cores = systemType === '1p' ? 2 : (systemType === '3pn' ? 4 : 3);
  if (form === 'single') {
    return `${conductor}_${insulation}_1core`;
  }
  const armour = form === 'armoured' ? 'armoured' : 'unarmoured';
  return `${conductor}_${insulation}_${cores}core_${armour}`;
}

/**
 * Returns effective cable derating factor K_total (default 0.80 per IEC 60364-5-52 / Elsewedy standard laying).
 */
export function applyCorrectionFactors(customFactor?: number): number {
  return (customFactor !== undefined && customFactor > 0) ? customFactor : 0.80;
}

/**
 * Calculates required cable catalogue ampacity Iz_required = In / K_total.
 *
 * Reference:
 * - IEC 60364-4-43 Clause 433.1: In <= Iz = I_catalogue * K_total  ==>  I_catalogue >= In / K_total
 */
export function calculateCableRequirement(In: number, Ktotal: number = 0.80): Amps {
  const k = Ktotal > 0 ? Ktotal : 0.80;
  return asAmps(In / k);
}

/**
 * Finds the smallest cable cross-section in the catalogue table meeting the required ampacity.
 */
export function selectCableFromTable(
  tableKey: string,
  Iz_required: number,
  installMethod: InstallationMethod,
  minSize: number = 0,
  catalogue: CableCatalogue = CABLES
): SelectedCable | null {
  const table = catalogue[tableKey];
  if (!table) return null;

  const sizes = Object.keys(table).map(Number).sort((a, b) => a - b);
  for (const s of sizes) {
    if (s >= minSize && table[s][installMethod] >= Iz_required) {
      return {
        size: asMm2(s),
        ampacity: asAmps(table[s][installMethod]),
        dia: table[s].dia
      };
    }
  }
  return null;
}

/**
 * Validates fundamental overload protection coordination: Ib <= In <= Iz.
 *
 * Reference:
 * - IEC 60364-4-43 Clause 433.1 Condition 1:
 *   Ib <= In and In <= Iz
 */
export function checkProtection(Ib: number, In: number, Iz_corrected: number): ProtectionCheckResult {
  const pass1 = Ib <= (In + 0.001);
  const pass2 = In <= (Iz_corrected + 0.001);
  return {
    pass: pass1 && pass2,
    passIbIn: pass1,
    passInIz: pass2,
    Ib,
    In,
    Iz: Iz_corrected
  };
}

/**
 * Selects cable meeting ampacity, verifies voltage drop, and automatically steps up cross-section if voltage drop fails.
 */
export function selectCableWithVdrop(
  tableKey: string,
  Iz_required: number,
  installMethod: InstallationMethod,
  lengthM: number,
  Ib: number,
  voltage: number,
  is3Phase: boolean,
  conductor: ConductorMaterial,
  insulation: InsulationType,
  pf: number = 0.9,
  maxDropPct: number = 3.0,
  catalogue: CableCatalogue = CABLES
): CableWithVdropResult | null {
  const table = catalogue[tableKey];
  if (!table) return null;

  const sizes = Object.keys(table).map(Number).sort((a, b) => a - b);

  let ampacitySelected: SelectedCable | null = null;
  for (const s of sizes) {
    if (table[s][installMethod] >= Iz_required) {
      ampacitySelected = {
        size: asMm2(s),
        ampacity: asAmps(table[s][installMethod]),
        dia: table[s].dia
      };
      break;
    }
  }
  if (!ampacitySelected) return null;

  let finalCable = ampacitySelected;
  let vDrop = calculateVoltageDrop(finalCable.size, lengthM, Ib, voltage, is3Phase, conductor, insulation, pf, maxDropPct);
  let steppedUp = false;

  // Step up cable size until voltage drop requirement is satisfied
  if (!vDrop.pass) {
    for (const s of sizes) {
      if (s > ampacitySelected.size) {
        const candidate: SelectedCable = {
          size: asMm2(s),
          ampacity: asAmps(table[s][installMethod]),
          dia: table[s].dia
        };
        const candidateVdrop = calculateVoltageDrop(s, lengthM, Ib, voltage, is3Phase, conductor, insulation, pf, maxDropPct);
        if (candidateVdrop.pass) {
          finalCable = candidate;
          vDrop = candidateVdrop;
          steppedUp = true;
          break;
        }
      }
    }
  }

  return {
    cable: finalCable,
    ampacitySelected,
    vDrop,
    steppedUp
  };
}

export interface ParallelCableResult {
  cable: SelectedCable;
  runs: number;
  totalAmpacity: Amps;
  vDrop: VoltageDropResult;
  steppedUp: boolean;
  pass: boolean;
}

/**
 * Sizes single or parallel cables per phase (N = 1, 2, 3, 4) meeting required breaker and voltage drop.
 * When a single cable cross-section is insufficient, automatically increments N.
 */
export function selectParallelCableWithVdrop(
  tableKey: string,
  In: number,
  baseDerate: number,
  installMethod: InstallationMethod,
  lengthM: number,
  Ib: number,
  voltage: number,
  is3Phase: boolean,
  conductor: ConductorMaterial,
  insulation: InsulationType,
  pf: number = 0.9,
  maxDropPct: number = 3.0,
  targetRuns?: number,
  maxConductorSize: number = 400,
  catalogue: CableCatalogue = CABLES
): ParallelCableResult | null {
  const table = catalogue[tableKey];
  if (!table) return null;

  const runCandidates = targetRuns && targetRuns >= 1 ? [targetRuns] : [1, 2, 3, 4];
  const groupFactors: Record<number, number> = { 1: 1.0, 2: 0.80, 3: 0.70, 4: 0.65 };

  for (const n of runCandidates) {
    const kGroup = groupFactors[n] || 0.65;
    const effectiveDerate = Math.max(0.2, baseDerate * kGroup);
    const requiredPerRun = In / (n * effectiveDerate);

    // Try finding single cable meeting per-run ampacity requirement
    const singleResult = selectCableWithVdrop(
      tableKey,
      requiredPerRun,
      installMethod,
      lengthM,
      Ib / n, // Current per conductor
      voltage,
      is3Phase,
      conductor,
      insulation,
      pf,
      maxDropPct,
      catalogue
    );

    // If cable size exceeds max practical conductor size and we are allowed to use more runs, try next run
    if (singleResult && (singleResult.cable.size <= maxConductorSize || targetRuns !== undefined || n === 4)) {
      const totalAmpacity = asAmps(Number((singleResult.cable.ampacity * n * effectiveDerate).toFixed(1)));
      // Voltage drop for N parallel conductors
      const parallelVdrop: VoltageDropResult = {
        ...singleResult.vDrop,
        dropV: asVolts(Number((singleResult.vDrop.dropV).toFixed(2))),
        dropPct: asPercentage(Number((singleResult.vDrop.dropPct).toFixed(2))),
        pass: singleResult.vDrop.pass
      };


      return {
        cable: singleResult.cable,
        runs: n,
        totalAmpacity,
        vDrop: parallelVdrop,
        steppedUp: singleResult.steppedUp,
        pass: parallelVdrop.pass && In <= totalAmpacity
      };
    }
  }

  return null;
}


