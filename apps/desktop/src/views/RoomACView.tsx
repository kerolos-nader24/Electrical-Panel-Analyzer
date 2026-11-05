import React, { useState, useMemo } from 'react';
import { calculateRoomAC } from '@panel-analyzer/engine';
import { type Language } from '../i18n.js';

interface Props {
  lang: Language;
}

export const RoomACView: React.FC<Props> = ({ lang }) => {
  const [rating, setRating] = useState<number>(12);
  const [hasOtherLoads, setHasOtherLoads] = useState<boolean>(false);

  const results = useMemo(() => {
    return calculateRoomAC({ rating, hasOtherLoads });
  }, [rating, hasOtherLoads]);

  return (
    <div style={{ padding: '24px 32px', height: '100%', overflowY: 'auto' }}>
      <div style={{ marginBottom: '18px' }}>
        <div style={{ fontFamily: 'var(--mono)', fontSize: '11px', color: 'var(--teal)', letterSpacing: '1px', textTransform: 'uppercase' }}>
          NEC ARTICLE 440 PART VII — ROOM AIR CONDITIONERS
        </div>
        <h1 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text)', marginTop: '2px' }}>
          {lang === 'ar' ? 'وحدة تكييف الغرفة (Room A/C Unit)' : 'Room A/C Unit Sizing'}
        </h1>
        <p style={{ color: 'var(--text-dim)', fontSize: '13px', margin: '4px 0 0 0' }}>
          {lang === 'ar'
            ? 'تحديد تصنيف الدائرة الفرعية لوحدات التكييف أحادية الطور (≤ 40A, ≤ 250V) وفق NEC 440 Part VII.'
            : 'Sizing simplified branch circuits for single-phase cord-and-plug room air conditioners (≤ 40A, ≤ 250V).'}
        </p>
      </div>

      <div className="hero-grid">
        <div className="hero-box">
          <div className="lbl">Unit Rating</div>
          <div className="val">{rating.toFixed(1)}<span className="u"> A</span></div>
        </div>
        <div className="hero-box">
          <div className="lbl">Sizing Factor</div>
          <div className="val">{results.factor === 1.25 ? '80% Rule (1.25×)' : '50% Rule (2.00×)'}</div>
        </div>
        <div className="hero-box">
          <div className="lbl">Min Branch Circuit Rating</div>
          <div className="val">{results.requiredAmpacity.toFixed(1)}<span className="u"> A</span></div>
        </div>
      </div>

      <div className="card">
        <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--amber)', marginBottom: '12px' }}>
          Unit Electrical Data & Sharing
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
          <div className="field">
            <label>Nameplate Rated Current <span className="unit">(A)</span></label>
            <input
              type="number"
              step="0.5"
              value={rating || ''}
              onChange={e => setRating(parseFloat(e.target.value) || 0)}
              placeholder="e.g. 12"
            />
          </div>

          <div>
            <label style={{ fontSize: '12px', color: 'var(--text-dim)', display: 'block', marginBottom: '6px' }}>
              Circuit Sharing
            </label>
            <div className="toggle-row">
              <button
                type="button"
                className={`toggle-btn ${!hasOtherLoads ? 'active' : ''}`}
                onClick={() => setHasOtherLoads(false)}
              >
                No — Sole Load (80% Rule)
              </button>
              <button
                type="button"
                className={`toggle-btn ${hasOtherLoads ? 'active' : ''}`}
                onClick={() => setHasOtherLoads(true)}
              >
                Yes — Shared Circuit (50% Rule)
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Code Provisions & Mandatory Notes */}
      <div className="card" style={{ marginTop: '16px' }}>
        <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--teal)', marginBottom: '10px' }}>
          NEC Article 440 Part VII Engineering Provisions
        </div>
        <div style={{ display: 'grid', gap: '12px', fontSize: '13px', lineHeight: 1.6 }}>
          <div style={{ background: 'var(--panel-2)', padding: '12px 16px', borderRadius: '4px', borderLeft: '3px solid var(--amber)' }}>
            <strong>NEC 440.62 Branch-Circuit Requirements:</strong><br />
            {hasOtherLoads ? (
              <span>Where other loads (lighting or other appliances) share the circuit, the room A/C rating shall not exceed <strong>50%</strong> of the branch-circuit rating (multiplier = 2.00× → {results.requiredAmpacity.toFixed(1)} A minimum).</span>
            ) : (
              <span>Where the room A/C is the sole load on a branch circuit, its marked rating shall not exceed <strong>80%</strong> of the branch-circuit rating (multiplier = 1.25× → {results.requiredAmpacity.toFixed(1)} A minimum).</span>
            )}
          </div>

          <div style={{ background: 'var(--panel-2)', padding: '12px 16px', borderRadius: '4px', borderLeft: '3px solid var(--teal)' }}>
            <strong>NEC 440.63 Disconnecting Means:</strong><br />
            An attachment plug and receptacle or cord connector shall be permitted to serve as the disconnecting means if the manual controls on the room air conditioner are readily accessible and located within 1.8 m (6 ft) of the floor, or an approved manually operable switch is installed within sight of the unit.
          </div>

          <div style={{ background: 'var(--panel-2)', padding: '12px 16px', borderRadius: '4px', borderLeft: '3px solid var(--teal)' }}>
            <strong>NEC 440.65 Supply-Cord Protection:</strong><br />
            Single-phase room air conditioners must be provided with factory-installed LCDI (Leakage-Current Detector-Interrupter), AFCI (Arc-Fault Circuit Interrupter), or HDCI (Heat-Detecting Circuit Interrupter) integral to the attachment plug or within 300 mm (12 in.) of it.
          </div>
        </div>
      </div>
    </div>
  );
};
