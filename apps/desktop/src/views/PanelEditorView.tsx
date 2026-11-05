import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  calculateDesignCurrent,
  calculateRequiredBreaker,
  selectStandardBreaker,
  applyCorrectionFactors,
  calculateCableRequirement,
  selectParallelCableWithVdrop,
  checkProtection,
  checkShortCircuit,
  selectConduit,
  calculateNeutral,
  calculateEarth,
  generateCableTag,
  getCableTableKey,
  calculateDetailedDerating,
  calculatePanelDemand,
  calculateMotorCircuit,
  calculatePanelBoq,
  DEFAULT_DEMAND_FACTORS,
  type DemandFactorsConfig,
  type SldPanel,
  type SldCircuit,
  type SldTitleBlock
} from '@panel-analyzer/engine';
import { Copy, Plus, Trash2, CheckCircle2, RefreshCw, Printer, Download, Settings2, GitFork, Layers, FileSpreadsheet } from 'lucide-react';
import type { PanelRecord, CircuitRecord, ProjectRecord } from '../../../electron/db.js';
import { I18N, type Language } from '../i18n.js';
import { PrintableReportModal } from '../components/PrintableReportModal.js';
import { SingleLineDiagramModal } from '../components/SingleLineDiagramModal.js';
import { PanelScheduleEditor } from '../components/PanelScheduleEditor.js';
import { DemandFactorsEditor } from '../components/DemandFactorsEditor.js';
import { generateExcelWorkbookXml } from '../services/excelExport.js';

export interface PanelCalculationResult {
  Ib: number;
  In: number;
  cable: { size: number; ampacity: number; dia: number } | null;
  vdrop: { vDrop: number; vDropPct: number } | null;
  coord: { pass: boolean; Ib: number; In: number; Iz: number } | null;
  sc: { pass: boolean; Smin: number; k: number } | null;
  conduit: { size: number; fillPct: number } | null;
  neutral: number;
  ecc: number;
  tag: string;
}

interface PanelEditorViewProps {
  project: ProjectRecord | null;
  panel: PanelRecord;
  allPanels: PanelRecord[];
  circuits: CircuitRecord[];
  inheritedLoadKva?: number;
  settings?: Record<string, string>;
  lang: Language;
  onUpdatePanel: (id: string, updates: Partial<PanelRecord>) => void;
  onAddCircuit: (circuit: Omit<CircuitRecord, 'id' | 'created_at' | 'updated_at'>) => void;
  onUpdateCircuit: (id: string, updates: Partial<CircuitRecord>) => void;
  onDeleteCircuit: (id: string) => void;
  onCopyText: (text: string) => void;
}

