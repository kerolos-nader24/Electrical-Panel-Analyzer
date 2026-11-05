import { describe, it, expect } from 'vitest';
import {
  calculatePanelBoq,
  generateStepByStepDerivations,
  type BoqPanelInput,
  type BoqCircuitInput,
  type DerivationInputs
} from '../src/reports/index.js';

describe('Reports & Bill of Quantities (BOQ) Engine', () => {
  const mockPanel: BoqPanelInput = {
    name: 'DB-MAIN',
    systemType: '3pn',
    voltage: 380,
    incomerBreaker: 250,
    incomerPoles: '4P',
    incomerCableTag: '4x120mm² Cu/XLPE + 70mm² ECC',
    incomerLengthM: 35,
    incomerConduitSize: 90
  };

  const mockCircuits: BoqCircuitInput[] = [
    {
      circuitNumber: 1,
      name: 'LIGHTING 1',
      phase: 'L1',
      lengthM: 30,
      breakerRating: 20,
      cableTag: '3x2.5mm² Cu/PVC',
      conduitSize: 20
    },
    {
      circuitNumber: 2,
      name: 'LIGHTING 2',
      phase: 'L2',
      lengthM: 40,
      breakerRating: 20,
      cableTag: '3x2.5mm² Cu/PVC',
      conduitSize: 20
    },
    {
      circuitNumber: 3,
      name: 'PUMP MOTOR',
      loadType: 'motor',
      phase: '3P',
      lengthM: 50,
      breakerRating: 63,
      breakerPoles: '3P',
      cableTag: '4x25mm² Cu/XLPE',
      conduitSize: 32
    }
  ];

  it('aggregates breakers, cable total meters, and conduits accurately', () => {
    const boq = calculatePanelBoq(mockPanel, mockCircuits);

    expect(boq.panelName).toBe('DB-MAIN');

    // Breakers
    expect(boq.breakers.length).toBeGreaterThanOrEqual(3);
    const mainBreaker = boq.breakers.find(b => b.specification.includes('250A'));
    expect(mainBreaker).toBeDefined();
    expect(mainBreaker?.quantity).toBe(1);

    const mcb20 = boq.breakers.find(b => b.specification.includes('20A'));
    expect(mcb20?.quantity).toBe(2);

    // Cables: 35m incomer + 70m (30+40) 3x2.5mm² + 50m 4x25mm² = 155m total
    expect(boq.totalCableMeters).toBe(155);

    const lightingCables = boq.cables.find(c => c.specification.includes('3x2.5'));
    expect(lightingCables?.quantity).toBe(70);

    // Conduits: 35m 90mm + 70m 20mm + 50m 32mm = 155m total
    expect(boq.totalConduitMeters).toBe(155);
  });

  it('generates step-by-step mathematical derivations with substituted values', () => {
    const mockDerivationsInput: DerivationInputs = {
      panelName: 'DB-MAIN',
      voltage: 380,
      systemType: '3pn',
      isThreePhase: true,
      loadKva: 62,
      pf: 0.9,
      lengthM: 30,
      deratingK: 0.748,
      vdropMax: 3.0,
      iscKa: 25,
      fclearSec: 0.1,
      conductor: 'cu',
      insulation: 'xlpe',
      Ib: 94.2,
      In: 125,
      cableSize: 25,
      cableAmpacity: 131,
      actualIz: 97.9,
      vDropV: 4.18,
      vDropPct: 1.1,
      sMinSc: 17.5,
      scK: 143,
      conduitSize: 50,
      conduitFillPct: 28.5,
      neutralSize: 25,
      eccSize: 16,
      cadTag: '4x25mm² Cu/XLPE'
    };

    const steps = generateStepByStepDerivations(mockDerivationsInput);
    expect(steps.length).toBe(7);

    // Step 1: Design Current
    expect(steps[0].formulaStr).toContain('Ib = S / (√3 × V)');
    expect(steps[0].substitutedStr).toContain('62000');
    expect(steps[0].resultStr).toContain('94.20 A');

    // Step 4: Overload Coordination Check
    expect(steps[3].formulaStr).toBe('Ib ≤ In ≤ Iz');
    expect(steps[3].substitutedStr).toContain('94.2 A ≤ 125 A ≤ 97.9 A');
    expect(steps[3].passed).toBe(false); // In (125) > actualIz (97.9)

    // Step 5: Voltage Drop
    expect(steps[4].resultStr).toContain('1.10% ≤ Allowed 3.0%');
    expect(steps[4].passed).toBe(true);
  });
});
