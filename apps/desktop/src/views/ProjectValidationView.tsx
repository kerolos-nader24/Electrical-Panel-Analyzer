import React, { useMemo } from 'react';
import {
  analyzeDistributionHierarchy,
  calculateDesignCurrent,
  calculateRequiredBreaker,
  selectStandardBreaker,
  selectParallelCableWithVdrop,
  getCableTableKey,
  checkProtection,
  checkShortCircuit,
  selectConduit
} from '@panel-analyzer/engine';
import { ShieldAlert, AlertTriangle, CheckCircle, XCircle, ArrowRight, LayoutGrid, Zap, RefreshCw } from 'lucide-react';
import type { ProjectRecord, PanelRecord, CircuitRecord } from '../../electron/db.js';

interface Props {
  project: ProjectRecord;
  panels: PanelRecord[];
  circuits: Record<string, CircuitRecord[]>;
  onSelectPanel: (panelId: string) => void;
}

export interface ValidationIssue {
  id: string;
  severity: 'error' | 'warning';
  category: 'Hierarchy Loop' | 'Voltage Drop' | 'Protection Check' | 'Short Circuit' | 'Phase Imbalance' | 'Conduit Fill';
  panelId: string;
  panelName: string;
  circuitName?: string;
  message: string;
  recommendation: string;
}

