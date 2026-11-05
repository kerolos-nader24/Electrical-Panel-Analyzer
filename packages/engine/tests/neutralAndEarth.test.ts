import { describe, it, expect } from 'vitest';
import { calculateNeutral, calculateEarth } from '../src/index.js';

describe('Neutral and Earth Sizing Module', () => {
  it('returns full phase size for 1-phase system', () => {
    expect(calculateNeutral(16, '1p')).toBe(16);
    expect(calculateNeutral(70, '1p')).toBe(70);
  });

  it('returns null neutral for 3P system without neutral', () => {
    expect(calculateNeutral(50, '3p')).toBeNull();
  });

  it('applies IEC 60364-5-52 Clause 524.2 reduced neutral table for 3P+N', () => {
    expect(calculateNeutral(16, '3pn')).toBe(16);
    expect(calculateNeutral(25, '3pn')).toBe(16);
    expect(calculateNeutral(35, '3pn')).toBe(16);
    expect(calculateNeutral(50, '3pn')).toBe(25);
    expect(calculateNeutral(70, '3pn')).toBe(35);
    expect(calculateNeutral(95, '3pn')).toBe(50);
    expect(calculateNeutral(120, '3pn')).toBe(70);
    expect(calculateNeutral(150, '3pn')).toBe(70);
    expect(calculateNeutral(185, '3pn')).toBe(95);
    expect(calculateNeutral(240, '3pn')).toBe(120);
    expect(calculateNeutral(300, '3pn')).toBe(150);
    expect(calculateNeutral(400, '3pn')).toBe(185);
    expect(calculateNeutral(500, '3pn')).toBe(240);
  });

  it('sizes ECC according to IEC 60364-5-54 Table 54.2', () => {
    expect(calculateEarth(10)).toBe(10);
    expect(calculateEarth(16)).toBe(16);
    expect(calculateEarth(25)).toBe(16);
    expect(calculateEarth(35)).toBe(16);
    expect(calculateEarth(50)).toBe(25);
    expect(calculateEarth(70)).toBe(35);
    expect(calculateEarth(95)).toBe(50);
    expect(calculateEarth(120)).toBe(70);
    expect(calculateEarth(240)).toBe(120);
    expect(calculateEarth(500)).toBe(240);
  });
});
