import { describe, it, expect } from 'vitest';
import {
  generateSldLayout,
  renderSldToSvg,
  renderSldToDxf,
  type SldPanel,
  type SldCircuit,
  type SldTitleBlock
} from '../src/sld/index.js';

describe('Single Line Diagram (SLD) Engine', () => {
  const mockPanel: SldPanel = {
    name: 'DB-MAIN',
    panelType: 'MDB',
    systemType: '3P+N',
    voltage: 380,
    frequencyHz: 50,
    incomerBreaker: 250,
    incomerPoles: '4P',
    incomerCableTag: '4x120mm² Cu/XLPE/SWA/PVC + 70mm² ECC',
    busbarRatingAmps: 400,
    iscKa: 25,
    fedFrom: 'TR-01 (1000kVA)'
  };

  const mockCircuits: SldCircuit[] = [
    {
      circuitNumber: 1,
      name: 'LIGHTING FLOOR 1',
      loadType: 'lighting',
      loadVal: 5.2,
      loadUnit: 'kW',
      pf: 0.95,
      phase: 'L1',
      lengthM: 30,
      breakerRating: 20,
      breakerPoles: '1P',
      breakerCurve: 'C',
      cableTag: '3x2.5mm² Cu/PVC/PVC',
      vdropPct: 0.8
    },
    {
      circuitNumber: 2,
      name: 'CHILLED WATER PUMP',
      loadType: 'motor',
      loadVal: 15,
      loadUnit: 'kW',
      pf: 0.85,
      phase: '3P',
      lengthM: 45,
      breakerRating: 40,
      breakerPoles: '3P',
      breakerCurve: 'D',
      cableTag: '4x16mm² Cu/XLPE/PVC + 16mm² ECC',
      vdropPct: 1.4,
      starterType: 'Star-Delta'
    },
    {
      circuitNumber: 3,
      name: 'AC SPLIT UNITS',
      loadType: 'ac',
      loadVal: 8.5,
      loadUnit: 'kW',
      pf: 0.88,
      phase: '3P',
      lengthM: 25,
      breakerRating: 25,
      breakerPoles: '3P',
      breakerCurve: 'C',
      cableTag: '4x6mm² Cu/XLPE/PVC + 6mm² ECC',
      vdropPct: 0.9
    },
    {
      circuitNumber: 4,
      name: 'GENERAL RECEPTACLES',
      loadType: 'socket',
      loadVal: 3.6,
      loadUnit: 'kW',
      pf: 0.9,
      phase: 'L2',
      lengthM: 20,
      breakerRating: 20,
      breakerPoles: '1P',
      cableTag: '3x4mm² Cu/PVC/PVC',
      vdropPct: 0.6
    }
  ];

  const mockTitleBlock: SldTitleBlock = {
    projectName: 'HOSPITAL TOWER COMPLEX',
    projectCode: 'HOS-2026',
    client: 'Ministry of Health',
    engineer: 'Eng. K. Nader',
    panelName: 'DB-MAIN',
    dateStr: '2026-11-04',
    revision: '01',
    drawingTitle: 'SINGLE LINE DIAGRAM - DB-MAIN',
    scale: 'N.T.S.'
  };

  it('generates layout geometry with all elements and title block', () => {
    const layout = generateSldLayout(mockPanel, mockCircuits, mockTitleBlock);

    expect(layout.width).toBeGreaterThanOrEqual(1200);
    expect(layout.height).toBe(880);
    expect(layout.lines.length).toBeGreaterThan(15);
    expect(layout.rects.length).toBeGreaterThan(5);
    expect(layout.circles.length).toBeGreaterThan(4);
    expect(layout.texts.length).toBeGreaterThan(15);

    // Check that title block texts are included
    const textContents = layout.texts.map(t => t.text);
    expect(textContents.some(t => t.includes('HOSPITAL TOWER COMPLEX'))).toBe(true);
    expect(textContents.some(t => t.includes('DB-MAIN'))).toBe(true);
    expect(textContents.some(t => t.includes('Eng. K. Nader'))).toBe(true);

    // Check busbar and breaker labels
    expect(textContents.some(t => t.includes('MAIN BUSBAR'))).toBe(true);
    expect(textContents.some(t => t.includes('MAIN CB'))).toBe(true);
    expect(textContents.some(t => t.includes('CHILLED WATER PUMP'))).toBe(true);
  });

  it('renders valid SVG with all required layers and themes', () => {
    const layout = generateSldLayout(mockPanel, mockCircuits, mockTitleBlock);

    // Render dark app theme
    const svgDark = renderSldToSvg(layout, 'app_dark');
    expect(svgDark.startsWith('<svg')).toBe(true);
    expect(svgDark.endsWith('</svg>')).toBe(true);
    expect(svgDark).toContain('#0E1A24'); // background
    expect(svgDark).toContain('DB-MAIN');
    expect(svgDark).toContain('LIGHTING FLOOR 1');

    // Render CAD theme
    const svgCad = renderSldToSvg(layout, 'cad_dark');
    expect(svgCad).toContain('#05070A');
    expect(svgCad).toContain('#FFFF00'); // Yellow busbar

    // Render Paper White theme
    const svgPaper = renderSldToSvg(layout, 'paper_white');
    expect(svgPaper).toContain('#FFFFFF');
  });

  it('renders standard AutoCAD DXF matching ASCII specification', () => {
    const layout = generateSldLayout(mockPanel, mockCircuits, mockTitleBlock);
    const dxf = renderSldToDxf(layout);

    expect(dxf).toContain('SECTION\n2\nHEADER');
    expect(dxf).toContain('$ACADVER\n1\nAC1009');
    expect(dxf).toContain('$INSUNITS\n70\n4'); // Millimeters
    expect(dxf).toContain('SECTION\n2\nTABLES');
    expect(dxf).toContain('BUSBAR');
    expect(dxf).toContain('BREAKERS');
    expect(dxf).toContain('FEEDERS');
    expect(dxf).toContain('SYMBOLS');
    expect(dxf).toContain('TITLE_BLOCK');
    expect(dxf).toContain('SECTION\n2\nENTITIES');
    expect(dxf).toContain('LINE');
    expect(dxf).toContain('CIRCLE');
    expect(dxf).toContain('TEXT');
    expect(dxf).toContain('EOF');

    // Ensure circuit names exist in DXF entities
    expect(dxf).toContain('CHILLED WATER PUMP');
    expect(dxf).toContain('LIGHTING FLOOR 1');
  });
});
