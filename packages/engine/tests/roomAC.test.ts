import { describe, it, expect } from 'vitest';
import { calculateRoomAC } from '../src/index.js';

describe('Room A/C Unit Calculations (NEC Article 440 Part VII)', () => {
  it('applies 1.25 factor when sole load on the circuit (NEC 440.62(B))', () => {
    const res = calculateRoomAC({ rating: 12, hasOtherLoads: false });
    expect(res.factor).toBe(1.25);
    // 1.25 * 12 = 15A
    expect(res.requiredAmpacity).toBe(15);
  });

  it('applies 2.00 factor when other loads share the circuit (NEC 440.62(C))', () => {
    const res = calculateRoomAC({ rating: 12, hasOtherLoads: true });
    expect(res.factor).toBe(2.00);
    // 2.00 * 12 = 24A
    expect(res.requiredAmpacity).toBe(24);
  });

  it('handles 0A input', () => {
    const res = calculateRoomAC({ rating: 0, hasOtherLoads: false });
    expect(res.requiredAmpacity).toBe(0);
  });
});
