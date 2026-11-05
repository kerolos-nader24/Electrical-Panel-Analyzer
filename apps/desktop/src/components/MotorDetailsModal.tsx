import React from 'react';
import { calculateMotorCircuit, type MotorStarterType } from '@panel-analyzer/engine';
import { X, Cpu } from 'lucide-react';
import type { CircuitRecord } from '../../electron/db.js';

interface Props {
  circuit: CircuitRecord;
  voltage: number;
  onClose: () => void;
  onUpdateStarter: (starter: MotorStarterType) => void;
}

export const MotorDetailsModal: React.FC<Props> = ({
  circuit,
  voltage,
  onClose,
  onUpdateStarter
}) => {
  const is3Phase = circuit.phase === '3P';
  const unit = circuit.load_unit as 'kw' | 'hp' | 'a';
  const starter = (circuit.starter_type || 'dol') as MotorStarterType;

  const motorCalc = calculateMotorCircuit({
    loadVal: circuit.load_val,
    loadUnit: unit === 'kw' || unit === 'hp' || unit === 'a' ? unit : 'kw',
    voltage: is3Phase ? voltage : 230,
    is3Phase,
    pf: circuit.pf || 0.85,
    starterType: starter
  });

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(5, 10, 15, 0.8)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: '20px'
    }}>
      <div style={{
        background: 'var(--panel)',
        border: '1.5px solid var(--teal)',
        borderRadius: '6px',
        width: '100%',
        maxWidth: '560px',
        padding: '24px',
        boxShadow: '0 12px 36px rgba(0,0,0,0.6)',
        color: 'var(--text)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid var(--grid)', paddingBottom: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Cpu size={18} color="var(--amber)" />
            <h2 style={{ fontSize: '16px', fontWeight: 700, margin: 0 }}>
              NEC Article 430 Motor Circuit Details
            </h2>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer' }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ marginBottom: '14px', fontSize: '12.5px', color: 'var(--text-dim)' }}>
          Circuit: <strong style={{ color: 'var(--text)' }}>{circuit.name}</strong> ({circuit.load_val} {circuit.load_unit.toUpperCase()}, {circuit.phase})
        </div>

        {/* Hero Motor Metrics */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '16px' }}>
          <div className="hero-box" style={{ padding: '10px' }}>
            <div className="lbl">Motor FLA</div>
            <div className="val" style={{ fontSize: '18px' }}>{motorCalc.fla.toFixed(1)}<span className="u"> A</span></div>
          </div>
          <div className="hero-box" style={{ padding: '10px' }}>
            <div className="lbl">Branch Breaker (250%)</div>
            <div className="val" style={{ fontSize: '18px', color: 'var(--amber)' }}>{motorCalc.ocpdBreaker}<span className="u"> A</span></div>
          </div>
          <div className="hero-box" style={{ padding: '10px' }}>
            <div className="lbl">Conductor (125%)</div>
            <div className="val" style={{ fontSize: '18px', color: 'var(--teal)' }}>{motorCalc.conductorAmpacity.toFixed(1)}<span className="u"> A</span></div>
          </div>
        </div>

        {/* Starter Selection */}
        <div style={{ marginBottom: '16px', background: 'var(--panel-2)', padding: '12px', borderRadius: '4px' }}>
          <label style={{ fontSize: '12px', color: 'var(--text-dim)', display: 'block', marginBottom: '6px' }}>
            Starter Method &amp; Controller (Recommended: <strong style={{ color: 'var(--teal)' }}>{motorCalc.recommendedStarter.toUpperCase()}</strong>)
          </label>
          <div className="toggle-row">
            {(['dol', 'star_delta', 'soft_starter', 'vfd'] as const).map(s => (
              <button
                key={s}
                type="button"
                className={`toggle-btn ${starter === s ? 'active' : ''}`}
                onClick={() => onUpdateStarter(s)}
                style={{ fontSize: '11.5px', padding: '6px 8px' }}
              >
                {s === 'dol' ? 'D.O.L.' : s === 'star_delta' ? 'Star-Delta' : s === 'soft_starter' ? 'Soft Starter' : 'VFD'}
              </button>
            ))}
          </div>
        </div>

        {/* Engineering Breakdown List */}
        <div style={{ fontSize: '12.5px', lineHeight: 1.8, background: 'var(--panel-2)', padding: '12px 16px', borderRadius: '4px', borderLeft: '3px solid var(--amber)' }}>
          <div>Overload Relay (NEC 430.32): <strong>≤ {motorCalc.overloadSetting.toFixed(1)} A</strong> (115% FLA)</div>
          <div>Disconnect Switch (NEC 430.110): <strong>≥ {motorCalc.disconnectRating.toFixed(1)} A</strong> (115% FLA)</div>
          <div>Starting Inrush Protection (NEC 430.52): <strong>{motorCalc.ocpdCalculated.toFixed(1)} A</strong> (Selected Breaker: <strong>{motorCalc.ocpdBreaker} A</strong>)</div>
          <div>Minimum Conductor Ampacity (NEC 430.22): <strong>≥ {motorCalc.conductorAmpacity.toFixed(1)} A</strong></div>
        </div>

        <div style={{ marginTop: '16px', textAlign: 'right' }}>
          <button className="btn" onClick={onClose} style={{ padding: '6px 16px', fontSize: '12.5px' }}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
