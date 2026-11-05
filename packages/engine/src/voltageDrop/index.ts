import { asMeters, asOhmsPerKm, asPercentage, asVolts, type Meters, type OhmsPerKm, type Percentage, type Volts } from '../types/units.js';
import type { ConductorMaterial, InsulationType } from '../types/common.js';
import { CABLE_IMPEDANCE } from '@panel-analyzer/data';

export interface VoltageDropResult {
  lengthM: Meters;
  r: OhmsPerKm;
  x: OhmsPerKm;
  z_eff: OhmsPerKm;
  dropV: Volts;
  dropPct: Percentage;
  maxDropPct: Percentage;
  pass: boolean;
}

/**
 * Calculates feeder voltage drop using vector impedance projection.
 *
 * References:
 * - IEC 60364-5-52 Annex G (Formula G.1)
 * - IEEE 141 (Red Book) Clause 3.2: Z_eff = R * cos(phi) + X * sin(phi)
 * - Three-Phase: ΔV = (√3 * L * I_b * Z_eff) / 1000
 * - Single-Phase: ΔV = (2 * L * I_b * Z_eff) / 1000
 * - Drop Percentage: ΔV% = (ΔV / V) * 100
 */
export function calculateVoltageDrop(
  cableSize: number,
  lengthM: number,
  Ib: number,
  voltage: number,
  is3Phase: boolean,
  conductor: ConductorMaterial,
  insulation: InsulationType,
  pf: number = 0.9,
  maxDropPct: number = 3.0
): VoltageDropResult {
  const condData = CABLE_IMPEDANCE[conductor] || CABLE_IMPEDANCE.cu;
  const imp = condData[cableSize] || { r_pvc: 0.87, r_xlpe: 0.887, x: 0.08 };
  const r = insulation === 'pvc' ? imp.r_pvc : imp.r_xlpe;
  const x = imp.x || 0.08;

  const cosPhi = (pf > 0 && pf <= 1) ? pf : 0.9;
  const sinPhi = Math.sqrt(Math.max(0, 1 - cosPhi * cosPhi));
  const z_eff = r * cosPhi + x * sinPhi;

  const L = lengthM > 0 ? lengthM : 30;
  const k = is3Phase ? Math.sqrt(3) : 2.0;
  const dropV = (k * L * Ib * z_eff) / 1000;
  const dropPct = voltage > 0 ? (dropV / voltage) * 100 : 0;

  return {
    lengthM: asMeters(L),
    r: asOhmsPerKm(r),
    x: asOhmsPerKm(x),
    z_eff: asOhmsPerKm(z_eff),
    dropV: asVolts(dropV),
    dropPct: asPercentage(dropPct),
    maxDropPct: asPercentage(maxDropPct),
    pass: dropPct <= maxDropPct
  };
}
