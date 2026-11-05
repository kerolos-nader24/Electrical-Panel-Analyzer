import React, { useState, useMemo } from 'react';
import {
  calculateDesignCurrent,
  calculateRequiredBreaker,
  selectStandardBreaker,
  selectParallelCableWithVdrop,
  getCableTableKey,
  checkProtection
} from '@panel-analyzer/engine';
import { Plus, Trash2, Download, AlertTriangle, CheckCircle, XCircle, Settings, Cpu } from 'lucide-react';
import type { CircuitRecord } from '../../electron/db.js';
import { MotorDetailsModal } from './MotorDetailsModal.js';
import { exportPanelScheduleToCsv, type CircuitExportRow } from '../utils/csvExport.js';

interface Props {
  panelName: string;
  voltage: number;
  maxVdropPct: number;
  circuits: CircuitRecord[];
  onAddCircuit: () => void;
  onUpdateCircuit: (id: string, updates: Partial<CircuitRecord>) => void;
  onDeleteCircuit: (id: string) => void;
}

export const PanelScheduleEditor: React.FC<Props> = ({
  panelName,
  voltage,
  maxVdropPct,
  circuits,
  onAddCircuit,
  onUpdateCircuit,
  onDeleteCircuit
}) => {
  const [selectedMotorCircuit, setSelectedMotorCircuit] = useState<CircuitRecord | null>(null);

  // Compute all circuits live via pure @panel-analyzer/engine functions
  const calculatedRows = useMemo(() => {
    return circuits.map((c, idx) => {
      const is3P = c.phase === '3P';
      const cVolt = is3P ? voltage : 230;

      // 1. Current calculation
      const curr = calculateDesignCurrent(c.load_val, c.load_unit, cVolt, is3P, c.pf || 0.9, 1.0, false);
      const reqB = calculateRequiredBreaker(curr.Ib, 1.25);
      const breaker = selectStandardBreaker(reqB);

      // 2. Cable selection (with parallel support if needed)
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
        maxVdropPct
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
  }, [circuits, voltage, maxVdropPct]);

  // Overall Phase Balancing
  const phaseStats = useMemo(() => {
    let l1 = 0;
    let l2 = 0;
    let l3 = 0;

    calculatedRows.forEach(r => {
      const kva = r.connectedKva;
      if (r.phase === 'L1') l1 += kva;
      else if (r.phase === 'L2') l2 += kva;
      else if (r.phase === 'L3') l3 += kva;
      else {
        l1 += kva / 3;
        l2 += kva / 3;
        l3 += kva / 3;
      }
    });

    const avg = (l1 + l2 + l3) / 3;
    const maxDev = Math.max(Math.abs(l1 - avg), Math.abs(l2 - avg), Math.abs(l3 - avg));
    const imbalancePct = avg > 0 ? (maxDev / avg) * 100 : 0;

    return {
      l1Kva: l1,
      l2Kva: l2,
      l3Kva: l3,
      totalKva: l1 + l2 + l3,
      imbalancePct
    };
  }, [calculatedRows]);

  // Validation Warnings Check
  const warnings = useMemo(() => {
    const list: string[] = [];
    if (phaseStats.imbalancePct > 10) {
      list.push(`High Phase Imbalance: ${phaseStats.imbalancePct.toFixed(1)}% (> 10% limit). Rebalance loads across L1, L2, and L3.`);
    }

    const failedVdrop = calculatedRows.filter(r => !r.vDropPass);
    if (failedVdrop.length > 0) {
      list.push(`Voltage Drop exceeded on ${failedVdrop.length} circuit(s): ${failedVdrop.map(r => r.name).join(', ')}.`);
    }

    const failedProt = calculatedRows.filter(r => !r.protPass);
    if (failedProt.length > 0) {
      list.push(`Overload protection coordination check (Ib ≤ In ≤ Iz) failed on ${failedProt.length} circuit(s): ${failedProt.map(r => r.name).join(', ')}.`);
    }

    return list;
  }, [phaseStats, calculatedRows]);

  const handleDownloadCsv = () => {
    const rows: CircuitExportRow[] = calculatedRows.map(r => ({
      circuitNumber: r.circuit_number,
      name: r.name,
      phase: r.phase,
      loadVal: r.load_val,
      loadUnit: r.load_unit,
      pf: r.pf,
      lengthM: r.length_m,
      breakerA: r.breaker,
      cableMm2: r.cableSize
    }));

    exportPanelScheduleToCsv(panelName, rows, phaseStats);
  };

  return (
    <div style={{ marginTop: '14px' }}>
      {/* Top Warning Banner if any check fails */}
      {warnings.length > 0 && (
        <div className="warn" style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '14px' }}>
          {warnings.map((w, idx) => (
            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertTriangle size={15} color="var(--danger)" />
              <span>{w}</span>
            </div>
          ))}
        </div>
      )}

      {/* Schedule Actions & Balancing Summary */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '10px' }}>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--teal)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Branch Circuits Schedule ({calculatedRows.length})
          </span>
          <span style={{
            fontSize: '11px',
            fontFamily: 'var(--mono)',
            padding: '2px 8px',
            borderRadius: '3px',
            background: phaseStats.imbalancePct > 10 ? 'rgba(209,96,61,0.2)' : 'rgba(79,179,169,0.15)',
            color: phaseStats.imbalancePct > 10 ? 'var(--danger)' : 'var(--teal)'
          }}>
            Imbalance: {phaseStats.imbalancePct.toFixed(1)}% {phaseStats.imbalancePct > 10 ? '(FAIL)' : '(PASS)'}
          </span>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn secondary" onClick={handleDownloadCsv} style={{ padding: '5px 10px', fontSize: '11.5px', display: 'flex', alignItems: 'center', gap: '5px' }}>
            <Download size={13} />
            <span>Download CSV</span>
          </button>
          <button className="btn teal" onClick={onAddCircuit} style={{ padding: '5px 12px', fontSize: '11.5px', display: 'flex', alignItems: 'center', gap: '5px' }}>
            <Plus size={13} />
            <span>+ Add Circuit</span>
          </button>
        </div>
      </div>

      {/* Phase load pills */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '8px', marginBottom: '12px' }}>
        <div className="hero-box" style={{ padding: '6px 10px', textAlign: 'left' }}>
          <div className="lbl" style={{ marginBottom: '2px' }}>Phase L1 Load</div>
          <div className="val" style={{ fontSize: '16px' }}>{phaseStats.l1Kva.toFixed(1)}<span className="u"> kVA</span></div>
        </div>
        <div className="hero-box" style={{ padding: '6px 10px', textAlign: 'left' }}>
          <div className="lbl" style={{ marginBottom: '2px' }}>Phase L2 Load</div>
          <div className="val" style={{ fontSize: '16px' }}>{phaseStats.l2Kva.toFixed(1)}<span className="u"> kVA</span></div>
        </div>
        <div className="hero-box" style={{ padding: '6px 10px', textAlign: 'left' }}>
          <div className="lbl" style={{ marginBottom: '2px' }}>Phase L3 Load</div>
          <div className="val" style={{ fontSize: '16px' }}>{phaseStats.l3Kva.toFixed(1)}<span className="u"> kVA</span></div>
        </div>
        <div className="hero-box" style={{ padding: '6px 10px', textAlign: 'left' }}>
          <div className="lbl" style={{ marginBottom: '2px' }}>Total Connected</div>
          <div className="val" style={{ fontSize: '16px', color: 'var(--amber)' }}>{phaseStats.totalKva.toFixed(1)}<span className="u"> kVA</span></div>
        </div>
      </div>

      {/* Main Circuits Schedule DataGrid with all requested columns */}
      <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: 'var(--panel-2)', borderBottom: '1px solid var(--grid)', color: 'var(--text-dim)', fontFamily: 'var(--mono)' }}>
              <th style={{ padding: '8px 10px' }}>#</th>
              <th style={{ padding: '8px 10px' }}>Circuit Description</th>
              <th style={{ padding: '8px 10px' }}>Type</th>
              <th style={{ padding: '8px 10px' }}>Load &amp; Unit</th>
              <th style={{ padding: '8px 10px' }}>PF</th>
              <th style={{ padding: '8px 10px' }}>Phase</th>
              <th style={{ padding: '8px 10px' }}>Length (m)</th>
              <th style={{ padding: '8px 10px' }}>Install</th>
              <th style={{ padding: '8px 10px' }}>Cable Type</th>
              <th style={{ padding: '8px 10px' }}>Ib (A)</th>
              <th style={{ padding: '8px 10px' }}>Breaker</th>
              <th style={{ padding: '8px 10px' }}>Cable (mm²)</th>
              <th style={{ padding: '8px 10px' }}>ΔV %</th>
              <th style={{ padding: '8px 10px' }}>Protection</th>
              <th style={{ padding: '8px 10px' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {calculatedRows.length === 0 ? (
              <tr>
                <td colSpan={15} style={{ padding: '24px', textAlign: 'center', color: 'var(--text-dim)' }}>
                  No branch circuits on this panel yet. Click "+ Add Circuit" above.
                </td>
              </tr>
            ) : (
              calculatedRows.map((c, idx) => {
                const cableTypeVal = `${c.conductor || 'cu'}_${c.insulation || 'xlpe'}`;
                return (
                  <tr key={c.id} style={{ borderBottom: '1px solid var(--grid)' }}>
                    <td style={{ padding: '6px 10px', color: 'var(--text-dim)', fontFamily: 'var(--mono)' }}>{idx + 1}</td>
                    <td style={{ padding: '6px 10px' }}>
                      <input
                        style={{ width: '120px', background: 'transparent', border: '1px solid var(--grid)', color: 'var(--text)', padding: '3px 6px', borderRadius: '3px', fontSize: '11.5px' }}
                        value={c.name}
                        onChange={e => onUpdateCircuit(c.id, { name: e.target.value })}
                      />
                    </td>
                    <td style={{ padding: '6px 10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <select
                          value={c.load_type || 'socket'}
                          onChange={e => onUpdateCircuit(c.id, { load_type: e.target.value })}
                          style={{ background: 'var(--panel-2)', border: '1px solid var(--grid)', color: 'var(--teal)', padding: '2px 4px', borderRadius: '3px', fontSize: '11px' }}
                        >
                          <option value="lighting">Lighting</option>
                          <option value="socket">Socket</option>
                          <option value="motor">Motor</option>
                          <option value="ac">HVAC/AC</option>
                          <option value="other">Other</option>
                        </select>
                        {(c.load_type === 'motor' || c.load_type === 'ac') && (
                          <button
                            title="View NEC 430/440 Motor Circuit Details"
                            onClick={() => setSelectedMotorCircuit(c)}
                            style={{ background: 'none', border: 'none', color: 'var(--amber)', cursor: 'pointer', padding: '2px' }}
                          >
                            <Cpu size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: '6px 10px' }}>
                      <div style={{ display: 'flex', gap: '3px', alignItems: 'center' }}>
                        <input
                          type="number"
                          step="0.5"
                          style={{ width: '55px', background: 'transparent', border: '1px solid var(--grid)', color: 'var(--amber)', padding: '3px 4px', borderRadius: '3px', fontSize: '11.5px', fontFamily: 'var(--mono)' }}
                          value={c.load_val}
                          onChange={e => onUpdateCircuit(c.id, { load_val: parseFloat(e.target.value) || 0 })}
                        />
                        <select
                          value={c.load_unit}
                          onChange={e => onUpdateCircuit(c.id, { load_unit: e.target.value })}
                          style={{ width: '48px', background: 'var(--panel-2)', border: '1px solid var(--grid)', color: 'var(--text-dim)', padding: '2px 2px', borderRadius: '3px', fontSize: '10.5px' }}
                        >
                          <option value="kva">kVA</option>
                          <option value="kw">kW</option>
                          <option value="hp">HP</option>
                          <option value="a">A</option>
                        </select>
                      </div>
                    </td>
                    <td style={{ padding: '6px 10px' }}>
                      <input
                        type="number"
                        step="0.05"
                        style={{ width: '42px', background: 'transparent', border: '1px solid var(--grid)', color: 'var(--text)', padding: '3px 4px', borderRadius: '3px', fontSize: '11.5px', fontFamily: 'var(--mono)' }}
                        value={c.pf}
                        onChange={e => onUpdateCircuit(c.id, { pf: parseFloat(e.target.value) || 0.9 })}
                      />
                    </td>
                    <td style={{ padding: '6px 10px' }}>
                      <select
                        value={c.phase}
                        onChange={e => onUpdateCircuit(c.id, { phase: e.target.value })}
                        style={{ background: 'var(--panel-2)', border: '1px solid var(--grid)', color: 'var(--teal)', padding: '2px 4px', borderRadius: '3px', fontSize: '11px', fontFamily: 'var(--mono)' }}
                      >
                        <option value="L1">L1</option>
                        <option value="L2">L2</option>
                        <option value="L3">L3</option>
                        <option value="3P">3P</option>
                      </select>
                    </td>
                    <td style={{ padding: '6px 10px' }}>
                      <input
                        type="number"
                        style={{ width: '45px', background: 'transparent', border: '1px solid var(--grid)', color: 'var(--text)', padding: '3px 4px', borderRadius: '3px', fontSize: '11.5px', fontFamily: 'var(--mono)' }}
                        value={c.length_m}
                        onChange={e => onUpdateCircuit(c.id, { length_m: parseFloat(e.target.value) || 20 })}
                      />
                    </td>
                    <td style={{ padding: '6px 10px' }}>
                      <select
                        value={c.install_method || 'air'}
                        onChange={e => onUpdateCircuit(c.id, { install_method: e.target.value })}
                        style={{ background: 'var(--panel-2)', border: '1px solid var(--grid)', color: 'var(--text-dim)', padding: '2px 4px', borderRadius: '3px', fontSize: '10.5px' }}
                      >
                        <option value="air">Air</option>
                        <option value="ground">Ground</option>
                        <option value="duct">Duct</option>
                      </select>
                    </td>
                    <td style={{ padding: '6px 10px' }}>
                      <select
                        value={cableTypeVal}
                        onChange={e => {
                          const parts = e.target.value.split('_');
                          onUpdateCircuit(c.id, {
                            conductor: parts[0] || 'cu',
                            insulation: parts[1] || 'xlpe'
                          });
                        }}
                        style={{ background: 'var(--panel-2)', border: '1px solid var(--grid)', color: 'var(--text-dim)', padding: '2px 4px', borderRadius: '3px', fontSize: '10.5px' }}
                      >
                        <option value="cu_xlpe">Cu/XLPE</option>
                        <option value="cu_pvc">Cu/PVC</option>
                        <option value="al_xlpe">Al/XLPE</option>
                        <option value="al_pvc">Al/PVC</option>
                      </select>
                    </td>
                    <td style={{ padding: '6px 10px', fontFamily: 'var(--mono)', color: 'var(--amber)', fontWeight: 600 }}>
                      {c.Ib.toFixed(1)} A
                    </td>
                    <td style={{ padding: '6px 10px', fontFamily: 'var(--mono)', color: 'var(--teal)', fontWeight: 700 }}>
                      {c.breaker} A
                    </td>
                    <td style={{ padding: '6px 10px', fontFamily: 'var(--mono)', color: 'var(--text)', fontWeight: 600 }}>
                      {c.cableDisplay} mm²
                    </td>
                    <td style={{ padding: '6px 10px' }}>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '3px',
                        fontFamily: 'var(--mono)',
                        fontSize: '11px',
                        color: c.vDropPass ? 'var(--text)' : 'var(--danger)',
                        fontWeight: c.vDropPass ? 400 : 700
                      }}>
                        {c.vDropPct.toFixed(2)}%
                        {c.vDropPass ? <CheckCircle size={11} color="var(--success)" /> : <XCircle size={11} color="var(--danger)" />}
                      </span>
                    </td>
                    <td style={{ padding: '6px 10px' }}>
                      {c.protPass ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', color: 'var(--success)', fontSize: '10.5px', fontWeight: 700 }}>
                          <CheckCircle size={11} /> PASS
                        </span>
                      ) : (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', color: 'var(--danger)', fontSize: '10.5px', fontWeight: 700 }} title="In > Iz">
                          <XCircle size={11} /> FAIL
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '6px 10px' }}>
                      <button
                        onClick={() => onDeleteCircuit(c.id)}
                        title="Delete circuit"
                        style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', padding: '3px' }}
                      >
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Motor Inspection Modal */}
      {selectedMotorCircuit && (
        <MotorDetailsModal
          circuit={selectedMotorCircuit}
          voltage={voltage}
          onClose={() => setSelectedMotorCircuit(null)}
          onUpdateStarter={(starter) => onUpdateCircuit(selectedMotorCircuit.id, { starter_type: starter })}
        />
      )}
    </div>
  );
};
