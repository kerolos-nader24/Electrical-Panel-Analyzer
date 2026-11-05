import { asPercentage, type Percentage } from '../types/units.js';
import { MAX_CONDUIT_FILL, STANDARD_CONDUITS, type ConduitSpec } from '@panel-analyzer/data';

export interface ConduitFillResult {
  /** Nominal conduit size (trade size in mm) */
  size: number;
  /** Internal diameter in mm */
  id: number;
  /** Total cross-sectional area of cables in mm² */
  totalArea: number;
  /** Internal cross-sectional area of conduit in mm² */
  conduitArea: number;
  /** Calculated fill percentage (%) */
  fillPct: Percentage;
}

/**
 * Sizes conduit based on cable diameter and number of cables ensuring fill ratio <= maxFill (default 40%).
 *
 * References:
 * - NEC Chapter 9 Table 1 (40% maximum fill rule for 3 or more conductors).
 * - Standard PVC conduit dimensions.
 */
export function selectConduit(
  cableDia: number,
  numCables: number,
  conduits: ConduitSpec[] = STANDARD_CONDUITS,
  maxFill: number = MAX_CONDUIT_FILL
): ConduitFillResult | null {
  if (cableDia <= 0 || numCables <= 0) return null;

  const singleArea = (Math.PI / 4) * cableDia * cableDia;
  const totalArea = singleArea * numCables;

  for (const c of conduits) {
    const conduitArea = (Math.PI / 4) * c.id * c.id;
    if (totalArea <= maxFill * conduitArea) {
      const fillPct = (totalArea / conduitArea) * 100;
      return {
        size: c.size,
        id: c.id,
        totalArea,
        conduitArea,
        fillPct: asPercentage(fillPct)
      };
    }
  }

  return null;
}
