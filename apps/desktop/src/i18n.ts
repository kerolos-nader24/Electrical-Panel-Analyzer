export type Language = 'en' | 'ar';

export interface Translations {
  // Navigation & General
  appTitle: string;
  appSubtitle: string;
  projects: string;
  panels: string;
  circuits: string;
  settings: string;
  singleMC: string;
  comboLoads: string;
  roomAC: string;
  save: string;
  saved: string;
  saving: string;
  exportReport: string;
  exportJson: string;
  importJson: string;
  downloadCsv: string;
  addCircuit: string;
  delete: string;
  duplicate: string;
  backToProjects: string;
  backToPanels: string;
  language: string;
  statusPass: string;
  statusFail: string;

  // Titleblock & Metadata
  projectInfo: string;
  projectName: string;
  projectCode: string;
  client: string;
  engineer: string;
  date: string;

  // Panel & Sizing Inputs
  panelType: string;
  system: string;
  voltage: string;
  connectedLoad: string;
  demandFactor: string;
  powerFactor: string;
  conductor: string;
  insulation: string;
  construction: string;
  installation: string;
  cableLength: string;
  maxVdrop: string;
  deratingMode: string;
  manualDerating: string;
  detailedDerating: string;
  ambientTemp: string;
  circuitsCount: string;
  burialDepth: string;
  soilResistivity: string;
  shortCircuitCurrent: string;
  clearingTime: string;

  // Materials & Options
  copper: string;
  aluminium: string;
  singleCore: string;
  multicoreUnarmoured: string;
  multicoreArmoured: string;
  directBuried: string;
  inDuct: string;
  freeAir: string;

  // Results & Metrics
  designCurrent: string;
  mainBreaker: string;
  selectedCable: string;
  voltageDrop: string;
  conduitSize: string;
  conduitFill: string;
  shortCircuitCheck: string;
  protectionCheck: string;
  autoCadTag: string;
  copyTag: string;
  tagCopied: string;

  // Calculation Breakdown
  calcBreakdown: string;
  formulaSteps: string;

  // Schedule
  panelSchedule: string;
  circuitName: string;
  load: string;
  unit: string;
  phase: string;
  length: string;
  breaker: string;
  cable: string;
  actions: string;
  phaseBalance: string;
  phaseImbalance: string;
  maxPhase: string;
  totalLoad: string;

  // Single Line Diagram (SLD)
  singleLineDiagram: string;
  exportSvg: string;
  exportDxf: string;
  cadTheme: string;
  appTheme: string;
  paperTheme: string;
  zoomIn: string;
  zoomOut: string;
  resetZoom: string;
  panHint: string;
}

