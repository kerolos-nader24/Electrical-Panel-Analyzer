import type { Amps, mm2 } from './units.js';

export type SystemType = '1p' | '3pn' | '3p';
export type ConductorMaterial = 'cu' | 'al';
export type InsulationType = 'xlpe' | 'pvc';
export type CableForm = 'single' | 'multi' | 'armoured';
export type InstallationMethod = 'ground' | 'duct' | 'air';
export type LoadUnit = 'kva' | 'kw' | 'w' | 'va' | 'hp';
export type PanelType = 'lighting' | 'power' | 'ac' | 'motors';

export interface SelectedCable {
  size: mm2;
  ampacity: Amps;
  dia: number;
}

export interface CableTagResult {
  line1: string;
  line2: string;
  full: string;
  phaseSize: string;
  neutralSize: string;
  eccSize: string;
}
