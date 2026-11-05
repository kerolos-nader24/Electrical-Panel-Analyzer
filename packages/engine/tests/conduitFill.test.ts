import { describe, it, expect } from 'vitest';
import { selectConduit } from '../src/index.js';

describe('Conduit Fill Module (NEC Chapter 9 Table 1)', () => {
  it('selects conduit keeping fill <= 40%', () => {
    // 4 single cables of 10mm diameter
    // singleArea = pi/4 * 100 = 78.54 mm²
    // totalArea = 4 * 78.54 = 314.16 mm²
    // Conduit requires area >= 314.16 / 0.40 = 785.4 mm²
    // Conduit ID >= sqrt(785.4 * 4 / pi) = 31.6 mm
    // From conduits list: 40mm conduit has ID 33.4mm (area 876.16 mm²) -> fill = 314.16 / 876.16 = 35.85% <= 40%
    const res = selectConduit(10, 4);
    expect(res).not.toBeNull();
    expect(res!.size).toBe(40);
    expect(res!.fillPct).toBeLessThanOrEqual(40);
  });

  it('returns null for zero diameter or zero cables', () => {
    expect(selectConduit(0, 4)).toBeNull();
    expect(selectConduit(10, 0)).toBeNull();
  });
});
