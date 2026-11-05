import React, { useState, useMemo } from 'react';
import {
  FolderKanban,
  LayoutGrid,
  Zap,
  Plus,
  Settings,
  ChevronRight,
  ChevronDown,
  Layers,
  Cpu,
  Boxes,
  Wind,
  Download,
  Upload,
  Globe,
  ShieldAlert,
  AlertTriangle,
  GitFork
} from 'lucide-react';
import { analyzeDistributionHierarchy } from '@panel-analyzer/engine';
import type { ProjectRecord, PanelRecord, CircuitRecord } from '../../electron/db.js';
import { I18N, type Language } from '../i18n.js';

interface SidebarTreeProps {
  currentProject: ProjectRecord | null;
  panels: PanelRecord[];
  circuits: Record<string, CircuitRecord[]>;
  activePanelId: string | null;
  currentView: string;
  lang: Language;
  onToggleLang: () => void;
  onSelectProjectList: () => void;
  onSelectDashboard: () => void;
  onSelectValidation: () => void;
  onSelectPanel: (panelId: string) => void;
  onSelectSingleMC: () => void;
  onSelectComboLoads: () => void;
  onSelectRoomAC: () => void;
  onSelectSettings: () => void;
  onCreatePanel: () => void;
  onAddCircuit: (panelId: string) => void;
  onExportProjectJson: () => void;
  onImportProjectJson: (file: File) => void;
}

