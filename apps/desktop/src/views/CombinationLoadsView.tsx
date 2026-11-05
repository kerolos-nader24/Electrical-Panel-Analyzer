import React, { useState, useMemo } from 'react';
import {
  calculateCombinationLoads,
  type CombinationLoadItem,
  type LoadType
} from '@panel-analyzer/engine';
import { Plus, Trash2 } from 'lucide-react';
import { type Language } from '../i18n.js';

interface Props {
  lang: Language;
}

export const CombinationLoadsView: React.FC<Props> = ({ lang }) => {
  const [loads, setLoads] = useState<CombinationLoadItem[]>([
    { id: 1, type: 'mc', rlc: 24, bsc: 0, lrc: 130 },
    { id: 2, type: 'fan', rlc: 3.5, bsc: 0, lrc: 18 },
    { id: 3, type: 'mc', rlc: 15, bsc: 0, lrc: 85 }
  ]);

  const results = useMemo(() => {
    return calculateCombinationLoads(loads);
  }, [loads]);

  const handleAddLoad = () => {
    const nextId = loads.length > 0 ? Math.max(...loads.map(l => Number(l.id))) + 1 : 1;
    setLoads(prev => [
      ...prev,
      { id: nextId, type: 'mc', rlc: 10, bsc: 0, lrc: 50 }
    ]);
  };

  const handleUpdateLoad = (id: number | string, updates: Partial<CombinationLoadItem>) => {
    setLoads(prev => prev.map(l => l.id === id ? { ...l, ...updates } : l));
  };

  const handleDeleteLoad = (id: number | string) => {
    setLoads(prev => prev.filter(l => l.id !== id));
  };

  return (
    <div style={{ padding: '24px 32px', height: '100%', overflowY: 'auto' }}>
      <div style={{ marginBottom: '18px' }}>
        <div style={{ fontFamily: 'var(--mono)', fontSize: '11px', color: 'var(--teal)', letterSpacing: '1px', textTransform: 'uppercase' }}>
          NEC ARTICLE 440 PART IV — COMBINATION LOADS
        </div>
        <h1 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text)', marginTop: '2px' }}>
          {lang === 'ar' ? 'أحمال تكييف مركبة (Combination AC Loads)' : 'Combination AC Loads Sizing'}
        </h1>
        <p style={{ color: 'var(--text-dim)', fontSize: '13px', margin: '4px 0 0 0' }}>
          {lang === 'ar'
            ? 'حساب دوائر التغذية وقواطع الحماية لمجموعات من ضواغط التبريد والمحركات وفق NEC 440 Part IV.'
            : 'Size feeder conductors, disconnects and protection for circuits supplying two or more motor-compressors and other loads.'}
        </p>
      </div>

      {/* Hero Metric Cards */}
      <div className="hero-grid">
        <div className="hero-box">
          <div className="lbl">Feeder Current Sum</div>
          <div className="val">{results.totalSumCurrent.toFixed(1)}<span className="u"> A</span></div>
        </div>
        <div className="hero-box">
          <div className="lbl">Feeder Disconnect</div>
          <div className="val">{results.disconnectRating.toFixed(1)}<span className="u"> A</span></div>
        </div>
        <div className="hero-box">
          <div className="lbl">Feeder Conductor (125%)</div>
          <div className="val">{results.conductorAmpacity.toFixed(1)}<span className="u"> A</span></div>
        </div>
        <div className="hero-box">
          <div className="lbl">Starting OCPD</div>
          <div className="val">{results.ocpdStep1.toFixed(1)}<span className="u"> A</span></div>
        </div>
      </div>

      {/* Load List Table */}
      <div className="card" style={{ padding: '0', overflowX: 'auto', marginBottom: '16px' }}>
        <div style={{ padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--grid)' }}>
          <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--amber)' }}>
            Connected AC Units & Motors
          </div>
          <button className="btn teal" onClick={handleAddLoad} style={{ padding: '4px 10px', fontSize: '11.5px' }}>
            <Plus size={13} />
            <span>Add Load</span>
          </button>
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px' }}>
          <thead>
            <tr style={{ background: 'var(--panel-2)', borderBottom: '1px solid var(--grid)', color: 'var(--text-dim)', fontFamily: 'var(--mono)' }}>
              <th style={{ padding: '8px 12px' }}>#</th>
              <th style={{ padding: '8px 12px' }}>Type</th>
              <th style={{ padding: '8px 12px' }}>RLC / FLC (A)</th>
              <th style={{ padding: '8px 12px' }}>BSC (A)</th>
              <th style={{ padding: '8px 12px' }}>LRC (A)</th>
              <th style={{ padding: '8px 12px' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {loads.map((load, idx) => (
              <tr key={load.id} style={{ borderBottom: '1px solid var(--grid)' }}>
                <td style={{ padding: '8px 12px', fontFamily: 'var(--mono)', color: 'var(--text-dim)' }}>{idx + 1}</td>
                <td style={{ padding: '8px 12px' }}>
                  <select
                    value={load.type}
                    onChange={e => handleUpdateLoad(load.id, { type: e.target.value as LoadType })}
                    style={{ background: 'var(--panel-2)', border: '1px solid var(--grid)', color: 'var(--teal)', padding: '4px 8px', borderRadius: '3px' }}
                  >
                    <option value="mc">Motor-Compressor</option>
                    <option value="fan">Condenser/Evap Fan</option>
                    <option value="motor">Induction Motor</option>
                    <option value="other">Other Continuous Load</option>
                  </select>
                </td>
                <td style={{ padding: '8px 12px' }}>
                  <input
                    type="number"
                    step="0.1"
                    style={{ width: '80px', background: 'transparent', border: '1px solid var(--grid)', color: 'var(--amber)', padding: '4px 6px', borderRadius: '3px', fontFamily: 'var(--mono)' }}
                    value={load.rlc}
                    onChange={e => handleUpdateLoad(load.id, { rlc: parseFloat(e.target.value) || 0 })}
                  />
                </td>
                <td style={{ padding: '8px 12px' }}>
                  <input
                    type="number"
                    step="0.1"
                    disabled={load.type !== 'mc'}
                    placeholder={load.type === 'mc' ? 'optional' : '—'}
                    style={{ width: '80px', background: 'transparent', border: '1px solid var(--grid)', color: 'var(--text)', padding: '4px 6px', borderRadius: '3px', fontFamily: 'var(--mono)', opacity: load.type === 'mc' ? 1 : 0.4 }}
                    value={load.bsc || ''}
                    onChange={e => handleUpdateLoad(load.id, { bsc: parseFloat(e.target.value) || 0 })}
                  />
                </td>
                <td style={{ padding: '8px 12px' }}>
                  <input
                    type="number"
                    step="1"
                    style={{ width: '80px', background: 'transparent', border: '1px solid var(--grid)', color: 'var(--text)', padding: '4px 6px', borderRadius: '3px', fontFamily: 'var(--mono)' }}
                    value={load.lrc || ''}
                    onChange={e => handleUpdateLoad(load.id, { lrc: parseFloat(e.target.value) || 0 })}
                  />
                </td>
                <td style={{ padding: '8px 12px' }}>
                  <button
                    onClick={() => handleDeleteLoad(load.id)}
                    style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', padding: '4px' }}
                  >
                    <Trash2 size={13} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Sizing Results Breakdown */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '14px' }}>
        <div className="card">
          <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--teal)', marginBottom: '8px' }}>
            1. Disconnecting Means (NEC 440.12(B))
          </div>
          <div style={{ fontSize: '13px', lineHeight: 1.8 }}>
            <div>Ampere Rating: <strong>≥ {results.disconnectRating.toFixed(2)} A</strong> (115% of sum)</div>
            <div>Combined LRC: <strong>{results.totalSumLrc.toFixed(0)} A</strong></div>
            <div style={{ color: 'var(--text-dim)', fontSize: '11.5px', marginTop: '4px' }}>
              Disconnect rating must be not less than 115% of the arithmetic sum of the rated-load currents of all units.
            </div>
          </div>
        </div>

        <div className="card">
          <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--amber)', marginBottom: '8px' }}>
            2. Feeder Protection OCPD (NEC 440.22(B))
          </div>
          <div style={{ fontSize: '13px', lineHeight: 1.8 }}>
            <div>Step 1 Breaker: <strong>≤ {results.ocpdStep1.toFixed(2)} A</strong></div>
            <div>Step 3 (Max Rating): <strong>≤ {results.ocpdStep3.toFixed(2)} A</strong></div>
            <div style={{ color: 'var(--text-dim)', fontSize: '11.5px', marginTop: '4px' }}>
              {results.isMcLargest
                ? 'Case A: A motor-compressor has the largest starting demand (175% + sum of others).'
                : 'Case B: Another motor has the largest starting demand (NEC 430.62).'}
            </div>
          </div>
        </div>

        <div className="card">
          <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--teal)', marginBottom: '8px' }}>
            3. Feeder Conductors (NEC 440.33 &amp; 430.24)
          </div>
          <div style={{ fontSize: '13px', lineHeight: 1.8 }}>
            <div>Feeder Ampacity: <strong>≥ {results.conductorAmpacity.toFixed(2)} A</strong></div>
            <div style={{ color: 'var(--text-dim)', fontSize: '11.5px', marginTop: '4px' }}>
              Formula: 125% of the largest motor/compressor's full load current + the sum of all other motor currents.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
