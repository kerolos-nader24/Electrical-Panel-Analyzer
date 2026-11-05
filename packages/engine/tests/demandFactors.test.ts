import { describe, it, expect } from 'vitest';
import { calculatePanelDemand } from '../src/demandFactors/index.js';

describe('Panel Demand Factors Engine', () => {
  it('correctly aggregates categorized loads and applies demand factors', () => {
    const circuits = [
      { loadType: 'lighting' as const, connectedKva: 10 },
      { loadType: 'lighting' as const, connectedKva: 5 },
      { loadType: 'socket' as const, connectedKva: 20 },
      { loadType: 'motor' as const, connectedKva: 30 },
      { loadType: 'ac' as const, connectedKva: 15 }
    ];

    // Defaults: lighting=0.9, socket=0.7, motor=1.0, ac=0.85
    // lighting: 15 * 0.9 = 13.5
    // socket: 20 * 0.7 = 14.0
    // motor: 30 * 1.0 = 30.0
    // ac: 15 * 0.85 = 12.75
    // total connected = 80 kVA
    // total demand = 13.5 + 14 + 30 + 12.75 = 70.25 kVA
    const res = calculatePanelDemand(circuits);

    expect(res.totalConnectedKva).toBe(80);
    expect(res.totalDemandKva).toBe(70.25);
    expect(res.categories.lighting.demandKva).toBe(13.5);
    expect(res.categories.socket.demandKva).toBe(14);
    expect(res.overallDemandFactor).toBeCloseTo(70.25 / 80, 3);
  });

  it('respects custom demand factors', () => {
    const circuits = [
      { loadType: 'lighting' as const, connectedKva: 20 }
    ];
    const res = calculatePanelDemand(circuits, { lighting: 0.8 });
    expect(res.categories.lighting.demandKva).toBe(16);
    expect(res.totalDemandKva).toBe(16);
  });
});
