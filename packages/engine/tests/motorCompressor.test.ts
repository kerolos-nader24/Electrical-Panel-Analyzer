import { describe, it, expect } from 'vitest';
import { calculateMotorCompressor } from '../src/index.js';

describe('Motor-Compressor Calculations (NEC Article 440)', () => {
  it('correctly calculates single motor compressor with RLC only (24A, LRC 130A)', () => {
    const res = calculateMotorCompressor({ rlc: 24, lrc: 130 });

    // Base current = max(24, 0) = 24A
    expect(res.baseCurrent).toBe(24);
    // Disconnect: 1.15 * 24 = 27.6A
    expect(res.disconnectRating).toBeCloseTo(27.6, 2);
    // Starting OCPD: 1.75 * 24 = 42A
    expect(res.ocpdStep1).toBe(42);
    // Intersection OCPD: 2.25 * 24 = 54A
    expect(res.ocpdStep3).toBe(54);
    // Conductor ampacity: 1.25 * 24 = 30A
    expect(res.conductorAmpacity).toBe(30);
    // Wye-Delta conductor: 0.72 * 24 = 17.28A
    expect(res.wyeDeltaConductorAmpacity).toBeCloseTo(17.28, 2);
    // Controller ratings: FLC = 24A, LRC = 130A
    expect(res.controllerFlc).toBe(24);
    expect(res.controllerLrc).toBe(130);
    // Overload ratings:
    expect(res.overload.separateRelay).toBeCloseTo(1.40 * 24, 2); // 33.6A
    expect(res.overload.thermalProtector).toBeCloseTo(1.56 * 24, 2); // 37.44A
    expect(res.overload.fuseOrBreaker).toBeCloseTo(1.25 * 24, 2); // 30.0A
    expect(res.overload.specialProtectiveSystem).toBeCloseTo(1.56 * 24, 2); // 37.44A
  });

  it('uses BSC when BSC is greater than RLC', () => {
    const res = calculateMotorCompressor({ rlc: 20, bsc: 28, lrc: 150 });
    // Base current should be BSC = 28A
    expect(res.baseCurrent).toBe(28);
    expect(res.disconnectRating).toBeCloseTo(1.15 * 28, 2);
    expect(res.ocpdStep1).toBe(1.75 * 28);
    expect(res.ocpdStep3).toBe(2.25 * 28);
    expect(res.conductorAmpacity).toBe(1.25 * 28);
    // Overload relay uses RLC strictly: 1.40 * 20 = 28A
    expect(res.overload.separateRelay).toBe(28);
    // Overload fuse/CB uses RLC strictly: 1.25 * 20 = 25A
    expect(res.overload.fuseOrBreaker).toBe(25);
    // Thermal protector uses max(RLC, BSC) = 28: 1.56 * 28 = 43.68A
    expect(res.overload.thermalProtector).toBeCloseTo(1.56 * 28, 2);
  });

  it('uses nameplate MCA when MCA is greater than 125% of current', () => {
    // 1.25 * 20 = 25A, but marked MCA is 32A
    const res = calculateMotorCompressor({ rlc: 20, mca: 32 });
    expect(res.conductorAmpacity).toBe(32);
  });

  it('handles zero inputs gracefully', () => {
    const res = calculateMotorCompressor({ rlc: 0 });
    expect(res.baseCurrent).toBe(0);
    expect(res.disconnectRating).toBe(0);
    expect(res.ocpdStep1).toBe(0);
    expect(res.conductorAmpacity).toBe(0);
  });
});
