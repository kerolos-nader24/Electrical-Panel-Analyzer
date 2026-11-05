import { describe, it, expect } from 'vitest';
import { calculateCombinationLoads, type CombinationLoadItem } from '../src/index.js';

describe('Combination AC Loads Calculations (NEC Article 440 Part IV)', () => {
  it('handles empty load lists by returning zeroed response with hasCompressors=false', () => {
    const res = calculateCombinationLoads([]);
    expect(res.hasCompressors).toBe(false);
    expect(res.totalSumCurrent).toBe(0);
    expect(res.disconnectRating).toBe(0);
  });

  it('calculates Case A when largest motor-compressor is the largest load on circuit', () => {
    const loads: CombinationLoadItem[] = [
      { id: 1, type: 'mc', rlc: 30, bsc: 0, lrc: 150 }, // largest MC: 30A
      { id: 2, type: 'mc', rlc: 15, bsc: 0, lrc: 80 },  // second MC: 15A
      { id: 3, type: 'fan', rlc: 5, lrc: 20 }           // fan: 5A
    ];

    const res = calculateCombinationLoads(loads);
    expect(res.hasCompressors).toBe(true);
    expect(res.isMcLargest).toBe(true);

    // Total current sum = 30 + 15 + 5 = 50A
    expect(res.totalSumCurrent).toBe(50);
    // Disconnect = 1.15 * 50 = 57.5A
    expect(res.disconnectRating).toBeCloseTo(57.5, 2);

    // Case A: 1.75 * 30 + (50 - 30) = 52.5 + 20 = 72.5A
    expect(res.ocpdStep1).toBeCloseTo(72.5, 2);
    // Case A Step 3: 2.25 * 30 + 20 = 67.5 + 20 = 87.5A
    expect(res.ocpdStep3).toBeCloseTo(87.5, 2);

    // Conductor ampacity: 1.25 * 30 + 20 = 37.5 + 20 = 57.5A
    expect(res.conductorAmpacity).toBeCloseTo(57.5, 2);

    // Overload items
    expect(res.compressorOverloads.length).toBe(2);
    expect(res.compressorOverloads[0].separateRelay).toBeCloseTo(1.40 * 30, 2);
    expect(res.compressorOverloads[1].separateRelay).toBeCloseTo(1.40 * 15, 2);
  });

  it('calculates Case B when a non-compressor load is larger than any compressor', () => {
    const loads: CombinationLoadItem[] = [
      { id: 1, type: 'mc', rlc: 10, bsc: 0, lrc: 50 },  // MC: 10A
      { id: 2, type: 'motor', rlc: 40, lrc: 200 }       // Large motor: 40A
    ];

    const res = calculateCombinationLoads(loads);
    expect(res.hasCompressors).toBe(true);
    expect(res.isMcLargest).toBe(false);

    // Total current = 10 + 40 = 50A
    expect(res.totalSumCurrent).toBe(50);
    // Disconnect = 1.15 * 50 = 57.5A
    expect(res.disconnectRating).toBeCloseTo(57.5, 2);

    // Preserved HTML behavior for Case B:
    // Step 1: sumMcI + sumOtherI = 10 + 40 = 50A
    expect(res.ocpdStep1).toBe(50);
    // Step 3: 2.25 * 40 + (50 - 40) = 90 + 10 = 100A
    expect(res.ocpdStep3).toBe(100);
  });
});
