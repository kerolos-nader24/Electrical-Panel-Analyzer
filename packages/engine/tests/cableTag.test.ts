import { describe, it, expect } from 'vitest';
import { generateCableTag, asMm2, asAmps } from '../src/index.js';

describe('AutoCAD Cable Tag Module', () => {
  it('returns dashes when cable is null', () => {
    const res = generateCableTag(null, 4, 'cu', 'single', 'xlpe', '3pn');
    expect(res.full).toBe('—');
  });

  it('generates single-core 3P+N tag format matching original HTML calculator', () => {
    const cable = { size: asMm2(25), ampacity: asAmps(166), dia: 10 };
    const res = generateCableTag(cable, 4, 'cu', 'single', 'xlpe', '3pn');
    expect(res.line1).toBe('(4(1CX25+1CX16)mm2  CU/XLPE/PVC');
    expect(res.line2).toBe('1x16mm2  CU/PVC ECC');
  });

  it('generates multicore armoured tag with SWA suffix', () => {
    const cable = { size: asMm2(50), ampacity: asAmps(238), dia: 31.8 };
    const res = generateCableTag(cable, 4, 'cu', 'armoured', 'xlpe', '3pn');
    expect(res.line1).toBe('(4X50)mm2  CU/XLPE/PVC SWA');
    expect(res.line2).toBe('1x25mm2  CU/PVC ECC');
  });

  it('generates aluminium multicore tag', () => {
    const cable = { size: asMm2(95), ampacity: asAmps(235), dia: 33.1 };
    const res = generateCableTag(cable, 4, 'al', 'multi', 'xlpe', '3pn');
    expect(res.line1).toBe('(4X95)mm2  AL/XLPE/PVC');
  });
});
