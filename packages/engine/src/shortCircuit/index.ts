import { asMm2, type mm2 } from '../types/units.js';
import type { ConductorMaterial, InsulationType } from '../types/common.js';

export interface ShortCircuitResult {
  available: boolean;
  message?: string;
  Isc_kA?: number;
  timeSec?: number;
  k?: number;
  S_min?: mm2;
  cableSize?: mm2;
  pass?: boolean;
}

/**
 * Verifies adiabatic thermal withstand capability of cable under short-circuit conditions.
 *
 * References:
 * - IEC 60364-4-43 Clause 434.5.2: t = k^2 * S^2 / I^2  ==>  S_min = (I_sc * √t) / k
 * - IEC 60364-5-54 Table 54.2 thermodynamic constants (k):
 *   - Cu / XLPE (90°C -> 250°C): k = 143
 *   - Cu / PVC (70°C -> 160°C):  k = 115
 *   - Al / XLPE (90°C -> 250°C): k = 94
 *   - Al / PVC (70°C -> 160°C):  k = 76
 */
export function checkShortCircuit(
  cableSize: number,
  Isc_kA?: number,
  timeSec?: number,
  conductor: ConductorMaterial = 'cu',
  insulation: InsulationType = 'xlpe'
): ShortCircuitResult {
  if (!Isc_kA || Isc_kA <= 0 || !timeSec || timeSec <= 0) {
    return {
      available: false,
      message: 'Short-circuit verification requires additional input data.'
    };
  }

  let k = 143;
  if (conductor === 'cu') {
    k = insulation === 'pvc' ? 115 : 143;
  } else {
    k = insulation === 'pvc' ? 76 : 94;
  }

  // S_min = (I_sc_Amps * sqrt(t)) / k
  const S_min = (Isc_kA * 1000 * Math.sqrt(timeSec)) / k;
  const pass = cableSize >= S_min;

  return {
    available: true,
    Isc_kA,
    timeSec,
    k,
    S_min: asMm2(S_min),
    cableSize: asMm2(cableSize),
    pass
  };
}
