import { asAmps, asKVA, asVolts, type Amps, type kVA, type Volts } from '../types/units.js';
import type { LoadUnit } from '../types/common.js';
import { STANDARD_BREAKERS } from '@panel-analyzer/data';

export interface DemandLoadResult {
  connectedLoad: kVA;
  demandLoad: kVA;
  factor: number;
  isApplied: boolean;
}

export interface DesignCurrentResult {
  connectedKva: kVA;
  demandKva: kVA;
  demandResult: DemandLoadResult;
  isPfUsed: boolean;
  pf: number;
  voltage: Volts;
  is3Phase: boolean;
  Ib: Amps;
  formulaStr: string;
}

/**
 * Calculates demand load from connected load and demand factor.
 * IEC 60364-5-52 Clause 523 / NEC 220 Part III.
 */
export function calculateDemandLoad(connectedLoad: number, demandFactor: number, isEnabled?: boolean): DemandLoadResult {
  const df = (demandFactor > 0 && demandFactor <= 1) ? demandFactor : 1.0;
  const applied = isEnabled !== false && df < 1.0;
  const demandLoad = applied ? (connectedLoad * df) : connectedLoad;
  return {
    connectedLoad: asKVA(connectedLoad),
    demandLoad: asKVA(demandLoad),
    factor: df,
    isApplied: applied
  };
}

/**
 * Calculates design current Ib for 1-phase or 3-phase systems from raw load value and unit.
 *
 * Fundamental formulas:
 * - Single Phase: Ib = (S_demand * 1000) / V
 * - Three Phase:  Ib = (S_demand * 1000) / (√3 * VLL)
 *
 * When input is in kVA or VA, Power Factor is NOT used (kVA is apparent power).
 * When input is in kW, W, or HP, Power Factor is used to calculate kVA = kW / PF.
 */
export function calculateDesignCurrent(
  loadValue: number,
  unit: LoadUnit | string,
  voltage: number,
  is3Phase: boolean,
  pf: number = 0.85,
  demandFactor: number = 1.0,
  isDemandEnabled: boolean = false
): DesignCurrentResult {
  const V = voltage > 0 ? voltage : (is3Phase ? 380 : 230);
  const pFactor = (pf > 0 && pf <= 1) ? pf : 0.85;

  let kvaConnected = 0;
  let isPfUsed = false;

  const u = (unit || 'kva').toLowerCase();
  if (u === 'kva') {
    kvaConnected = loadValue;
    isPfUsed = false;
  } else if (u === 'va') {
    kvaConnected = loadValue / 1000;
    isPfUsed = false;
  } else if (u === 'kw') {
    // S = P / cos(phi)
    kvaConnected = pFactor > 0 ? loadValue / pFactor : loadValue;
    isPfUsed = true;
  } else if (u === 'w') {
    // S = (P_W / 1000) / cos(phi)
    kvaConnected = pFactor > 0 ? (loadValue / 1000) / pFactor : loadValue / 1000;
    isPfUsed = true;
  } else if (u === 'hp') {
    // 1 HP = 0.746 kW (assuming eta = 1.0 as in original calculator)
    const kw = loadValue * 0.746;
    kvaConnected = pFactor > 0 ? kw / pFactor : kw;
    isPfUsed = true;
  } else {
    kvaConnected = loadValue;
    isPfUsed = false;
  }

  const demandResult = calculateDemandLoad(kvaConnected, demandFactor, isDemandEnabled);
  const S_demand = demandResult.demandLoad;

  let Ib = 0;
  let formulaStr = '';
  if (is3Phase) {
    // 3-Phase Apparent Power Current: I = (S * 1000) / (sqrt(3) * V_LL)
    Ib = (S_demand * 1000) / (Math.sqrt(3) * V);
    formulaStr = `${(Math.round(S_demand * 1000 * 100) / 100).toString()} / (√3 × ${(Math.round(V * 100) / 100).toString()})`;
  } else {
    // 1-Phase Apparent Power Current: I = (S * 1000) / V_LN
    Ib = (S_demand * 1000) / V;
    formulaStr = `${(Math.round(S_demand * 1000 * 100) / 100).toString()} / ${(Math.round(V * 100) / 100).toString()}`;
  }

  return {
    connectedKva: asKVA(kvaConnected),
    demandKva: asKVA(S_demand),
    demandResult,
    isPfUsed,
    pf: pFactor,
    voltage: asVolts(V),
    is3Phase,
    Ib: asAmps(Ib),
    formulaStr
  };
}

/**
 * Calculates required nominal breaker rating applying safety sizing factor (default 1.25x for continuous load).
 * NEC 215.2(A)(1) & NEC 210.20(A).
 */
export function calculateRequiredBreaker(Ib: number, sizingFactor: number = 1.25): Amps {
  return asAmps(Ib * sizingFactor);
}

/**
 * Selects the next standard breaker rating In >= Irequired from standard breaker list.
 * IEC 60898 / IEC 60947-2 / NEC 240.6 standard ratings.
 */
export function selectStandardBreaker(Irequired: number, breakerList: number[] = STANDARD_BREAKERS): Amps {
  for (const b of breakerList) {
    if (b >= Irequired) return asAmps(b);
  }
  // Fallback rounding to next hundred
  return asAmps(Math.ceil(Irequired / 100) * 100);
}
