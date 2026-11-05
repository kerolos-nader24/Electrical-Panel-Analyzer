import React, { useState, 
  
 } from 'react';
import type { ProjectRecord, PanelRecord, CircuitRecord } from '../../electron/db.js';
import type { PanelCalculationResult } from '../views/PanelEditorView.js';
import {
  calculatePanelBoq,
  generateStepByStepDerivations,
  resolveCalculationProfile,
  type BoqCircuitInput,
  type BoqPanelInput,
  type DerivationInputs,
  type CalculationProfile
} from '@panel-analyzer/engine';
import { generateExcelWorkbookXml } from '../services/excelExport.js';
import { Printer, Download, X, Globe, Building2, CheckCircle2, AlertTriangle, FileSpreadsheet, ShieldCheck } from 'lucide-react';
import type { Language } from '../i18n.js';

interface Props {
  project: ProjectRecord | null;
  panel: PanelRecord;
  calc: PanelCalculationResult;
  circuits: CircuitRecord[];
  calculatedCircuits: any[];
  settings: Record<string, string>;
  initialLang?: Language;
  onClose: () => void;
}

export const PrintableReportModal: React.FC<Props> = ({
  project,
  panel,
  calc,
  circuits,
  calculatedCircuits,
  settings,
  initialLang = 'en',
  onClose
}) => {
  const [reportLang, setReportLang] = useState<Language>(initialLang);

  const companyName = settings['company_name'] || 'ELECTRICAL ENGINEERING CONSULTANTS';
  const companyTagline = settings['company_tagline'] || 'Power Distribution & HVAC Engineering';
  const companyAddress = settings['company_address'] || 'Cairo, Egypt • Tel: +20 2 1234 5678';
  const companyLogo = settings['company_logo'] || '';

  const isAr = reportLang === 'ar';

  const currentDate = new Date().toLocaleDateString(isAr ? 'ar-EG' : 'en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });

  // Resolve Calculation Standard Profile
  const profile: CalculationProfile = useMemo(() => {
    try {
      const cfg = settings['calculation_profile_config'];
      if (cfg) {
        const parsed = JSON.parse(cfg);
        return resolveCalculationProfile(parsed.id || 'iec', parsed);
      }
    } catch (e) {
      // fallback
    }
    return resolveCalculationProfile('iec');
  }, [settings]);

  // Calculate BOQ using pure engine
  const boq = useMemo(() => {
    const boqPanel: BoqPanelInput = {
      name: panel.name,
      systemType: panel.system_type,
      voltage: panel.voltage,
      incomerBreaker: calc.In,
      incomerPoles: panel.system_type.includes('3') ? '4P' : '2P',
      incomerCableTag: calc.tag,
      incomerLengthM: panel.cable_length,
      incomerConduitSize: calc.conduit?.size
    };

    const boqCircuits: BoqCircuitInput[] = calculatedCircuits.map(c => ({
      circuitNumber: c.circuit_number,
      name: c.name,
      loadType: c.load_type,
      phase: c.phase,
      lengthM: c.length_m || 20,
      breakerRating: c.breaker || 20,
      breakerPoles: c.phase === '3P' ? '3P' : '1P',
      cableTag: `${c.runs > 1 ? c.runs + 'x(' : ''}${c.phase === '3P' ? '4' : '3'}x${c.cableSize}mm² ${(c.conductor || 'Cu').toUpperCase()}/${(c.insulation || 'XLPE').toUpperCase()}`,
      cableSize: c.cableSize,
      conductor: c.conductor,
      insulation: c.insulation,
      conduitSize: c.phase === '3P' ? 32 : 20
    }));

    return calculatePanelBoq(boqPanel, boqCircuits);
  }, [panel, calc, calculatedCircuits]);

  // Generate Step-by-Step Derivations using pure engine
  const derivations = useMemo(() => {
    const is3P = panel.system_type.includes('3');
    const inp: DerivationInputs = {
      panelName: panel.name,
      voltage: panel.voltage,
      systemType: panel.system_type,
      isThreePhase: is3P,
      loadKva: panel.raw_load,
      pf: panel.pf,
      lengthM: panel.cable_length,
      deratingK: panel.derate,
      vdropMax: panel.vdrop_max,
      iscKa: panel.isc || 10,
      fclearSec: panel.fclear || 0.1,
      conductor: panel.conductor as any,
      insulation: panel.insulation as any,
      Ib: calc.Ib,
      In: calc.In,
      cableSize: calc.cable?.size ?? 25,
      cableAmpacity: calc.cable?.ampacity ?? 100,
      actualIz: calc.coord?.Iz ?? 100,
      vDropV: calc.vdrop?.vDrop ?? 0,
      vDropPct: calc.vdrop?.vDropPct ?? 0,
      sMinSc: calc.sc?.Smin ?? 16,
      scK: calc.sc?.k ?? 143,
      conduitSize: calc.conduit?.size ?? 50,
      conduitFillPct: calc.conduit?.fillPct ?? 25,
      neutralSize: calc.neutral,
      eccSize: calc.ecc,
      cadTag: calc.tag
    };

    return generateStepByStepDerivations(inp);
  }, [panel, calc]);

  // Excel (.xlsx) Download Handler
  const handleDownloadExcel = () => {
    const xmlContent = generateExcelWorkbookXml({
      project,
      panel,
      circuits,
      calculatedCircuits,
      boq,
      settings
    });

    const blob = new Blob([xmlContent], { type: 'application/vnd.ms-excel;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${panel.name.replace(/\s+/g, '_')}_Schedule_BOQ.xls`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(5, 10, 15, 0.85)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: '20px'
    }}>
      <div style={{
        background: '#ffffff',
        color: '#111827',
        width: '100%',
        maxWidth: '1000px',
        maxHeight: '92vh',
        overflowY: 'auto',
        borderRadius: '8px',
        padding: '36px',
        boxShadow: '0 20px 40px rgba(0,0,0,0.6)',
        position: 'relative',
        fontFamily: isAr ? "'Cairo', 'Segoe UI', Tahoma, sans-serif" : "'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
      }} className="print-report-container">

        {/* Modal Toolbar (Hidden during Print) */}
        <div className="no-print" style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '24px',
          borderBottom: '1px solid #E5E7EB',
          paddingBottom: '14px',
          gap: '12px'
        }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#142A38', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FileSpreadsheet size={20} color="#0D9488" />
              <span>{isAr ? 'تقرير الحسابات الهندسية وجداول التوزيع' : 'Engineering Calculation Report & Schedules'}</span>
            </h2>
            <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#6B7280' }}>
              {isAr ? 'مستند طباعة رسمي بصيغة PDF وجداول إكسل تفصيلية' : 'Formal PDF Print Document & Multi-Tab Excel Workbook'}
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {/* Language Toggle */}
            <button
              onClick={() => setReportLang(prev => (prev === 'en' ? 'ar' : 'en'))}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background: '#F3F4F6',
                color: '#1F2937',
                border: '1px solid #D1D5DB',
                borderRadius: '6px',
                padding: '7px 12px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              <Globe size={14} color="#0D9488" />
              <span>{isAr ? 'English Report' : 'التقرير بالعربية'}</span>
            </button>

            {/* Excel Download */}
            <button
              onClick={handleDownloadExcel}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background: '#047857',
                color: '#ffffff',
                border: 'none',
                borderRadius: '6px',
                padding: '7px 14px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
              title="Download 4-Sheet Excel workbook with formulas"
            >
              <Download size={14} />
              <span>{isAr ? 'تحميل جدول إكسل (.xlsx)' : 'Download Excel (.xlsx)'}</span>
            </button>

            {/* Print / Save PDF */}
            <button
              onClick={handlePrint}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background: '#E8A33D',
                color: '#1A1104',
                fontWeight: 700,
                border: 'none',
                borderRadius: '6px',
                padding: '7px 16px',
                fontSize: '12px',
                cursor: 'pointer'
              }}
            >
              <Printer size={14} />
              <span>{isAr ? 'طباعة / حفظ PDF' : 'Print / Save PDF'}</span>
            </button>

            {/* Close */}
            <button
              onClick={onClose}
              style={{
                background: '#E5E7EB',
                color: '#374151',
                border: 'none',
                borderRadius: '6px',
                padding: '7px 12px',
                cursor: 'pointer'
              }}
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Printable Content Root */}
        <div dir={isAr ? 'rtl' : 'ltr'}>

          {/* ======================================================== */}
          {/* COVER PAGE (With Page Break)                             */}
          {/* ======================================================== */}
          <div className="report-cover-page" style={{
            border: '2px solid #142A38',
            padding: '32px',
            marginBottom: '36px',
            minHeight: '440px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            background: 'linear-gradient(180deg, #F8FAFC 0%, #FFFFFF 100%)'
          }}>
            {/* Top Company Branding */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #142A38', paddingBottom: '16px' }}>
              <div>
                <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: '#142A38', textTransform: 'uppercase' }}>
                  {companyName}
                </h1>
                <p style={{ margin: '3px 0 0 0', fontSize: '11px', color: '#0D9488', fontWeight: 600 }}>
                  {companyTagline}
                </p>
                <p style={{ margin: '2px 0 0 0', fontSize: '10.5px', color: '#6B7280' }}>
                  {companyAddress}
                </p>
              </div>

              {companyLogo && (
                <div style={{ maxWidth: '160px', maxHeight: '55px', display: 'flex', alignItems: 'center' }}>
                  <img src={companyLogo} alt="Company Logo" style={{ maxWidth: '100%', maxHeight: '50px', objectFit: 'contain' }} />
                </div>
              )}
            </div>

            {/* Central Document Title */}
            <div style={{ textAlign: 'center', padding: '36px 10px' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: '#0D9488', marginBottom: '8px' }}>
                {isAr ? 'تقرير حسابات الأحمال والقوى الكهربائية والتكييف' : 'ELECTRICAL LOAD & DISTRIBUTION CALCULATION REPORT'}
              </div>
              <h2 style={{ fontSize: '26px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                {panel.name} ({panel.panel_type.toUpperCase()})
              </h2>
              <div style={{ display: 'inline-block', marginTop: '10px', padding: '4px 14px', background: '#E2E8F0', borderRadius: '4px', fontSize: '12px', fontWeight: 600, color: '#334155' }} dir="ltr">
                {panel.voltage}V • {panel.system_type.toUpperCase()} • 50 Hz
              </div>
              <div style={{ marginTop: '8px', fontSize: '11px', color: '#64748B', fontWeight: 600 }}>
                {isAr ? 'المواصفة القياسية المعتمدة: ' : 'Calculation Standard Profile: '}
                <strong style={{ color: '#0F172A' }}>{profile.name}</strong> ({profile.codeReference})
              </div>
            </div>

            {/* Bottom Metadata & Sign-off Box */}
            <div style={{ borderTop: '1px solid #CBD5E1', paddingTop: '16px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', fontSize: '11px' }}>
              <div>
                <span style={{ color: '#64748B', display: 'block' }}>{isAr ? 'المشروع:' : 'Project Name:'}</span>
                <strong style={{ fontSize: '12px', color: '#0F172A' }}>{project?.name || 'Distribution Project'}</strong>
              </div>
              <div>
                <span style={{ color: '#64748B', display: 'block' }}>{isAr ? 'كود المشروع:' : 'Project Code:'}</span>
                <strong style={{ fontSize: '12px', color: '#0F172A' }}>{project?.code || 'P-001'}</strong>
              </div>
              <div>
                <span style={{ color: '#64748B', display: 'block' }}>{isAr ? 'العميل / المالك:' : 'Client:'}</span>
                <strong style={{ fontSize: '12px', color: '#0F172A' }}>{project?.client || 'N/A'}</strong>
              </div>
              <div>
                <span style={{ color: '#64748B', display: 'block' }}>{isAr ? 'مهندس التصميم:' : 'Lead Engineer:'}</span>
                <strong style={{ fontSize: '12px', color: '#0F172A' }}>{project?.engineer || 'Senior Electrical Engineer'}</strong>
              </div>
              <div>
                <span style={{ color: '#64748B', display: 'block' }}>{isAr ? 'التاريخ والإصدار:' : 'Date & Revision:'}</span>
                <strong style={{ fontSize: '12px', color: '#0F172A' }}>{currentDate} (Rev 01)</strong>
              </div>
            </div>
          </div>

          {/* ======================================================== */}
          {/* SECTION 1: DESIGN PARAMETERS & SITE CONDITIONS           */}
          {/* ======================================================== */}
          <div style={{ marginBottom: '28px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 700, borderBottom: '2px solid #142A38', paddingBottom: '4px', marginBottom: '10px', color: '#142A38' }}>
              {isAr ? '1. معطيات التصميم وظروف الموقع القياسية' : '1. DESIGN INPUTS & SITE CONDITIONS'}
            </h3>

            {/* Calculation Standard Profile & Factors Audit Trail */}
            <div style={{
              background: '#F0FDFA',
              border: '1.5px solid #0D9488',
              borderRadius: '6px',
              padding: '10px 14px',
              marginBottom: '14px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px', borderBottom: '1px solid #99F6E4', paddingBottom: '4px' }}>
                <div style={{ fontSize: '11.5px', fontWeight: 700, color: '#0F766E', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <ShieldCheck size={14} />
                  <span>{isAr ? 'المواصفة المعتمدة وسجل التدقيق الحسابي' : 'Standard Profile & Design Factors Audit Trail'}</span>
                </div>
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#134E4A', background: '#CCFBF1', padding: '1px 8px', borderRadius: '4px' }}>
                  {profile.codeReference}
                </span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '6px', fontSize: '11px' }}>
                <div><span style={{ color: '#64748B' }}>{isAr ? 'المواصفة: ' : 'Standard: '}</span><strong>{profile.name}</strong></div>
                <div><span style={{ color: '#64748B' }}>{isAr ? 'معامل القاطع: ' : 'Breaker Factor: '}</span><strong dir="ltr">x{profile.breakerFactor} Ib</strong></div>
                <div><span style={{ color: '#64748B' }}>{isAr ? 'أقصى هبوط جهد مغذي / فرعي: ' : 'Max Feeder / Branch ΔV: '}</span><strong dir="ltr">{profile.maxVoltageDropFeeder}% / {profile.maxVoltageDropBranch}%</strong></div>
                <div><span style={{ color: '#64748B' }}>{isAr ? 'حرارة التصميم القياسية: ' : 'Ambient Temp: '}</span><strong dir="ltr">Air {profile.defaultAmbientAirTemp}°C | Grd {profile.defaultAmbientGroundTemp}°C</strong></div>
                <div><span style={{ color: '#64748B' }}>{isAr ? 'مقاومة التربة الحرارية: ' : 'Soil Thermal Res: '}</span><strong dir="ltr">{profile.defaultSoilResistivity} K·m/W</strong></div>
                <div><span style={{ color: '#64748B' }}>{isAr ? 'معاملات المحركات: ' : 'Motor Factors: '}</span><strong dir="ltr">Cond x{profile.motorConductorFactor} | OCPD x{profile.motorOcpdBreakerFactor}</strong></div>
              </div>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11.5px' }}>
              <tbody>
                <tr>
                  <td style={{ padding: '6px 10px', border: '1px solid #E5E7EB', width: '25%', background: '#F8FAFC' }}><strong>{isAr ? 'جهد النظام:' : 'System Voltage:'}</strong></td>
                  <td style={{ padding: '6px 10px', border: '1px solid #E5E7EB', width: '25%' }} dir="ltr">{panel.voltage} V ({panel.system_type.toUpperCase()})</td>
                  <td style={{ padding: '6px 10px', border: '1px solid #E5E7EB', width: '25%', background: '#F8FAFC' }}><strong>{isAr ? 'الحمل المتصل:' : 'Connected Load:'}</strong></td>
                  <td style={{ padding: '6px 10px', border: '1px solid #E5E7EB', width: '25%' }} dir="ltr">{panel.raw_load} {panel.load_unit.toUpperCase()} (PF: {panel.pf})</td>
                </tr>
                <tr>
                  <td style={{ padding: '6px 10px', border: '1px solid #E5E7EB', background: '#F8FAFC' }}><strong>{isAr ? 'معدن ونوع العزل:' : 'Conductor & Insulation:'}</strong></td>
                  <td style={{ padding: '6px 10px', border: '1px solid #E5E7EB' }} dir="ltr">{panel.conductor.toUpperCase()} / {panel.insulation.toUpperCase()}</td>
                  <td style={{ padding: '6px 10px', border: '1px solid #E5E7EB', background: '#F8FAFC' }}><strong>{isAr ? 'معامل الطلب (DF):' : 'Demand Factor:'}</strong></td>
                  <td style={{ padding: '6px 10px', border: '1px solid #E5E7EB' }} dir="ltr">{panel.demand_factor}</td>
                </tr>
                <tr>
                  <td style={{ padding: '6px 10px', border: '1px solid #E5E7EB', background: '#F8FAFC' }}><strong>{isAr ? 'طريقة التمديد:' : 'Installation Method:'}</strong></td>
                  <td style={{ padding: '6px 10px', border: '1px solid #E5E7EB' }} dir="ltr">{panel.install_method.toUpperCase()} ({panel.cable_form})</td>
                  <td style={{ padding: '6px 10px', border: '1px solid #E5E7EB', background: '#F8FAFC' }}><strong>{isAr ? 'طول المسار وأقصى هبوط:' : 'Run Length & Max ΔV:'}</strong></td>
                  <td style={{ padding: '6px 10px', border: '1px solid #E5E7EB' }} dir="ltr">{panel.cable_length} m (Max {panel.vdrop_max}%)</td>
                </tr>
                <tr>
                  <td style={{ padding: '6px 10px', border: '1px solid #E5E7EB', background: '#F8FAFC' }}><strong>{isAr ? 'معامل التخفيض الإجمالي:' : 'Derating Factor (K_total):'}</strong></td>
                  <td style={{ padding: '6px 10px', border: '1px solid #E5E7EB' }} dir="ltr">{panel.derate}</td>
                  <td style={{ padding: '6px 10px', border: '1px solid #E5E7EB', background: '#F8FAFC' }}><strong>{isAr ? 'تيار القصر وزمن الفصل:' : 'Short Circuit Level:'}</strong></td>
                  <td style={{ padding: '6px 10px', border: '1px solid #E5E7EB' }} dir="ltr">{panel.isc} kA @ {panel.fclear} s</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* ======================================================== */}
          {/* SECTION 2: STEP-BY-STEP MATHEMATICAL DERIVATIONS         */}
          {/* ======================================================== */}
          <div style={{ marginBottom: '28px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 700, borderBottom: '2px solid #142A38', paddingBottom: '4px', marginBottom: '12px', color: '#142A38' }}>
              {isAr ? '2. خطوات التحليل والحسابات الهندسية والمعادلات الرياضية' : '2. STEP-BY-STEP MATHEMATICAL DERIVATIONS & FORMULAS'}
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {derivations.map(d => (
                <div key={d.step} style={{
                  border: '1px solid #E2E8F0',
                  borderRadius: '6px',
                  padding: '10px 14px',
                  background: '#F8FAFC'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#142A38' }}>
                      Step {d.step}: {d.title}
                    </div>
                    <span style={{ fontSize: '10.5px', color: '#0D9488', fontWeight: 600 }}>
                      {d.standardRef}
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '8px', fontSize: '11px', fontFamily: "'IBM Plex Mono', Consolas, monospace" }} dir="ltr">
                    <div style={{ background: '#FFFFFF', padding: '6px 10px', borderRadius: '4px', border: '1px solid #CBD5E1' }}>
                      <span style={{ color: '#64748B' }}>Formula: </span>
                      <strong>{d.formulaStr}</strong>
                    </div>
                    <div style={{ background: '#FFFFFF', padding: '6px 10px', borderRadius: '4px', border: '1px solid #CBD5E1' }}>
                      <span style={{ color: '#64748B' }}>Substituted: </span>
                      <span>{d.substitutedStr}</span>
                    </div>
                  </div>

                  <div style={{ marginTop: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11.5px' }}>
                    <span style={{ fontWeight: 700, color: '#0F172A' }} dir="ltr">
                      Result: {d.resultStr}
                    </span>
                    {d.passed !== undefined && (
                      <span style={{
                        padding: '2px 8px',
                        borderRadius: '4px',
                        fontSize: '10.5px',
                        fontWeight: 700,
                        background: d.passed ? '#DCFCE7' : '#FEE2E2',
                        color: d.passed ? '#15803D' : '#B91C1C'
                      }}>
                        {d.passed ? 'PASS' : 'FAIL'}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ======================================================== */}
          {/* SECTION 3: PANEL BRANCH CIRCUITS SCHEDULE                */}
          {/* ======================================================== */}
          <div style={{ marginBottom: '28px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 700, borderBottom: '2px solid #142A38', paddingBottom: '4px', marginBottom: '10px', color: '#142A38' }}>
              {isAr ? '3. جدول توزيع الدوائر الكهربائية الفرعية' : '3. BRANCH CIRCUITS SCHEDULE'}
            </h3>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10.5px' }}>
              <thead>
                <tr style={{ background: '#142A38', color: '#FFFFFF' }}>
                  <th style={{ padding: '6px 8px', textAlign: 'center' }}>Ckt</th>
                  <th style={{ padding: '6px 8px', textAlign: isAr ? 'right' : 'left' }}>Description</th>
                  <th style={{ padding: '6px 8px', textAlign: 'center' }}>Load</th>
                  <th style={{ padding: '6px 8px', textAlign: 'center' }}>PF</th>
                  <th style={{ padding: '6px 8px', textAlign: 'center' }}>Phase</th>
                  <th style={{ padding: '6px 8px', textAlign: 'center' }}>Ib (A)</th>
                  <th style={{ padding: '6px 8px', textAlign: 'center' }}>Breaker</th>
                  <th style={{ padding: '6px 8px', textAlign: 'center' }}>Cable (mm²)</th>
                  <th style={{ padding: '6px 8px', textAlign: 'center' }}>ΔV (%)</th>
                  <th style={{ padding: '6px 8px', textAlign: 'center' }}>Coord</th>
                </tr>
              </thead>
              <tbody>
                {calculatedCircuits.map((c, idx) => (
                  <tr key={idx} style={{ background: idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC' }}>
                    <td style={{ padding: '5px 8px', border: '1px solid #E5E7EB', textAlign: 'center', fontWeight: 600 }}>C{c.circuit_number}</td>
                    <td style={{ padding: '5px 8px', border: '1px solid #E5E7EB' }}>{c.name}</td>
                    <td style={{ padding: '5px 8px', border: '1px solid #E5E7EB', textAlign: 'center' }} dir="ltr">{c.load_val} {c.load_unit}</td>
                    <td style={{ padding: '5px 8px', border: '1px solid #E5E7EB', textAlign: 'center' }} dir="ltr">{c.pf}</td>
                    <td style={{ padding: '5px 8px', border: '1px solid #E5E7EB', textAlign: 'center', fontWeight: 600 }}>{c.phase}</td>
                    <td style={{ padding: '5px 8px', border: '1px solid #E5E7EB', textAlign: 'center' }} dir="ltr">{c.Ib.toFixed(1)}</td>
                    <td style={{ padding: '5px 8px', border: '1px solid #E5E7EB', textAlign: 'center', fontWeight: 600 }} dir="ltr">{c.breaker}A</td>
                    <td style={{ padding: '5px 8px', border: '1px solid #E5E7EB', textAlign: 'center' }} dir="ltr">{c.cableDisplay}</td>
                    <td style={{ padding: '5px 8px', border: '1px solid #E5E7EB', textAlign: 'center' }} dir="ltr">{c.vDropPct.toFixed(1)}%</td>
                    <td style={{ padding: '5px 8px', border: '1px solid #E5E7EB', textAlign: 'center' }}>
                      <span style={{ color: c.protPass ? '#15803D' : '#B91C1C', fontWeight: 700 }}>
                        {c.protPass ? 'PASS' : 'FAIL'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* ======================================================== */}
          {/* SECTION 4: BILL OF QUANTITIES (BOQ)                      */}
          {/* ======================================================== */}
          <div style={{ marginBottom: '28px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 700, borderBottom: '2px solid #142A38', paddingBottom: '4px', marginBottom: '10px', color: '#142A38' }}>
              {isAr ? '4. جدول حصر الكميات والمهمات الكهربائية (BOQ)' : '4. BILL OF QUANTITIES (BOQ)'}
            </h3>

            {/* Breakers Summary */}
            <div style={{ marginBottom: '14px' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#0D9488', marginBottom: '6px' }}>
                {isAr ? 'أولاً: قواطع الحماية الرئيسية والفرعية' : 'A. Circuit Breakers (Main & Branch)'}
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                <thead>
                  <tr style={{ background: '#F1F5F9', color: '#334155' }}>
                    <th style={{ padding: '5px 8px', textAlign: isAr ? 'right' : 'left' }}>Item</th>
                    <th style={{ padding: '5px 8px', textAlign: isAr ? 'right' : 'left' }}>Specification</th>
                    <th style={{ padding: '5px 8px', textAlign: 'center' }}>Unit</th>
                    <th style={{ padding: '5px 8px', textAlign: 'center' }}>Quantity</th>
                  </tr>
                </thead>
                <tbody>
                  {boq.breakers.map((b, idx) => (
                    <tr key={idx} style={{ background: idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC' }}>
                      <td style={{ padding: '5px 8px', border: '1px solid #E5E7EB' }}>{b.item}</td>
                      <td style={{ padding: '5px 8px', border: '1px solid #E5E7EB' }}>{b.specification}</td>
                      <td style={{ padding: '5px 8px', border: '1px solid #E5E7EB', textAlign: 'center' }}>{b.unit}</td>
                      <td style={{ padding: '5px 8px', border: '1px solid #E5E7EB', textAlign: 'center', fontWeight: 700 }} dir="ltr">{b.quantity}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Cables Summary with TOTAL METERS */}
            <div style={{ marginBottom: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#0D9488' }}>
                  {isAr ? 'ثانياً: كابلات القوى والتغذية الكهربائية' : 'B. Power Cables & Conductors'}
                </span>
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#142A38', background: '#FEF3C7', padding: '2px 8px', borderRadius: '4px' }} dir="ltr">
                  Total Cable: {boq.totalCableMeters} meters
                </span>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                <thead>
                  <tr style={{ background: '#F1F5F9', color: '#334155' }}>
                    <th style={{ padding: '5px 8px', textAlign: isAr ? 'right' : 'left' }}>Item</th>
                    <th style={{ padding: '5px 8px', textAlign: isAr ? 'right' : 'left' }}>Specification</th>
                    <th style={{ padding: '5px 8px', textAlign: 'center' }}>Unit</th>
                    <th style={{ padding: '5px 8px', textAlign: 'center' }}>Total Length (m)</th>
                  </tr>
                </thead>
                <tbody>
                  {boq.cables.map((c, idx) => (
                    <tr key={idx} style={{ background: idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC' }}>
                      <td style={{ padding: '5px 8px', border: '1px solid #E5E7EB' }}>{c.item}</td>
                      <td style={{ padding: '5px 8px', border: '1px solid #E5E7EB' }}>{c.specification}</td>
                      <td style={{ padding: '5px 8px', border: '1px solid #E5E7EB', textAlign: 'center' }}>{c.unit}</td>
                      <td style={{ padding: '5px 8px', border: '1px solid #E5E7EB', textAlign: 'center', fontWeight: 700 }} dir="ltr">{c.quantity} m</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Conduits Summary with TOTAL METERS */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#0D9488' }}>
                  {isAr ? 'ثالثاً: المواسير ومسارات الكابلات' : 'C. Conduits & Containment'}
                </span>
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#142A38', background: '#E0F2FE', padding: '2px 8px', borderRadius: '4px' }} dir="ltr">
                  Total Conduit: {boq.totalConduitMeters} meters
                </span>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                <thead>
                  <tr style={{ background: '#F1F5F9', color: '#334155' }}>
                    <th style={{ padding: '5px 8px', textAlign: isAr ? 'right' : 'left' }}>Item</th>
                    <th style={{ padding: '5px 8px', textAlign: isAr ? 'right' : 'left' }}>Specification</th>
                    <th style={{ padding: '5px 8px', textAlign: 'center' }}>Unit</th>
                    <th style={{ padding: '5px 8px', textAlign: 'center' }}>Total Length (m)</th>
                  </tr>
                </thead>
                <tbody>
                  {boq.conduits.map((cd, idx) => (
                    <tr key={idx} style={{ background: idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC' }}>
                      <td style={{ padding: '5px 8px', border: '1px solid #E5E7EB' }}>{cd.item}</td>
                      <td style={{ padding: '5px 8px', border: '1px solid #E5E7EB' }}>{cd.specification}</td>
                      <td style={{ padding: '5px 8px', border: '1px solid #E5E7EB', textAlign: 'center' }}>{cd.unit}</td>
                      <td style={{ padding: '5px 8px', border: '1px solid #E5E7EB', textAlign: 'center', fontWeight: 700 }} dir="ltr">{cd.quantity} m</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* ======================================================== */}
          {/* SECTION 5: SIGN-OFF & ENGINEERING STAMP BOX              */}
          {/* ======================================================== */}
          <div style={{
            borderTop: '2px solid #142A38',
            paddingTop: '16px',
            marginTop: '30px',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '20px',
            fontSize: '11.5px'
          }}>
            <div>
              <strong>{isAr ? 'إعداد مهندس التصميم:' : 'Prepared By:'}</strong><br />
              <span>{project?.engineer || 'Senior Electrical Designer'}</span><br />
              <div style={{ marginTop: '16px', borderBottom: '1px dotted #94A3B8', width: '180px' }} />
              <span style={{ fontSize: '10px', color: '#64748B' }}>{isAr ? 'التوقيع والاعتماد' : 'Signature'}</span>
            </div>

            <div>
              <strong>{isAr ? 'مراجعة واعتماد الاستشاري:' : 'Reviewed & Approved By:'}</strong><br />
              <span>{isAr ? 'استشاري الأعمال الكهروميكانيكية' : 'Lead Consultant'}</span><br />
              <div style={{ marginTop: '16px', borderBottom: '1px dotted #94A3B8', width: '180px' }} />
              <span style={{ fontSize: '10px', color: '#64748B' }}>{isAr ? 'التوقيع والتاريخ' : 'Signature & Date'}</span>
            </div>

            <div style={{ textAlign: isAr ? 'left' : 'right' }}>
              <strong>{isAr ? 'خاتم الاعتماد الهندسي:' : 'Engineering Stamp:'}</strong><br />
              <div style={{
                display: 'inline-block',
                marginTop: '6px',
                width: '130px',
                height: '55px',
                border: '1.5px dashed #0D9488',
                borderRadius: '4px',
                color: '#0D9488',
                fontSize: '10px',
                paddingTop: '16px',
                textAlign: 'center'
              }}>
                APPROVED
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
