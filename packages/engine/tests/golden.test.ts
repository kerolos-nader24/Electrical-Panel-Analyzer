import { describe, it, expect } from 'vitest';
import {
  calculateDesignCurrent,
  calculateRequiredBreaker,
  selectStandardBreaker,
  applyCorrectionFactors,
  calculateCableRequirement,
  selectCableWithVdrop,
  checkProtection,
  generateCableTag,
  getCableTableKey
} from '../src/index.js';

describe('Golden Test Case Verification', () => {
  it('sizes 62 kVA, 380V, 3P+N, Cu XLPE single-core, direct buried, 30 m, 3% vdrop', () => {
    // 1. Inputs
    const loadKva = 62;
    const voltage = 380;
    const is3Phase = true;
    const systemType = '3pn';
    const conductor = 'cu';
    const insulation = 'xlpe';
    const cableForm = 'single';
    const installMethod = 'ground';
    const lengthM = 30;
    const maxDropPct = 3.0;
    const derate = 0.80;
    const pf = 0.90;

    // 2. Design Current Ib
    const currentResult = calculateDesignCurrent(loadKva, 'kva', voltage, is3Phase, pf, 1.0, false);
    // Ib = (62 * 1000) / (√3 * 380) = 94.199 A ≈ 94.2 A
    expect(currentResult.Ib).toBeCloseTo(94.2, 1);
    expect(Math.round(currentResult.Ib * 10) / 10).toBe(94.2);

    // 3. Breaker Sizing In
    const I_required = calculateRequiredBreaker(currentResult.Ib, 1.25);
    // 94.199 * 1.25 = 117.75 A
    expect(I_required).toBeCloseTo(117.75, 1);
    const In = selectStandardBreaker(I_required);
    expect(In).toBe(125);

    // 4. Cable Sizing
    const Ktotal = applyCorrectionFactors(derate);
    expect(Ktotal).toBe(0.80);
    const Iz_required = calculateCableRequirement(In, Ktotal);
    // 125 / 0.80 = 156.25 A
    expect(Iz_required).toBe(156.25);

    const tableKey = getCableTableKey(conductor, insulation, cableForm, systemType);
    expect(tableKey).toBe('cu_xlpe_1core');

    const cableResult = selectCableWithVdrop(
      tableKey,
      Iz_required,
      installMethod,
      lengthM,
      currentResult.Ib,
      voltage,
      is3Phase,
      conductor,
      insulation,
      pf,
      maxDropPct
    );

    expect(cableResult).not.toBeNull();
    const cable = cableResult!.cable;

    // 25 mm² Cu XLPE 1-core ground catalogue rating is 166 A >= 156.25 A
    expect(cable.size).toBe(25);
    expect(cable.ampacity).toBe(166);

    // 5. Voltage Drop
    // r_xlpe = 0.887, x = 0.081, z_eff = 0.8336, drop = 4.08 V, dropPct = 1.07% ≈ 1.1%
    const vDrop = cableResult!.vDrop;
    expect(vDrop.dropPct).toBeCloseTo(1.1, 1);
    expect(vDrop.pass).toBe(true);

    // 6. Overload Protection Coordination: Ib <= In <= Iz
    const Iz_corrected = cable.ampacity * Ktotal; // 166 * 0.80 = 132.8 A
    const protCheck = checkProtection(currentResult.Ib, In, Iz_corrected);
    expect(protCheck.pass).toBe(true);
    expect(protCheck.passIbIn).toBe(true);
    expect(protCheck.passInIz).toBe(true);

    // 7. AutoCAD Drawing Tag
    const tag = generateCableTag(cable, 4, conductor, cableForm, insulation, systemType);
    expect(tag.line1).toBe('(4(1CX25+1CX16)mm2  CU/XLPE/PVC');
    expect(tag.line2).toBe('1x16mm2  CU/PVC ECC');
  });
});
