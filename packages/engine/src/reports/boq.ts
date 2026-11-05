/**
 * Bill of Quantities (BOQ) Generator
 * Aggregates circuit breakers, cable runs (with total meters), and conduits.
 */

import type { BoqItem, PanelBoq } from './types.js';

export interface BoqCircuitInput {
  circuitNumber: number;
  name: string;
  loadType?: string;
  phase: string;
  lengthM: number;
  breakerRating: number;
  breakerPoles?: string;
  cableTag: string;
  cableSize?: number;
  conductor?: string;
  insulation?: string;
  conduitSize?: number;
}

export interface BoqPanelInput {
  name: string;
  systemType: string;
  voltage: number;
  incomerBreaker: number;
  incomerPoles?: string;
  incomerCableTag?: string;
  incomerLengthM?: number;
  incomerConduitSize?: number;
}

export function calculatePanelBoq(
  panel: BoqPanelInput,
  circuits: BoqCircuitInput[]
): PanelBoq {
  const breakersMap = new Map<string, { item: string; spec: string; qty: number }>();
  const cablesMap = new Map<string, { item: string; spec: string; meters: number }>();
  const conduitsMap = new Map<string, { item: string; spec: string; meters: number }>();

  // 1. Incomer Breaker
  const mainPoles = panel.incomerPoles || (panel.systemType.includes('3') ? '4P' : '2P');
  const mainBreakerKey = `MAIN_${mainPoles}_${panel.incomerBreaker}A`;
  breakersMap.set(mainBreakerKey, {
    item: `Moulded Case Circuit Breaker (MCCB) - Main Incomer`,
    spec: `${mainPoles} ${panel.incomerBreaker}A, 36kA IEC 60947-2`,
    qty: 1
  });

  // 2. Incomer Feeder Cable & Conduit
  if (panel.incomerCableTag && panel.incomerLengthM && panel.incomerLengthM > 0) {
    const cableKey = panel.incomerCableTag;
    cablesMap.set(cableKey, {
      item: 'Main Incomer Feeder Cable',
      spec: panel.incomerCableTag,
      meters: panel.incomerLengthM
    });

    if (panel.incomerConduitSize && panel.incomerConduitSize > 0) {
      const condKey = `CONDUIT_Ø${panel.incomerConduitSize}mm`;
      conduitsMap.set(condKey, {
        item: `Rigid PVC/Galvanized Steel Conduit Ø${panel.incomerConduitSize}mm`,
        spec: `Heavy Duty Ø${panel.incomerConduitSize} mm`,
        meters: panel.incomerLengthM
      });
    }
  }

  // 3. Branch Circuit Breakers, Cables, and Conduits
  for (const c of circuits) {
    const poles = c.breakerPoles || (c.phase === '3P' ? '3P' : '1P');
    const curve = c.loadType === 'motor' ? 'D' : 'C';
    const breakerType = c.breakerRating > 100 ? 'MCCB' : 'MCB';
    const bKey = `${breakerType}_${poles}_${c.breakerRating}A_${curve}`;

    if (breakersMap.has(bKey)) {
      breakersMap.get(bKey)!.qty += 1;
    } else {
      breakersMap.set(bKey, {
        item: `Miniature / Moulded Circuit Breaker (${breakerType})`,
        spec: `${poles} ${c.breakerRating}A ${curve}-curve 10kA (IEC 60898/60947-2)`,
        qty: 1
      });
    }

    // Cable aggregation by tag or construction
    const cTag = c.cableTag || `${c.phase === '3P' ? '4' : '3'}x${c.cableSize || 2.5}mm² ${c.conductor || 'Cu'}/${c.insulation || 'XLPE'}`;
    const len = c.lengthM || 20;

    if (cablesMap.has(cTag)) {
      cablesMap.get(cTag)!.meters += len;
    } else {
      cablesMap.set(cTag, {
        item: `Low Voltage Copper/Aluminium Power Cable`,
        spec: cTag,
        meters: len
      });
    }

    // Conduit estimation / size
    const condDiam = c.conduitSize || (c.phase === '3P' ? 32 : 20);
    const condKey = `CONDUIT_Ø${condDiam}mm`;
    if (conduitsMap.has(condKey)) {
      conduitsMap.get(condKey)!.meters += len;
    } else {
      conduitsMap.set(condKey, {
        item: `Rigid PVC Conduit Ø${condDiam}mm`,
        spec: `Class 4 Heavy Gauge Ø${condDiam} mm`,
        meters: len
      });
    }
  }

  // Convert maps to sorted arrays
  const breakers: BoqItem[] = Array.from(breakersMap.values()).map(b => ({
    category: 'breaker',
    item: b.item,
    specification: b.spec,
    unit: 'pcs',
    quantity: b.qty
  }));

  const cables: BoqItem[] = Array.from(cablesMap.values()).map(c => ({
    category: 'cable',
    item: c.item,
    specification: c.spec,
    unit: 'm',
    quantity: Math.round(c.meters)
  }));

  const conduits: BoqItem[] = Array.from(conduitsMap.values()).map(cd => ({
    category: 'conduit',
    item: cd.item,
    specification: cd.spec,
    unit: 'm',
    quantity: Math.round(cd.meters)
  }));

  const totalCableMeters = cables.reduce((acc, curr) => acc + curr.quantity, 0);
  const totalConduitMeters = conduits.reduce((acc, curr) => acc + curr.quantity, 0);

  return {
    panelName: panel.name,
    breakers,
    cables,
    conduits,
    totalCableMeters,
    totalConduitMeters
  };
}
