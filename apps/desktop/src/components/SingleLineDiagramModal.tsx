import React, { useState, useRef, useMemo, useEffect } from 'react';
import {
  generateSldLayout,
  renderSldToSvg,
  renderSldToDxf,
  type SldPanel,
  type SldCircuit,
  type SldTitleBlock,
  type SldTheme
} from '@panel-analyzer/engine';
import {
  X,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Download,
  FileCode2,
  FileSpreadsheet,
  Maximize2,
  Layers,
  Printer
} from 'lucide-react';
import { I18N, type Language } from '../i18n.js';

interface SingleLineDiagramModalProps {
  panelData: SldPanel;
  circuitsData: SldCircuit[];
  titleBlockData: SldTitleBlock;
  lang: Language;
  onClose: () => void;
}

export const SingleLineDiagramModal: React.FC<SingleLineDiagramModalProps> = ({
  panelData,
  circuitsData,
  titleBlockData,
  lang,
  onClose
}) => {
  const t = I18N[lang];
  const [theme, setTheme] = useState<SldTheme>('app_dark');
  const [scale, setScale] = useState<number>(0.85);
  const [position, setPosition] = useState<{ x: number; y: number }>({ x: 20, y: 20 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const dragStart = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  // Compute Layout
  const layout = useMemo(() => {
    return generateSldLayout(panelData, circuitsData, titleBlockData);
  }, [panelData, circuitsData, titleBlockData]);

  // Compute SVG XML
  const svgContent = useMemo(() => {
    return renderSldToSvg(layout, theme);
  }, [layout, theme]);

  // Compute DXF text
  const dxfContent = useMemo(() => {
    return renderSldToDxf(layout);
  }, [layout]);

  // Fit to screen on initial mount
  useEffect(() => {
    if (containerRef.current) {
      const { clientWidth, clientHeight } = containerRef.current;
      const fitScale = Math.min((clientWidth - 60) / layout.width, (clientHeight - 60) / layout.height, 1);
      const initScale = Math.max(0.4, Math.min(1.2, fitScale));
      setScale(initScale);
      const initX = Math.max(10, (clientWidth - layout.width * initScale) / 2);
      const initY = Math.max(10, (clientHeight - layout.height * initScale) / 2);
      setPosition({ x: initX, y: initY });
    }
  }, [layout.width, layout.height]);

  // Mouse wheel zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
    setScale(prev => Math.min(3.0, Math.max(0.3, prev * zoomFactor)));
  };

  // Drag pan handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return; // left click only
    setIsDragging(true);
    dragStart.current = { x: e.clientX - position.x, y: e.clientY - position.y };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPosition({
      x: e.clientX - dragStart.current.x,
      y: e.clientY - dragStart.current.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Zoom controls
  const handleZoomIn = () => setScale(prev => Math.min(3.0, prev + 0.15));
  const handleZoomOut = () => setScale(prev => Math.max(0.3, prev - 0.15));
  const handleReset = () => {
    if (containerRef.current) {
      const { clientWidth, clientHeight } = containerRef.current;
      const fitScale = Math.min((clientWidth - 60) / layout.width, (clientHeight - 60) / layout.height, 1);
      const initScale = Math.max(0.4, Math.min(1.2, fitScale));
      setScale(initScale);
      setPosition({
        x: Math.max(10, (clientWidth - layout.width * initScale) / 2),
        y: Math.max(10, (clientHeight - layout.height * initScale) / 2)
      });
    }
  };

  // Download SVG
  const handleDownloadSvg = () => {
    const blob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${panelData.name.replace(/\s+/g, '_')}_SLD.svg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Download DXF
  const handleDownloadDxf = () => {
    const blob = new Blob([dxfContent], { type: 'application/dxf;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${panelData.name.replace(/\s+/g, '_')}_SLD.dxf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Print view
  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${panelData.name} - SLD</title>
          <style>
            @page { size: landscape; margin: 5mm; }
            body { margin: 0; display: flex; justify-content: center; align-items: center; background: white; }
            svg { width: 100vw; height: auto; max-height: 98vh; }
          </style>
        </head>
        <body>
          ${renderSldToSvg(layout, 'paper_white')}
          <script>
            window.onload = () => { window.print(); window.close(); };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="flex flex-col w-[96vw] h-[92vh] max-w-[1600px] bg-[#0E1A24] border border-[#2A3B4C] rounded-xl shadow-2xl overflow-hidden">
        {/* Header Toolbar */}
        <div className="flex flex-wrap items-center justify-between px-5 py-3.5 bg-[#142331] border-b border-[#2A3B4C] gap-3">
          {/* Title & Info */}
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[#E8A33D]/10 border border-[#E8A33D]/30 text-[#E8A33D]">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-wide flex items-center gap-2">
                <span>{panelData.name}</span>
                <span className="text-xs px-2 py-0.5 rounded bg-[#4FB3A9]/20 text-[#4FB3A9] border border-[#4FB3A9]/30 font-mono">
                  {panelData.voltage}V {panelData.systemType}
                </span>
                <span className="text-xs text-slate-400 font-normal">
                  — {t.singleLineDiagram}
                </span>
              </h2>
              <p className="text-xs text-slate-400 font-mono">
                {circuitsData.length} Circuits • Main Breaker: {panelData.incomerBreaker}A • Busbar: {panelData.busbarRatingAmps || panelData.incomerBreaker}A
              </p>
            </div>
          </div>

          {/* Theme Selector & Zoom & Actions */}
          <div className="flex items-center flex-wrap gap-2.5">
            {/* Theme Selector */}
            <div className="flex items-center bg-[#0A131C] border border-[#2A3B4C] rounded-lg p-0.5 text-xs">
              <button
                onClick={() => setTheme('app_dark')}
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  theme === 'app_dark'
                    ? 'bg-[#1E3042] text-[#4FB3A9] font-medium shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {t.appTheme}
              </button>
              <button
                onClick={() => setTheme('cad_dark')}
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  theme === 'cad_dark'
                    ? 'bg-[#1E3042] text-[#E8A33D] font-medium shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {t.cadTheme}
              </button>
              <button
                onClick={() => setTheme('paper_white')}
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  theme === 'paper_white'
                    ? 'bg-white text-slate-900 font-medium shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {t.paperTheme}
              </button>
            </div>

            {/* Zoom Controls */}
            <div className="flex items-center bg-[#0A131C] border border-[#2A3B4C] rounded-lg p-0.5 text-xs text-slate-300">
              <button
                onClick={handleZoomOut}
                title={t.zoomOut}
                className="p-1.5 hover:bg-[#1E3042] rounded text-slate-400 hover:text-white"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <span className="px-2 font-mono text-[11px] text-slate-400 min-w-[45px] text-center">
                {Math.round(scale * 100)}%
              </span>
              <button
                onClick={handleZoomIn}
                title={t.zoomIn}
                className="p-1.5 hover:bg-[#1E3042] rounded text-slate-400 hover:text-white"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button
                onClick={handleReset}
                title={t.resetZoom}
                className="p-1.5 hover:bg-[#1E3042] rounded text-slate-400 hover:text-white border-l border-[#2A3B4C]"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Export SVG */}
            <button
              onClick={handleDownloadSvg}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#142331] hover:bg-[#1C3246] border border-[#2A3B4C] text-xs font-medium text-slate-200 transition-colors"
              title="Download standard SVG vector diagram"
            >
              <FileCode2 className="w-3.5 h-3.5 text-[#38BDF8]" />
              <span>{t.exportSvg}</span>
            </button>

            {/* Export AutoCAD DXF */}
            <button
              onClick={handleDownloadDxf}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#E8A33D]/20 hover:bg-[#E8A33D]/30 border border-[#E8A33D]/40 text-xs font-medium text-[#E8A33D] transition-colors"
              title="Export AutoCAD R12 ASCII DXF with layers"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{t.exportDxf}</span>
            </button>

            {/* Print */}
            <button
              onClick={handlePrint}
              className="p-1.5 rounded-lg bg-[#142331] hover:bg-[#1C3246] border border-[#2A3B4C] text-slate-400 hover:text-white transition-colors"
              title="Print / PDF"
            >
              <Printer className="w-4 h-4" />
            </button>

            {/* Close */}
            <button
              onClick={onClose}
              className="p-1.5 ml-2 rounded-lg bg-[#1E3042] hover:bg-rose-950/60 hover:text-rose-400 text-slate-400 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Interactive SVG Canvas */}
        <div
          ref={containerRef}
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          className={`flex-1 relative overflow-hidden select-none ${
            theme === 'paper_white' ? 'bg-[#E2E8F0]' : 'bg-[#070D12]'
          } ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
        >
          {/* Canvas Viewport */}
          <div
            style={{
              transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
              transformOrigin: '0 0',
              transition: isDragging ? 'none' : 'transform 0.05s ease-out'
            }}
            className="inline-block shadow-2xl"
            dangerouslySetInnerHTML={{ __html: svgContent }}
          />

          {/* Floating Pan/Zoom Hint */}
          <div className="absolute bottom-4 left-5 px-3 py-1.5 rounded-md bg-black/60 backdrop-blur-md border border-white/10 text-[11px] font-mono text-slate-400 pointer-events-none">
            {t.panHint}
          </div>
        </div>
      </div>
    </div>
  );
};
