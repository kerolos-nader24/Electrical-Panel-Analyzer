import React, { useState, useEffect } from 'react';
import {
  exportCatalogueToCsv,
  parseCatalogueFromCsv,
  exportCatalogueToJson,
  parseCatalogueFromJson,
  type CableCatalogueEntry
} from '@panel-analyzer/engine';
import {
  Database,
  X,
  Plus,
  Trash2,
  Edit2,
  Download,
  Upload,
  RefreshCw,
  Search,
  Check,
  FileCode,
  FileSpreadsheet
} from 'lucide-react';
import type { Language } from '../i18n.js';

interface Props {
  lang: Language;
  onClose: () => void;
}

export const CatalogueManagerModal: React.FC<Props> = ({ lang, onClose }) => {
  const isAr = lang === 'ar';
  const [entries, setEntries] = useState<CableCatalogueEntry[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterTable, setFilterTable] = useState<string>('all');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showAddForm, setShowAddForm] = useState<boolean>(false);

  // Form State for new/edited cable
  const [formData, setFormData] = useState<CableCatalogueEntry>({
    manufacturer: 'Elsewedy Cables',
    tableKey: 'cu_xlpe_1core',
    sizeMm2: 25,
    groundAmp: 148,
    ductAmp: 118,
    airAmp: 140,
    diaMm: 13.5,
    resistance: 0.927,
    reactance: 0.08
  });

  const api = window.electronAPI;

  const loadData = async () => {
    setLoading(true);
    try {
      if (api?.getCableCatalogue) {
        const data = await api.getCableCatalogue();
        setEntries(data.map((r: any) => ({
          id: r.id,
          manufacturer: r.manufacturer || 'Elsewedy Cables',
          tableKey: r.table_key || r.tableKey,
          sizeMm2: r.size_mm2 || r.sizeMm2,
          groundAmp: r.ground_amp || r.groundAmp,
          ductAmp: r.duct_amp || r.ductAmp,
          airAmp: r.air_amp || r.airAmp,
          diaMm: r.dia_mm || r.diaMm,
          resistance: r.resistance || 0,
          reactance: r.reactance || 0.08
        })));
      } else {
        // Fallback for browser preview
        setEntries([
          { id: 1, manufacturer: 'Elsewedy Cables', tableKey: 'cu_xlpe_1core', sizeMm2: 16, groundAmp: 115, ductAmp: 92, airAmp: 108, diaMm: 11.8, resistance: 1.45, reactance: 0.082 },
          { id: 2, manufacturer: 'Elsewedy Cables', tableKey: 'cu_xlpe_1core', sizeMm2: 25, groundAmp: 148, ductAmp: 118, airAmp: 140, diaMm: 13.5, resistance: 0.927, reactance: 0.08 },
          { id: 3, manufacturer: 'Elsewedy Cables', tableKey: 'cu_xlpe_4core', sizeMm2: 50, groundAmp: 195, ductAmp: 155, airAmp: 185, diaMm: 31.0, resistance: 0.493, reactance: 0.075 },
          { id: 4, manufacturer: 'Ducab', tableKey: 'cu_xlpe_4core', sizeMm2: 70, groundAmp: 240, ductAmp: 190, airAmp: 235, diaMm: 36.0, resistance: 0.342, reactance: 0.073 }
        ]);
      }
    } catch (e) {
      console.error('Failed to load catalogue:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSaveEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (api?.saveCableCatalogueEntry) {
        await api.saveCableCatalogueEntry({
          id: editingId || undefined,
          manufacturer: formData.manufacturer,
          table_key: formData.tableKey,
          size_mm2: Number(formData.sizeMm2),
          ground_amp: Number(formData.groundAmp),
          duct_amp: Number(formData.ductAmp),
          air_amp: Number(formData.airAmp),
          dia_mm: Number(formData.diaMm),
          resistance: Number(formData.resistance),
          reactance: Number(formData.reactance)
        });
      }
      setShowAddForm(false);
      setEditingId(null);
      await loadData();
    } catch (err) {
      alert('Failed to save cable: ' + err);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this cable specification?')) return;
    try {
      if (api?.deleteCableCatalogueEntry) {
        await api.deleteCableCatalogueEntry(id);
      }
      setEntries(prev => prev.filter(e => e.id !== id));
    } catch (err) {
      alert('Failed to delete cable: ' + err);
    }
  };

  const handleEdit = (entry: CableCatalogueEntry) => {
    setFormData(entry);
    setEditingId(entry.id || null);
    setShowAddForm(true);
  };

  // Export CSV
  const handleExportCsv = () => {
    const csv = exportCatalogueToCsv(entries);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cable_catalogue_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Export JSON
  const handleExportJson = () => {
    const jsonStr = exportCatalogueToJson(entries);
    const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cable_catalogue_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Import CSV
  const handleImportCsv = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const text = reader.result as string;
        const imported = parseCatalogueFromCsv(text);
        if (imported.length === 0) {
          alert('No valid cable rows found in CSV file.');
          return;
        }

        if (api?.importCableCatalogue) {
          await api.importCableCatalogue(imported);
          await loadData();
          alert(`Successfully imported ${imported.length} cable specifications!`);
        } else {
          setEntries(prev => [...prev, ...imported]);
          alert(`Imported ${imported.length} cable specifications into view.`);
        }
      } catch (err) {
        alert('Error parsing CSV: ' + err);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Import JSON
  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const text = reader.result as string;
        const imported = parseCatalogueFromJson(text);
        if (imported.length === 0) {
          alert('No valid cable specifications found in JSON file.');
          return;
        }

        if (api?.importCableCatalogue) {
          await api.importCableCatalogue(imported);
          await loadData();
          alert(`Successfully imported ${imported.length} cable specifications!`);
        } else {
          setEntries(prev => [...prev, ...imported]);
          alert(`Imported ${imported.length} cable specifications into view.`);
        }
      } catch (err) {
        alert('Error parsing JSON: ' + err);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Filtered entries
  const filtered = entries.filter(e => {
    const matchesSearch =
      (e.manufacturer || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.tableKey.toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(e.sizeMm2).includes(searchTerm);
    const matchesTable = filterTable === 'all' || e.tableKey === filterTable;
    return matchesSearch && matchesTable;
  });

  const uniqueTables = Array.from(new Set(entries.map(e => e.tableKey)));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="flex flex-col w-[96vw] h-[92vh] max-w-[1400px] bg-[#0E1A24] border border-[#2A3B4C] rounded-xl shadow-2xl overflow-hidden">
        {/* Header Toolbar */}
        <div className="flex flex-wrap items-center justify-between px-6 py-4 bg-[#142331] border-b border-[#2A3B4C] gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[#4FB3A9]/10 border border-[#4FB3A9]/30 text-[#4FB3A9]">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-wide flex items-center gap-2">
                <span>{isAr ? 'إدارة كتالوج الكابلات ومواصفات المصنعين' : 'Cable Catalogue & Manufacturer Manager'}</span>
                <span className="text-xs px-2 py-0.5 rounded bg-[#E8A33D]/20 text-[#E8A33D] border border-[#E8A33D]/30 font-mono">
                  {entries.length} {isAr ? 'مقاس مسجل' : 'Specifications'}
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                {isAr ? 'تعديل وحصر مقاطع الكابلات، سعة التحمل، المقاومة والممانعة، وتصدير واستيراد البيانات' : 'Custom cable libraries, ampacities per installation method, AC impedance, and CSV/JSON I/O'}
              </p>
            </div>
          </div>

          <div className="flex items-center flex-wrap gap-2.5">
            {/* Export Actions */}
            <button
              onClick={handleExportCsv}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#142331] hover:bg-[#1C3246] border border-[#2A3B4C] text-xs font-medium text-slate-200 transition-colors"
              title="Export catalogue as CSV"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-[#0D9488]" />
              <span>Export CSV</span>
            </button>

            <button
              onClick={handleExportJson}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#142331] hover:bg-[#1C3246] border border-[#2A3B4C] text-xs font-medium text-slate-200 transition-colors"
              title="Export catalogue as JSON"
            >
              <FileCode className="w-3.5 h-3.5 text-[#38BDF8]" />
              <span>Export JSON</span>
            </button>

            {/* Import Actions */}
            <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#142331] hover:bg-[#1C3246] border border-[#2A3B4C] text-xs font-medium text-slate-200 transition-colors cursor-pointer">
              <Upload className="w-3.5 h-3.5 text-[#E8A33D]" />
              <span>Import CSV</span>
              <input type="file" accept=".csv" onChange={handleImportCsv} style={{ display: 'none' }} />
            </label>

            <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#142331] hover:bg-[#1C3246] border border-[#2A3B4C] text-xs font-medium text-slate-200 transition-colors cursor-pointer">
              <Upload className="w-3.5 h-3.5 text-[#38BDF8]" />
              <span>Import JSON</span>
              <input type="file" accept=".json" onChange={handleImportJson} style={{ display: 'none' }} />
            </label>

            {/* Add Cable Button */}
            <button
              onClick={() => {
                setEditingId(null);
                setFormData({
                  manufacturer: 'Elsewedy Cables',
                  tableKey: 'cu_xlpe_1core',
                  sizeMm2: 25,
                  groundAmp: 148,
                  ductAmp: 118,
                  airAmp: 140,
                  diaMm: 13.5,
                  resistance: 0.927,
                  reactance: 0.08
                });
                setShowAddForm(true);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#E8A33D] hover:bg-[#D9932B] text-slate-950 text-xs font-bold transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{isAr ? '+ إضافة مقاس' : '+ Add Cable'}</span>
            </button>

            {/* Refresh */}
            <button
              onClick={loadData}
              className="p-1.5 rounded-lg bg-[#142331] hover:bg-[#1C3246] border border-[#2A3B4C] text-slate-400 hover:text-white transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>

            {/* Close */}
            <button
              onClick={onClose}
              className="p-1.5 ml-2 rounded-lg bg-[#1E3042] hover:bg-rose-950/60 hover:text-rose-400 text-slate-400 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="flex flex-wrap items-center justify-between px-6 py-3 bg-[#0A131C] border-b border-[#2A3B4C] gap-3">
          <div className="flex items-center gap-3 flex-1 min-w-[260px]">
            <div className="relative flex-1 max-w-[360px]">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
              <input
                type="text"
                placeholder={isAr ? 'بحث بالشركة المصنعة أو نوع الكابل أو المقطع...' : 'Search manufacturer, table key, or size...'}
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-[#142331] border border-[#2A3B4C] rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-[#4FB3A9]"
              />
            </div>

            <select
              value={filterTable}
              onChange={e => setFilterTable(e.target.value)}
              className="bg-[#142331] border border-[#2A3B4C] rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-[#4FB3A9]"
            >
              <option value="all">{isAr ? 'جميع جداول الكابلات' : 'All Cable Types'}</option>
              {uniqueTables.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          <div className="text-xs text-slate-400 font-mono">
            Showing {filtered.length} of {entries.length} entries
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-auto p-6 flex flex-col gap-6">
          {/* Add / Edit Form Card */}
          {showAddForm && (
            <form onSubmit={handleSaveEntry} className="bg-[#142331] border border-[#4FB3A9]/40 rounded-xl p-5 shadow-xl">
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-[#2A3B4C]">
                <h3 className="text-sm font-bold text-[#4FB3A9] flex items-center gap-2">
                  <Plus className="w-4 h-4" />
                  <span>{editingId ? 'Edit Cable Specification' : 'Add New Cable Specification'}</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs mb-4">
                <div>
                  <label className="block text-slate-400 mb-1">Manufacturer</label>
                  <input
                    type="text"
                    required
                    value={formData.manufacturer}
                    onChange={e => setFormData({ ...formData, manufacturer: e.target.value })}
                    className="w-full bg-[#0E1A24] border border-[#2A3B4C] rounded px-2.5 py-1.5 text-slate-200"
                    placeholder="e.g. Elsewedy Electric"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Table Key / Type</label>
                  <input
                    type="text"
                    required
                    value={formData.tableKey}
                    onChange={e => setFormData({ ...formData, tableKey: e.target.value })}
                    className="w-full bg-[#0E1A24] border border-[#2A3B4C] rounded px-2.5 py-1.5 text-slate-200"
                    placeholder="e.g. cu_xlpe_1core"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Cross-Section (mm²)</label>
                  <input
                    type="number"
                    step="0.5"
                    required
                    value={formData.sizeMm2}
                    onChange={e => setFormData({ ...formData, sizeMm2: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-[#0E1A24] border border-[#2A3B4C] rounded px-2.5 py-1.5 text-slate-200 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Outer Diameter (mm)</label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={formData.diaMm}
                    onChange={e => setFormData({ ...formData, diaMm: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-[#0E1A24] border border-[#2A3B4C] rounded px-2.5 py-1.5 text-slate-200 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Ground Ampacity (A)</label>
                  <input
                    type="number"
                    required
                    value={formData.groundAmp}
                    onChange={e => setFormData({ ...formData, groundAmp: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-[#0E1A24] border border-[#2A3B4C] rounded px-2.5 py-1.5 text-slate-200 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Duct Ampacity (A)</label>
                  <input
                    type="number"
                    required
                    value={formData.ductAmp}
                    onChange={e => setFormData({ ...formData, ductAmp: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-[#0E1A24] border border-[#2A3B4C] rounded px-2.5 py-1.5 text-slate-200 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Air Ampacity (A)</label>
                  <input
                    type="number"
                    required
                    value={formData.airAmp}
                    onChange={e => setFormData({ ...formData, airAmp: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-[#0E1A24] border border-[#2A3B4C] rounded px-2.5 py-1.5 text-slate-200 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">AC Resistance R (Ω/km)</label>
                  <input
                    type="number"
                    step="0.001"
                    required
                    value={formData.resistance}
                    onChange={e => setFormData({ ...formData, resistance: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-[#0E1A24] border border-[#2A3B4C] rounded px-2.5 py-1.5 text-slate-200 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Reactance X (Ω/km)</label>
                  <input
                    type="number"
                    step="0.001"
                    required
                    value={formData.reactance}
                    onChange={e => setFormData({ ...formData, reactance: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-[#0E1A24] border border-[#2A3B4C] rounded px-2.5 py-1.5 text-slate-200 font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-3 py-1.5 rounded-lg bg-[#1E3042] text-slate-300 text-xs font-medium hover:bg-[#2A3E52]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-[#4FB3A9] text-slate-950 text-xs font-bold hover:bg-[#3EA298]"
                >
                  Save Specification
                </button>
              </div>
            </form>
          )}

          {/* Catalogue Data Grid */}
          <div className="bg-[#142331] border border-[#2A3B4C] rounded-xl overflow-hidden shadow">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#0A131C] text-slate-400 font-mono border-b border-[#2A3B4C]">
                  <th className="py-2.5 px-3">Manufacturer</th>
                  <th className="py-2.5 px-3">Table Key</th>
                  <th className="py-2.5 px-3">Size (mm²)</th>
                  <th className="py-2.5 px-3">Ground (A)</th>
                  <th className="py-2.5 px-3">Duct (A)</th>
                  <th className="py-2.5 px-3">Air (A)</th>
                  <th className="py-2.5 px-3">Dia (mm)</th>
                  <th className="py-2.5 px-3">R (Ω/km)</th>
                  <th className="py-2.5 px-3">X (Ω/km)</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1E2E3E] text-slate-200">
                {filtered.map((item, idx) => (
                  <tr key={item.id || idx} className="hover:bg-[#1A2C3D] transition-colors">
                    <td className="py-2 px-3 font-semibold text-slate-100">{item.manufacturer}</td>
                    <td className="py-2 px-3 font-mono text-[#38BDF8]">{item.tableKey}</td>
                    <td className="py-2 px-3 font-mono font-bold text-[#E8A33D]">{item.sizeMm2}</td>
                    <td className="py-2 px-3 font-mono">{item.groundAmp}</td>
                    <td className="py-2 px-3 font-mono">{item.ductAmp}</td>
                    <td className="py-2 px-3 font-mono">{item.airAmp}</td>
                    <td className="py-2 px-3 font-mono">{item.diaMm}</td>
                    <td className="py-2 px-3 font-mono">{item.resistance ? item.resistance.toFixed(4) : '0.0000'}</td>
                    <td className="py-2 px-3 font-mono">{item.reactance ? item.reactance.toFixed(3) : '0.080'}</td>
                    <td className="py-2 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleEdit(item)}
                          className="p-1 rounded hover:bg-[#2A3E52] text-slate-400 hover:text-white"
                          title="Edit"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        {item.id && (
                          <button
                            onClick={() => handleDelete(item.id!)}
                            className="p-1 rounded hover:bg-rose-950/60 text-slate-400 hover:text-rose-400"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
