/**
 * TypeScript interfaces matching JSON schemas for standards and cable catalogue data.
 */

export interface CableRating {
  ground: number; // Ampacity when direct buried in ground (A)
  duct: number;   // Ampacity when laid in single-way duct (A)
  air: number;    // Ampacity in free air / shaded tray (A)
  dia: number;    // Outer diameter (mm)
}

export type CableSizeMap = Record<number | string, CableRating>;

export type CableCatalogue = Record<string, CableSizeMap>;

export interface ConductorImpedance {
  r_pvc: number;  // AC resistance at 70°C (Ω/km)
  r_xlpe: number; // AC resistance at 90°C (Ω/km)
  x: number;      // Reactance at 50Hz (Ω/km)
}

export interface ImpedanceDatabase {
  cu: Record<number | string, ConductorImpedance>;
  al: Record<number | string, ConductorImpedance>;
}

export interface ConduitSpec {
  size: number; // Nominal trade size (mm)
  id: number;   // Internal diameter (mm)
}

export interface StandardsData {
  breakers: number[];
  conduits: ConduitSpec[];
  maxConduitFill: number;
  reducedNeutral: Record<number | string, number>;
  standardEcc: Record<number | string, number>;
}

export interface DeratingDatabase {
  ambientAir: {
    xlpe: Record<number | string, number>;
    pvc: Record<number | string, number>;
  };
  ambientGround: {
    xlpe: Record<number | string, number>;
    pvc: Record<number | string, number>;
  };
  grouping: Record<number | string, number>;
  burialDepth: Record<number | string, number>;
  soilResistivity: Record<number | string, number>;
}

