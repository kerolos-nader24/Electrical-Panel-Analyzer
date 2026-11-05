import React, { useState } from 'react';
import { LayoutGrid, Zap, Plus, ArrowRight, Trash2, Calendar, User, Building } from 'lucide-react';
import type { ProjectRecord, PanelRecord, CircuitRecord } from '../../../electron/db.js';

interface ProjectDashboardViewProps {
  project: ProjectRecord;
  panels: PanelRecord[];
  circuits: Record<string, CircuitRecord[]>;
  onOpenPanel: (panelId: string) => void;
  onCreatePanel: () => void;
  onDeletePanel: (panelId: string) => void;
  onUpdateProject: (updates: Partial<ProjectRecord>) => void;
}

export const ProjectDashboardView: React.FC<ProjectDashboardViewProps> = ({
  project,
  panels,
  circuits,
  onOpenPanel,
  onCreatePanel,
  onDeletePanel,
  onUpdateProject
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(project.name);
  const [code, setCode] = useState(project.code);
  const [client, setClient] = useState(project.client);
  const [engineer, setEngineer] = useState(project.engineer);

  const totalConnectedKva = panels.reduce((sum, p) => sum + (p.raw_load || 0), 0);
  const totalCircuitsCount = Object.values(circuits).reduce((sum, arr) => sum + arr.length, 0);

  const handleSaveMeta = () => {
    onUpdateProject({ name, code, client, engineer });
    setIsEditing(false);
  };

  return (
    <div style={{ padding: '28px 36px', height: '100%', overflowY: 'auto' }}>
      {/* Header with Title and Quick Edit */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <div style={{ fontFamily: 'var(--mono)', fontSize: '11px', color: 'var(--teal)', letterSpacing: '1px', textTransform: 'uppercase' }}>
            Project Dashboard
          </div>
          <h1 style={{ fontSize: '26px', fontWeight: 700, color: 'var(--text)', marginTop: '4px' }}>{project.name}</h1>
          <div style={{ display: 'flex', gap: '16px', marginTop: '6px', color: 'var(--text-dim)', fontSize: '12.5px' }}>
            <span>Code: <strong style={{ color: 'var(--text)' }}>{project.code}</strong></span>
            {project.client && <span>Client: <strong style={{ color: 'var(--text)' }}>{project.client}</strong></span>}
            {project.engineer && <span>Engineer: <strong style={{ color: 'var(--text)' }}>{project.engineer}</strong></span>}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn secondary" onClick={() => setIsEditing(!isEditing)}>
            {isEditing ? 'Cancel Edit' : 'Edit Project Details'}
          </button>
          <button className="btn" onClick={onCreatePanel}>
            <Plus size={16} />
            <span>Add Panel</span>
          </button>
        </div>
      </div>

      {/* Edit Form Drawer */}
      {isEditing && (
        <div className="card" style={{ marginBottom: '20px', background: 'var(--panel-2)', border: '1px solid var(--amber)' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--amber)', marginBottom: '12px' }}>
            Update Project Information
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', marginBottom: '14px' }}>
            <div className="field">
              <label>Project Name</label>
              <input value={name} onChange={e => setName(e.target.value)} />
            </div>
            <div className="field">
              <label>Project Code</label>
              <input value={code} onChange={e => setCode(e.target.value)} />
            </div>
            <div className="field">
              <label>Client</label>
              <input value={client} onChange={e => setClient(e.target.value)} />
            </div>
            <div className="field">
              <label>Engineer</label>
              <input value={engineer} onChange={e => setEngineer(e.target.value)} />
            </div>
          </div>
          <button className="btn" onClick={handleSaveMeta}>Save Changes</button>
        </div>
      )}

      {/* Hero Metrics */}
      <div className="hero-grid">
        <div className="hero-box">
          <div className="lbl">Total Connected Load</div>
          <div className="val">{totalConnectedKva.toFixed(1)}<span className="u"> kVA</span></div>
        </div>
        <div className="hero-box">
          <div className="lbl">Distribution Panels</div>
          <div className="val">{panels.length}</div>
        </div>
        <div className="hero-box">
          <div className="lbl">Branch Circuits</div>
          <div className="val">{totalCircuitsCount}</div>
        </div>
        <div className="hero-box">
          <div className="lbl">Standards Engine</div>
          <div className="val" style={{ fontSize: '18px', color: 'var(--teal)' }}>NEC 440 + IEC</div>
        </div>
      </div>

      {/* Distribution Panels Table */}
      <div className="section-title">Distribution Boards & Panels</div>
      {panels.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '30px' }}>
          <p style={{ color: 'var(--text-dim)', fontSize: '13px' }}>No panels added to this project yet.</p>
          <button className="btn" onClick={onCreatePanel} style={{ marginTop: '12px' }}>
            <Plus size={15} />
            <span>Create First Panel</span>
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '14px' }}>
          {panels.map(panel => {
            const panelCircs = circuits[panel.id] || [];
            return (
              <div
                key={panel.id}
                className="card"
                onClick={() => onOpenPanel(panel.id)}
                style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{
                      fontSize: '11px',
                      color: 'var(--teal)',
                      fontFamily: 'var(--mono)',
                      background: 'var(--panel-2)',
                      padding: '2px 6px',
                      borderRadius: '3px',
                      textTransform: 'uppercase'
                    }}>
                      {panel.panel_type}
                    </span>
                    <span style={{ fontSize: '11px', color: 'var(--text-dim)', fontFamily: 'var(--mono)' }}>
                      {panel.system_type.toUpperCase()} · {panel.voltage}V
                    </span>
                  </div>

                  <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text)', marginBottom: '8px' }}>
                    {panel.name}
                  </h3>

                  <div style={{ display: 'flex', gap: '14px', fontSize: '12px', color: 'var(--text-dim)' }}>
                    <span>Load: <strong style={{ color: 'var(--amber)' }}>{panel.raw_load} {panel.load_unit.toUpperCase()}</strong></span>
                    <span>Circuits: <strong style={{ color: 'var(--text)' }}>{panelCircs.length}</strong></span>
                  </div>
                </div>

                <div style={{
                  marginTop: '14px',
                  paddingTop: '10px',
                  borderTop: '1px solid var(--grid)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}>
                  <button
                    title="Delete Panel"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm(`Delete panel "${panel.name}"?`)) onDeletePanel(panel.id);
                    }}
                    style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer' }}
                  >
                    <Trash2 size={13} />
                  </button>

                  <div style={{ color: 'var(--amber)', fontSize: '12px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span>Open Panel Sizer</span>
                    <ArrowRight size={13} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
