import React, { useState } from 'react';
import { Plus, FolderKanban, Copy, Trash2, ArrowRight, Calendar, User, Hash } from 'lucide-react';
import type { ProjectRecord } from '../../../electron/db.js';

interface ProjectListViewProps {
  projects: ProjectRecord[];
  onOpenProject: (projectId: string) => void;
  onCreateProject: (data: { name: string; code: string; client: string; engineer: string }) => void;
  onDuplicateProject: (id: string) => void;
  onDeleteProject: (id: string) => void;
}

export const ProjectListView: React.FC<ProjectListViewProps> = ({
  projects,
  onOpenProject,
  onCreateProject,
  onDuplicateProject,
  onDeleteProject
}) => {
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [client, setClient] = useState('');
  const [engineer, setEngineer] = useState('');
  const [search, setSearch] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onCreateProject({
      name: name.trim(),
      code: code.trim() || 'PROJ-' + Math.floor(100 + Math.random() * 900),
      client: client.trim(),
      engineer: engineer.trim()
    });
    setName('');
    setCode('');
    setClient('');
    setEngineer('');
    setShowModal(false);
  };

  const filtered = projects.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.code.toLowerCase().includes(search.toLowerCase()) ||
    p.client.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ padding: '28px 36px', height: '100%', overflowY: 'auto' }}>
      {/* Title Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <div style={{ fontFamily: 'var(--mono)', fontSize: '11px', color: 'var(--teal)', letterSpacing: '1px', textTransform: 'uppercase' }}>
            Workspaces & Projects
          </div>
          <h1 style={{ fontSize: '26px', fontWeight: 700, color: 'var(--text)', marginTop: '4px' }}>Electrical Projects</h1>
          <p style={{ color: 'var(--text-dim)', fontSize: '13px', marginTop: '2px' }}>
            Manage electrical panel sizing projects, distribution boards, and Elsewedy cable schedules.
          </p>
        </div>
        <button className="btn" onClick={() => setShowModal(true)}>
          <Plus size={16} />
          <span>New Project</span>
        </button>
      </div>

      {/* Filter / Search Bar */}
      <div style={{ marginBottom: '20px', maxWidth: '400px' }}>
        <input
          type="text"
          placeholder="Search projects by name, code, or client..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            width: '100%',
            background: 'var(--panel)',
            border: '1px solid var(--grid)',
            borderRadius: 'var(--radius)',
            padding: '8px 12px',
            color: 'var(--text)',
            fontSize: '13px',
            fontFamily: 'var(--mono)'
          }}
        />
      </div>

      {/* Projects Grid */}
      {filtered.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '40px 20px' }}>
          <FolderKanban size={36} color="var(--text-dim)" style={{ margin: '0 auto 12px' }} />
          <h3 style={{ fontSize: '16px', color: 'var(--text)' }}>No projects found</h3>
          <p style={{ color: 'var(--text-dim)', fontSize: '13px', marginTop: '4px' }}>
            Create your first electrical design project to begin sizing panels and cables.
          </p>
          <button className="btn" onClick={() => setShowModal(true)} style={{ marginTop: '16px' }}>
            <Plus size={16} />
            <span>Create Project</span>
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
          {filtered.map(project => (
            <div
              key={project.id}
              className="card"
              style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                transition: 'border-color 0.15s, transform 0.15s',
                cursor: 'pointer'
              }}
              onClick={() => onOpenProject(project.id)}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{
                    fontFamily: 'var(--mono)',
                    fontSize: '11px',
                    color: 'var(--teal)',
                    background: 'var(--panel-2)',
                    padding: '2px 6px',
                    borderRadius: '3px'
                  }}>
                    {project.code}
                  </span>
                  <span style={{ fontSize: '11px', color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Calendar size={11} />
                    {new Date(project.updated_at).toLocaleDateString()}
                  </span>
                </div>
                <h3 style={{ fontSize: '17px', fontWeight: 700, color: 'var(--text)', marginBottom: '8px' }}>
                  {project.name}
                </h3>
                {project.client && (
                  <div style={{ fontSize: '12px', color: 'var(--text-dim)', marginBottom: '4px' }}>
                    Client: <strong style={{ color: 'var(--text)' }}>{project.client}</strong>
                  </div>
                )}
                {project.engineer && (
                  <div style={{ fontSize: '12px', color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <User size={12} />
                    <span>{project.engineer}</span>
                  </div>
                )}
              </div>

              {/* Actions Footer */}
              <div style={{
                marginTop: '16px',
                paddingTop: '12px',
                borderTop: '1px solid var(--grid)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    title="Duplicate project"
                    onClick={(e) => { e.stopPropagation(); onDuplicateProject(project.id); }}
                    style={{
                      background: 'none',
                      border: '1px solid var(--grid)',
                      borderRadius: '3px',
                      color: 'var(--text-dim)',
                      padding: '4px 8px',
                      cursor: 'pointer'
                    }}
                  >
                    <Copy size={13} />
                  </button>
                  <button
                    title="Delete project"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm(`Are you sure you want to delete project "${project.name}"?`)) {
                        onDeleteProject(project.id);
                      }
                    }}
                    style={{
                      background: 'none',
                      border: '1px solid var(--grid)',
                      borderRadius: '3px',
                      color: 'var(--danger)',
                      padding: '4px 8px',
                      cursor: 'pointer'
                    }}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>

                <div style={{ color: 'var(--amber)', fontSize: '12.5px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span>Open</span>
                  <ArrowRight size={14} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* New Project Modal */}
      {showModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(5, 10, 16, 0.75)',
          backdropFilter: 'blur(3px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div className="card" style={{ width: '480px', maxWidth: '90%', padding: '24px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text)', marginBottom: '16px' }}>
              Create New Electrical Project
            </h2>
            <form onSubmit={handleSubmit}>
              <div className="field" style={{ marginBottom: '12px' }}>
                <label>Project Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Commercial Complex - Phase 1"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div className="field" style={{ marginBottom: '12px' }}>
                <label>Project Code</label>
                <input
                  type="text"
                  placeholder="e.g. PRJ-2026-001"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                />
              </div>

              <div className="field" style={{ marginBottom: '12px' }}>
                <label>Client Name</label>
                <input
                  type="text"
                  placeholder="e.g. Acme Development Corp"
                  value={client}
                  onChange={(e) => setClient(e.target.value)}
                />
              </div>

              <div className="field" style={{ marginBottom: '20px' }}>
                <label>Lead Electrical Engineer</label>
                <input
                  type="text"
                  placeholder="e.g. Eng. Ahmed Mostafa, PE"
                  value={engineer}
                  onChange={(e) => setEngineer(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  className="btn secondary"
                  onClick={() => setShowModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn">
                  Create Project
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
