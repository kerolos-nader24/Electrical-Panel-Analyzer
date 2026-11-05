/**
 * Single Line Diagram (SLD) Layout Generator
 * Computes exact engineering coordinates, IEC 60617 electrical symbols,
 * busbars, annotations, and title block geometry.
 */

import type {
  SldPanel,
  SldCircuit,
  SldTitleBlock,
  SldLayout,
  SldLine,
  SldCircle,
  SldRect,
  SldText,
  SldPath
} from './types.js';

export function generateSldLayout(
  panel: SldPanel,
  circuits: SldCircuit[],
  titleBlock: SldTitleBlock
): SldLayout {
  const lines: SldLine[] = [];
  const circles: SldCircle[] = [];
  const rects: SldRect[] = [];
  const texts: SldText[] = [];
  const paths: SldPath[] = [];

  const circuitCount = Math.max(circuits.length, 1);
  const circuitPitch = 140; // horizontal spacing between outgoing circuits
  const leftMargin = 180; // space for incomer breaker and labels
  const rightMargin = 120;
  const contentWidth = Math.max(1280, leftMargin + circuitCount * circuitPitch + rightMargin);
  const contentHeight = 880;

  const frameMargin = 30;
  const frameWidth = contentWidth - frameMargin * 2;
  const frameHeight = contentHeight - frameMargin * 2;

  // 1. Drawing Border & Sheet Frame
  // Outer frame
  rects.push({
    x: frameMargin,
    y: frameMargin,
    width: frameWidth,
    height: frameHeight,
    strokeWidth: 2,
    layer: 'TITLE_BLOCK'
  });
  // Inner frame
  rects.push({
    x: frameMargin + 5,
    y: frameMargin + 5,
    width: frameWidth - 10,
    height: frameHeight - 10,
    strokeWidth: 1,
    layer: 'TITLE_BLOCK'
  });

  // 2. Title Block (Bottom-Right)
  const tbWidth = 380;
  const tbHeight = 110;
  const tbX = frameMargin + frameWidth - 5 - tbWidth;
  const tbY = frameMargin + frameHeight - 5 - tbHeight;

  // Title block outer border
  rects.push({
    x: tbX,
    y: tbY,
    width: tbWidth,
    height: tbHeight,
    strokeWidth: 1.5,
    layer: 'TITLE_BLOCK'
  });

  // Title block grid lines
  lines.push(
    { x1: tbX, y1: tbY + 28, x2: tbX + tbWidth, y2: tbY + 28, strokeWidth: 1, layer: 'TITLE_BLOCK' },
    { x1: tbX, y1: tbY + 56, x2: tbX + tbWidth, y2: tbY + 56, strokeWidth: 1, layer: 'TITLE_BLOCK' },
    { x1: tbX, y1: tbY + 84, x2: tbX + tbWidth, y2: tbY + 84, strokeWidth: 1, layer: 'TITLE_BLOCK' },
    { x1: tbX + 220, y1: tbY + 28, x2: tbX + 220, y2: tbY + tbHeight, strokeWidth: 1, layer: 'TITLE_BLOCK' },
    { x1: tbX + 300, y1: tbY + 56, x2: tbX + 300, y2: tbY + tbHeight, strokeWidth: 1, layer: 'TITLE_BLOCK' }
  );

  // Title block contents
  texts.push(
    // Header banner
    { x: tbX + tbWidth / 2, y: tbY + 18, text: titleBlock.projectName.toUpperCase(), fontSize: 13, anchor: 'middle', fontWeight: 'bold', layer: 'TITLE_BLOCK' },
    // Drawing Title & Panel
    { x: tbX + 10, y: tbY + 42, text: 'TITLE: ' + (titleBlock.drawingTitle || 'SINGLE LINE DIAGRAM (SLD)'), fontSize: 9, anchor: 'start', layer: 'TITLE_BLOCK' },
    { x: tbX + 10, y: tbY + 52, text: 'PANEL: ' + titleBlock.panelName, fontSize: 10, anchor: 'start', fontWeight: 'bold', layer: 'TITLE_BLOCK' },
    // Client / Engineer
    { x: tbX + 10, y: tbY + 70, text: 'CLIENT: ' + (titleBlock.client || 'N/A'), fontSize: 8.5, anchor: 'start', layer: 'TITLE_BLOCK' },
    { x: tbX + 10, y: tbY + 98, text: 'ENG: ' + (titleBlock.engineer || 'ELECTRICAL ENGINEER'), fontSize: 8.5, anchor: 'start', layer: 'TITLE_BLOCK' },
    // Date & Rev
    { x: tbX + 225, y: tbY + 45, text: 'SYS: ' + panel.voltage + 'V ' + panel.systemType, fontSize: 8.5, anchor: 'start', layer: 'TITLE_BLOCK' },
    { x: tbX + 225, y: tbY + 72, text: 'DATE: ' + (titleBlock.dateStr || new Date().toISOString().slice(0, 10)), fontSize: 8, anchor: 'start', layer: 'TITLE_BLOCK' },
    { x: tbX + 225, y: tbY + 98, text: 'REV: ' + (titleBlock.revision || '01'), fontSize: 8.5, anchor: 'start', fontWeight: 'bold', layer: 'TITLE_BLOCK' },
    { x: tbX + 305, y: tbY + 72, text: 'SCALE: ' + (titleBlock.scale || 'N.T.S.'), fontSize: 8, anchor: 'start', layer: 'TITLE_BLOCK' },
    { x: tbX + 305, y: tbY + 98, text: 'STATUS: AS DESIGN', fontSize: 7.5, anchor: 'start', layer: 'TITLE_BLOCK' }
  );

  // 3. Top Banner & Panel Description
  texts.push({
    x: frameMargin + 20,
    y: frameMargin + 30,
    text: `SINGLE LINE DIAGRAM - ${panel.name.toUpperCase()} (${panel.panelType || 'DISTRIBUTION BOARD'})`,
    fontSize: 16,
    anchor: 'start',
    fontWeight: 'bold',
    layer: 'TEXT_LABELS'
  });
  texts.push({
    x: frameMargin + 20,
    y: frameMargin + 48,
    text: `Voltage: ${panel.voltage}V | System: ${panel.systemType} | Frequency: ${panel.frequencyHz || 50}Hz | Fault Level: ${panel.iscKa || 10} kA 1s`,
    fontSize: 10,
    anchor: 'start',
    layer: 'TEXT_LABELS'
  });

  // 4. Incomer Feeder & Main Breaker
  const incomerX = leftMargin - 50;
  const incomerStartY = 110;
  const busbarY = 250;

  // Source symbol / Tag
  const fedFromText = panel.fedFrom ? `FED FROM: ${panel.fedFrom}` : 'MAIN INCOMING SUPPLY';
  texts.push({
    x: incomerX,
    y: incomerStartY - 10,
    text: fedFromText,
    fontSize: 9.5,
    anchor: 'middle',
    fontWeight: 'bold',
    layer: 'TEXT_LABELS'
  });

  // Incoming supply cable annotation
  if (panel.incomerCableTag) {
    texts.push({
      x: incomerX + 15,
      y: incomerStartY + 25,
      text: panel.incomerCableTag,
      fontSize: 8.5,
      anchor: 'start',
      layer: 'TEXT_LABELS'
    });
  }

  // Incoming vertical feeder line
  lines.push({
    x1: incomerX,
    y1: incomerStartY,
    x2: incomerX,
    y2: incomerStartY + 40,
    strokeWidth: 2,
    layer: 'FEEDERS'
  });

  // Main Circuit Breaker (IEC Symbol)
  const mbCenterY = incomerStartY + 60;
  const mbSize = 20;

  // Breaker box
  rects.push({
    x: incomerX - mbSize / 2,
    y: mbCenterY - mbSize / 2,
    width: mbSize,
    height: mbSize,
    strokeWidth: 1.5,
    layer: 'BREAKERS'
  });
  // Diagonal trip mechanism line
  lines.push({
    x1: incomerX - mbSize / 2,
    y1: mbCenterY + mbSize / 2,
    x2: incomerX + mbSize / 2,
    y2: mbCenterY - mbSize / 2,
    strokeWidth: 1.5,
    layer: 'BREAKERS'
  });
  // Cross "X" on breaker representing automatic trip
  lines.push(
    { x1: incomerX - 4, y1: mbCenterY - 4, x2: incomerX + 4, y2: mbCenterY + 4, strokeWidth: 1.5, layer: 'BREAKERS' },
    { x1: incomerX - 4, y1: mbCenterY + 4, x2: incomerX + 4, y2: mbCenterY - 4, strokeWidth: 1.5, layer: 'BREAKERS' }
  );

  // Main breaker labels
  const mbPoles = panel.incomerPoles || (panel.systemType.includes('3') ? '4P' : '2P');
  texts.push({
    x: incomerX + 22,
    y: mbCenterY - 4,
    text: `MAIN CB: ${mbPoles} ${panel.incomerBreaker}A`,
    fontSize: 9.5,
    anchor: 'start',
    fontWeight: 'bold',
    layer: 'TEXT_LABELS'
  });
  texts.push({
    x: incomerX + 22,
    y: mbCenterY + 10,
    text: `Icu = ${panel.iscKa || 25}kA (IEC 60947-2)`,
    fontSize: 8,
    anchor: 'start',
    layer: 'TEXT_LABELS'
  });

  // Feeder continuation from main breaker down to busbar
  lines.push({
    x1: incomerX,
    y1: mbCenterY + mbSize / 2,
    x2: incomerX,
    y2: busbarY,
    strokeWidth: 2,
    layer: 'FEEDERS'
  });

  // Busbar entry tap
  circles.push({
    cx: incomerX,
    cy: busbarY,
    r: 4,
    fill: '#E8A33D',
    layer: 'BUSBAR'
  });

  // 5. Main Copper Busbar
  const busbarStartX = incomerX;
  const busbarEndX = leftMargin + (circuitCount - 1) * circuitPitch + 70;

  // Main Busbar Line (Heavy Line)
  lines.push({
    x1: busbarStartX,
    y1: busbarY,
    x2: busbarEndX,
    y2: busbarY,
    strokeWidth: 5,
    layer: 'BUSBAR'
  });

  // Busbar rating annotation
  const busRating = panel.busbarRatingAmps || Math.max(panel.incomerBreaker, 100);
  texts.push({
    x: busbarEndX + 10,
    y: busbarY + 4,
    text: `MAIN BUSBAR: ${busRating}A Cu | ${panel.iscKa || 10}kA 1s`,
    fontSize: 9,
    anchor: 'start',
    fontWeight: 'bold',
    layer: 'BUSBAR'
  });

  // Neutral & Earth Busbars (dashed / thin lines above and below)
  // Neutral bus
  lines.push({
    x1: busbarStartX,
    y1: busbarY + 12,
    x2: busbarEndX,
    y2: busbarY + 12,
    strokeWidth: 2,
    dashed: true,
    layer: 'BUSBAR'
  });
  texts.push({
    x: busbarEndX + 10,
    y: busbarY + 15,
    text: 'NEUTRAL BUS (N)',
    fontSize: 7.5,
    anchor: 'start',
    layer: 'BUSBAR'
  });

  // Earth bus (PE)
  lines.push({
    x1: busbarStartX,
    y1: busbarY + 22,
    x2: busbarEndX,
    y2: busbarY + 22,
    strokeWidth: 2,
    dashed: true,
    layer: 'BUSBAR'
  });
  texts.push({
    x: busbarEndX + 10,
    y: busbarY + 25,
    text: 'EARTH BUS (PE)',
    fontSize: 7.5,
    anchor: 'start',
    layer: 'BUSBAR'
  });

  // 6. Outgoing Branch Circuits
  const circuitScheduleY = 660; // where the circuit data block begins

  circuits.forEach((circuit, idx) => {
    const cX = leftMargin + idx * circuitPitch;

    // Busbar tap point
    circles.push({
      cx: cX,
      cy: busbarY,
      r: 3.5,
      fill: '#E8A33D',
      layer: 'BUSBAR'
    });

    // Phase tap mark
    texts.push({
      x: cX - 6,
      y: busbarY - 8,
      text: circuit.phase,
      fontSize: 8,
      anchor: 'middle',
      fontWeight: 'bold',
      layer: 'TEXT_LABELS'
    });

    // Line from busbar down to branch breaker
    const breakerCenterY = 320;
    lines.push({
      x1: cX,
      y1: busbarY + 22, // leaves neutral/earth bus
      x2: cX,
      y2: breakerCenterY - mbSize / 2,
      strokeWidth: 1.5,
      layer: 'FEEDERS'
    });

    // Branch Circuit Breaker (IEC Symbol)
    rects.push({
      x: cX - mbSize / 2,
      y: breakerCenterY - mbSize / 2,
      width: mbSize,
      height: mbSize,
      strokeWidth: 1.5,
      layer: 'BREAKERS'
    });
    // Diagonal trip line
    lines.push({
      x1: cX - mbSize / 2,
      y1: breakerCenterY + mbSize / 2,
      x2: cX + mbSize / 2,
      y2: breakerCenterY - mbSize / 2,
      strokeWidth: 1.5,
      layer: 'BREAKERS'
    });
    // Cross "X"
    lines.push(
      { x1: cX - 3, y1: breakerCenterY - 3, x2: cX + 3, y2: breakerCenterY + 3, strokeWidth: 1.2, layer: 'BREAKERS' },
      { x1: cX - 3, y1: breakerCenterY + 3, x2: cX + 3, y2: breakerCenterY - 3, strokeWidth: 1.2, layer: 'BREAKERS' }
    );

    // Breaker text annotation
    const poles = circuit.breakerPoles || (circuit.phase === '3P' ? '3P' : '1P');
    const curve = circuit.breakerCurve || (circuit.loadType === 'motor' ? 'D' : 'C');
    texts.push({
      x: cX + 15,
      y: breakerCenterY - 2,
      text: `${poles} ${circuit.breakerRating}A`,
      fontSize: 8.5,
      anchor: 'start',
      fontWeight: 'bold',
      layer: 'TEXT_LABELS'
    });
    texts.push({
      x: cX + 15,
      y: breakerCenterY + 9,
      text: `${curve}-curve 10kA`,
      fontSize: 7.5,
      anchor: 'start',
      layer: 'TEXT_LABELS'
    });

    let currentY = breakerCenterY + mbSize / 2;

    // Motor starter & contactor if circuit is motor
    if (circuit.loadType === 'motor') {
      const contactorCenterY = currentY + 35;
      lines.push({
        x1: cX,
        y1: currentY,
        x2: cX,
        y2: contactorCenterY - 12,
        strokeWidth: 1.5,
        layer: 'FEEDERS'
      });

      // Contactor square (IEC 60617)
      rects.push({
        x: cX - 10,
        y: contactorCenterY - 12,
        width: 20,
        height: 24,
        strokeWidth: 1.2,
        layer: 'SYMBOLS'
      });
      texts.push({
        x: cX,
        y: contactorCenterY + 3,
        text: 'KM',
        fontSize: 8,
        anchor: 'middle',
        layer: 'SYMBOLS'
      });

      // Starter type label
      const starter = circuit.starterType || 'DOL';
      texts.push({
        x: cX + 15,
        y: contactorCenterY + 2,
        text: `${starter} Starter`,
        fontSize: 7.5,
        anchor: 'start',
        layer: 'TEXT_LABELS'
      });

      // Thermal Overload symbol below contactor
      const overloadCenterY = contactorCenterY + 28;
      lines.push({
        x1: cX,
        y1: contactorCenterY + 12,
        x2: cX,
        y2: overloadCenterY - 10,
        strokeWidth: 1.5,
        layer: 'FEEDERS'
      });

      // Overload bimetallic symbol (IEC rectangle with thermal step)
      rects.push({
        x: cX - 8,
        y: overloadCenterY - 8,
        width: 16,
        height: 16,
        strokeWidth: 1.2,
        layer: 'SYMBOLS'
      });
      lines.push({
        x1: cX - 8,
        y1: overloadCenterY,
        x2: cX + 8,
        y2: overloadCenterY,
        strokeWidth: 1.2,
        layer: 'SYMBOLS'
      });
      texts.push({
        x: cX + 15,
        y: overloadCenterY + 2,
        text: 'O/L Relay',
        fontSize: 7,
        anchor: 'start',
        layer: 'TEXT_LABELS'
      });

      currentY = overloadCenterY + 8;
    }

    // Feeder drop down to load symbol
    const loadSymbolY = 530;
    lines.push({
      x1: cX,
      y1: currentY,
      x2: cX,
      y2: loadSymbolY - 20,
      strokeWidth: 1.5,
      layer: 'FEEDERS'
    });

    // Cable specification annotation (drawn on side of feeder line)
    const cableTextY = currentY + 35;
    texts.push({
      x: cX + 12,
      y: cableTextY,
      text: circuit.cableTag,
      fontSize: 7.5,
      anchor: 'start',
      fontWeight: 'bold',
      layer: 'TEXT_LABELS'
    });
    texts.push({
      x: cX + 12,
      y: cableTextY + 11,
      text: `L = ${circuit.lengthM}m | ΔV = ${circuit.vdropPct ? circuit.vdropPct.toFixed(1) + '%' : 'N/A'}`,
      fontSize: 7,
      anchor: 'start',
      layer: 'TEXT_LABELS'
    });

    // Load Symbol according to category (IEC 60617 standard symbols)
    const symR = 18;
    if (circuit.loadType === 'motor') {
      // Motor symbol: Circle with "M" and "3~" or "1~"
      circles.push({
        cx: cX,
        cy: loadSymbolY,
        r: symR,
        strokeWidth: 1.5,
        layer: 'SYMBOLS'
      });
      texts.push(
        { x: cX, y: loadSymbolY - 1, text: 'M', fontSize: 13, anchor: 'middle', fontWeight: 'bold', layer: 'SYMBOLS' },
        { x: cX, y: loadSymbolY + 11, text: circuit.phase === '3P' ? '3 ~' : '1 ~', fontSize: 8, anchor: 'middle', layer: 'SYMBOLS' }
      );
    } else if (circuit.loadType === 'lighting') {
      // Lighting symbol: Circle with an "X" cross
      circles.push({
        cx: cX,
        cy: loadSymbolY,
        r: symR,
        strokeWidth: 1.5,
        layer: 'SYMBOLS'
      });
      const d = symR * 0.707;
      lines.push(
        { x1: cX - d, y1: loadSymbolY - d, x2: cX + d, y2: loadSymbolY + d, strokeWidth: 1.2, layer: 'SYMBOLS' },
        { x1: cX - d, y1: loadSymbolY + d, x2: cX + d, y2: loadSymbolY - d, strokeWidth: 1.2, layer: 'SYMBOLS' }
      );
    } else if (circuit.loadType === 'socket') {
      // Socket symbol: Semicircle with vertical pin line
      paths.push({
        d: `M ${cX - symR} ${loadSymbolY} A ${symR} ${symR} 0 0 1 ${cX + symR} ${loadSymbolY} Z`,
        strokeWidth: 1.5,
        layer: 'SYMBOLS'
      });
      lines.push({
        x1: cX,
        y1: loadSymbolY,
        x2: cX,
        y2: loadSymbolY + symR,
        strokeWidth: 1.5,
        layer: 'SYMBOLS'
      });
    } else if (circuit.loadType === 'ac') {
      // AC symbol: Box with snowflake or "AC"
      rects.push({
        x: cX - symR,
        y: loadSymbolY - symR,
        width: symR * 2,
        height: symR * 2,
        strokeWidth: 1.5,
        layer: 'SYMBOLS'
      });
      texts.push({
        x: cX,
        y: loadSymbolY + 4,
        text: 'A/C',
        fontSize: 10,
        anchor: 'middle',
        fontWeight: 'bold',
        layer: 'SYMBOLS'
      });
    } else {
      // Generic / Subpanel load: Arrow downwards into terminal
      lines.push(
        { x1: cX, y1: loadSymbolY - 15, x2: cX, y2: loadSymbolY + 15, strokeWidth: 2, layer: 'SYMBOLS' },
        { x1: cX - 6, y1: loadSymbolY + 6, x2: cX, y2: loadSymbolY + 15, strokeWidth: 2, layer: 'SYMBOLS' },
        { x1: cX + 6, y1: loadSymbolY + 6, x2: cX, y2: loadSymbolY + 15, strokeWidth: 2, layer: 'SYMBOLS' }
      );
    }

    // 7. Circuit Schedule Summary Cell (Table at bottom)
    const cellW = circuitPitch - 10;
    const cellX = cX - cellW / 2;
    const cellH = 110;

    rects.push({
      x: cellX,
      y: circuitScheduleY,
      width: cellW,
      height: cellH,
      strokeWidth: 1,
      layer: 'TEXT_LABELS'
    });

    // Horizontal divider inside cell
    lines.push(
      { x1: cellX, y1: circuitScheduleY + 24, x2: cellX + cellW, y2: circuitScheduleY + 24, strokeWidth: 0.8, layer: 'TEXT_LABELS' },
      { x1: cellX, y1: circuitScheduleY + 50, x2: cellX + cellW, y2: circuitScheduleY + 50, strokeWidth: 0.8, layer: 'TEXT_LABELS' },
      { x1: cellX, y1: circuitScheduleY + 76, x2: cellX + cellW, y2: circuitScheduleY + 76, strokeWidth: 0.8, layer: 'TEXT_LABELS' }
    );

    // Connecting line from load symbol to schedule table
    lines.push({
      x1: cX,
      y1: loadSymbolY + symR,
      x2: cX,
      y2: circuitScheduleY,
      strokeWidth: 1,
      dashed: true,
      layer: 'FEEDERS'
    });

    texts.push(
      // Row 1: Circuit tag & phase
      { x: cX, y: circuitScheduleY + 16, text: `C${circuit.circuitNumber} (${circuit.phase})`, fontSize: 9.5, anchor: 'middle', fontWeight: 'bold', layer: 'TEXT_LABELS' },
      // Row 2: Circuit Name
      { x: cX, y: circuitScheduleY + 38, text: circuit.name.length > 28 ? circuit.name.slice(0, 26) + '..' : circuit.name, fontSize: 8, anchor: 'middle', layer: 'TEXT_LABELS' },
      // Row 3: Load Rating
      { x: cX, y: circuitScheduleY + 65, text: `${circuit.loadVal} ${circuit.loadUnit} (PF ${circuit.pf})`, fontSize: 7.5, anchor: 'middle', layer: 'TEXT_LABELS' },
      // Row 4: Category
      { x: cX, y: circuitScheduleY + 95, text: circuit.loadType.toUpperCase(), fontSize: 7.5, anchor: 'middle', layer: 'TEXT_LABELS' }
    );
  });

  return {
    width: contentWidth,
    height: contentHeight,
    lines,
    circles,
    rects,
    texts,
    paths,
    panel,
    circuits,
    titleBlock
  };
}
