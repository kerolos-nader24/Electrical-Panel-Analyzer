import { DERATING } from '@panel-analyzer/data';
import type { InsulationType, InstallationMethod } from '../types/common.js';

export interface DetailedDeratingInputs {
  ambientTemp: number; // °C
  insulation: InsulationType; // 'xlpe' | 'pvc'
  installMethod: InstallationMethod; // 'ground' | 'duct' | 'air'
  circuitsCount?: number; // Number of grouped circuits (default 1)
  depth?: number; // Burial depth in meters (ground/duct, default 0.7)
  soilResistivity?: number; // Soil thermal resistivity in K.m/W (ground/duct, default 1.5)
}

export interface DetailedDeratingResult {
  kTemp: number;
  kGroup: number;
  kDepth: number;
  kSoil: number;
  kTotal: number;
  formula: string;
}

/**
 * Linearly interpolates a numeric factor from a discrete table.
 */
export function interpolateFactor(table: Record<number | string, number>, val: number): number {
  const points = Object.entries(table)
    .map(([k, v]) => ({ x: Number(k), y: Number(v) }))
    .sort((a, b) => a.x - b.x);

  if (points.length === 0) return 1.0;
  if (val <= points[0].x) return points[0].y;
  if (val >= points[points.length - 1].x) return points[points.length - 1].y;

  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i];
    const p1 = points[i + 1];
    if (val >= p0.x && val <= p1.x) {
      if (p1.x === p0.x) return p0.y;
      const t = (val - p0.x) / (p1.x - p0.x);
      return Number((p0.y + t * (p1.y - p0.y)).toFixed(4));
    }
  }

  return 1.0;
}

/**
 * Calculates detailed cable derating factors according to IEC 60364-5-52:
 * - k_temp: Ambient temperature correction factor (Table B.52.14 for air, Table B.52.15 for ground)
 * - k_group: Grouping factor for circuits (Table B.52.17)
 * - k_depth: Burial depth factor (for ground/duct)
 * - k_soil: Soil thermal resistivity factor (Table B.52.16 / Elsewedy catalogue)
 *
 * Formula:
 *   K_total = k_temp * k_group * k_depth * k_soil
 */
export function calculateDetailedDerating(inputs: DetailedDeratingInputs): DetailedDeratingResult {
  const {
    ambientTemp,
    insulation,
    installMethod,
    circuitsCount = 1,
    depth = 0.7,
    soilResistivity = 1.5
  } = inputs;

  const isGround = installMethod === 'ground' || installMethod === 'duct';

  // 1. Temperature factor
  const tempTable = isGround
    ? DERATING.ambientGround[insulation]
    : DERATING.ambientAir[insulation];

  const kTemp = interpolateFactor(tempTable, ambientTemp);

  // 2. Grouping factor
  const kGroup = interpolateFactor(DERATING.grouping, circuitsCount);

  // 3. Burial depth factor (only applies to underground installations)
  const kDepth = isGround
    ? interpolateFactor(DERATING.burialDepth, depth)
    : 1.00;

  // 4. Soil thermal resistivity factor (only applies to underground installations)
  const kSoil = isGround
    ? interpolateFactor(DERATING.soilResistivity, soilResistivity)
    : 1.00;

  // Product of all factors, rounded to 4 decimals
  const kTotal = Number((kTemp * kGroup * kDepth * kSoil).toFixed(4));

  const formula = `K_total = k_temp(${kTemp}) × k_group(${kGroup})` +
    (isGround ? ` × k_depth(${kDepth}) × k_soil(${kSoil})` : '') +
    ` = ${kTotal}`;

  return {
    kTemp,
    kGroup,
    kDepth,
    kSoil,
    kTotal,
    formula
  };
}
