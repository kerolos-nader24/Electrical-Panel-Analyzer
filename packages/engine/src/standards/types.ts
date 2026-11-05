/**
 * Standards and Calculation Profiles Type Definitions
 */

export type StandardProfileId = 'iec' | 'nec' | 'custom';

export interface CalculationProfile {
  id: StandardProfileId;
  name: string;
  codeReference: string;
  breakerFactor: number; // e.g., 1.25 for NEC continuous duty, 1.0/1.25 for IEC
  maxVoltageDropFeeder: number; // e.g., 3.0% IEC, 2.0% or 3.0% NEC
  maxVoltageDropBranch: number; // e.g., 4.0% IEC, 3.0% NEC
  maxVoltageDropTotal: number; // e.g., 5.0%
  defaultAmbientAirTemp: number; // 40°C IEC vs 30°C NEC
  defaultAmbientGroundTemp: number; // 20°C IEC vs 30°C NEC
  defaultSoilResistivity: number; // 1.5 or 2.5 K·m/W
  standardBreakers: number[]; // e.g. [16, 20, 25, 32, 40, 50, 63, 80, 100, 125, 160, 200, 250, 315, 400, 500, 630, 800, 1000, 1250, 1600]
  motorConductorFactor: number; // 1.25 (NEC 430.22)
  motorOcpdBreakerFactor: number; // 2.50 (NEC 430.52)
  motorOverloadFactor: number; // 1.15 (NEC 430.32)
}

export interface CableCatalogueEntry {
  id?: number;
  manufacturer: string;
  tableKey: string;
  sizeMm2: number;
  groundAmp: number;
  ductAmp: number;
  airAmp: number;
  diaMm: number;
  resistance: number; // AC resistance (R) in Ω/km at operating temp
  reactance: number; // Inductive reactance (X) in Ω/km at 50/60 Hz
}