export const SidebarTree: React.FC<SidebarTreeProps> = ({
  currentProject,
  panels,
  circuits,
  activePanelId,
  currentView,
  lang,
  onToggleLang,
  onSelectProjectList,
  onSelectDashboard,
  onSelectValidation,
  onSelectPanel,
  onSelectSingleMC,
  onSelectComboLoads,
  onSelectRoomAC,
  onSelectSettings,
  onCreatePanel,
  onAddCircuit,
  onExportProjectJson,
  onImportProjectJson
}) => {
  const t = I18N[lang];
  const [expandedPanels, setExpandedPanels] = useState<Record<string, boolean>>({});
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const togglePanelExpand = (panelId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedPanels(prev => ({ ...prev, [panelId]: !prev[panelId] }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onImportProjectJson(file);
      e.target.value = '';
    }
  };

  // Distribution Hierarchy Analysis
  const hierarchyResult = useMemo(() => {
    const nodes = panels.map(p => ({
      id: p.id,
      name: p.name,
      fedFromId: p.fed_from_id,
      directDemandKva: p.raw_load || 0
    }));
    return analyzeDistributionHierarchy(nodes);
  }, [panels]);

  // Root panels (fed from utility or missing parent)
  const rootPanels = useMemo(() => {
    const panelIds = new Set(panels.map(p => p.id));
    return panels.filter(p => !p.fed_from_id || !panelIds.has(p.fed_from_id));
  }, [panels]);

  // Recursive panel node renderer
  const renderPanelNode = (panel: PanelRecord, depth: number = 0) => {
    const isActive = activePanelId === panel.id && currentView === 'panel_editor';
    const isExpanded = expandedPanels[panel.id] ?? true;
    const panelCircuits = circuits[panel.id] || [];
    const children = panels.filter(p => p.fed_from_id === panel.id);

    return (
      <div key={panel.id} style={{ marginBottom: '3px', paddingLeft: depth > 0 ? `${depth * 12}px` : '0' }}>
        {/* Panel Row */}
        <div
          onClick={() => onSelectPanel(panel.id)}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '5px 8px',
            borderRadius: 'var(--radius)',
            background: isActive ? 'var(--panel)' : 'transparent',
            borderLeft: isActive ? '3px solid var(--amber)' : '3px solid transparent',
            color: isActive ? 'var(--text)' : 'var(--text-dim)',
            fontSize: '12px',
            cursor: 'pointer'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0, flex: 1 }}>
            {(children.length > 0 || panelCircuits.length > 0) ? (
              <span
                onClick={(e) => togglePanelExpand(panel.id, e)}
                style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', color: 'var(--text-dim)' }}
              >
                {isExpanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
              </span>
            ) : (
              <span style={{ width: '13px' }} />
            )}
            <LayoutGrid size={13} color={depth === 0 ? 'var(--amber)' : 'var(--teal)'} />
            <span style={{
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              fontWeight: isActive ? 700 : (depth === 0 ? 600 : 400)
            }}>
              {panel.name}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            {children.length > 0 && (
              <span title={`${children.length} sub-panels fed`} style={{ fontSize: '9px', background: 'var(--panel)', padding: '1px 4px', borderRadius: '3px', color: 'var(--amber)' }}>
                {children.length} sub
              </span>
            )}
            <span style={{
              fontSize: '10px',
              fontFamily: 'var(--mono)',
              background: 'var(--panel-2)',
              padding: '1px 5px',
              borderRadius: '3px',
              color: 'var(--text-dim)'
            }}>
              {panelCircuits.length}
            </span>
          </div>
        </div>

        {/* Circuits & Child Panels Sub-Tree */}
        {isExpanded && (
          <div>
            {/* Child Panels */}
            {children.map(child => renderPanelNode(child, depth + 1))}

            {/* Circuits */}
            {panelCircuits.length > 0 && (
              <div style={{ paddingLeft: '20px', marginTop: '2px', borderLeft: '1px solid var(--grid)', marginLeft: '10px' }}>
                {panelCircuits.map(circ => (
                  <div
                    key={circ.id}
                    onClick={() => onSelectPanel(panel.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '2px 6px',
                      fontSize: '11px',
                      color: 'var(--text-dim)',
                      borderRadius: '3px',
                      cursor: 'pointer'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', minWidth: 0 }}>
                      <Zap size={10} color="var(--amber)" />
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {circ.name}
                      </span>
                    </div>
                    <span style={{ fontSize: '9.5px', color: 'var(--teal)', fontFamily: 'var(--mono)' }}>
                      {circ.phase}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="sidebar-tree no-print" style={{
      width: '280px',
      background: 'var(--panel-2)',
      borderRight: lang === 'rtl' ? 'none' : '1px solid var(--grid)',
      borderLeft: lang === 'rtl' ? '1px solid var(--grid)' : 'none',
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      userSelect: 'none',
      flexShrink: 0
    }}>
      {/* Brand Header */}
      <div style={{
        padding: '14px 16px',
        borderBottom: '1px solid var(--grid)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: 'var(--radius)',
            background: 'var(--amber)',
            color: '#1A1104',
            fontWeight: 800,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '15px'
          }}>
            PA
          </div>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)' }}>Panel Analyzer</div>
            <div style={{ fontSize: '10px', color: 'var(--teal)', fontFamily: 'var(--mono)' }}>MDB → SMDB → DB SUITE</div>
          </div>
        </div>

        {/* Language Toggle Button */}
        <button
          onClick={onToggleLang}
          title={t.language}
          style={{
            background: 'var(--panel)',
            border: '1px solid var(--grid)',
            color: 'var(--amber)',
            padding: '3px 7px',
            borderRadius: 'var(--radius)',
            fontSize: '11px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '3px',
            fontFamily: 'var(--mono)'
          }}
        >
          <Globe size={11} />
          <span>{lang === 'en' ? 'عربي' : 'EN'}</span>
        </button>
      </div>

      {/* Navigation Top Items */}
      <div style={{ padding: '8px', borderBottom: '1px solid var(--grid)', display: 'flex', flexDirection: 'column', gap: '2px' }}>
        <button
          onClick={onSelectProjectList}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: currentView === 'project_list' ? 'var(--panel-hover)' : 'transparent',
            border: 'none',
            color: currentView === 'project_list' ? 'var(--amber)' : 'var(--text-dim)',
            padding: '6px 10px',
            borderRadius: 'var(--radius)',
            fontSize: '12px',
            fontWeight: 600,
            cursor: 'pointer',
            textAlign: 'left'
          }}
        >
          <FolderKanban size={14} />
          <span>{t.projects}</span>
        </button>

        {currentProject && (
          <>
            <button
              onClick={onSelectDashboard}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: currentView === 'project_dashboard' ? 'var(--panel-hover)' : 'transparent',
                border: 'none',
                color: currentView === 'project_dashboard' ? 'var(--amber)' : 'var(--text)',
                padding: '6px 10px',
                borderRadius: 'var(--radius)',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                textAlign: 'left'
              }}
            >
              <Layers size={14} color="var(--teal)" />
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {currentProject.name}
              </span>
            </button>

            {/* Project Validation Center Link */}
            <button
              onClick={onSelectValidation}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: currentView === 'project_validation' ? 'var(--panel-hover)' : 'transparent',
                border: 'none',
                color: currentView === 'project_validation' ? 'var(--amber)' : (hierarchyResult.hasCycle ? 'var(--danger)' : 'var(--text-dim)'),
                padding: '6px 10px',
                borderRadius: 'var(--radius)',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                textAlign: 'left'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShieldAlert size={14} color={hierarchyResult.hasCycle ? 'var(--danger)' : 'var(--teal)'} />
                <span>Project Validation</span>
              </div>
              {hierarchyResult.hasCycle && (
                <span style={{ background: 'rgba(209,96,61,0.2)', color: 'var(--danger)', fontSize: '10px', padding: '1px 5px', borderRadius: '3px' }}>
                  LOOP!
                </span>
              )}
            </button>
          </>
        )}
      </div>

      {/* Cycle Warning Banner if loop detected */}
      {hierarchyResult.hasCycle && (
        <div style={{ background: 'rgba(209,96,61,0.18)', borderLeft: '3px solid var(--danger)', padding: '8px 12px', fontSize: '11px', color: '#ff9882' }}>
          <div style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '5px' }}>
            <AlertTriangle size={12} />
            <span>Circular Feed Loop!</span>
          </div>
          <div style={{ marginTop: '2px', wordBreak: 'break-all', fontFamily: 'var(--mono)' }}>
            {hierarchyResult.cyclePathStr}
          </div>
        </div>
      )}

      {/* Specialized NEC 440 Calculators Links */}
      <div style={{ padding: '6px 8px', borderBottom: '1px solid var(--grid)', display: 'flex', flexDirection: 'column', gap: '1px' }}>
        <button
          onClick={onSelectSingleMC}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: currentView === 'single_mc' ? 'var(--panel-hover)' : 'transparent',
            border: 'none',
            color: currentView === 'single_mc' ? 'var(--amber)' : 'var(--text-dim)',
            padding: '4px 10px',
            borderRadius: 'var(--radius)',
            fontSize: '11.5px',
            cursor: 'pointer',
            textAlign: 'left'
          }}
        >
          <Cpu size={13} />
          <span>{t.singleMC}</span>
        </button>

        <button
          onClick={onSelectComboLoads}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: currentView === 'combo_loads' ? 'var(--panel-hover)' : 'transparent',
            border: 'none',
            color: currentView === 'combo_loads' ? 'var(--amber)' : 'var(--text-dim)',
            padding: '4px 10px',
            borderRadius: 'var(--radius)',
            fontSize: '11.5px',
            cursor: 'pointer',
            textAlign: 'left'
          }}
        >
          <Boxes size={13} />
          <span>{t.comboLoads}</span>
        </button>

        <button
          onClick={onSelectRoomAC}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: currentView === 'room_ac' ? 'var(--panel-hover)' : 'transparent',
            border: 'none',
            color: currentView === 'room_ac' ? 'var(--amber)' : 'var(--text-dim)',
            padding: '4px 10px',
            borderRadius: 'var(--radius)',
            fontSize: '11.5px',
            cursor: 'pointer',
            textAlign: 'left'
          }}
        >
          <Wind size={13} />
          <span>{t.roomAC}</span>
        </button>
      </div>

      {/* Distribution Tree View (Hierarchy) */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '10px 8px' }}>
        {currentProject ? (
          <div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '2px 8px 6px',
              fontSize: '11px',
              color: 'var(--text-dim)',
              textTransform: 'uppercase',
              letterSpacing: '0.6px',
              fontWeight: 700,
              fontFamily: 'var(--mono)'
            }}>
              <span>Distribution Hierarchy</span>
              <button
                onClick={onCreatePanel}
                title="Add Distribution Board"
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--teal)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '2px'
                }}
              >
                <Plus size={14} />
              </button>
            </div>

            {panels.length === 0 ? (
              <div style={{ padding: '8px', fontSize: '11.5px', color: 'var(--text-dim)', fontStyle: 'italic' }}>
                No panels in project.
              </div>
            ) : (
              rootPanels.map(p => renderPanelNode(p, 0))
            )}
          </div>
        ) : (
          <div style={{ padding: '16px 8px', textAlign: 'center', color: 'var(--text-dim)', fontSize: '12px' }}>
            Select or create a project to explore panels and circuits.
          </div>
        )}
      </div>

      {/* Project JSON Save / Load Controls */}
      {currentProject && (
        <div style={{ padding: '8px', borderTop: '1px solid var(--grid)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
          <button
            onClick={onExportProjectJson}
            title={t.exportJson}
            style={{
              background: 'transparent',
              border: '1px solid var(--grid)',
              color: 'var(--teal)',
              padding: '5px 8px',
              borderRadius: 'var(--radius)',
              fontSize: '11px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px'
            }}
          >
            <Download size={12} />
            <span>{t.exportJson}</span>
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            title={t.importJson}
            style={{
              background: 'transparent',
              border: '1px solid var(--grid)',
              color: 'var(--amber)',
              padding: '5px 8px',
              borderRadius: 'var(--radius)',
              fontSize: '11px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px'
            }}
          >
            <Upload size={12} />
            <span>{t.importJson}</span>
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".json"
            style={{ display: 'none' }}
          />
        </div>
      )}

      {/* Settings Bottom Link */}
      <div style={{ padding: '8px', borderTop: '1px solid var(--grid)' }}>
        <button
          onClick={onSelectSettings}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: currentView === 'settings' ? 'var(--panel-hover)' : 'transparent',
            border: 'none',
            color: currentView === 'settings' ? 'var(--amber)' : 'var(--text-dim)',
            padding: '6px 10px',
            borderRadius: 'var(--radius)',
            fontSize: '12px',
            cursor: 'pointer',
            textAlign: 'left'
          }}
        >
          <Settings size={14} />
          <span>{t.settings}</span>
        </button>
      </div>
    </div>
  );
};