export const I18N: Record<Language, Translations> = {
  en: {
    appTitle: 'Electrical Panel & HVAC Sizing Suite',
    appSubtitle: 'Professional Distribution Engineering & Cable Sizing per NEC 440 / IEC 60364',
    projects: 'Projects',
    panels: 'Panels & Distribution',
    circuits: 'Branch Circuits',
    settings: 'Settings & Standards',
    singleMC: 'Single Motor-Compressor',
    comboLoads: 'Combination AC Loads',
    roomAC: 'Room A/C Unit',
    save: 'Save Project',
    saved: 'Saved',
    saving: 'Saving...',
    exportReport: 'Export Report',
    exportJson: 'Export JSON',
    importJson: 'Import JSON',
    downloadCsv: 'Download CSV',
    addCircuit: '+ Add Circuit',
    delete: 'Delete',
    duplicate: 'Duplicate',
    backToProjects: '← All Projects',
    backToPanels: '← Project Panels',
    language: 'Language / اللغة',
    statusPass: 'PASS',
    statusFail: 'FAIL',

    projectInfo: 'Project Header',
    projectName: 'Project Name',
    projectCode: 'Project Code',
    client: 'Client',
    engineer: 'Lead Engineer',
    date: 'Date',

    panelType: 'Panel Application',
    system: 'System Configuration',
    voltage: 'System Voltage (V)',
    connectedLoad: 'Connected Load',
    demandFactor: 'Demand Factor (DF)',
    powerFactor: 'Power Factor (PF)',
    conductor: 'Conductor Material',
    insulation: 'Insulation',
    construction: 'Cable Construction',
    installation: 'Installation Method',
    cableLength: 'Cable Run Length (m)',
    maxVdrop: 'Max Allowed Voltage Drop (%)',
    deratingMode: 'Derating Method',
    manualDerating: 'Manual K_total',
    detailedDerating: 'Detailed Derating (IEC 60364)',
    ambientTemp: 'Ambient Temp (°C)',
    circuitsCount: 'Grouped Circuits (Qty)',
    burialDepth: 'Burial Depth (m)',
    soilResistivity: 'Soil Resistivity (K·m/W)',
    shortCircuitCurrent: 'Prospective Fault Current Isc (kA)',
    clearingTime: 'Fault Clearing Time t (s)',

    copper: 'Copper (Cu)',
    aluminium: 'Aluminium (Al)',
    singleCore: 'Single-Core (1C)',
    multicoreUnarmoured: 'Multicore Unarmoured',
    multicoreArmoured: 'Multicore Armoured (SWA)',
    directBuried: 'Direct Buried / Ground',
    inDuct: 'Underground Duct',
    freeAir: 'Free Air / Perforated Tray',

    designCurrent: 'Design Current (Ib)',
    mainBreaker: 'Main Breaker (In)',
    selectedCable: 'Selected Feeder Cable',
    voltageDrop: 'Voltage Drop (ΔV)',
    conduitSize: 'Conduit Size',
    conduitFill: 'Conduit Fill',
    shortCircuitCheck: 'Thermal Withstand (I²t)',
    protectionCheck: 'Overload Coordination (Ib ≤ In ≤ Iz)',
    autoCadTag: 'AutoCAD / SLD Drawing Tag',
    copyTag: 'Copy Tag',
    tagCopied: 'Copied to Clipboard!',

    calcBreakdown: 'Engineering Calculation Breakdown',
    formulaSteps: 'Formula Steps & Standard References',

    panelSchedule: 'Branch Circuits Schedule',
    circuitName: 'Circuit Description',
    load: 'Load',
    unit: 'Unit',
    phase: 'Phase',
    length: 'Length (m)',
    breaker: 'Breaker',
    cable: 'Cable (mm²)',
    actions: 'Actions',
    phaseBalance: 'Phase Balance Summary',
    phaseImbalance: 'Phase Imbalance',
    maxPhase: 'Max Phase Load',
    totalLoad: 'Total Connected Load',

    singleLineDiagram: 'Single Line Diagram (SLD)',
    exportSvg: 'Export SVG',
    exportDxf: 'Export AutoCAD DXF',
    cadTheme: 'CAD Dark (AutoCAD)',
    appTheme: 'Engineering Dark',
    paperTheme: 'Paper Space (White)',
    zoomIn: 'Zoom In',
    zoomOut: 'Zoom Out',
    resetZoom: 'Reset View',
    panHint: 'Drag to pan • Scroll to zoom'
  },
  ar: {
    appTitle: 'حاسبة اللوحات الكهربائية وأنظمة التكييف',
    appSubtitle: 'برنامج التصميم الهندسي وتحديد مقاطع الكابلات وقواطع الحماية وفق كود NEC 440 و IEC 60364',
    projects: 'المشاريع',
    panels: 'اللوحات والتوزيع',
    circuits: 'الدوائر الفرعية',
    settings: 'الإعدادات والمعايير',
    singleMC: 'ضاغط تبريد منفرد (Single MC)',
    comboLoads: 'أحمال تكييف مركبة (Combination)',
    roomAC: 'وحدة تكييف الغرفة (Room A/C)',
    save: 'حفظ المشروع',
    saved: 'تم الحفظ',
    saving: 'جاري الحفظ...',
    exportReport: 'طباعة التقرير الفني',
    exportJson: 'تصدير ملف JSON',
    importJson: 'استيراد ملف JSON',
    downloadCsv: 'تحميل جدول CSV',
    addCircuit: '+ إضافة دائرة',
    delete: 'حذف',
    duplicate: 'نسخ',
    backToProjects: '← جميع المشاريع',
    backToPanels: '← لوحات المشروع',
    language: 'Language / اللغة',
    statusPass: 'مطابق (PASS)',
    statusFail: 'غير مطابق (FAIL)',

    projectInfo: 'بيانات المشروع',
    projectName: 'اسم المشروع',
    projectCode: 'كود المشروع',
    client: 'العميل',
    engineer: 'مهندس التصميم',
    date: 'التاريخ',

    panelType: 'نوع اللوحة واستخدامها',
    system: 'نظام التغذية الكهربائية',
    voltage: 'جهد النظام (فولت)',
    connectedLoad: 'الحمل المتصل',
    demandFactor: 'معامل الطلب (DF)',
    powerFactor: 'معامل القدرة (PF)',
    conductor: 'معدن الموصل',
    insulation: 'نوع العزل',
    construction: 'بنية الكابل وتدريعه',
    installation: 'طريقة التمديد',
    cableLength: 'طول مسار الكابل (متر)',
    maxVdrop: 'أقصى هبوط جهد مسموح (%)',
    deratingMode: 'طريقة حساب معاملات التخفيض',
    manualDerating: 'معامل تخفيض يدوي (K_total)',
    detailedDerating: 'حساب تفصيلي دقيق (IEC 60364)',
    ambientTemp: 'درجة حرارة الوسط المحيط (°م)',
    circuitsCount: 'عدد الدوائر المجمعة',
    burialDepth: 'عمق الدفن (متر)',
    soilResistivity: 'المقاومة الحرارية للتربة (K·m/W)',
    shortCircuitCurrent: 'تيار القصر المتوقع Isc (كيلو أمبير)',
    clearingTime: 'زمن فصل القاطع t (ثانية)',

    copper: 'نحاس (Cu)',
    aluminium: 'ألومنيوم (Al)',
    singleCore: 'أحادي القلب (1C)',
    multicoreUnarmoured: 'متعدد القلوب غير مسلح',
    multicoreArmoured: 'متعدد القلوب مسلح (SWA)',
    directBuried: 'مدفون مباشرة في التربة',
    inDuct: 'داخل مجرى/ماسورة مدفونة',
    freeAir: 'في الهواء الطلق وعلى الحوامل',

    designCurrent: 'تيار الحمل التصميمي (Ib)',
    mainBreaker: 'القاطع الرئيسي (In)',
    selectedCable: 'كابل التغذية المختار',
    voltageDrop: 'هبوط الجهد (ΔV)',
    conduitSize: 'قطر الماسورة الواقية',
    conduitFill: 'نسبة إشغال الماسورة',
    shortCircuitCheck: 'التحمل الحراري لتيار القصر (I²t)',
    protectionCheck: 'تنسيق الحماية من زيادة الحمل (Ib ≤ In ≤ Iz)',
    autoCadTag: 'رمز الكابل لمخططات الأوتوكاد (CAD Tag)',
    copyTag: 'نسخ الرمز',
    tagCopied: 'تم النسخ إلى الحافظة!',

    calcBreakdown: 'خطوات التحليل والحسابات الهندسية',
    formulaSteps: 'المعادلات المستخدمة والمعايير القياسية',

    panelSchedule: 'جدول توزيع الدوائر الكهربائية (Panel Schedule)',
    circuitName: 'وصف الدائرة',
    load: 'الحمل',
    unit: 'الوحدة',
    phase: 'الفازة',
    length: 'الطول (م)',
    breaker: 'القاطع',
    cable: 'الكابل (مم²)',
    actions: 'إجراءات',
    phaseBalance: 'ملخص اتزان الأطوار (Phase Balance)',
    phaseImbalance: 'نسبة عدم الاتزان بين الفازات',
    maxPhase: 'أقصى حمل على فازة',
    totalLoad: 'إجمالي الحمل المتصل',

    singleLineDiagram: 'المخطط أحادي الخط (SLD)',
    exportSvg: 'تصدير SVG',
    exportDxf: 'تصدير AutoCAD DXF',
    cadTheme: 'وضع الأوتوكاد (أسود)',
    appTheme: 'الوضع الداكن الهندسي',
    paperTheme: 'الوضع الورقي (أبيض)',
    zoomIn: 'تكبير',
    zoomOut: 'تصغير',
    resetZoom: 'إعادة ضبط العرض',
    panHint: 'اسحب للتحريك • حرك العجلة للتكبير والتصغير'
  }
};
