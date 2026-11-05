import { asAmps, type Amps } from '../types/units.js';

export type LoadType = 'mc' | 'fan' | 'motor' | 'other';

export interface CombinationLoadItem {
  id: number | string;
  type: LoadType;
  /** Rated-load current (for mc), full-load current (for fan/motor), or rated current (for other) in Amperes */
  rlc: number;
  /** Branch-circuit selection current in Amperes (applicable to mc) */
  bsc?: number;
  /** Locked-rotor current in Amperes */
  lrc?: number;
}

export interface CompressorOverloadResult {
  loadId: number | string;
  separateRelay: Amps;
  thermalProtector: Amps;
  fuseOrBreaker: Amps;
  specialProtectiveSystem: Amps;
}

export interface CombinationLoadsResult {
  hasCompressors: boolean;
  totalSumCurrent: Amps;
  totalSumLrc: Amps;
  disconnectRating: Amps;
  isMcLargest: boolean;
  ocpdStep1: Amps;
  ocpdStep3: Amps;
  conductorAmpacity: Amps;
  compressorOverloads: CompressorOverloadResult[];
}

export function getLoadOperatingCurrent(row: CombinationLoadItem): number {
  return row.type === 'mc' ? Math.max(row.rlc || 0, row.bsc || 0) : (row.rlc || 0);
}

export function getLoadLrc(row: CombinationLoadItem): number {
  return row.type === 'other' ? (row.rlc || 0) : (row.lrc || 0);
}

/**
 * Calculates feeder/branch circuit ratings supplying two or more motor-compressors and other loads per NEC 440 Part IV.
 */
export function calculateCombinationLoads(loads: CombinationLoadItem[]): CombinationLoadsResult {
  const mcRows = loads.filter(r => r.type === 'mc');
  if (mcRows.length === 0) {
    return {
      hasCompressors: false,
      totalSumCurrent: asAmps(0),
      totalSumLrc: asAmps(0),
      disconnectRating: asAmps(0),
      isMcLargest: false,
      ocpdStep1: asAmps(0),
      ocpdStep3: asAmps(0),
      conductorAmpacity: asAmps(0),
      compressorOverloads: []
    };
  }

  // Sum of currents across all loads on the circuit
  const sumI = loads.reduce((s, r) => s + getLoadOperatingCurrent(r), 0);
  const sumLRC = loads.reduce((s, r) => s + getLoadLrc(r), 0);

  // Find largest motor-compressor
  const largestMc = mcRows.reduce((a, b) => (getLoadOperatingCurrent(b) > getLoadOperatingCurrent(a) ? b : a));
  const largestMcI = getLoadOperatingCurrent(largestMc);

  // Find largest load overall
  const largestOverall = loads.reduce((a, b) => (getLoadOperatingCurrent(b) > getLoadOperatingCurrent(a) ? b : a));
  const isMcLargest = largestOverall.id === largestMc.id;

  // NEC 440.12(B)(1): Disconnecting means rating >= 115% of the sum of the currents
  const disconnectRating = 1.15 * sumI;

  let ocpdStep1 = 0;
  let ocpdStep3 = 0;

  if (isMcLargest) {
    // Case A: The largest motor-compressor is the largest load on the circuit
    const rest = sumI - largestMcI;
    // NEC 440.22(B)(1): 175% of largest compressor + sum of ratings of other loads
    ocpdStep1 = 1.75 * largestMcI + rest;
    // NEC 440.22(B)(1) Exception 1: up to 225% of largest compressor + sum of other loads
    ocpdStep3 = 2.25 * largestMcI + rest;
  } else {
    // Case B: A non-compressor load is larger than any compressor on the circuit
    const sumMcI = mcRows.reduce((s, r) => s + getLoadOperatingCurrent(r), 0);
    const otherRows = loads.filter(r => r.type !== 'mc');
    const sumOtherI = otherRows.reduce((s, r) => s + getLoadOperatingCurrent(r), 0);
    const restForMop = sumI - getLoadOperatingCurrent(largestOverall);

    // Numeric behavior preserved from HTML version:
    ocpdStep1 = sumMcI + sumOtherI;
    ocpdStep3 = 2.25 * getLoadOperatingCurrent(largestOverall) + restForMop;
  }

  // NEC 440.33: 125% of largest motor-compressor + sum of other loads (numeric behavior preserved)
  const conductorAmpacity = 1.25 * largestMcI + (sumI - largestMcI);

  // NEC 440.52(A): Overload protection per motor-compressor
  const compressorOverloads: CompressorOverloadResult[] = mcRows.map(row => {
    const rowI = getLoadOperatingCurrent(row);
    const rlc = row.rlc || 0;
    return {
      loadId: row.id,
      separateRelay: asAmps(1.40 * rlc),        // NEC 440.52(A)(1)
      thermalProtector: asAmps(1.56 * rowI),    // NEC 440.52(A)(2)
      fuseOrBreaker: asAmps(1.25 * rlc),        // NEC 440.52(A)(3)
      specialProtectiveSystem: asAmps(1.56 * rowI) // NEC 440.52(A)(4)
    };
  });

  return {
    hasCompressors: true,
    totalSumCurrent: asAmps(sumI),
    totalSumLrc: asAmps(sumLRC),
    disconnectRating: asAmps(disconnectRating),
    isMcLargest,
    ocpdStep1: asAmps(ocpdStep1),
    ocpdStep3: asAmps(ocpdStep3),
    conductorAmpacity: asAmps(conductorAmpacity),
    compressorOverloads
  };
}
