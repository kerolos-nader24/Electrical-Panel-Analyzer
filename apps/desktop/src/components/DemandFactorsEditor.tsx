import React, { useState } from 'react';
import {
  type DemandFactorsConfig,
  type PanelDemandSummary,
  type LoadCategory
} from '@panel-analyzer/engine';
import { SlidersHorizontal, ChevronDown, ChevronRight } from 'lucide-react';

interface Props {
  factors: DemandFactorsConfig;
  summary: PanelDemandSummary;
  onUpdateFactors: (updated: DemandFactorsConfig) => void;
}

export const DemandFactorsEditor: React.FC<Props> = ({
  factors,
  summary,
  onUpdateFactors
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);

  const handleChange = (category: LoadCategory, val: number) => {
    const clamped = Math.max(0.1, Math.min(1.0, val));
    onUpdateFactors({
      ...factors,
      [category]: clamped
    });
  };

  const categories: { key: LoadCategory; label: string }[] = [
    { key: 'lighting', label: 'Lighting Circuits' },
    { key: 'socket', label: 'Socket & General Power' },
    { key: 'motor', label: 'Motors & Mechanical Loads' },
    { key: 'ac', label: 'HVAC & Refrigeration' },
    { key: 'other', label: 'Other Circuits' }
  ];

  return (
    <div className="card" style={{ marginBottom: '14px' }}>
      <div
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          cursor: 'pointer',
          userSelect: 'none'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <SlidersHorizontal size={15} color="var(--amber)" />
          <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--amber)' }}>
            Demand Factors per Load Category (Editable Table)
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '12px', color: 'var(--teal)', fontFamily: 'var(--mono)' }}>
            Overall Demand Factor: <strong>{(summary.overallDemandFactor * 100).toFixed(1)}%</strong> ({summary.totalDemandKva.toFixed(1)} kVA / {summary.totalConnectedKva.toFixed(1)} kVA)
          </span>
          {isOpen ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
        </div>
      </div>

      {isOpen && (
        <div style={{ marginTop: '14px', borderTop: '1px solid var(--grid)', paddingTop: '12px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
            <thead>
              <tr style={{ background: 'var(--panel-2)', color: 'var(--text-dim)', textAlign: 'left', fontFamily: 'var(--mono)' }}>
                <th style={{ padding: '6px 10px' }}>Load Category</th>
                <th style={{ padding: '6px 10px' }}>Connected (kVA)</th>
                <th style={{ padding: '6px 10px' }}>Demand Factor (0.1–1.0)</th>
                <th style={{ padding: '6px 10px' }}>Demand Load (kVA)</th>
              </tr>
            </thead>
            <tbody>
              {categories.map(c => {
                const data = summary.categories[c.key];
                return (
                  <tr key={c.key} style={{ borderBottom: '1px solid var(--grid)' }}>
                    <td style={{ padding: '6px 10px', fontWeight: 600 }}>{c.label}</td>
                    <td style={{ padding: '6px 10px', fontFamily: 'var(--mono)' }}>
                      {data ? data.connectedKva.toFixed(1) : '0.0'} kVA
                    </td>
                    <td style={{ padding: '6px 10px' }}>
                      <input
                        type="number"
                        min="0.1"
                        max="1.0"
                        step="0.05"
                        value={factors[c.key] ?? 1.0}
                        onChange={e => handleChange(c.key, parseFloat(e.target.value) || 1.0)}
                        style={{
                          width: '75px',
                          background: 'transparent',
                          border: '1px solid var(--grid)',
                          color: 'var(--amber)',
                          padding: '3px 6px',
                          borderRadius: '3px',
                          fontFamily: 'var(--mono)',
                          fontSize: '12px'
                        }}
                      />
                    </td>
                    <td style={{ padding: '6px 10px', fontFamily: 'var(--mono)', color: 'var(--teal)', fontWeight: 600 }}>
                      {data ? data.demandKva.toFixed(1) : '0.0'} kVA
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr style={{ background: 'var(--panel-2)', fontWeight: 700 }}>
                <td style={{ padding: '8px 10px' }}>Panel Totals</td>
                <td style={{ padding: '8px 10px', fontFamily: 'var(--mono)' }}>{summary.totalConnectedKva.toFixed(1)} kVA</td>
                <td style={{ padding: '8px 10px', fontFamily: 'var(--mono)', color: 'var(--amber)' }}>
                  DF = {(summary.overallDemandFactor).toFixed(3)}
                </td>
                <td style={{ padding: '8px 10px', fontFamily: 'var(--mono)', color: 'var(--teal)' }}>
                  {summary.totalDemandKva.toFixed(1)} kVA
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
};
