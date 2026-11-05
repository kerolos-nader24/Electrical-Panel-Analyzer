import { describe, it, expect } from 'vitest';
import { calculateVoltageDrop } from '../src/index.js';

describe('Voltage Drop Module (IEC 60364-5-52 Annex G / IEEE 141)', () => {
  it('calculates 3-phase voltage drop using Cu XLPE cable impedance', () => {
    // 25 mm² Cu XLPE: r_xlpe = 0.887, x = 0.081
    // L = 30m, Ib = 94.2A, V = 380V, PF = 0.90
    // cosPhi = 0.9, sinPhi = sqrt(1 - 0.81) = 0.43588989
    // z_eff = 0.887 * 0.9 + 0.081 * 0.43589 = 0.8336 Ω/km
    // dropV = (√3 * 30 * 94.2 * 0.8336) / 1000 = 4.0805 V
    // dropPct = (4.0805 / 380) * 100 = 1.07%
    const res = calculateVoltageDrop(25, 30, 94.2, 380, true, 'cu', 'xlpe', 0.9, 3.0);
    expect(res.dropV).toBeCloseTo(4.08, 1);
    expect(res.dropPct).toBeCloseTo(1.07, 1);
    expect(res.pass).toBe(true);
  });

  it('calculates 1-phase voltage drop using factor k = 2.0', () => {
    // 16 mm² Cu PVC: r_pvc = 1.41, x = 0.083
    // L = 50m, Ib = 40A, V = 230V, PF = 0.95
    // k = 2.0
    const res = calculateVoltageDrop(16, 50, 40, 230, false, 'cu', 'pvc', 0.95, 3.0);
    expect(res.dropV).toBeGreaterThan(0);
    expect(res.dropPct).toBeGreaterThan(0);
  });

  it('fails check when drop exceeds maxDropPct', () => {
    // Very long length: 200m
    const res = calculateVoltageDrop(25, 200, 94.2, 380, true, 'cu', 'xlpe', 0.9, 3.0);
    expect(res.dropPct).toBeGreaterThan(3.0);
    expect(res.pass).toBe(false);
  });
});
