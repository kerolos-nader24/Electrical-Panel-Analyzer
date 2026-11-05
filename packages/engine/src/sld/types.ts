/**
 * Single Line Diagram (SLD) Type Definitions
 * Adheres to IEC 60617 graphical symbols for electrical diagrams.
 */

export type SldLoadCategory = 'lighting' | 'socket' | 'motor' | 'ac' | 'other' | 'subpanel';

export interface SldCircuit {
  circuitNumber: number;
  name: string;
  loadType: SldLoadCategory;
  loadVal: number;
  loadUnit: string;
  pf: number;
  phase: string; // 'L1' | 'L2' | 'L3' | '3P'
  lengthM: number;
  breakerRating: number; // In Amps
  breakerPoles?: string; // '1P', '2P', '3P', '4P'
  breakerCurve?: string; // 'B', 'C', 'D'
  cableTag: string;
  vdropPct?: number;
  starterType?: string; // 'DOL', 'Star-Delta', 'Soft-Starter', 'VFD'
}

export interface SldPanel {
  name: string;
  panelType: string; // 'MDB', 'SMDB', 'DB', etc.
  systemType: string; // '3P+N', '1P+N', etc.
  voltage: number;
  frequencyHz?: number;
  incomerBreaker: number; // In Amps
  incomerPoles?: string; // '3P', '4P'
  incomerCableTag?: string;
  busbarRatingAmps?: number;
  iscKa?: number;
  fedFrom?: string; // 'Utility / Transformer' or parent panel name
}

export interface SldTitleBlock {
  projectName: string;
  projectCode?: string;
  client?: string;
  engineer?: string;
  panelName: string;
  dateStr?: string;
  revision?: string;
  drawingTitle?: string;
  scale?: string;
}

export interface SldPoint {
  x: number;
  y: number;
}

export interface SldLine {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  strokeWidth?: number;
  dashed?: boolean;
  layer?: 'BUSBAR' | 'FEEDERS' | 'BREAKERS' | 'SYMBOLS' | 'TEXT_LABELS' | 'TITLE_BLOCK';
}

export interface SldCircle {
  cx: number;
  cy: number;
  r: number;
  fill?: string;
  strokeWidth?: number;
  layer?: 'BUSBAR' | 'FEEDERS' | 'BREAKERS' | 'SYMBOLS' | 'TEXT_LABELS' | 'TITLE_BLOCK';
}

export interface SldRect {
  x: number;
  y: number;
  width: number;
  height: number;
  strokeWidth?: number;
  fill?: string;
  layer?: 'BUSBAR' | 'FEEDERS' | 'BREAKERS' | 'SYMBOLS' | 'TEXT_LABELS' | 'TITLE_BLOCK';
}

export interface SldText {
  x: number;
  y: number;
  text: string;
  fontSize: number;
  anchor?: 'start' | 'middle' | 'end';
  rotation?: number; // degrees
  fontWeight?: string | number;
  layer?: 'BUSBAR' | 'FEEDERS' | 'BREAKERS' | 'SYMBOLS' | 'TEXT_LABELS' | 'TITLE_BLOCK';
}

export interface SldPath {
  d: string;
  strokeWidth?: number;
  fill?: string;
  layer?: 'BUSBAR' | 'FEEDERS' | 'BREAKERS' | 'SYMBOLS' | 'TEXT_LABELS' | 'TITLE_BLOCK';
}

export interface SldLayout {
  width: number;
  height: number;
  lines: SldLine[];
  circles: SldCircle[];
  rects: SldRect[];
  texts: SldText[];
  paths: SldPath[];
  panel: SldPanel;
  circuits: SldCircuit[];
  titleBlock: SldTitleBlock;
}

export type SldTheme = 'cad_dark' | 'app_dark' | 'paper_white';
