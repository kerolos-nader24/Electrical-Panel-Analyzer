import { describe, it, expect } from 'vitest';
import {
  calculateDesignCurrent,
  calculateRequiredBreaker,
  selectStandardBreaker,
  applyCorrectionFactors,
  calculateCableRequirement,
  selectCableFromTable,
  selectCableWithVdrop,
  checkProtection,
  calculateVoltageDrop,
  checkShortCircuit,
  selectConduit,
  calculateNeutral,
  calculateEarth,
  generateCableTag,
  getCableTableKey,
  calculateMotorCompressor,
  calculateCombinationLoads,
  calculateRoomAC
} from '../src/index.js';

describe('Comprehensive Edge Cases Suite (35+ Tests)', () => {
  // 1. Zero load input
  it('Edge Case 1: Zero load input produces 0A current', () => {
    const res = calculateDesignCurrent(0, 'kva', 380, true);
    expect(res.Ib).toBe(0);
    expect(res.connectedKva).toBe(0);
  });

  // 2. Zero voltage fallback to default 380V for 3P
  it('Edge Case 2: Zero voltage falls back to nominal 380V for 3-phase', () => {
    const res = calculateDesignCurrent(50, 'kva', 0, true);
    expect(res.voltage).toBe(380);
    expect(res.Ib).toBeCloseTo((50 * 1000) / (Math.sqrt(3) * 380), 2);
  });

  // 3. Zero voltage fallback to default 230V for 1P
  it('Edge Case 3: Zero voltage falls back to nominal 230V for 1-phase', () => {
    const res = calculateDesignCurrent(10, 'kva', 0, false);
    expect(res.voltage).toBe(230);
    expect(res.Ib).toBeCloseTo((10 * 1000) / 230, 2);
  });

  // 4. Huge load where no single cable in catalogue satisfies ampacity
  it('Edge Case 4: Huge load (5,000 kVA) returns null when no single cable exists', () => {
    const current = calculateDesignCurrent(5000, 'kva', 380, true);
    const In = selectStandardBreaker(calculateRequiredBreaker(current.Ib));
    const Iz_req = calculateCableRequirement(In, 0.80);
    // Catalogue max 1000 mm2 is under 1500A, but Iz_req is > 7000A
    const cable = selectCableFromTable('cu_xlpe_1core', Iz_req, 'ground');
    expect(cable).toBeNull();
  });

  // 5. Breaker fallback rounding for load exceeding largest breaker (4000A)
  it('Edge Case 5: Breaker selection rounds up to nearest 100 when > 4000A', () => {
    // 4500A required
    const breaker = selectStandardBreaker(4520);
    expect(breaker).toBe(4600);
  });

  // 6. Aluminium 1-core XLPE direct buried
  it('Edge Case 6: Sizing with Aluminium (Al XLPE 1-core, direct buried)', () => {
    const tableKey = getCableTableKey('al', 'xlpe', 'single', '3pn');
    expect(tableKey).toBe('al_xlpe_1core');
    const cable = selectCableFromTable(tableKey, 200, 'ground');
    expect(cable).not.toBeNull();
    // 70 mm² Al XLPE 1-core ground ampacity is 224 A >= 200 A
    expect(cable!.size).toBe(70);
  });

  // 7. Aluminium 4-core armoured XLPE in free air
  it('Edge Case 7: Sizing with Aluminium armoured in free air', () => {
    const tableKey = getCableTableKey('al', 'xlpe', 'armoured', '3pn');
    expect(tableKey).toBe('al_xlpe_4core_armoured');
    const cable = selectCableFromTable(tableKey, 150, 'air');
    expect(cable).not.toBeNull();
    // 50 mm² Al XLPE 4C armoured in air is 169 A >= 150 A
    expect(cable!.size).toBe(50);
  });

  // 8. Aluminium 4-core unarmoured PVC in duct
  it('Edge Case 8: Sizing with Aluminium unarmoured PVC in duct', () => {
    const tableKey = getCableTableKey('al', 'pvc', 'multi', '3pn');
    expect(tableKey).toBe('al_pvc_4core_unarmoured');
    const cable = selectCableFromTable(tableKey, 100, 'duct');
    expect(cable).not.toBeNull();
    // 50 mm² Al PVC 4C in duct is 110 A >= 100 A
    expect(cable!.size).toBe(50);
  });

  // 9. Copper PVC single core in air
  it('Edge Case 9: Copper single-core PVC in air', () => {
    const tableKey = getCableTableKey('cu', 'pvc', 'single', '3pn');
    expect(tableKey).toBe('cu_pvc_1core');
    const cable = selectCableFromTable(tableKey, 300, 'air');
    expect(cable).not.toBeNull();
    // 95 mm² Cu PVC 1C in air is 332 A >= 300 A
    expect(cable!.size).toBe(95);
  });

  // 10. Copper PVC 4-core armoured direct buried
  it('Edge Case 10: Copper PVC 4-core armoured direct buried', () => {
    const tableKey = getCableTableKey('cu', 'pvc', 'armoured', '3pn');
    expect(tableKey).toBe('cu_pvc_4core_armoured');
    const cable = selectCableFromTable(tableKey, 150, 'ground');
    expect(cable).not.toBeNull();
    // 35 mm² Cu PVC 4C armoured ground is 156 A >= 150 A
    expect(cable!.size).toBe(35);
  });

  // 11. 1-phase 230V Cu XLPE unarmoured
  it('Edge Case 11: 1-phase 230V selects 2-core cable table', () => {
    const tableKey = getCableTableKey('cu', 'xlpe', 'multi', '1p');
    expect(tableKey).toBe('cu_xlpe_2core_unarmoured');
    const cable = selectCableFromTable(tableKey, 80, 'ground');
    expect(cable).not.toBeNull();
    // 6 mm² Cu XLPE 2C ground is 86 A >= 80 A
    expect(cable!.size).toBe(6);
  });

  // 12. 3-phase without neutral (3P) selects 3-core cable table
  it('Edge Case 12: 3-phase without neutral selects 3-core table', () => {
    const tableKey = getCableTableKey('cu', 'xlpe', 'multi', '3p');
    expect(tableKey).toBe('cu_xlpe_3core_unarmoured');
  });

  // 13. Unit conversion: 'w' (Watts) to kVA
  it('Edge Case 13: Watts unit conversion to kVA with PF', () => {
    // 24000 W at 0.8 PF = 24 kW / 0.8 = 30 kVA
    const res = calculateDesignCurrent(24000, 'w', 380, true, 0.8);
    expect(res.isPfUsed).toBe(true);
    expect(res.connectedKva).toBe(30);
  });

  // 14. Unit conversion: 'va' to kVA
  it('Edge Case 14: Volt-Amperes conversion without PF', () => {
    // 50000 VA = 50 kVA
    const res = calculateDesignCurrent(50000, 'va', 380, true, 0.8);
    expect(res.isPfUsed).toBe(false);
    expect(res.connectedKva).toBe(50);
  });

  // 15. Unit conversion: HP with unity PF
  it('Edge Case 15: HP conversion with unity PF (1.0)', () => {
    // 20 HP * 0.746 = 14.92 kW = 14.92 kVA
    const res = calculateDesignCurrent(20, 'hp', 380, true, 1.0);
    expect(res.connectedKva).toBeCloseTo(14.92, 2);
  });

  // 16. Unit conversion: Low PF (0.50)
  it('Edge Case 16: kW with low PF (0.50) doubles kVA', () => {
    const res = calculateDesignCurrent(50, 'kw', 380, true, 0.50);
    expect(res.connectedKva).toBe(100);
  });

  // 17. Demand factor clamped when > 1.0
  it('Edge Case 17: Demand factor > 1.0 is clamped to 1.0', () => {
    const res = calculateDesignCurrent(50, 'kva', 380, true, 0.9, 1.5, true);
    expect(res.demandKva).toBe(50);
  });

  // 18. Demand factor clamped when <= 0
  it('Edge Case 18: Demand factor <= 0 is clamped to 1.0', () => {
    const res = calculateDesignCurrent(50, 'kva', 380, true, 0.9, -0.2, true);
    expect(res.demandKva).toBe(50);
  });

  // 19. Voltage drop auto step-up over long distance (150m)
  it('Edge Case 19: Cable size steps up automatically when voltage drop exceeds limit', () => {
    // Ib = 50A, 380V 3P, Cu XLPE 1C, direct buried
    // Required ampacity ~ 70A -> 6 mm² has ampacity 76A >= 70A
    // But at 150 meters, 6 mm² will have excessive drop!
    const cableRes = selectCableWithVdrop(
      'cu_xlpe_1core',
      70,
      'ground',
      150,
      50,
      380,
      true,
      'cu',
      'xlpe',
      0.9,
      3.0
    );
    expect(cableRes).not.toBeNull();
    // Cable must be stepped up to at least 16 mm² or 25 mm² to satisfy 3% limit
    expect(cableRes!.steppedUp).toBe(true);
    expect(cableRes!.cable.size).toBeGreaterThan(6);
    expect(cableRes!.vDrop.pass).toBe(true);
  });

  // 20. Short circuit with negative clearing time
  it('Edge Case 20: Short-circuit check with invalid time returns available=false', () => {
    const res = checkShortCircuit(25, 10, -0.5);
    expect(res.available).toBe(false);
  });

  // 21. Short circuit with Al PVC
  it('Edge Case 21: Short-circuit check for Aluminium PVC uses k = 76', () => {
    const res = checkShortCircuit(70, 8, 0.1, 'al', 'pvc');
    expect(res.available).toBe(true);
    expect(res.k).toBe(76);
  });

  // 22. Conduit sizing with single massive 80mm cable
  it('Edge Case 22: Conduit sizing with large cable diameter', () => {
    // Single cable 50mm dia -> area = pi/4 * 2500 = 1963.5 mm²
    // 40% fill requires conduit area >= 4908.7 mm² -> ID >= 79.05 mm
    // Standard 90mm conduit has ID 80.0 mm
    const res = selectConduit(50, 1);
    expect(res).not.toBeNull();
    expect(res!.size).toBe(90);
  });

  // 23. Conduit sizing when cable exceeds all standard conduits (returns null)
  it('Edge Case 23: Conduit sizing returns null when cable exceeds largest conduit', () => {
    const res = selectConduit(150, 1);
    expect(res).toBeNull();
  });

  // 24. Neutral calculation for 3P without neutral returns null
  it('Edge Case 24: Neutral calculation for 3P returns null', () => {
    expect(calculateNeutral(95, '3p')).toBeNull();
  });

  // 25. Neutral calculation for 1P returns phase size
  it('Edge Case 25: Neutral calculation for 1P returns full phase size', () => {
    expect(calculateNeutral(95, '1p')).toBe(95);
  });

  // 26. ECC sizing for unlisted size (> 500 mm2) uses half phase size
  it('Edge Case 26: ECC sizing for 630 mm2 uses ceil(630/2) = 315 mm2', () => {
    expect(calculateEarth(630)).toBe(315);
  });

  // 27. Combination loads with all-fan/other loads returns hasCompressors=false
  it('Edge Case 27: Combination loads without compressors returns hasCompressors=false', () => {
    const res = calculateCombinationLoads([
      { id: 1, type: 'fan', rlc: 10 },
      { id: 2, type: 'motor', rlc: 20 }
    ]);
    expect(res.hasCompressors).toBe(false);
  });

  // 28. Motor compressor with zero RLC but marked BSC
  it('Edge Case 28: Motor compressor with 0 RLC uses BSC', () => {
    const res = calculateMotorCompressor({ rlc: 0, bsc: 30 });
    expect(res.baseCurrent).toBe(30);
    expect(res.disconnectRating).toBeCloseTo(34.5, 1);
  });

  // 29. Room AC with zero rating
  it('Edge Case 29: Room AC with 0 rating gives 0 required ampacity', () => {
    const res = calculateRoomAC({ rating: 0, hasOtherLoads: true });
    expect(res.requiredAmpacity).toBe(0);
  });

  // 30. Derating factor fallback when <= 0
  it('Edge Case 30: applyCorrectionFactors defaults to 0.80 when <= 0', () => {
    expect(applyCorrectionFactors(0)).toBe(0.80);
    expect(applyCorrectionFactors(-0.5)).toBe(0.80);
    expect(applyCorrectionFactors(0.75)).toBe(0.75);
  });

  // 31. Protection check exact boundary values
  it('Edge Case 31: Protection check Ib == In == Iz passes', () => {
    const res = checkProtection(100, 100, 100);
    expect(res.pass).toBe(true);
  });

  // 32. Protection check fails when Ib > In
  it('Edge Case 32: Protection check fails when Ib exceeds In', () => {
    const res = checkProtection(126, 125, 160);
    expect(res.pass).toBe(false);
    expect(res.passIbIn).toBe(false);
  });

  // 33. Protection check fails when In > Iz
  it('Edge Case 33: Protection check fails when In exceeds Iz', () => {
    const res = checkProtection(100, 125, 110);
    expect(res.pass).toBe(false);
    expect(res.passInIz).toBe(false);
  });

  // 34. CAD tag for 3P system (no neutral)
  it('Edge Case 34: CAD tag for 3P single core system', () => {
    const cable = { size: 25 as any, ampacity: 166 as any, dia: 10 };
    const res = generateCableTag(cable, 3, 'cu', 'single', 'xlpe', '3p');
    expect(res.line1).toBe('(3(1CX25)mm2  CU/XLPE/PVC');
    expect(res.neutralSize).toBe('—');
  });

  // 35. CAD tag for 1P system
  it('Edge Case 35: CAD tag for 1P single core system', () => {
    const cable = { size: 16 as any, ampacity: 129 as any, dia: 8.7 };
    const res = generateCableTag(cable, 2, 'cu', 'single', 'xlpe', '1p');
    expect(res.line1).toBe('(2(1CX16)mm2  CU/XLPE/PVC');
  });

  // 36. Motor compressor with marked MCA matching 125% exactly
  it('Edge Case 36: MCA equal to 125% current', () => {
    // 20A * 1.25 = 25A, MCA = 25A
    const res = calculateMotorCompressor({ rlc: 20, mca: 25 });
    expect(res.conductorAmpacity).toBe(25);
  });
});