export const ProjectValidationView: React.FC<Props> = ({
  project,
  panels,
  circuits,
  onSelectPanel
}) => {
  const issues = useMemo(() => {
    const list: ValidationIssue[] = [];

    // 1. Hierarchy Cycle / Loop Detection
    const hierarchyNodes = panels.map(p => ({
      id: p.id,
      name: p.name,
      fedFromId: p.fed_from_id,
      directDemandKva: p.raw_load || 0
    }));

    const hierarchy = analyzeDistributionHierarchy(hierarchyNodes);
    if (hierarchy.hasCycle) {
      list.push({
        id: 'cycle-error',
        severity: 'error',
        category: 'Hierarchy Loop',
        panelId: hierarchy.cycleNodes[0] || panels[0]?.id || '',
        panelName: 'Distribution Feed Architecture',
        message: `Circular feed loop detected: ${hierarchy.cyclePathStr}`,
        recommendation: 'Break the circular loop by setting the feeding source of one panel to an independent incomer or upstream board.'
      });
    }

    // 2. Validate every panel incomer & branch circuits
    panels.forEach(p => {
      const is3P = p.system_type !== '1p';
      const pCircuits = circuits[p.id] || [];

      // Feeder Incomer Calculations
      const curr = calculateDesignCurrent(p.raw_load, p.load_unit, p.voltage, is3P, p.pf, p.demand_factor, false);
      const reqB = calculateRequiredBreaker(curr.Ib, 1.25);
      const In = selectStandardBreaker(reqB);

      const tableKey = getCableTableKey(p.conductor as any, p.insulation as any, p.cable_form as any, p.system_type as any);
      const cableRes = selectParallelCableWithVdrop(
        tableKey,
        In,
        p.derate || 0.8,
        p.install_method as any,
        p.cable_length || 30,
        curr.Ib,
        p.voltage,
        is3P,
        p.conductor as any,
        p.insulation as any,
        p.pf || 0.9,
        p.vdrop_max || 3.0,
        p.parallel_runs || 1
      );

      // Incomer Protection Check
      if (cableRes) {
        const prot = checkProtection(curr.Ib, In, cableRes.totalAmpacity);
        if (!prot.pass) {
          list.push({
            id: `prot-${p.id}`,
            severity: 'error',
            category: 'Protection Check',
            panelId: p.id,
            panelName: p.name,
            message: `Incomer breaker In (${In}A) exceeds cable corrected ampacity Iz (${cableRes.totalAmpacity}A).`,
            recommendation: 'Increase cable cross-section or add parallel runs to satisfy In ≤ Iz.'
          });
        }

        // Incomer Voltage Drop Check
        if (!cableRes.vDrop.pass) {
          list.push({
            id: `vdrop-${p.id}`,
            severity: 'error',
            category: 'Voltage Drop',
            panelId: p.id,
            panelName: p.name,
            message: `Incomer feeder voltage drop (${cableRes.vDrop.dropPct.toFixed(2)}%) exceeds allowed ${p.vdrop_max}%.`,
            recommendation: 'Step up feeder cross-section or shorten cable route length.'
          });
        }

        // Incomer Short Circuit Withstand
        const sc = checkShortCircuit(cableRes.cable.size, p.isc || 10, p.fclear || 0.1, p.conductor as any, p.insulation as any);
        if (!sc.pass) {
          list.push({
            id: `sc-${p.id}`,
            severity: 'error',
            category: 'Short Circuit',
            panelId: p.id,
            panelName: p.name,
            message: `Feeder cable (${cableRes.cable.size} mm²) fails adiabatic thermal withstand (S_min = ${sc.Smin.toFixed(1)} mm²).`,
            recommendation: 'Increase minimum cable cross-section or reduce fault clearing time.'
          });
        }

        // Conduit Fill
        const cores = p.system_type === '1p' ? 2 : (p.system_type === '3pn' ? 4 : 3);
        const cond = selectConduit(cableRes.cable.dia, p.cable_form === 'single' ? cores : 1);
        if (cond.fillPct > 40) {
          list.push({
            id: `conduit-${p.id}`,
            severity: 'warning',
            category: 'Conduit Fill',
            panelId: p.id,
            panelName: p.name,
            message: `Feeder conduit fill ratio (${cond.fillPct.toFixed(1)}%) exceeds 40% NEC limit.`,
            recommendation: `Use larger trade conduit size (≥ Ø${cond.size} mm).`
          });
        }
      }

      // Branch Circuits Check & Phase Imbalance
      let l1 = 0;
      let l2 = 0;
      let l3 = 0;

      pCircuits.forEach(c => {
        const c3P = c.phase === '3P';
        const cVolt = c3P ? p.voltage : 230;
        const cCurr = calculateDesignCurrent(c.load_val, c.load_unit, cVolt, c3P, c.pf || 0.9, 1.0, false);
        const kva = cCurr.connectedKva;

        if (c.phase === 'L1') l1 += kva;
        else if (c.phase === 'L2') l2 += kva;
        else if (c.phase === 'L3') l3 += kva;
        else {
          l1 += kva / 3;
          l2 += kva / 3;
          l3 += kva / 3;
        }

        // Branch Voltage drop check
        const cTableKey = getCableTableKey((c.conductor || 'cu') as any, (c.insulation || 'xlpe') as any, 'multi', c3P ? '3pn' : '1p');
        const cBreaker = selectStandardBreaker(calculateRequiredBreaker(cCurr.Ib, 1.25));
        const cCableRes = selectParallelCableWithVdrop(
          cTableKey,
          cBreaker,
          0.8,
          (c.install_method || 'air') as any,
          c.length_m || 20,
          cCurr.Ib,
          cVolt,
          c3P,
          (c.conductor || 'cu') as any,
          (c.insulation || 'xlpe') as any,
          c.pf || 0.9,
          p.vdrop_max || 3.0,
          1
        );

        if (cCableRes && !cCableRes.vDrop.pass) {
          list.push({
            id: `branch-vdrop-${c.id}`,
            severity: 'error',
            category: 'Voltage Drop',
            panelId: p.id,
            panelName: p.name,
            circuitName: c.name,
            message: `Circuit "${c.name}" voltage drop (${cCableRes.vDrop.dropPct.toFixed(2)}%) exceeds limit.`,
            recommendation: 'Increase branch cable cross-section.'
          });
        }
      });

      const avg = (l1 + l2 + l3) / 3;
      const maxDev = Math.max(Math.abs(l1 - avg), Math.abs(l2 - avg), Math.abs(l3 - avg));
      const imbalance = avg > 0 ? (maxDev / avg) * 100 : 0;

      if (imbalance > 10 && pCircuits.length > 0) {
        list.push({
          id: `imbalance-${p.id}`,
          severity: 'warning',
          category: 'Phase Imbalance',
          panelId: p.id,
          panelName: p.name,
          message: `Phase imbalance on panel is ${imbalance.toFixed(1)}% (Maximum allowable: 10%).`,
          recommendation: 'Redistribute single-phase circuits between L1, L2, and L3.'
        });
      }
    });

    return list;
  }, [project, panels, circuits]);

  const errors = issues.filter(i => i.severity === 'error');
  const warnings = issues.filter(i => i.severity === 'warning');

  return (
    <div style={{ padding: '24px 32px', height: '100%', overflowY: 'auto' }}>
      {/* Title */}
      <div style={{ marginBottom: '18px' }}>
        <div style={{ fontFamily: 'var(--mono)', fontSize: '11px', color: 'var(--teal)', letterSpacing: '1px', textTransform: 'uppercase' }}>
          PROJECT COMPLIANCE &amp; VERIFICATION AUDIT
        </div>
        <h1 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text)', marginTop: '2px' }}>
          Project Validation Center
        </h1>
        <p style={{ color: 'var(--text-dim)', fontSize: '13px', margin: '4px 0 0 0' }}>
          Automated compliance audit against NEC 440, NEC 430, and IEC 60364 across all panels and circuits in <strong>{project.name}</strong>.
        </p>
      </div>

      {/* Hero Issue Metrics */}
      <div className="hero-grid">
        <div className="hero-box">
          <div className="lbl">Total Issues</div>
          <div className="val" style={{ color: issues.length === 0 ? 'var(--success)' : 'var(--text)' }}>
            {issues.length}
          </div>
        </div>
        <div className="hero-box">
          <div className="lbl">Critical Errors</div>
          <div className="val" style={{ color: errors.length > 0 ? 'var(--danger)' : 'var(--success)' }}>
            {errors.length}
          </div>
        </div>
        <div className="hero-box">
          <div className="lbl">Warnings</div>
          <div className="val" style={{ color: warnings.length > 0 ? 'var(--amber)' : 'var(--text-dim)' }}>
            {warnings.length}
          </div>
        </div>
        <div className="hero-box">
          <div className="lbl">Overall Status</div>
          <div className="val" style={{ color: errors.length === 0 ? 'var(--success)' : 'var(--danger)', fontSize: '18px' }}>
            {errors.length === 0 ? 'COMPLIANT' : 'NON-COMPLIANT'}
          </div>
        </div>
      </div>

      {/* Issues List */}
      {issues.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '40px 20px', border: '1px solid var(--teal)' }}>
          <CheckCircle size={40} color="var(--success)" style={{ margin: '0 auto 12px' }} />
          <h3 style={{ fontSize: '16px', color: 'var(--text)', margin: '0 0 6px 0' }}>All Calculations Fully Compliant</h3>
          <p style={{ color: 'var(--text-dim)', fontSize: '13px', maxWidth: '500px', margin: '0 auto' }}>
            Zero protection coordination errors, voltage drop violations, loop feeds, or short-circuit withstand failures detected across the project.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {issues.map(issue => (
            <div
              key={issue.id}
              className="card"
              style={{
                borderLeft: `4px solid ${issue.severity === 'error' ? 'var(--danger)' : 'var(--amber)'}`,
                padding: '14px 18px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '12px'
              }}
            >
              <div style={{ flex: 1, minWidth: '260px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <span style={{
                    fontSize: '10.5px',
                    fontFamily: 'var(--mono)',
                    padding: '2px 6px',
                    borderRadius: '3px',
                    fontWeight: 700,
                    background: issue.severity === 'error' ? 'rgba(209,96,61,0.2)' : 'rgba(232,163,61,0.2)',
                    color: issue.severity === 'error' ? 'var(--danger)' : 'var(--amber)'
                  }}>
                    {issue.category.toUpperCase()}
                  </span>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--teal)' }}>
                    {issue.panelName} {issue.circuitName ? `→ ${issue.circuitName}` : ''}
                  </span>
                </div>
                <div style={{ fontSize: '13px', color: 'var(--text)', fontWeight: 500 }}>
                  {issue.message}
                </div>
                <div style={{ fontSize: '11.5px', color: 'var(--text-dim)', marginTop: '4px' }}>
                  Recommendation: {issue.recommendation}
                </div>
              </div>

              <button
                className="btn secondary"
                onClick={() => onSelectPanel(issue.panelId)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 12px',
                  fontSize: '11.5px',
                  whiteSpace: 'nowrap'
                }}
              >
                <span>Fix in Panel</span>
                <ArrowRight size={13} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