export const PanelEditorView: React.FC<PanelEditorViewProps> = ({
  project,
  panel,
  allPanels,
  circuits,
  inheritedLoadKva = 0,
  settings = {},
  lang,
  onUpdatePanel,
  onAddCircuit,
  onUpdateCircuit,
  onDeleteCircuit,
  onCopyText
}) => {
  const t = I18N[lang];

  // Local form state
  const [formData, setFormData] = useState<PanelRecord>(panel);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving'>('saved');
  const autosaveTimer = useRef<any>(null);

  // Derating Mode State
  const [deratingMode, setDeratingMode] = useState<'manual' | 'detailed'>('manual');
  const [detailedInputs, setDetailedInputs] = useState({
    ambientTemp: panel.install_method === 'ground' ? 30 : 40,
    circuitsCount: 1,
    depth: 0.7,
    soilResistivity: 1.5
  });

  // Modal State
  const [showPrintModal, setShowPrintModal] = useState<boolean>(false);
  const [showSldModal, setShowSldModal] = useState<boolean>(false);

  // Demand Factors config state
  const demandConfig: DemandFactorsConfig = useMemo(() => {
    try {
      if (formData.demand_factors) {
        return { ...DEFAULT_DEMAND_FACTORS, ...JSON.parse(formData.demand_factors) };
      }
    } catch {}
    return DEFAULT_DEMAND_FACTORS;
  }, [formData.demand_factors]);

  useEffect(() => {
    setFormData(panel);
  }, [panel.id]);

  const updateField = (field: keyof PanelRecord, value: any) => {
    const updated = { ...formData, [field]: value };
    setFormData(updated);
    setSaveStatus('saving');

    if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    autosaveTimer.current = setTimeout(() => {
      onUpdatePanel(panel.id, { [field]: value });
      setSaveStatus('saved');
    }, 400);
  };

  // 1. Demand Factors Calculation from schedule circuits
  const circuitLoadInputs = useMemo(() => {
    return circuits.map(c => {
      const is3P = c.phase === '3P';
      const cVolt = is3P ? formData.voltage : 230;
      const curr = calculateDesignCurrent(c.load_val, c.load_unit, cVolt, is3P, c.pf || 0.9, 1.0, false);
      return {
        loadType: (c.load_type || 'socket') as any,
        connectedKva: curr.connectedKva
      };
    });
  }, [circuits, formData.voltage]);

  const demandSummary = useMemo(() => {
    return calculatePanelDemand(circuitLoadInputs, demandConfig);
  }, [circuitLoadInputs, demandConfig]);

  // Total Incomer Load = Direct Demand Load + Inherited Sub-panel Demand Load
  const effectiveIncomerLoad = useMemo(() => {
    const baseDemand = demandSummary.totalConnectedKva > 0
      ? demandSummary.totalDemandKva
      : formData.raw_load;
    return Number((baseDemand + inheritedLoadKva).toFixed(2));
  }, [demandSummary, formData.raw_load, inheritedLoadKva]);

  // Detailed derating calculation
  const detailedDeratingResult = useMemo(() => {
    return calculateDetailedDerating({
      ambientTemp: detailedInputs.ambientTemp,
      insulation: formData.insulation as any,
      installMethod: formData.install_method as any,
      circuitsCount: detailedInputs.circuitsCount,
      depth: detailedInputs.depth,
      soilResistivity: detailedInputs.soilResistivity
    });
  }, [detailedInputs, formData.insulation, formData.install_method]);

  // Sync detailed derating factor to formData.derate when in detailed mode
  useEffect(() => {
    if (deratingMode === 'detailed') {
      updateField('derate', detailedDeratingResult.kTotal);
    }
  }, [deratingMode, detailedDeratingResult.kTotal]);

  // 2. Core Panel Sizing Calculations via @panel-analyzer/engine
  const is3Phase = formData.system_type !== '1p';
  const calculationResults = useMemo(() => {
    const currentResult = calculateDesignCurrent(
      effectiveIncomerLoad,
      'kva',
      formData.voltage,
      is3Phase,
      formData.pf,
      1.0,
      false
    );

    const I_required = calculateRequiredBreaker(currentResult.Ib, 1.25);
    const In = selectStandardBreaker(I_required);

    const effectiveK = deratingMode === 'detailed'
      ? detailedDeratingResult.kTotal
      : applyCorrectionFactors(formData.derate);

    const tableKey = getCableTableKey(
      formData.conductor as any,
      formData.insulation as any,
      formData.cable_form as any,
      formData.system_type as any
    );

    const targetRuns = formData.parallel_runs && formData.parallel_runs >= 1 ? formData.parallel_runs : undefined;

    const parallelCableResult = selectParallelCableWithVdrop(
      tableKey,
      In,
      effectiveK,
      formData.install_method as any,
      formData.cable_length,
      currentResult.Ib,
      formData.voltage,
      is3Phase,
      formData.conductor as any,
      formData.insulation as any,
      formData.pf,
      formData.vdrop_max,
      targetRuns
    );

    const cable = parallelCableResult ? parallelCableResult.cable : null;
    const runs = parallelCableResult ? parallelCableResult.runs : 1;
    const vDrop = parallelCableResult ? parallelCableResult.vDrop : null;
    const Iz_corrected = parallelCableResult ? parallelCableResult.totalAmpacity : 0;

    const protCheck = checkProtection(currentResult.Ib, In, Iz_corrected);

    const scCheck = checkShortCircuit(
      cable ? cable.size : 0,
      formData.isc,
      formData.fclear,
      formData.conductor as any,
      formData.insulation as any
    );

    const cores = formData.system_type === '1p' ? 2 : (formData.system_type === '3pn' ? 4 : 3);
    const numRuns = formData.cable_form === 'single' ? cores * runs : runs;
    const conduit = cable ? selectConduit(cable.dia, numRuns) : null;

    const neutralSize = cable ? calculateNeutral(cable.size, formData.system_type as any) : 0;
    const eccSize = cable ? calculateEarth(cable.size) : 0;

    const cadTag = generateCableTag(
      cable,
      cores,
      formData.conductor as any,
      formData.cable_form as any,
      formData.insulation as any,
      formData.system_type as any,
      runs
    );

    return {
      currentResult,
      I_required,
      In,
      Ktotal: effectiveK,
      Iz_required: calculateCableRequirement(In, effectiveK),
      cable,
      runs,
      vDrop,
      Iz_corrected,
      protCheck,
      scCheck,
      conduit,
      neutral: neutralSize,
      ecc: eccSize,
      cadTag
    };
  }, [formData, is3Phase, effectiveIncomerLoad, deratingMode, detailedDeratingResult]);

  // Printable report data bundle
  const printCalcData: PanelCalculationResult = useMemo(() => ({
    Ib: calculationResults.currentResult.Ib,
    In: calculationResults.In,
    cable: calculationResults.cable ? {
      size: calculationResults.cable.size,
      ampacity: calculationResults.cable.ampacity,
      dia: calculationResults.cable.dia
    } : null,
    vdrop: calculationResults.vDrop ? {
      vDrop: calculationResults.vDrop.dropV,
      vDropPct: calculationResults.vDrop.dropPct
    } : null,
    coord: {
      pass: calculationResults.protCheck.pass,
      Ib: calculationResults.protCheck.Ib,
      In: calculationResults.protCheck.In,
      Iz: calculationResults.protCheck.Iz
    },
    sc: calculationResults.scCheck ? {
      pass: calculationResults.scCheck.pass,
      Smin: calculationResults.scCheck.Smin,
      k: calculationResults.scCheck.k
    } : null,
    conduit: calculationResults.conduit ? {
      size: calculationResults.conduit.size,
      fillPct: calculationResults.conduit.fillPct
    } : null,
    neutral: calculationResults.neutral,
    ecc: calculationResults.ecc,
    tag: calculationResults.cadTag.full
  }), [calculationResults]);

  // Single Line Diagram (SLD) Data Preparation
  const sldPanel: SldPanel = useMemo(() => {
    const parentPanel = allPanels.find(p => p.id === formData.fed_from_id);
    return {
      name: formData.name,
      panelType: formData.panel_type || 'Distribution Board',
      systemType: formData.system_type,
      voltage: formData.voltage,
      frequencyHz: 50,
      incomerBreaker: calculationResults.In,
      incomerPoles: formData.system_type.includes('3') ? '4P' : '2P',
      incomerCableTag: calculationResults.cadTag?.full,
      busbarRatingAmps: Math.max(calculationResults.In, 100),
      iscKa: formData.isc || 10,
      fedFrom: parentPanel ? parentPanel.name : 'Main Utility / Transformer'
    };
  }, [formData, calculationResults, allPanels]);

  const sldCircuits: SldCircuit[] = useMemo(() => {
    return circuits.map((c, idx) => {
      const is3P = c.phase === '3P';
      const cVolt = is3P ? formData.voltage : 220;
      let curr = calculateDesignCurrent(c.load_val || 0, c.load_unit as any, cVolt, is3P, c.pf || 0.9);
      let breaker = selectStandardBreaker(curr.Ib * 1.25);
      let starterType = c.starter_type;

      if (c.load_type === 'motor') {
        const motorSizing = calculateMotorCircuit({
          motorLoad: c.load_val,
          unit: c.load_unit as any,
          voltage: cVolt,
          isThreePhase: is3P,
          powerFactor: c.pf || 0.85
        });
        curr = { ...curr, Ib: motorSizing.fla };
        breaker = motorSizing.ocpdBreaker;
        starterType = motorSizing.recommendedStarter;
      }

      const cond = (c.conductor || 'cu') as any;
      const insul = (c.insulation || 'xlpe') as any;
      const method = (c.install_method || 'air') as any;
      const tableKey = getCableTableKey(cond, insul, 'multi', is3P ? '3pn' : '1p');

      const parallelRes = selectParallelCableWithVdrop(
        tableKey,
        breaker,
        0.80,
        method,
        c.length_m || 20,
        curr.Ib,
        cVolt,
        is3P,
        cond,
        insul,
        c.pf || 0.9,
        formData.vdrop_max
      );

      const cableSize = parallelRes?.cable.size ?? 2.5;
      const runs = parallelRes?.runs ?? 1;
      const cores = is3P ? 4 : 3;
      const cableTag = parallelRes?.cable
        ? generateCableTag(parallelRes.cable, cores, cond, 'multi', insul, is3P ? '3pn' : '1p', runs).full
        : `${runs > 1 ? runs + 'x(' : ''}${cores}x${cableSize}mm² ${cond.toUpperCase()}/${insul.toUpperCase()}`;

      return {
        circuitNumber: c.circuit_number || (idx + 1),
        name: c.name || `Circuit ${idx + 1}`,
        loadType: (c.load_type || 'other') as any,
        loadVal: c.load_val || 0,
        loadUnit: c.load_unit || 'kW',
        pf: c.pf || 0.9,
        phase: c.phase || '1P',
        lengthM: c.length_m || 20,
        breakerRating: breaker,
        breakerPoles: is3P ? '3P' : '1P',
        breakerCurve: c.load_type === 'motor' ? 'D' : 'C',
        cableTag,
        vdropPct: parallelRes?.vDrop?.dropPct,
        starterType
      };
    });
  }, [circuits, formData.voltage, formData.vdrop_max]);

  const sldTitleBlock: SldTitleBlock = useMemo(() => ({
    projectName: project?.name || 'ELECTRICAL DISTRIBUTION PROJECT',
    projectCode: project?.code || 'P-001',
    client: project?.client || 'N/A',
    engineer: project?.engineer || 'Lead Electrical Engineer',
    panelName: formData.name,
    dateStr: new Date().toISOString().slice(0, 10),
    revision: '01',
    drawingTitle: `SINGLE LINE DIAGRAM - ${formData.name}`,
    scale: 'N.T.S.'
  }), [project, formData.name]);

  // Full Branch Circuit Schedule Calculations for Reports & Excel
  const calculatedCircuits = useMemo(() => {
    return circuits.map((c, idx) => {
      const is3P = c.phase === '3P';
      const cVolt = is3P ? formData.voltage : 220;
      let curr = calculateDesignCurrent(c.load_val || 0, c.load_unit as any, cVolt, is3P, c.pf || 0.9);
      let breaker = selectStandardBreaker(curr.Ib * 1.25);

      if (c.load_type === 'motor') {
        const motorSizing = calculateMotorCircuit({
          motorLoad: c.load_val,
          unit: c.load_unit as any,
          voltage: cVolt,
          isThreePhase: is3P,
          powerFactor: c.pf || 0.85
        });
        curr = { ...curr, Ib: motorSizing.fla };
        breaker = motorSizing.ocpdBreaker;
      }

      const cond = (c.conductor || 'cu') as any;
      const insul = (c.insulation || 'xlpe') as any;
      const method = (c.install_method || 'air') as any;
      const tableKey = getCableTableKey(cond, insul, 'multi', is3P ? '3pn' : '1p');

      const parallelRes = selectParallelCableWithVdrop(
        tableKey,
        breaker,
        0.80,
        method,
        c.length_m || 20,
        curr.Ib,
        cVolt,
        is3P,
        cond,
        insul,
        c.pf || 0.9,
        formData.vdrop_max
      );

      const cableSize = parallelRes?.cable.size ?? 2.5;
      const runs = parallelRes?.runs ?? 1;
      const cableDisplay = runs > 1 ? `${runs}x${cableSize}` : `${cableSize}`;
      const totalAmpacity = parallelRes?.totalAmpacity ?? 20;

      const protCheck = checkProtection(curr.Ib, breaker, totalAmpacity);
      const vDrop = parallelRes?.vDrop || { dropV: 0 as any, dropPct: 0 as any, pass: true };

      return {
        ...c,
        circuit_number: c.circuit_number || (idx + 1),
        Ib: curr.Ib,
        breaker,
        cableSize,
        runs,
        cableDisplay,
        totalAmpacity,
        vDropPct: vDrop.dropPct,
        vDropPass: vDrop.pass,
        protPass: protCheck.pass,
        connectedKva: curr.connectedKva
      };
    });
  }, [circuits, formData.voltage, formData.vdrop_max]);

  // One-Click Multi-Sheet Excel Download Handler
  const handleDownloadExcel = () => {
    const boq = calculatePanelBoq(
      {
        name: formData.name,
        systemType: formData.system_type,
        voltage: formData.voltage,
        incomerBreaker: calculationResults.In,
        incomerPoles: formData.system_type.includes('3') ? '4P' : '2P',
        incomerCableTag: calculationResults.cadTag?.full,
        incomerLengthM: formData.cable_length,
        incomerConduitSize: calculationResults.conduit?.size
      },
      calculatedCircuits.map(c => ({
        circuitNumber: c.circuit_number,
        name: c.name,
        loadType: c.load_type,
        phase: c.phase,
        lengthM: c.length_m || 20,
        breakerRating: c.breaker || 20,
        breakerPoles: c.phase === '3P' ? '3P' : '1P',
        cableTag: `${c.runs > 1 ? c.runs + 'x(' : ''}${c.phase === '3P' ? '4' : '3'}x${c.cableSize}mm² ${(c.conductor || 'Cu').toUpperCase()}/${(c.insulation || 'XLPE').toUpperCase()}`,
        cableSize: c.cableSize,
        conductor: c.conductor,
        insulation: c.insulation,
        conduitSize: c.phase === '3P' ? 32 : 20
      }))
    );

    const xml = generateExcelWorkbookXml({
      project,
      panel: formData,
      circuits,
      calculatedCircuits,
      boq,
      settings: settings || {}
    });

    const blob = new Blob([xml], { type: 'application/vnd.ms-excel;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${formData.name.replace(/\s+/g, '_')}_Schedule_BOQ.xls`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleAddDefaultCircuit = () => {
    const nextNum = circuits.length + 1;
    const phaseOrder = ['L1', 'L2', 'L3'];
    const phase = phaseOrder[(nextNum - 1) % 3];
    onAddCircuit({
      panel_id: panel.id,
      circuit_number: nextNum,
      name: `Circuit-${nextNum}`,
      load_val: 3.5,
      load_unit: 'kva',
      pf: 0.9,
      phase,
      length_m: 25,
      conductor: 'cu',
      insulation: 'xlpe',
      load_type: 'socket',
      install_method: 'air',
      cable_type: 'cu_xlpe',
      starter_type: 'dol'
    });
  };

  const feedingCandidates = allPanels.filter(p => p.id !== panel.id);

  return (
    <div style={{ padding: '24px 32px', height: '100%', overflowY: 'auto' }}>
      {/* Top Header & Actions */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div style={{ fontFamily: 'var(--mono)', fontSize: '11px', color: 'var(--teal)', letterSpacing: '1px', textTransform: 'uppercase' }}>
            {t.panels} — {project?.name || 'Project Workspace'}
          </div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text)', marginTop: '2px' }}>
            {formData.name}
          </h1>
        </div>

        <div className="toolbar-actions" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            fontSize: '11.5px',
            fontFamily: 'var(--mono)',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            color: saveStatus === 'saved' ? 'var(--teal)' : 'var(--amber)',
            marginRight: '8px'
          }}>
            {saveStatus === 'saved' ? <CheckCircle2 size={14} /> : <RefreshCw size={14} className="spin" />}
            <span>{saveStatus === 'saved' ? t.saved : t.saving}</span>
          </div>

          <button
            className="btn secondary"
            onClick={handleDownloadExcel}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 12px', fontSize: '12px' }}
            title="Download multi-tab Excel workbook with formulas"
          >
            <FileSpreadsheet size={14} color="#047857" />
            <span>Excel (.xlsx)</span>
          </button>

          <button
            className="btn secondary"
            onClick={() => setShowPrintModal(true)}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 12px', fontSize: '12px' }}
          >
            <Printer size={14} />
            <span>{t.exportReport}</span>
          </button>

          <button
            className="btn"
            onClick={() => setShowSldModal(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '7px 14px',
              fontSize: '12px',
              background: '#0D9488',
              color: 'white',
              border: '1px solid #14B8A6',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            <Layers size={14} />
            <span>{t.singleLineDiagram}</span>
          </button>
        </div>
      </div>

      {/* Hierarchy Feed Banner */}
      <div className="card" style={{ background: 'var(--panel-2)', border: '1px solid var(--grid)', padding: '10px 14px', marginBottom: '14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <GitFork size={16} color="var(--amber)" />
          <div style={{ fontSize: '12px' }}>
            <span style={{ color: 'var(--text-dim)' }}>Distribution Source (Fed From): </span>
            <select
              value={formData.fed_from_id || ''}
              onChange={e => updateField('fed_from_id', e.target.value ? e.target.value : null)}
              style={{
                background: 'var(--panel)',
                border: '1px solid var(--grid)',
                color: 'var(--amber)',
                fontWeight: 600,
                padding: '3px 8px',
                borderRadius: '3px',
                marginLeft: '6px'
              }}
            >
              <option value="">Utility Transformer / Main Incomer (MDB)</option>
              {feedingCandidates.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
        </div>

        {inheritedLoadKva > 0 && (
          <div style={{ fontSize: '11.5px', fontFamily: 'var(--mono)', color: 'var(--teal)' }}>
            Direct Demand: <strong>{demandSummary.totalDemandKva.toFixed(1)} kVA</strong> + Downstream Sub-panels: <strong>{inheritedLoadKva.toFixed(1)} kVA</strong> = Incomer Total: <strong>{effectiveIncomerLoad.toFixed(1)} kVA</strong>
          </div>
        )}
      </div>

      {/* Top Hero Cards */}
      <div className="hero-grid">
        <div className="hero-box">
          <div className="lbl">Incomer Design Current (Ib)</div>
          <div className="val">{calculationResults.currentResult.Ib.toFixed(1)}<span className="u"> A</span></div>
        </div>
        <div className="hero-box">
          <div className="lbl">Main Breaker (In)</div>
          <div className="val">{calculationResults.In}<span className="u"> A</span></div>
        </div>
        <div className="hero-box">
          <div className="lbl">Selected Feeder Cable</div>
          <div className="val">
            {calculationResults.cable ? `${calculationResults.runs > 1 ? calculationResults.runs + 'x' : ''}${calculationResults.cable.size}` : '—'}
            <span className="u"> mm²</span>
          </div>
        </div>
        <div className="hero-box">
          <div className="lbl">Incomer Voltage Drop</div>
          <div
            className="val"
            style={{ color: calculationResults.vDrop && calculationResults.vDrop.pass ? 'var(--success)' : 'var(--danger)' }}
          >
            {calculationResults.vDrop ? calculationResults.vDrop.dropPct.toFixed(2) : '—'}<span className="u"> %</span>
          </div>
        </div>
      </div>

      {/* AutoCAD Drawing Tag Card */}
      {calculationResults.cable && (
        <div className="card cad-tag-box" style={{ background: 'rgba(20,24,33,0.95)', border: '1.5px solid var(--teal)', margin: '14px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <div style={{ fontFamily: 'var(--mono)', fontSize: '11px', color: 'var(--teal)', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase' }}>
              {t.autoCadTag}
            </div>
            <button
              className="btn teal"
              onClick={() => onCopyText(calculationResults.cadTag.full)}
              style={{ padding: '4px 10px', fontSize: '11.5px', display: 'flex', alignItems: 'center', gap: '5px' }}
            >
              <Copy size={13} />
              <span>{t.copyTag}</span>
            </button>
          </div>
          <div style={{
            background: '#0c1017',
            padding: '12px 14px',
            borderRadius: '4px',
            border: '1px solid rgba(0,210,180,0.3)',
            fontFamily: 'Courier New, monospace',
            fontSize: '14.5px',
            color: '#20e8a2',
            whiteSpace: 'pre-wrap',
            fontWeight: 600,
            direction: 'ltr',
            textAlign: 'left'
          }}>
            {calculationResults.cadTag.full}
          </div>
        </div>
      )}

      {/* Editable Demand Factors Section */}
      <DemandFactorsEditor
        factors={demandConfig}
        summary={demandSummary}
        onUpdateFactors={(updated) => updateField('demand_factors', JSON.stringify(updated))}
      />

      {/* Grid Inputs: Panel Config & Feeder Parameters */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '14px' }}>
        {/* Panel Electrical Data */}
        <div className="card">
          <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--amber)', marginBottom: '12px' }}>
            {t.system} &amp; Electrical Specs
          </div>

          <div style={{ marginBottom: '12px' }}>
            <label style={{ fontSize: '12px', color: 'var(--text-dim)', display: 'block', marginBottom: '6px' }}>{t.panelType}</label>
            <div className="toggle-row">
              {(['lighting', 'power', 'ac', 'motors'] as const).map(pType => (
                <button
                  key={pType}
                  type="button"
                  className={`toggle-btn ${formData.panel_type === pType ? 'active' : ''}`}
                  onClick={() => updateField('panel_type', pType)}
                >
                  {pType.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: '12px' }}>
            <label style={{ fontSize: '12px', color: 'var(--text-dim)', display: 'block', marginBottom: '6px' }}>{t.system}</label>
            <div className="toggle-row">
              {(['1p', '3pn', '3p'] as const).map(s => (
                <button
                  key={s}
                  type="button"
                  className={`toggle-btn ${formData.system_type === s ? 'active' : ''}`}
                  onClick={() => {
                    updateField('system_type', s);
                    updateField('voltage', s === '1p' ? 230 : 380);
                  }}
                >
                  {s === '1p' ? '1P+N (230V)' : s === '3pn' ? '3P+N (380V)' : '3P (380V)'}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
            <div className="field">
              <label>System Voltage <span className="unit">(V)</span></label>
              <input
                type="number"
                value={formData.voltage}
                onChange={e => updateField('voltage', parseFloat(e.target.value) || 0)}
              />
            </div>
            <div className="field">
              <label>{t.powerFactor}</label>
              <input
                type="number"
                step="0.01"
                min="0.5"
                max="1"
                value={formData.pf}
                onChange={e => updateField('pf', parseFloat(e.target.value) || 0.85)}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div className="field">
              <label>Parallel Cable Runs (N)</label>
              <select
                value={formData.parallel_runs || 1}
                onChange={e => updateField('parallel_runs', parseInt(e.target.value) || 1)}
                style={{ background: 'var(--panel-2)', border: '1px solid var(--grid)', color: 'var(--amber)', fontWeight: 600, padding: '8px' }}
              >
                <option value={1}>1 Run (Single Cable)</option>
                <option value={2}>2 Parallel Runs (2x)</option>
                <option value={3}>3 Parallel Runs (3x)</option>
                <option value={4}>4 Parallel Runs (4x)</option>
              </select>
            </div>
            <div className="field">
              <label>Max Vdrop <span className="unit">(%)</span></label>
              <input
                type="number"
                step="0.5"
                value={formData.vdrop_max}
                onChange={e => updateField('vdrop_max', parseFloat(e.target.value) || 3.0)}
              />
            </div>
          </div>
        </div>

        {/* Cable & Laying Specs */}
        <div className="card">
          <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--teal)', marginBottom: '12px' }}>
            Feeder Conductor &amp; Installation
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
            <div>
              <label style={{ fontSize: '12px', color: 'var(--text-dim)', display: 'block', marginBottom: '6px' }}>{t.conductor}</label>
              <div className="toggle-row">
                <button
                  type="button"
                  className={`toggle-btn ${formData.conductor === 'cu' ? 'active' : ''}`}
                  onClick={() => updateField('conductor', 'cu')}
                >
                  {t.copper}
                </button>
                <button
                  type="button"
                  className={`toggle-btn ${formData.conductor === 'al' ? 'active' : ''}`}
                  onClick={() => updateField('conductor', 'al')}
                >
                  {t.aluminium}
                </button>
              </div>
            </div>

            <div>
              <label style={{ fontSize: '12px', color: 'var(--text-dim)', display: 'block', marginBottom: '6px' }}>{t.insulation}</label>
              <div className="toggle-row">
                <button
                  type="button"
                  className={`toggle-btn ${formData.insulation === 'xlpe' ? 'active' : ''}`}
                  onClick={() => updateField('insulation', 'xlpe')}
                >
                  XLPE (90°C)
                </button>
                <button
                  type="button"
                  className={`toggle-btn ${formData.insulation === 'pvc' ? 'active' : ''}`}
                  onClick={() => updateField('insulation', 'pvc')}
                >
                  PVC (70°C)
                </button>
              </div>
            </div>
          </div>

          <div style={{ marginBottom: '12px' }}>
            <label style={{ fontSize: '12px', color: 'var(--text-dim)', display: 'block', marginBottom: '6px' }}>{t.construction}</label>
            <div className="toggle-row">
              <button
                type="button"
                className={`toggle-btn ${formData.cable_form === 'single' ? 'active' : ''}`}
                onClick={() => updateField('cable_form', 'single')}
              >
                {t.singleCore}
              </button>
              <button
                type="button"
                className={`toggle-btn ${formData.cable_form === 'multi' ? 'active' : ''}`}
                onClick={() => updateField('cable_form', 'multi')}
              >
                {t.multicoreUnarmoured}
              </button>
              <button
                type="button"
                className={`toggle-btn ${formData.cable_form === 'armoured' ? 'active' : ''}`}
                onClick={() => updateField('cable_form', 'armoured')}
              >
                {t.multicoreArmoured}
              </button>
            </div>
          </div>

          <div style={{ marginBottom: '12px' }}>
            <label style={{ fontSize: '12px', color: 'var(--text-dim)', display: 'block', marginBottom: '6px' }}>{t.installation}</label>
            <div className="toggle-row">
              <button
                type="button"
                className={`toggle-btn ${formData.install_method === 'ground' ? 'active' : ''}`}
                onClick={() => updateField('install_method', 'ground')}
              >
                {t.directBuried}
              </button>
              <button
                type="button"
                className={`toggle-btn ${formData.install_method === 'duct' ? 'active' : ''}`}
                onClick={() => updateField('install_method', 'duct')}
              >
                {t.inDuct}
              </button>
              <button
                type="button"
                className={`toggle-btn ${formData.install_method === 'air' ? 'active' : ''}`}
                onClick={() => updateField('install_method', 'air')}
              >
                {t.freeAir}
              </button>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
            <div className="field">
              <label>{t.cableLength}</label>
              <input
                type="number"
                value={formData.cable_length}
                onChange={e => updateField('cable_length', parseFloat(e.target.value) || 0)}
              />
            </div>
            <div className="field">
              <label>Prospective Fault Isc (kA)</label>
              <input
                type="number"
                value={formData.isc || 10}
                onChange={e => updateField('isc', parseFloat(e.target.value) || 10)}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Detailed Derating Section */}
      <div className="card" style={{ marginTop: '14px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--amber)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Settings2 size={16} />
            <span>{t.deratingMode}</span>
          </div>
          <div className="toggle-row" style={{ width: 'auto', margin: 0 }}>
            <button
              type="button"
              className={`toggle-btn ${deratingMode === 'manual' ? 'active' : ''}`}
              onClick={() => setDeratingMode('manual')}
              style={{ minWidth: '120px' }}
            >
              {t.manualDerating}
            </button>
            <button
              type="button"
              className={`toggle-btn ${deratingMode === 'detailed' ? 'active' : ''}`}
              onClick={() => setDeratingMode('detailed')}
              style={{ minWidth: '150px' }}
            >
              {t.detailedDerating}
            </button>
          </div>
        </div>

        {deratingMode === 'manual' ? (
          <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: '14px', alignItems: 'center' }}>
            <div className="field">
              <label>K_total (0.2–1.0)</label>
              <input
                type="number"
                step="0.05"
                value={formData.derate}
                onChange={e => updateField('derate', parseFloat(e.target.value) || 0.8)}
              />
            </div>
            <div style={{ color: 'var(--text-dim)', fontSize: '12px', lineHeight: 1.6 }}>
              Direct overall correction factor per IEC 60364-4-43 / Elsewedy standard laying assumptions (Default: 0.80).
            </div>
          </div>
        ) : (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '12px' }}>
              <div className="field">
                <label>{t.ambientTemp}</label>
                <input
                  type="number"
                  step="5"
                  value={detailedInputs.ambientTemp}
                  onChange={e => setDetailedInputs(prev => ({ ...prev, ambientTemp: parseFloat(e.target.value) || 30 }))}
                />
              </div>
              <div className="field">
                <label>{t.circuitsCount}</label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={detailedInputs.circuitsCount}
                  onChange={e => setDetailedInputs(prev => ({ ...prev, circuitsCount: parseInt(e.target.value) || 1 }))}
                />
              </div>
              <div className="field">
                <label>{t.burialDepth}</label>
                <input
                  type="number"
                  step="0.1"
                  value={detailedInputs.depth}
                  disabled={formData.install_method === 'air'}
                  onChange={e => setDetailedInputs(prev => ({ ...prev, depth: parseFloat(e.target.value) || 0.7 }))}
                />
              </div>
              <div className="field">
                <label>{t.soilResistivity}</label>
                <input
                  type="number"
                  step="0.1"
                  value={detailedInputs.soilResistivity}
                  disabled={formData.install_method === 'air'}
                  onChange={e => setDetailedInputs(prev => ({ ...prev, soilResistivity: parseFloat(e.target.value) || 1.5 }))}
                />
              </div>
            </div>

            <div style={{
              background: 'var(--panel-2)',
              padding: '10px 14px',
              borderRadius: '4px',
              fontFamily: 'var(--mono)',
              fontSize: '12px',
              color: 'var(--teal)',
              display: 'flex',
              gap: '16px',
              flexWrap: 'wrap'
            }}>
              <div>k_temp: <strong>{detailedDeratingResult.kTemp}</strong></div>
              <div>k_group: <strong>{detailedDeratingResult.kGroup}</strong></div>
              {formData.install_method !== 'air' && (
                <>
                  <div>k_depth: <strong>{detailedDeratingResult.kDepth}</strong></div>
                  <div>k_soil: <strong>{detailedDeratingResult.kSoil}</strong></div>
                </>
              )}
              <div style={{ color: 'var(--amber)', fontWeight: 700 }}>
                K_total = <strong>{detailedDeratingResult.kTotal}</strong>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Comprehensive Panel Schedule Editor with motor inspections, badges, and CSV export */}
      <PanelScheduleEditor
        panelName={formData.name}
        voltage={formData.voltage}
        maxVdropPct={formData.vdrop_max}
        circuits={circuits}
        onAddCircuit={handleAddDefaultCircuit}
        onUpdateCircuit={onUpdateCircuit}
        onDeleteCircuit={onDeleteCircuit}
      />

      {/* Printable Report Modal */}
      {showPrintModal && (
        <PrintableReportModal
          project={project}
          panel={formData}
          calc={printCalcData}
          circuits={circuits}
          calculatedCircuits={calculatedCircuits}
          settings={settings || {}}
          initialLang={lang}
          onClose={() => setShowPrintModal(false)}
        />
      )}

      {/* Single Line Diagram (SLD) Interactive Modal */}
      {showSldModal && (
        <SingleLineDiagramModal
          panelData={sldPanel}
          circuitsData={sldCircuits}
          titleBlockData={sldTitleBlock}
          lang={lang}
          onClose={() => setShowSldModal(false)}
        />
      )}
    </div>
  );
};
