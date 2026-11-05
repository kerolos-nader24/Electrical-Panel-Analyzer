import { describe, it, expect } from 'vitest';
import { calculateMotorCircuit } from '../src/motorCircuit/index.js';

describe('NEC 430 Motor Branch-Circuit Engine', () => {
  it('correctly sizes a 15 kW 380V 3-phase induction motor', () => {
    // 15 kW, 380V, 3-Phase, PF=0.85, eff=0.88
    // FLA = 15000 / (sqrt(3) * 380 * 0.85 * 0.88) = 15000 / 492.5 = 30.45 A
    // Conductor = 1.25 * 30.45 = 38.07 A
    // OCPD = 2.50 * 30.45 = 76.14 A -> selected breaker: 80 A
    // Overload = 1.15 * 30.45 = 35.02 A
    // Disconnect = 1.15 * 30.45 = 35.02 A
    // Starter recommendation: star_delta (4 kW < 15 kW <= 45 kW)
    const res = calculateMotorCircuit({
      loadVal: 15,
      loadUnit: 'kw',
      voltage: 380,
      is3Phase: true,
      pf: 0.85,
      efficiency: 0.88
    });

    expect(res.fla).toBeCloseTo(30.45, 1);
    expect(res.conductorAmpacity).toBeCloseTo(38.07, 1);
    expect(res.ocpdBreaker).toBe(80);
    expect(res.overloadSetting).toBeCloseTo(35.02, 1);
    expect(res.disconnectRating).toBeCloseTo(35.02, 1);
    expect(res.recommendedStarter).toBe('star_delta');
  });

  it('recommends DOL for small motors <= 4 kW', () => {
    const res = calculateMotorCircuit({
      loadVal: 3,
      loadUnit: 'kw',
      voltage: 380,
      is3Phase: true
    });
    expect(res.recommendedStarter).toBe('dol');
  });

  it('recommends VFD for large motors > 45 kW', () => {
    const res = calculateMotorCircuit({
      loadVal: 55,
      loadUnit: 'kw',
      voltage: 380,
      is3Phase: true
    });
    expect(res.recommendedStarter).toBe('vfd');
  });

  it('correctly handles direct ampere input', () => {
    const res = calculateMotorCircuit({
      loadVal: 20,
      loadUnit: 'a',
      voltage: 230,
      is3Phase: false
    });
    expect(res.fla).toBe(20);
    expect(res.conductorAmpacity).toBe(25); // 1.25 * 20
    expect(res.ocpdBreaker).toBe(50); // 2.50 * 20 = 50 -> 50A breaker
  });
});
