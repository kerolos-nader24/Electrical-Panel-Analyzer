import { asAmps, type Amps } from '../types/units.js';
import { selectStandardBreaker } from '../panelSizing/index.js';

export type MotorStarterType = 'dol' | 'star_delta' | 'soft_starter' | 'vfd';

export interface MotorCircuitInputs {
  /** Rated power in kW or HP, or direct current in Amperes */
  loadVal: number;
  loadUnit: 'kw' | 'hp' | 'a';
  voltage: number;
  is3Phase: boolean;
  pf?: number;
  efficiency?: number;
  serviceFactor?: number;
  starterType?: MotorStarterType;
}

export interface MotorCircuitOutputs {
  fla: Amps;
  conductorAmpacity: Amps;
  ocpdCalculated: Amps;
  ocpdBreaker: number;
  overloadSetting: Amps;
  disconnectRating: Amps;
  recommendedStarter: MotorStarterType;
  starterType: MotorStarterType;
  notes: string[];
}

/**
 * Calculates induction motor branch-circuit parameters per NEC Article 430:
 * - Branch Conductor: 125% of FLA (NEC 430.22)
 * - Branch OCPD: Inverse-Time Breaker at 250% of FLA, rounded to standard rating (NEC 430.52)
 * - Overload Protection: 115% or 125% of FLA (NEC 430.32)
 * - Disconnecting Means: 115% of FLA (NEC 430.110)
 */
export function calculateMotorCircuit(inputs: MotorCircuitInputs): MotorCircuitOutputs {
  const {
    loadVal,
    loadUnit,
    voltage,
    is3Phase,
    pf = 0.85,
    efficiency = 0.88,
    serviceFactor = 1.0,
    starterType
  } = inputs;

  let flaNum = 0;
  let powerKw = 0;

  if (loadUnit === 'a') {
    flaNum = Math.max(0, loadVal);
    // Approximate power for starter recommendation
    powerKw = is3Phase
      ? (Math.sqrt(3) * voltage * flaNum * pf * efficiency) / 1000
      : (voltage * flaNum * pf * efficiency) / 1000;
  } else {
    powerKw = loadUnit === 'hp' ? loadVal * 0.746 : loadVal;
    if (voltage > 0 && pf > 0 && efficiency > 0) {
      if (is3Phase) {
        flaNum = (powerKw * 1000) / (Math.sqrt(3) * voltage * pf * efficiency);
      } else {
        flaNum = (powerKw * 1000) / (voltage * pf * efficiency);
      }
    }
  }

  const fla = asAmps(Number(flaNum.toFixed(2)));

  // 1. Conductor Ampacity (NEC 430.22): >= 125% FLA
  const conductorAmpacity = asAmps(Number((flaNum * 1.25).toFixed(2)));

  // 2. Branch OCPD (NEC 430.52 Table 430.52): 250% of FLA for inverse time CB
  const ocpdCalculated = asAmps(Number((flaNum * 2.50).toFixed(2)));
  const ocpdBreaker = selectStandardBreaker(ocpdCalculated);

  // 3. Overload Protection (NEC 430.32(A)(1)):
  // 125% for motors with service factor >= 1.15, otherwise 115%
  const ovlMultiplier = serviceFactor >= 1.15 ? 1.25 : 1.15;
  const overloadSetting = asAmps(Number((flaNum * ovlMultiplier).toFixed(2)));

  // 4. Disconnecting Means (NEC 430.110(A)): >= 115% FLA
  const disconnectRating = asAmps(Number((flaNum * 1.15).toFixed(2)));

  // 5. Recommended Starter Selection
  let recommendedStarter: MotorStarterType = 'dol';
  if (powerKw > 45) {
    recommendedStarter = 'vfd';
  } else if (powerKw > 4) {
    recommendedStarter = 'star_delta';
  }

  const effectiveStarter = starterType || recommendedStarter;

  const notes: string[] = [
    `Branch conductor minimum ampacity = 125% × ${fla}A = ${conductorAmpacity}A (NEC 430.22).`,
    `Short-circuit protection (OCPD) = 250% × ${fla}A = ${ocpdCalculated}A → Selected breaker: ${ocpdBreaker}A (NEC 430.52).`,
    `Overload relay setting = ${ovlMultiplier * 100}% × ${fla}A = ${overloadSetting}A (NEC 430.32).`,
    `Disconnecting switch rating ≥ 115% × ${fla}A = ${disconnectRating}A (NEC 430.110).`
  ];

  if (effectiveStarter === 'star_delta') {
    notes.push('Wye-Delta starting reduces starting inrush to ~33% of DOL.');
  } else if (effectiveStarter === 'vfd' || effectiveStarter === 'soft_starter') {
    notes.push('Electronic controlled starting provides smooth acceleration and low starting current.');
  }

  return {
    fla,
    conductorAmpacity,
    ocpdCalculated,
    ocpdBreaker,
    overloadSetting,
    disconnectRating,
    recommendedStarter,
    starterType: effectiveStarter,
    notes
  };
}
