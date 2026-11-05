import { describe, it, expect } from 'vitest';
import { checkShortCircuit } from '../src/index.js';

describe('Short-Circuit Module (IEC 60364-4-43 Clause 434.5.2)', () => {
  it('returns available=false when fault current is omitted or zero', () => {
    const res = checkShortCircuit(25, 0, 0.1, 'cu', 'xlpe');
    expect(res.available).toBe(false);
  });

  it('correctly calculates S_min for Cu XLPE (k = 143)', () => {
    // 10 kA, 0.1s -> S_min = (10 * 1000 * sqrt(0.1)) / 143 = 3162.277 / 143 = 22.11 mm²
    const res = checkShortCircuit(25, 10, 0.1, 'cu', 'xlpe');
    expect(res.available).toBe(true);
    expect(res.k).toBe(143);
    expect(res.S_min).toBeCloseTo(22.11, 1);
    // 25 mm² >= 22.11 mm² -> PASS
    expect(res.pass).toBe(true);
  });

  it('fails when cable cross-section is smaller than S_min', () => {
    // 16 mm² cable with S_min = 22.11 mm² -> FAIL
    const res = checkShortCircuit(16, 10, 0.1, 'cu', 'xlpe');
    expect(res.pass).toBe(false);
  });

  it('uses k = 115 for Cu PVC', () => {
    // S_min = 3162.28 / 115 = 27.5 mm²
    const res = checkShortCircuit(35, 10, 0.1, 'cu', 'pvc');
    expect(res.k).toBe(115);
    expect(res.S_min).toBeCloseTo(27.5, 1);
    expect(res.pass).toBe(true);
  });

  it('uses k = 94 for Al XLPE and k = 76 for Al PVC', () => {
    const resXlpe = checkShortCircuit(50, 5, 0.1, 'al', 'xlpe');
    expect(resXlpe.k).toBe(94);
    const resPvc = checkShortCircuit(50, 5, 0.1, 'al', 'pvc');
    expect(resPvc.k).toBe(76);
  });
});
