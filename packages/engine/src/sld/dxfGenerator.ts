/**
 * Single Line Diagram (SLD) AutoCAD DXF Generator
 * Generates standard AutoCAD ASCII DXF (AC1009 / R12 format) with
 * engineering layers, standard ACI colors, text, and geometry.
 */

import type { SldLayout } from './types.js';

export function renderSldToDxf(layout: SldLayout): string {
  const { width, height, lines, circles, rects, texts } = layout;

  // Coordinate conversion: SVG origin is top-left, DXF origin is bottom-left
  const convY = (y: number) => (height - y).toFixed(2);
  const convX = (x: number) => x.toFixed(2);

  const out: string[] = [];

  const push = (...args: (string | number)[]) => {
    for (const a of args) {
      out.push(String(a));
    }
  };

  // 1. HEADER SECTION
  push('0', 'SECTION');
  push('2', 'HEADER');
  push('9', '$ACADVER');
  push('1', 'AC1009'); // AutoCAD R12 ASCII DXF - universal compatibility
  push('9', '$INSUNITS');
  push('70', '4'); // Millimeters
  push('9', '$MEASUREMENT');
  push('70', '1'); // Metric
  push('9', '$EXTMIN');
  push('10', '0.0', '20', '0.0', '30', '0.0');
  push('9', '$EXTMAX');
  push('10', convX(width), '20', convX(height), '30', '0.0');
  push('0', 'ENDSEC');

  // 2. TABLES SECTION
  push('0', 'SECTION');
  push('2', 'TABLES');

  // Linetypes
  push('0', 'TABLE');
  push('2', 'LTYPE');
  push('70', '2');

  push('0', 'LTYPE');
  push('2', 'CONTINUOUS');
  push('70', '64');
  push('3', 'Solid line');
  push('72', '65');
  push('73', '0');
  push('40', '0.0');

  push('0', 'LTYPE');
  push('2', 'DASHED');
  push('70', '64');
  push('3', 'Dashed __ __ __');
  push('72', '65');
  push('73', '2');
  push('40', '10.0');
  push('49', '6.0');
  push('49', '-4.0');

  push('0', 'ENDTAB');

  // Layers
  // Layer ACI colors:
  // 1 = Red, 2 = Yellow, 3 = Green, 4 = Cyan, 5 = Blue, 6 = Magenta, 7 = White
  const layers = [
    { name: '0', color: 7, ltype: 'CONTINUOUS' },
    { name: 'BUSBAR', color: 2, ltype: 'CONTINUOUS' }, // Yellow
    { name: 'BREAKERS', color: 4, ltype: 'CONTINUOUS' }, // Cyan
    { name: 'FEEDERS', color: 7, ltype: 'CONTINUOUS' }, // White
    { name: 'SYMBOLS', color: 3, ltype: 'CONTINUOUS' }, // Green
    { name: 'TEXT_LABELS', color: 7, ltype: 'CONTINUOUS' }, // White
    { name: 'TITLE_BLOCK', color: 6, ltype: 'CONTINUOUS' } // Magenta
  ];

  push('0', 'TABLE');
  push('2', 'LAYER');
  push('70', layers.length);

  for (const lyr of layers) {
    push('0', 'LAYER');
    push('2', lyr.name);
    push('70', '0');
    push('62', lyr.color);
    push('6', lyr.ltype);
  }

  push('0', 'ENDTAB');

  // Text Styles
  push('0', 'TABLE');
  push('2', 'STYLE');
  push('70', '1');
  push('0', 'STYLE');
  push('2', 'STANDARD');
  push('70', '0');
  push('40', '0.0');
  push('41', '1.0');
  push('50', '0.0');
  push('71', '0');
  push('42', '2.5');
  push('3', 'txt');
  push('4', '');
  push('0', 'ENDTAB');

  push('0', 'ENDSEC'); // END TABLES

  // 3. BLOCKS SECTION (Empty for standard R12)
  push('0', 'SECTION');
  push('2', 'BLOCKS');
  push('0', 'ENDSEC');

  // 4. ENTITIES SECTION
  push('0', 'SECTION');
  push('2', 'ENTITIES');

  // Emit Lines
  for (const l of lines) {
    push('0', 'LINE');
    push('8', l.layer || 'FEEDERS');
    if (l.dashed) {
      push('6', 'DASHED');
    }
    push('10', convX(l.x1));
    push('20', convY(l.y1));
    push('30', '0.0');
    push('11', convX(l.x2));
    push('21', convY(l.y2));
    push('31', '0.0');
  }

  // Emit Rectangles as 4 Lines
  for (const r of rects) {
    const layer = r.layer || 'FEEDERS';
    const x1 = r.x;
    const y1 = r.y;
    const x2 = r.x + r.width;
    const y2 = r.y + r.height;

    const segments = [
      { xa: x1, ya: y1, xb: x2, yb: y1 },
      { xa: x2, ya: y1, xb: x2, yb: y2 },
      { xa: x2, ya: y2, xb: x1, yb: y2 },
      { xa: x1, ya: y2, xb: x1, yb: y1 }
    ];

    for (const seg of segments) {
      push('0', 'LINE');
      push('8', layer);
      push('10', convX(seg.xa));
      push('20', convY(seg.ya));
      push('30', '0.0');
      push('11', convX(seg.xb));
      push('21', convY(seg.yb));
      push('31', '0.0');
    }
  }

  // Emit Circles
  for (const c of circles) {
    push('0', 'CIRCLE');
    push('8', c.layer || 'SYMBOLS');
    push('10', convX(c.cx));
    push('20', convY(c.cy));
    push('30', '0.0');
    push('40', c.r.toFixed(2));
  }

  // Emit Texts
  for (const t of texts) {
    // Sanitize string for DXF
    const cleanText = t.text.replace(/[\r\n]/g, ' ').replace(/\^/g, '');
    const layer = t.layer || 'TEXT_LABELS';

    push('0', 'TEXT');
    push('8', layer);
    push('10', convX(t.x));
    push('20', convY(t.y));
    push('30', '0.0');
    push('40', t.fontSize.toFixed(2));
    push('1', cleanText);

    // Text Justification: 0 = Left, 1 = Center, 2 = Right
    let just = 0;
    if (t.anchor === 'middle') just = 1;
    else if (t.anchor === 'end') just = 2;

    if (just > 0) {
      push('72', just);
      push('11', convX(t.x));
      push('21', convY(t.y));
      push('31', '0.0');
    }

    if (t.rotation) {
      push('50', t.rotation.toFixed(2));
    }
  }

  push('0', 'ENDSEC'); // END ENTITIES

  // 5. EOF
  push('0', 'EOF');

  return out.join('\n') + '\n';
}
