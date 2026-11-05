import { asMm2, type mm2 } from '../types/units.js';
import type { SystemType } from '../types/common.js';
import { REDUCED_NEUTRAL, STANDARD_ECC } from '@panel-analyzer/data';

/**
 * Calculates neutral conductor cross-section size.
 *
 * References:
 * - IEC 60364-5-52 Clause 524.2 / Table B.52.18:
 *   - For 1P+N: neutral conductor size equals phase conductor size.
 *   - For 3P (no neutral): neutral is null.
 *   - For 3P+N: reduced neutral is permitted for phase size >= 25 mm² where third harmonic current <= 15-33%.
 */
export function calculateNeutral(phaseSize: number, systemType: SystemType): mm2 | null {
  if (systemType === '1p') return asMm2(phaseSize);
  if (systemType === '3p') return null;
  const reduced = REDUCED_NEUTRAL[phaseSize];
  return asMm2(reduced !== undefined ? reduced : phaseSize);
}

/**
 * Calculates protective Earth Continuity Conductor (ECC) size.
 *
 * References:
 * - IEC 60364-5-54 Table 54.2 / BS 7671 Table 54.7:
 *   - S <= 16 mm²: Se = S
 *   - 16 < S <= 35 mm²: Se = 16 mm²
 *   - S > 35 mm²: Se = S / 2 (rounded up)
 */
export function calculateEarth(phaseSize: number): mm2 {
  const standard = STANDARD_ECC[phaseSize];
  if (standard !== undefined) {
    return asMm2(standard);
  }
  return asMm2(phaseSize > 35 ? Math.ceil(phaseSize / 2) : phaseSize);
}
