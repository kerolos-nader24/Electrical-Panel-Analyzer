import React, { useState, useMemo } from 'react';
import { calculateMotorCompressor, type MotorCompressorInputs } from '@panel-analyzer/engine';
import { I18N, type Language } from '../i18n.js';

interface Props {
  lang: Language;
}

export const SingleMotorView: React.FC<Props> = ({ lang }) => {
  const [inputs, setInputs] = useState<MotorCompressorInputs>({
    rlc: 24,
    bsc: 0,
    lrc: 130,
    mca: 0
  });

  const results = useMemo(() => {
    return calculateMotorCompressor(inputs);
  }, [inputs]);

  return (
    <div style={{ padding: '24px 32px', height: '100%', overflowY: 'auto' }}>
      <div style={{ marginBottom: '18px' }}>
        <div style={{ fontFamily: 'var(--mono)', fontSize: '11px', color: 'var(--teal)', letterSpacing: '1px', textTransform: 'uppercase' }}>
          NEC ARTICLE 440 — HERMETIC REFRIGERANT MOTOR-COMPRESSOR
        </div>
        <h1 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text)', marginTop: '2px' }}>
          {lang === 'ar' ? 'ضاغط تبريد منفرد (Single Motor-Compressor)' : 'Single Motor-Compressor Sizing'}
        </h1>
        <p style={{ color: 'var(--text-dim)', fontSize: '13px', margin: '4px 0 0 0' }}>
          {lang === 'ar'
            ? 'تحديد قواطع الفصل، أجهزة الحماية من القصر، مقاطع الموصلات، والمفتاح الحاكم وفق متطلبات NEC 440.'
            : 'Size disconnects, branch-circuit protection, conductors, controllers and overload relays per NEC 440.'}
        </p>
      </div>

      {/* Hero Output Cards */}
      <div className="hero-grid">
        <div className="hero-box">
          <div className="lbl">Base Current (I)</div>
          <div className="val">{results.baseCurrent.toFixed(1)}<span className="u"> A</span></div>
        </div>
        <div className="hero-box">
          <div className="lbl">Min Disconnect</div>
          <div className="val">{results.disconnectRating.toFixed(1)}<span className="u"> A</span></div>
        </div>
        <div className="hero-box">
          <div className="lbl">Starting OCPD (175%)</div>
          <div className="val">{results.ocpdStep1.toFixed(1)}<span className="u"> A</span></div>
        </div>
        <div className="hero-box">
          <div className="lbl">Min Conductor (125%)</div>
          <div className="val">{results.conductorAmpacity.toFixed(1)}<span className="u"> A</span></div>
        </div>
      </div>

      {/* Input Data Card */}
      <div className="card">
        <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--amber)', marginBottom: '12px' }}>
          Nameplate Electrical Inputs
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
          <div className="field">
            <label>Rated-Load Current, RLC <span className="unit">(A)</span></label>
            <input
              type="number"
              step="0.1"
              value={inputs.rlc || ''}
              onChange={e => setInputs(prev => ({ ...prev, rlc: parseFloat(e.target.value) || 0 }))}
              placeholder="e.g. 24"
            />
          </div>
          <div className="field">
            <label>Branch-Circuit Selection, BSC <span className="unit">(A)</span></label>
            <input
              type="number"
              step="0.1"
              value={inputs.bsc || ''}
              onChange={e => setInputs(prev => ({ ...prev, bsc: parseFloat(e.target.value) || 0 }))}
              placeholder="optional"
            />
          </div>
          <div className="field">
            <label>Locked-Rotor Current, LRC <span className="unit">(A)</span></label>
            <input
              type="number"
              step="1"
              value={inputs.lrc || ''}
              onChange={e => setInputs(prev => ({ ...prev, lrc: parseFloat(e.target.value) || 0 }))}
              placeholder="e.g. 130"
            />
          </div>
          <div className="field">
            <label>Minimum Circuit Ampacity, MCA <span className="unit">(A)</span></label>
            <input
              type="number"
              step="0.1"
              value={inputs.mca || ''}
              onChange={e => setInputs(prev => ({ ...prev, mca: parseFloat(e.target.value) || 0 }))}
              placeholder="optional"
            />
          </div>
        </div>
      </div>

      {/* Sizing Results Accordion / Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '14px' }}>
        {/* 1. Disconnect */}
        <div className="card">
          <div style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--teal)', marginBottom: '8px' }}>
            1. Disconnecting Means (NEC 440.12)
          </div>
          <div style={{ fontSize: '13px', lineHeight: 1.8 }}>
            <div>Ampere Rating: <strong>≥ {results.disconnectRating.toFixed(2)} A</strong> (115% of I)</div>
            <div style={{ color: 'var(--text-dim)', fontSize: '11.5px', marginTop: '4px' }}>
              Must have an ampere rating not less than 115% of the rated-load current or branch-circuit selection current.
            </div>
          </div>
        </div>

        {/* 2. OCPD */}
        <div className="card">
          <div style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--amber)', marginBottom: '8px' }}>
            2. Short-Circuit & Ground-Fault (NEC 440.22)
          </div>
          <div style={{ fontSize: '13px', lineHeight: 1.8 }}>
            <div>Step 1 (Starting Breaker): <strong>≤ {results.ocpdStep1.toFixed(2)} A</strong> (175% of I)</div>
            <div>Step 3 (Max Breaker / Trip Curves): <strong>≤ {results.ocpdStep3.toFixed(2)} A</strong> (225% of I)</div>
            <div style={{ color: 'var(--text-dim)', fontSize: '11.5px', marginTop: '4px' }}>
              If starting current trips the Step 1 device, rating may be increased to next standard rating up to 225%.
            </div>
          </div>
        </div>

        {/* 3. Conductor */}
        <div className="card">
          <div style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--teal)', marginBottom: '8px' }}>
            3. Branch-Circuit Conductors (NEC 440.32)
          </div>
          <div style={{ fontSize: '13px', lineHeight: 1.8 }}>
            <div>Minimum Conductor Ampacity: <strong>≥ {results.conductorAmpacity.toFixed(2)} A</strong></div>
            <div>Wye-Start / Delta-Run Conductor: <strong>≥ {results.wyeDeltaConductorAmpacity.toFixed(2)} A</strong> (72% of I)</div>
            <div style={{ color: 'var(--text-dim)', fontSize: '11.5px', marginTop: '4px' }}>
              Sized at not less than 125% of motor-compressor current (or MCA if marked on nameplate).
            </div>
          </div>
        </div>

        {/* 4. Controller */}
        <div className="card">
          <div style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--amber)', marginBottom: '8px' }}>
            4. Motor Controller (NEC 440.41)
          </div>
          <div style={{ fontSize: '13px', lineHeight: 1.8 }}>
            <div>Continuous-Duty FLC: <strong>≥ {results.controllerFlc.toFixed(2)} A</strong></div>
            <div>Locked-Rotor Current (LRC): <strong>≥ {results.controllerLrc.toFixed(0)} A</strong></div>
            <div style={{ color: 'var(--text-dim)', fontSize: '11.5px', marginTop: '4px' }}>
              Controller must be rated for continuous full-load current and locked-rotor current.
            </div>
          </div>
        </div>
      </div>

      {/* 5. Overload Protection */}
      <div className="card" style={{ marginTop: '14px' }}>
        <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)', marginBottom: '10px' }}>
          5. Overload Protection Options (NEC 440.52(A))
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
          <div style={{ background: 'var(--panel-2)', padding: '12px', borderRadius: '4px' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>Option 1: Overload Relay (≤ 140% RLC)</div>
            <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--amber)', fontFamily: 'var(--mono)' }}>
              {results.overload.separateRelay.toFixed(1)} A
            </div>
          </div>
          <div style={{ background: 'var(--panel-2)', padding: '12px', borderRadius: '4px' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>Option 2: Thermal Protector (≤ 156% I)</div>
            <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--teal)', fontFamily: 'var(--mono)' }}>
              {results.overload.thermalProtector.toFixed(1)} A
            </div>
          </div>
          <div style={{ background: 'var(--panel-2)', padding: '12px', borderRadius: '4px' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>Option 3: Fuse / CB (≤ 125% RLC)</div>
            <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--amber)', fontFamily: 'var(--mono)' }}>
              {results.overload.fuseOrBreaker.toFixed(1)} A
            </div>
          </div>
          <div style={{ background: 'var(--panel-2)', padding: '12px', borderRadius: '4px' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>Option 4: Special System (≤ 156% I)</div>
            <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--teal)', fontFamily: 'var(--mono)' }}>
              {results.overload.specialProtectiveSystem.toFixed(1)} A
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
