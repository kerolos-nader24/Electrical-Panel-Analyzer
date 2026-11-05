import React, { useState } from 'react';
import { CABLES } from '@panel-analyzer/data';
import {
  resolveCalculationProfile,
  IEC_PROFILE,
  NEC_PROFILE,
  CUSTOM_PROFILE,
  type CalculationProfile,
  type StandardProfileId
} from '@panel-analyzer/engine';
import {
  Settings,
  ShieldCheck,
  Database,
  Save,
  Building2,
  Upload,
  Trash2,
  Image as ImageIcon,
  Sliders,
  Thermometer,
  Layers,
  BookOpen
} from 'lucide-react';
import { CatalogueManagerModal } from '../components/CatalogueManagerModal.js';
import type { Language } from '../i18n.js';

interface SettingsViewProps {
  settings: Record<string, string>;
  onUpdateSetting: (key: string, value: string) => void;
  lang?: Language;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  onUpdateSetting,
  lang = 'en'
}) => {
  const isAr = lang === 'ar';

  // Modal State
  const [showCatalogueModal, setShowCatalogueModal] = useState(false);

  // General Sizing Defaults
  const [selectedTable, setSelectedTable] = useState<string>('cu_xlpe_1core');
  const [defaultVoltage, setDefaultVoltage] = useState(settings['default_voltage'] || '380');
  const [defaultDerate, setDefaultDerate] = useState(settings['default_derate'] || '0.80');
  const [defaultVdrop, setDefaultVdrop] = useState(settings['default_vdrop'] || '3.0');

  // Company Branding State
  const [companyName, setCompanyName] = useState(settings['company_name'] || 'ELECTRICAL ENGINEERING CONSULTANTS');
  const [companyTagline, setCompanyTagline] = useState(settings['company_tagline'] || 'Power Distribution & HVAC Engineering');
  const [companyAddress, setCompanyAddress] = useState(settings['company_address'] || 'Cairo, Egypt • Tel: +20 2 1234 5678');
  const [companyLogo, setCompanyLogo] = useState(settings['company_logo'] || '');

  // Standards Profile State
  const initialProfile: CalculationProfile = (() => {
    try {
      if (settings['calculation_profile_config']) {
        const parsed = JSON.parse(settings['calculation_profile_config']);
        return resolveCalculationProfile(parsed.id || 'iec', parsed);
      }
    } catch (e) {
      // fallback
    }
    return resolveCalculationProfile('iec');
  })();

  const [activeProfileId, setActiveProfileId] = useState<StandardProfileId>(initialProfile.id);
  const [breakerFactor, setBreakerFactor] = useState(initialProfile.breakerFactor);
  const [maxVdropFeeder, setMaxVdropFeeder] = useState(initialProfile.maxVoltageDropFeeder);
  const [maxVdropBranch, setMaxVdropBranch] = useState(initialProfile.maxVoltageDropBranch);
  const [ambientAir, setAmbientAir] = useState(initialProfile.defaultAmbientAirTemp);
  const [ambientGround, setAmbientGround] = useState(initialProfile.defaultAmbientGroundTemp);
  const [soilResistivity, setSoilResistivity] = useState(initialProfile.defaultSoilResistivity);
  const [standardBreakersStr, setStandardBreakersStr] = useState(initialProfile.standardBreakers.join(', '));
  const [motorOcpdFactor, setMotorOcpdFactor] = useState(initialProfile.motorOcpdBreakerFactor);
  const [motorCondFactor, setMotorCondFactor] = useState(initialProfile.motorConductorFactor);
  const [motorOverloadFactor, setMotorOverloadFactor] = useState(initialProfile.motorOverloadFactor);

  const [saved, setSaved] = useState(false);

  const handleProfileChange = (newId: StandardProfileId) => {
    setActiveProfileId(newId);
    let template = IEC_PROFILE;
    if (newId === 'nec') template = NEC_PROFILE;
    else if (newId === 'custom') template = CUSTOM_PROFILE;

    setBreakerFactor(template.breakerFactor);
    setMaxVdropFeeder(template.maxVoltageDropFeeder);
    setMaxVdropBranch(template.maxVoltageDropBranch);
    setAmbientAir(template.defaultAmbientAirTemp);
    setAmbientGround(template.defaultAmbientGroundTemp);
    setSoilResistivity(template.defaultSoilResistivity);
    setStandardBreakersStr(template.standardBreakers.join(', '));
    setMotorOcpdFactor(template.motorOcpdBreakerFactor);
    setMotorCondFactor(template.motorConductorFactor);
    setMotorOverloadFactor(template.motorOverloadFactor);
  };

  const handleSave = () => {
    // Parse breakers
    const breakers = standardBreakersStr
      .split(',')
      .map(s => Number(s.trim()))
      .filter(n => !isNaN(n) && n > 0);

    const updatedProfile: CalculationProfile = {
      id: activeProfileId,
      name:
        activeProfileId === 'nec'
          ? 'NEC 2023 / NFPA 70 Profile'
          : activeProfileId === 'custom'
          ? 'Custom Engineering Specification'
          : 'IEC 60364 Standard Profile',
      codeReference:
        activeProfileId === 'nec'
          ? 'NEC Article 215 / 430 / 440'
          : activeProfileId === 'custom'
          ? 'Client Technical Specification'
          : 'IEC 60364 / BS 7671',
      breakerFactor: Number(breakerFactor),
      maxVoltageDropFeeder: Number(maxVdropFeeder),
      maxVoltageDropBranch: Number(maxVdropBranch),
      maxVoltageDropTotal: 5.0,
      defaultAmbientAirTemp: Number(ambientAir),
      defaultAmbientGroundTemp: Number(ambientGround),
      defaultSoilResistivity: Number(soilResistivity),
      standardBreakers: breakers.length > 0 ? breakers : initialProfile.standardBreakers,
      motorConductorFactor: Number(motorCondFactor),
      motorOcpdBreakerFactor: Number(motorOcpdFactor),
      motorOverloadFactor: Number(motorOverloadFactor)
    };

    onUpdateSetting('calculation_profile_config', JSON.stringify(updatedProfile));
    onUpdateSetting('default_voltage', defaultVoltage);
    onUpdateSetting('default_derate', defaultDerate);
    onUpdateSetting('default_vdrop', String(maxVdropFeeder));
    onUpdateSetting('company_name', companyName);
    onUpdateSetting('company_tagline', companyTagline);
    onUpdateSetting('company_address', companyAddress);
    onUpdateSetting('company_logo', companyLogo);

    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        setCompanyLogo(result);
        onUpdateSetting('company_logo', result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveLogo = () => {
    setCompanyLogo('');
    onUpdateSetting('company_logo', '');
  };

  const tableData = CABLES[selectedTable] || {};
  const sizes = Object.keys(tableData).map(Number).sort((a, b) => a - b);

  return (
    <div style={{ padding: '28px 36px', height: '100%', overflowY: 'auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ fontFamily: 'var(--mono)', fontSize: '11px', color: 'var(--teal)', letterSpacing: '1px', textTransform: 'uppercase' }}>
          {isAr ? 'إعدادات النظام والمواصفات القياسية' : 'Standards & Catalogue Configuration'}
        </div>
        <h1 style={{ fontSize: '26px', fontWeight: 700, color: 'var(--text)', marginTop: '4px' }}>
          {isAr ? 'المعايير الهندسية وكتالوج الكابلات' : 'Standards & Catalogue Settings'}
        </h1>
        <p style={{ color: 'var(--text-dim)', fontSize: '13px', marginTop: '2px' }}>
          {isAr
            ? 'اختر مواصفة التصميم القياسية (IEC / NEC / مخصص)، واضبط معاملات التصحيح والحرارة وتصفح كتالوج الكابلات.'
            : 'Select calculation standard profile (IEC / NEC / Custom), configure detailed derating factors, and manage the cable catalogue.'}
        </p>
      </div>

      {/* Standards Profile Selector & Calculation Factors */}
      <div className="card" style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '15px', fontWeight: 700, color: 'var(--amber)' }}>
            <ShieldCheck size={18} />
            <span>{isAr ? 'المواصفة القياسية للتصميم ومعاملات الحسابات' : 'Calculation Standard Profile & Design Factors'}</span>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => handleProfileChange('iec')}
              className={`btn ${activeProfileId === 'iec' ? '' : 'secondary'}`}
              style={{ padding: '6px 14px', fontSize: '12px' }}
            >
              IEC 60364 / BS 7671
            </button>
            <button
              onClick={() => handleProfileChange('nec')}
              className={`btn ${activeProfileId === 'nec' ? '' : 'secondary'}`}
              style={{ padding: '6px 14px', fontSize: '12px' }}
            >
              NEC 2023 / NFPA 70
            </button>
            <button
              onClick={() => handleProfileChange('custom')}
              className={`btn ${activeProfileId === 'custom' ? '' : 'secondary'}`}
              style={{ padding: '6px 14px', fontSize: '12px' }}
            >
              {isAr ? 'مخصص (Custom)' : 'Custom Profile'}
            </button>
          </div>
        </div>

        {/* Profile Info Banner */}
        <div style={{
          background: 'rgba(20, 184, 166, 0.08)',
          border: '1px solid rgba(20, 184, 166, 0.25)',
          borderRadius: 'var(--radius)',
          padding: '12px 16px',
          marginBottom: '18px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <BookOpen size={20} color="var(--teal)" />
          <div style={{ fontSize: '12.5px', color: 'var(--text)' }}>
            <strong>{isAr ? 'المواصفة المطبقة:' : 'Active Reference:'} </strong>
            <span style={{ color: 'var(--teal)', fontFamily: 'var(--mono)', fontWeight: 600 }}>
              {activeProfileId === 'nec' ? 'NEC 2023 / NFPA 70 (Articles 215, 430, 440)' : activeProfileId === 'custom' ? 'Custom Technical Specification' : 'IEC 60364 / BS 7671 (Substations & Distribution Boards)'}
            </span>
            <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '2px' }}>
              {isAr
                ? 'تُدرج هذه المواصفة ومعاملاتها نصياً في جميع تقارير الحسابات الهندسية ومخططات Excel المصدرة للمشروع.'
                : 'This profile and its design factors are explicitly documented on calculation reports and exported Excel workbooks.'}
            </div>
          </div>
        </div>

        {/* Factors Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px', marginBottom: '16px' }}>
          <div className="field">
            <label>{isAr ? 'معامل القاطع المستمر (Breaker Factor)' : 'Breaker Sizing Factor (x Ib)'}</label>
            <input
              type="number"
              step="0.05"
              value={breakerFactor}
              onChange={e => setBreakerFactor(Number(e.target.value))}
            />
          </div>

          <div className="field">
            <label>{isAr ? 'أقصى هبوط جهد للمغذي الرئيسي Feeder (%)' : 'Max Feeder Voltage Drop (%)'}</label>
            <input
              type="number"
              step="0.5"
              value={maxVdropFeeder}
              onChange={e => setMaxVdropFeeder(Number(e.target.value))}
            />
          </div>

          <div className="field">
            <label>{isAr ? 'أقصى هبوط جهد للدوائر الفرعية Branch (%)' : 'Max Branch Voltage Drop (%)'}</label>
            <input
              type="number"
              step="0.5"
              value={maxVdropBranch}
              onChange={e => setMaxVdropBranch(Number(e.target.value))}
            />
          </div>

          <div className="field">
            <label>{isAr ? 'معامل كابلات المحركات (Motor Cond. Factor)' : 'Motor Conductor Factor (NEC 430.22)'}</label>
            <input
              type="number"
              step="0.05"
              value={motorCondFactor}
              onChange={e => setMotorCondFactor(Number(e.target.value))}
            />
          </div>

          <div className="field">
            <label>{isAr ? 'معامل حماية المحركات (Motor OCPD Factor)' : 'Motor OCPD Factor (NEC 430.52)'}</label>
            <input
              type="number"
              step="0.1"
              value={motorOcpdFactor}
              onChange={e => setMotorOcpdFactor(Number(e.target.value))}
            />
          </div>

          <div className="field">
            <label>{isAr ? 'معامل الأوفرلود للمحركات (Overload Factor)' : 'Motor Overload Factor (NEC 430.32)'}</label>
            <input
              type="number"
              step="0.05"
              value={motorOverloadFactor}
              onChange={e => setMotorOverloadFactor(Number(e.target.value))}
            />
          </div>
        </div>

        {/* Detailed Derating Inputs */}
        <div style={{ borderTop: '1px solid var(--grid)', paddingTop: '16px', marginTop: '16px', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 600, color: 'var(--teal)', marginBottom: '12px' }}>
            <Thermometer size={15} />
            <span>{isAr ? 'معاملات التصحيح والظروف البيئية القياسية (Detailed Derating Conditions)' : 'Standard Environmental & Derating Conditions'}</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
            <div className="field">
              <label>{isAr ? 'حرارة الهواء التصميمية (°C)' : 'Ambient Air Temp (°C)'}</label>
              <input
                type="number"
                value={ambientAir}
                onChange={e => setAmbientAir(Number(e.target.value))}
              />
            </div>

            <div className="field">
              <label>{isAr ? 'حرارة التربة التصميمية (°C)' : 'Ambient Ground Temp (°C)'}</label>
              <input
                type="number"
                value={ambientGround}
                onChange={e => setAmbientGround(Number(e.target.value))}
              />
            </div>

            <div className="field">
              <label>{isAr ? 'المقاومة الحرارية للتربة (K·m/W)' : 'Soil Thermal Resistivity (K·m/W)'}</label>
              <input
                type="number"
                step="0.1"
                value={soilResistivity}
                onChange={e => setSoilResistivity(Number(e.target.value))}
              />
            </div>
          </div>
        </div>

        {/* Standard Breaker Sizes */}
        <div className="field" style={{ marginBottom: '16px' }}>
          <label>{isAr ? 'سلسلة سعات القواطع القياسية المتوفرة (Standard Breakers - Amperes)' : 'Standard Breaker Rating Series (Amperes)'}</label>
          <input
            type="text"
            value={standardBreakersStr}
            onChange={e => setStandardBreakersStr(e.target.value)}
            style={{ fontFamily: 'var(--mono)', fontSize: '12px' }}
          />
          <span style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '4px', display: 'block' }}>
            {isAr ? 'أدخل القيم القياسية مفصولة بفواصل (مثال: 16, 20, 25, 32, 40, 50, 63...)' : 'Comma-separated standard breaker sizes (e.g. 16, 20, 25, 32, 40, 50, 63, 80, 100, 125, 160...)'}
          </span>
        </div>

        <button className="btn" onClick={handleSave}>
          <Save size={14} />
          <span>{saved ? (isAr ? 'تم الحفظ بنجاح!' : 'Saved Successfully!') : (isAr ? 'حفظ إعدادات المواصفة' : 'Save Standards Configuration')}</span>
        </button>
      </div>

      {/* Cable Catalogue Management Card */}
      <div className="card" style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: '14px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '15px', fontWeight: 700, color: 'var(--teal)' }}>
              <Database size={18} />
              <span>{isAr ? 'إدارة كتالوج الكابلات والمصنعين' : 'Cable Catalogue & Manufacturer Manager'}</span>
            </div>
            <p style={{ fontSize: '12.5px', color: 'var(--text-dim)', margin: '4px 0 0 0' }}>
              {isAr
                ? 'إضافة مصنعين جدد، تعديل السعات الحالية (أرض، مجرى، هواء)، استيراد وتصدير بصيغة CSV و JSON.'
                : 'Custom manufacturers, edit ampacities per installation method, R & X values, and import/export CSV/JSON.'}
            </p>
          </div>

          <button
            onClick={() => setShowCatalogueModal(true)}
            className="btn primary"
            style={{ padding: '8px 18px', fontSize: '13px' }}
          >
            <Sliders size={15} />
            <span>{isAr ? 'فتح نافذة إدارة الكتالوج' : 'Open Catalogue Manager'}</span>
          </button>
        </div>

        {/* Embedded Fast Inspector */}
        <div style={{ borderTop: '1px solid var(--grid)', paddingTop: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text)' }}>
              {isAr ? 'معاينة سريعة لجداول السويدي للكابلات:' : 'Quick Viewer: Elsewedy Cables Reference Database'}
            </span>

            <select
              value={selectedTable}
              onChange={e => setSelectedTable(e.target.value)}
              style={{
                background: 'var(--panel-2)',
                border: '1px solid var(--grid)',
                color: 'var(--amber)',
                padding: '5px 12px',
                borderRadius: 'var(--radius)',
                fontFamily: 'var(--mono)',
                fontSize: '12px'
              }}
            >
              {Object.keys(CABLES).map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          <div style={{ overflowX: 'auto', maxHeight: '240px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px' }}>
              <thead>
                <tr style={{ background: 'var(--panel-2)', borderBottom: '1px solid var(--grid)', color: 'var(--text-dim)', fontFamily: 'var(--mono)' }}>
                  <th style={{ padding: '8px 12px' }}>{isAr ? 'المقاس' : 'Size (mm²)'}</th>
                  <th style={{ padding: '8px 12px' }}>{isAr ? 'مدفون بالأرض' : 'Direct Buried Ground (A)'}</th>
                  <th style={{ padding: '8px 12px' }}>{isAr ? 'في مجرى/ماسورة' : 'In Duct (A)'}</th>
                  <th style={{ padding: '8px 12px' }}>{isAr ? 'في الهواء' : 'Free Air (A)'}</th>
                  <th style={{ padding: '8px 12px' }}>{isAr ? 'القطر الخارجي' : 'Outer Diameter (mm)'}</th>
                </tr>
              </thead>
              <tbody>
                {sizes.map(s => {
                  const row = tableData[s];
                  return (
                    <tr key={s} style={{ borderBottom: '1px solid var(--grid)' }}>
                      <td style={{ padding: '6px 12px', fontFamily: 'var(--mono)', fontWeight: 700, color: 'var(--text)' }}>{s} mm²</td>
                      <td style={{ padding: '6px 12px', fontFamily: 'var(--mono)', color: 'var(--amber)' }}>{row.ground} A</td>
                      <td style={{ padding: '6px 12px', fontFamily: 'var(--mono)', color: 'var(--text)' }}>{row.duct} A</td>
                      <td style={{ padding: '6px 12px', fontFamily: 'var(--mono)', color: 'var(--teal)' }}>{row.air} A</td>
                      <td style={{ padding: '6px 12px', fontFamily: 'var(--mono)', color: 'var(--text-dim)' }}>{row.dia} mm</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Company Branding & Report Header */}
      <div className="card" style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: 700, color: 'var(--teal)', marginBottom: '14px' }}>
          <Building2 size={16} />
          <span>{isAr ? 'بيانات وهوية الشركة وشعار التقارير' : 'Company Branding & Report Header'}</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px', marginBottom: '16px' }}>
          <div className="field">
            <label>{isAr ? 'اسم الشركة أو المكتب الاستشاري' : 'Company / Firm Name'}</label>
            <input
              type="text"
              value={companyName}
              placeholder="e.g. DAR AL-HANDASAH / ELSEWEDY ELECTRIC"
              onChange={e => setCompanyName(e.target.value)}
            />
          </div>

          <div className="field">
            <label>{isAr ? 'التخصص أو الشعار النصي' : 'Tagline / Specialty'}</label>
            <input
              type="text"
              value={companyTagline}
              placeholder="e.g. MEP Engineering & Infrastructure Consultants"
              onChange={e => setCompanyTagline(e.target.value)}
            />
          </div>

          <div className="field" style={{ gridColumn: 'span 2' }}>
            <label>{isAr ? 'العنوان وأرقام التواصل' : 'Office Address & Contact Info'}</label>
            <input
              type="text"
              value={companyAddress}
              placeholder="e.g. Cairo, Egypt • info@company.com • Tel: +20 2 1234 5678"
              onChange={e => setCompanyAddress(e.target.value)}
            />
          </div>
        </div>

        {/* Logo Upload & Preview */}
        <div style={{ borderTop: '1px solid var(--grid)', paddingTop: '14px', marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-dim)', marginBottom: '8px' }}>
            {isAr ? 'شعار الشركة (يظهر في صفحة الغلاف وترويسة التقارير)' : 'Company Logo (Appears on Cover Page & Report Header)'}
          </label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
            {companyLogo ? (
              <div style={{
                position: 'relative',
                background: '#ffffff',
                padding: '8px',
                borderRadius: '6px',
                border: '1px solid var(--grid)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                maxHeight: '60px'
              }}>
                <img src={companyLogo} alt="Company Logo" style={{ maxHeight: '44px', maxWidth: '160px', objectFit: 'contain' }} />
                <button
                  onClick={handleRemoveLogo}
                  title="Remove Logo"
                  style={{
                    position: 'absolute',
                    top: '-8px',
                    right: '-8px',
                    background: '#EF4444',
                    color: 'white',
                    border: 'none',
                    borderRadius: '50%',
                    width: '20px',
                    height: '20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer'
                  }}
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ) : (
              <div style={{
                width: '140px',
                height: '44px',
                border: '1px dashed var(--grid)',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--text-dim)',
                fontSize: '11px',
                gap: '6px'
              }}>
                <ImageIcon size={14} />
                <span>{isAr ? 'لا يوجد شعار' : 'No Logo'}</span>
              </div>
            )}

            <label className="btn secondary" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', margin: 0 }}>
              <Upload size={14} />
              <span>{isAr ? 'رفع شعار الشركة (PNG / JPG / SVG)' : 'Upload Logo (PNG / JPG / SVG)'}</span>
              <input type="file" accept="image/*" onChange={handleLogoUpload} style={{ display: 'none' }} />
            </label>
          </div>
        </div>

        <button className="btn" onClick={handleSave}>
          <Save size={14} />
          <span>{saved ? (isAr ? 'تم الحفظ!' : 'Saved!') : (isAr ? 'حفظ هوية الشركة' : 'Save Branding')}</span>
        </button>
      </div>

      {/* Catalogue Manager Modal */}
      {showCatalogueModal && (
        <CatalogueManagerModal
          lang={lang}
          onClose={() => setShowCatalogueModal(false)}
        />
      )}
    </div>
  );
};
