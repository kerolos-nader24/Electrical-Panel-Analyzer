export type LoadCategory = 'lighting' | 'socket' | 'motor' | 'ac' | 'other';

export interface DemandFactorsConfig {
  lighting: number;
  socket: number;
  motor: number;
  ac: number;
  other: number;
}

export const DEFAULT_DEMAND_FACTORS: DemandFactorsConfig = {
  lighting: 0.90,
  socket: 0.70,
  motor: 1.00,
  ac: 0.85,
  other: 1.00
};

export interface CircuitLoadInput {
  loadType: LoadCategory;
  connectedKva: number;
}

export interface CategoryDemandResult {
  category: LoadCategory;
  connectedKva: number;
  factor: number;
  demandKva: number;
}

export interface PanelDemandSummary {
  categories: Record<LoadCategory, CategoryDemandResult>;
  totalConnectedKva: number;
  totalDemandKva: number;
  overallDemandFactor: number;
}

/**
 * Calculates categorized demand load and overall panel demand factor.
 */
export function calculatePanelDemand(
  circuits: CircuitLoadInput[],
  config: Partial<DemandFactorsConfig> = {}
): PanelDemandSummary {
  const activeConfig: DemandFactorsConfig = {
    ...DEFAULT_DEMAND_FACTORS,
    ...config
  };

  const categories: Record<LoadCategory, CategoryDemandResult> = {
    lighting: { category: 'lighting', connectedKva: 0, factor: activeConfig.lighting, demandKva: 0 },
    socket: { category: 'socket', connectedKva: 0, factor: activeConfig.socket, demandKva: 0 },
    motor: { category: 'motor', connectedKva: 0, factor: activeConfig.motor, demandKva: 0 },
    ac: { category: 'ac', connectedKva: 0, factor: activeConfig.ac, demandKva: 0 },
    other: { category: 'other', connectedKva: 0, factor: activeConfig.other, demandKva: 0 }
  };

  for (const c of circuits) {
    const cat = categories[c.loadType] ? c.loadType : 'other';
    categories[cat].connectedKva += Math.max(0, c.connectedKva || 0);
  }

  let totalConnected = 0;
  let totalDemand = 0;

  for (const key of Object.keys(categories) as LoadCategory[]) {
    const item = categories[key];
    item.connectedKva = Number(item.connectedKva.toFixed(2));
    item.demandKva = Number((item.connectedKva * item.factor).toFixed(2));
    totalConnected += item.connectedKva;
    totalDemand += item.demandKva;
  }

  const overallDf = totalConnected > 0 ? totalDemand / totalConnected : 1.0;

  return {
    categories,
    totalConnectedKva: Number(totalConnected.toFixed(2)),
    totalDemandKva: Number(totalDemand.toFixed(2)),
    overallDemandFactor: Number(overallDf.toFixed(3))
  };
}
