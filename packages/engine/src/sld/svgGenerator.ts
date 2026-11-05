/**
 * Single Line Diagram (SLD) SVG Renderer
 * Renders an SldLayout to a clean, standard SVG XML document.
 */

import type { SldLayout, SldTheme } from './types.js';

function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function renderSldToSvg(layout: SldLayout, theme: SldTheme = 'app_dark'): string {
  const { width, height, lines, circles, rects, texts, paths } = layout;

  // Theme palettes
  const palettes = {
    app_dark: {
      bg: '#0E1A24',
      busbar: '#E8A33D',
      breakers: '#4FB3A9',
      feeders: '#94A3B8',
      symbols: '#38BDF8',
      text: '#F1F5F9',
      titleBlock: '#334155',
      titleText: '#F8FAFC'
    },
    cad_dark: {
      bg: '#05070A',
      busbar: '#FFFF00', // AutoCAD Yellow (Color 2)
      breakers: '#00FFFF', // AutoCAD Cyan (Color 4)
      feeders: '#FFFFFF', // AutoCAD White (Color 7)
      symbols: '#00FF00', // AutoCAD Green (Color 3)
      text: '#FFFFFF',
      titleBlock: '#FF00FF', // AutoCAD Magenta (Color 6)
      titleText: '#FFFF00'
    },
    paper_white: {
      bg: '#FFFFFF',
      busbar: '#B45309',
      breakers: '#0369A1',
      feeders: '#334155',
      symbols: '#15803D',
      text: '#0F172A',
      titleBlock: '#64748B',
      titleText: '#0F172A'
    }
  };

  const p = palettes[theme] || palettes.app_dark;

  const getColor = (layer?: string) => {
    switch (layer) {
      case 'BUSBAR':
        return p.busbar;
      case 'BREAKERS':
        return p.breakers;
      case 'FEEDERS':
        return p.feeders;
      case 'SYMBOLS':
        return p.symbols;
      case 'TITLE_BLOCK':
        return p.titleBlock;
      case 'TEXT_LABELS':
      default:
        return p.text;
    }
  };

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" style="background-color: ${p.bg}; font-family: 'IBM Plex Mono', 'Space Grotesk', Consolas, monospace;">\n`;

  // Background rect
  svg += `  <rect width="${width}" height="${height}" fill="${p.bg}" />\n`;

  // Rectangles
  for (const r of rects) {
    const stroke = getColor(r.layer);
    const fill = r.fill || 'none';
    const sw = r.strokeWidth || 1;
    svg += `  <rect x="${r.x}" y="${r.y}" width="${r.width}" height="${r.height}" stroke="${stroke}" stroke-width="${sw}" fill="${fill}" />\n`;
  }

  // Paths
  for (const pt of paths) {
    const stroke = getColor(pt.layer);
    const fill = pt.fill || 'none';
    const sw = pt.strokeWidth || 1;
    svg += `  <path d="${pt.d}" stroke="${stroke}" stroke-width="${sw}" fill="${fill}" />\n`;
  }

  // Lines
  for (const l of lines) {
    const stroke = getColor(l.layer);
    const sw = l.strokeWidth || 1;
    const dash = l.dashed ? ' stroke-dasharray="4,4"' : '';
    svg += `  <line x1="${l.x1}" y1="${l.y1}" x2="${l.x2}" y2="${l.y2}" stroke="${stroke}" stroke-width="${sw}"${dash} />\n`;
  }

  // Circles
  for (const c of circles) {
    const stroke = getColor(c.layer);
    const fill = c.fill ? (c.fill.startsWith('#') ? c.fill : getColor(c.layer)) : 'none';
    const sw = c.strokeWidth || 1;
    svg += `  <circle cx="${c.cx}" cy="${c.cy}" r="${c.r}" stroke="${stroke}" stroke-width="${sw}" fill="${fill}" />\n`;
  }

  // Texts
  for (const t of texts) {
    const fill = t.layer === 'TITLE_BLOCK' ? p.titleText : getColor(t.layer);
    const anchor = t.anchor || 'start';
    const weight = t.fontWeight ? ` font-weight="${t.fontWeight}"` : '';
    const transform = t.rotation ? ` transform="rotate(${t.rotation} ${t.x} ${t.y})"` : '';
    svg += `  <text x="${t.x}" y="${t.y}" fill="${fill}" font-size="${t.fontSize}" text-anchor="${anchor}"${weight}${transform}>${escapeXml(t.text)}</text>\n`;
  }

  svg += `</svg>`;
  return svg;
}
