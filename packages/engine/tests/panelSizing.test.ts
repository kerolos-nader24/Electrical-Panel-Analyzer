import { describe, it, expect } from 'vitest';
import {
  calculateDemandLoad,
  calculateDesignCurrent,
  calculateRequiredBreaker,
  selectStandardBreaker
} from '../src/index.js';

describe('Panel Sizing Module', () => {
  it('calculates 3-phase current for kVA load directly without using PF', () => {
    // 60 kVA, 380V, 3-Phase, PF=0.8
    // Ib = (60 * 1000) / (√3 * 380) = 91.16 A
    const res = calculateDesignCurrent(60, 'kva', 380, true, 0.8, 1.0, false);
    expect(res.isPfUsed).toBe(false);
    expect(res.Ib).toBeCloseTo(91.16, 2);
  });

  it('calculates 1-phase current for kVA load directly', () => {
    // 10 kVA, 230V, 1-Phase
    // Ib = (10 * 1000) / 230 = 43.48 A
    const res = calculateDesignCurrent(10, 'kva', 230, false, 0.8, 1.0, false);
    expect(res.isPfUsed).toBe(false);
    expect(res.Ib).toBeCloseTo(43.48, 2);
  });

  it('uses PF when load is in kW', () => {
    // 40 kW, PF=0.8 -> kVA = 50 kVA
    // 380V 3P -> Ib = (50 * 1000) / (√3 * 380) = 75.97 A
    const res = calculateDesignCurrent(40, 'kw', 380, true, 0.8, 1.0, false);
    expect(res.isPfUsed).toBe(true);
    expect(res.connectedKva).toBe(50);
    expect(res.Ib).toBeCloseTo(75.97, 2);
  });

  it('converts HP to kW and uses PF', () => {
    // 10 HP -> 7.46 kW
    // PF = 0.85 -> kVA = 7.46 / 0.85 = 8.776 kVA
    const res = calculateDesignCurrent(10, 'hp', 380, true, 0.85, 1.0, false);
    expect(res.isPfUsed).toBe(true);
    expect(res.connectedKva).toBeCloseTo(8.776, 2);
  });

  it('applies demand factor when enabled and < 1.0', () => {
    const dem = calculateDemandLoad(100, 0.7, true);
    expect(dem.isApplied).toBe(true);
    expect(dem.demandLoad).toBe(70);

    const res = calculateDesignCurrent(100, 'kva', 380, true, 0.9, 0.7, true);
    expect(res.demandKva).toBe(70);
    // Ib calculated with 70 kVA instead of 100 kVA
    expect(res.Ib).toBeCloseTo((70 * 1000) / (Math.sqrt(3) * 380), 2);
  });

  it('sizes standard breaker with 125% factor', () => {
    // Ib = 80 A -> I_req = 100 A -> Breaker = 100 A
    const req = calculateRequiredBreaker(80, 1.25);
    expect(req).toBe(100);
    const breaker = selectStandardBreaker(req);
    expect(breaker).toBe(100);

    // Ib = 81 A -> I_req = 101.25 A -> Next breaker is 125 A
    const req2 = calculateRequiredBreaker(81, 1.25);
    expect(req2).toBe(101.25);
    const breaker2 = selectStandardBreaker(req2);
    expect(breaker2).toBe(125);
  });
});
