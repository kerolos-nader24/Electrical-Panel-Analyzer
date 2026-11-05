import { describe, it, expect } from 'vitest';
import { calculateDetailedDerating, interpolateFactor } from '../src/derating/index.js';

describe('Detailed Derating Module (IEC 60364-5-52)', () => {
  it('correctly retrieves reference temperature factor for XLPE 30°C in air', () => {
    const res = calculateDetailedDerating({
      ambientTemp: 30,
      insulation: 'xlpe',
      installMethod: 'air',
      circuitsCount: 1
    });

    expect(res.kTemp).toBe(1.0);
    expect(res.kGroup).toBe(1.0);
    expect(res.kDepth).toBe(1.0);
    expect(res.kSoil).toBe(1.0);
    expect(res.kTotal).toBe(1.0);
  });

  it('correctly calculates derating for underground installation at 35°C ground, 3 circuits, 0.8m depth, 2.0 soil resistivity', () => {
    // XLPE ground 35°C: 0.89
    // Grouping 3 circuits: 0.70
    // Depth 0.8m: 0.99
    // Soil 2.0: 0.93
    // Product: 0.89 * 0.70 * 0.99 * 0.93 = 0.5735
    const res = calculateDetailedDerating({
      ambientTemp: 35,
      insulation: 'xlpe',
      installMethod: 'ground',
      circuitsCount: 3,
      depth: 0.8,
      soilResistivity: 2.0
    });

    expect(res.kTemp).toBe(0.89);
    expect(res.kGroup).toBe(0.70);
    expect(res.kDepth).toBe(0.99);
    expect(res.kSoil).toBe(0.93);
    expect(res.kTotal).toBeCloseTo(0.5735, 3);
  });

  it('interpolates intermediate temperature values smoothly', () => {
    // Air XLPE: 30°C is 1.0, 35°C is 0.96. At 32.5°C, should be ~0.98
    const factor = interpolateFactor({ 30: 1.0, 35: 0.96 }, 32.5);
    expect(factor).toBe(0.98);
  });
});
