import { describe, it, expect } from 'vitest';
import { selectParallelCableWithVdrop } from '../src/cableSelection/index.js';
import { generateCableTag } from '../src/cableTag/index.js';

describe('Parallel Cable Sizing & Tagging Engine', () => {
  it('selects single cable (runs=1) when ampacity is within standard catalogue', () => {
    // 125A breaker, 30m, 380V
    const res = selectParallelCableWithVdrop(
      'cu_xlpe_1core',
      125,
      0.80,
      'ground',
      30,
      94.2,
      380,
      true,
      'cu',
      'xlpe',
      0.9,
      3.0,
      1
    );

    expect(res).not.toBeNull();
    expect(res?.runs).toBe(1);
    expect(res?.cable.size).toBe(25);
    expect(res?.pass).toBe(true);
  });

  it('selects parallel cables (N >= 2) for very large current (e.g. 1000A breaker)', () => {
    const res = selectParallelCableWithVdrop(
      'cu_xlpe_1core',
      1000,
      0.80,
      'air',
      50,
      800,
      380,
      true,
      'cu',
      'xlpe',
      0.9,
      3.0
    );

    expect(res).not.toBeNull();
    expect(res!.runs).toBeGreaterThanOrEqual(2);
    expect(res!.pass).toBe(true);
  });

  it('formats AutoCAD tag with parallel notation when runs > 1', () => {
    const cable = { size: 185 as any, ampacity: 450 as any, dia: 55 };
    const tag = generateCableTag(cable, 4, 'cu', 'armoured', 'xlpe', '3pn', 2);

    expect(tag.line1).toContain('2x(4X185)mm2');
    expect(tag.line2).toContain('2x95mm2');
  });
});
