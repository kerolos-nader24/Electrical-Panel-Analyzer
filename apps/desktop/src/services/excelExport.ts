/**
 * Professional Multi-Tab Excel Workbook Generator
 * Emits Microsoft Excel XML Spreadsheet format with multi-worksheets,
 * cell styles, column widths, number formats, and live Excel formulas.
 */

import type { PanelRecord, CircuitRecord, ProjectRecord } from '../../electron/db.js';
import { resolveCalculationProfile, type PanelBoq, type CalculationProfile } from '@panel-analyzer/engine';

interface ExcelExportParams {
  project: ProjectRecord | null;
  panel: PanelRecord;
  circuits: CircuitRecord[];
  calculatedCircuits: any[];
  boq: PanelBoq;
  settings: Record<string, string>;
}

function escapeXml(str: string | number | undefined | null): string {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function generateExcelWorkbookXml({
  project,
  panel,
  calculatedCircuits,
  boq,
  settings
}: ExcelExportParams): string {
  const companyName = settings['company_name'] || 'ELECTRICAL ENGINEERING CONSULTANTS';
  const companyTagline = settings['company_tagline'] || 'Power Distribution & HVAC Engineering';
  const dateStr = new Date().toISOString().slice(0, 10);
  const projectName = project?.name || 'ELECTRICAL DISTRIBUTION PROJECT';
  const projectCode = project?.code || 'P-001';
  const engineerName = project?.engineer || 'Lead Electrical Engineer';

  let profile: CalculationProfile = resolveCalculationProfile('iec');
  try {
    if (settings['calculation_profile_config']) {
      const parsed = JSON.parse(settings['calculation_profile_config']);
      profile = resolveCalculationProfile(parsed.id || 'iec', parsed);
    }
  } catch (e) {
    // fallback
  }

  let xml = `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
 <DocumentProperties xmlns="urn:schemas-microsoft-com:office:office">
  <Author>${escapeXml(companyName)}</Author>
  <Company>${escapeXml(companyName)}</Company>
  <Created>${dateStr}</Created>
 </DocumentProperties>
 <Styles>
  <Style ss:ID="Default" ss:Name="Normal">
   <Alignment ss:Vertical="Center"/>
   <Borders/>
   <Font ss:FontName="Calibri" ss:Size="10" ss:Color="#000000"/>
  </Style>
  <Style ss:ID="CompanyHeader">
   <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="14" ss:Color="#0B4F6C" ss:Bold="1"/>
  </Style>
  <Style ss:ID="SheetTitle">
   <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="16" ss:Color="#142A38" ss:Bold="1"/>
  </Style>
  <Style ss:ID="MetaLabel">
   <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="10" ss:Color="#475569" ss:Bold="1"/>
   <Interior ss:Color="#F8FAFC" ss:Pattern="Solid"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
   </Borders>
  </Style>
  <Style ss:ID="MetaVal">
   <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="10" ss:Color="#0F172A"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
   </Borders>
  </Style>
  <Style ss:ID="TableHeader">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:WrapText="1"/>
   <Font ss:FontName="Calibri" ss:Size="10" ss:Color="#FFFFFF" ss:Bold="1"/>
   <Interior ss:Color="#142A38" ss:Pattern="Solid"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#000000"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#000000"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#000000"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#000000"/>
   </Borders>
  </Style>
  <Style ss:ID="TableCell">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="10" ss:Color="#0F172A"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
   </Borders>
  </Style>
  <Style ss:ID="TableCellLeft">
   <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="10" ss:Color="#0F172A"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
   </Borders>
  </Style>
  <Style ss:ID="TableCellNum">
   <Alignment ss:Horizontal="Right" ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="10" ss:Color="#0F172A"/>
   <NumberFormat ss:Format="#,##0.00"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
   </Borders>
  </Style>
  <Style ss:ID="TablePass">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="9.5" ss:Color="#15803D" ss:Bold="1"/>
   <Interior ss:Color="#DCFCE7" ss:Pattern="Solid"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#BBF7D0"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#BBF7D0"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#BBF7D0"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#BBF7D0"/>
   </Borders>
  </Style>
  <Style ss:ID="TableFail">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="9.5" ss:Color="#B91C1C" ss:Bold="1"/>
   <Interior ss:Color="#FEE2E2" ss:Pattern="Solid"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#FECACA"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#FECACA"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#FECACA"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#FECACA"/>
   </Borders>
  </Style>
  <Style ss:ID="TotalRow">
   <Alignment ss:Horizontal="Right" ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="10.5" ss:Color="#0F172A" ss:Bold="1"/>
   <Interior ss:Color="#F1F5F9" ss:Pattern="Solid"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Double" ss:Weight="2" ss:Color="#475569"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#475569"/>
   </Borders>
  </Style>
  <Style ss:ID="TotalRowNum">
   <Alignment ss:Horizontal="Right" ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="10.5" ss:Color="#0F172A" ss:Bold="1"/>
   <Interior ss:Color="#F1F5F9" ss:Pattern="Solid"/>
   <NumberFormat ss:Format="#,##0.00"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Double" ss:Weight="2" ss:Color="#475569"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#475569"/>
   </Borders>
  </Style>
 </Styles>
`;

  // ==========================================
  // SHEET 1: PANEL SCHEDULE
  // ==========================================
  xml += ` <Worksheet ss:Name="Panel Schedule">
  <Table ss:DefaultRowHeight="20">
   <Column ss:Width="40"/>
   <Column ss:Width="160"/>
   <Column ss:Width="90"/>
   <Column ss:Width="70"/>
   <Column ss:Width="50"/>
   <Column ss:Width="50"/>
   <Column ss:Width="50"/>
   <Column ss:Width="65"/>
   <Column ss:Width="80"/>
   <Column ss:Width="90"/>
   <Column ss:Width="65"/>
   <Column ss:Width="70"/>
   <Column ss:Width="110"/>
   <Column ss:Width="65"/>
   <Column ss:Width="75"/>

   <!-- Company Banner -->
   <Row ss:Height="24">
    <Cell ss:StyleID="CompanyHeader"><Data ss:Type="String">${escapeXml(companyName)}</Data></Cell>
   </Row>
   <Row ss:Height="18">
    <Cell ss:StyleID="SheetTitle"><Data ss:Type="String">PANEL SCHEDULE - ${escapeXml(panel.name)}</Data></Cell>
   </Row>
   <Row ss:Height="14"/>

   <!-- Project Metadata Grid -->
   <Row>
    <Cell ss:StyleID="MetaLabel"><Data ss:Type="String">Project:</Data></Cell>
    <Cell ss:StyleID="MetaVal"><Data ss:Type="String">${escapeXml(projectName)} (${escapeXml(projectCode)})</Data></Cell>
    <Cell ss:StyleID="MetaLabel"><Data ss:Type="String">Voltage / System:</Data></Cell>
    <Cell ss:StyleID="MetaVal"><Data ss:Type="String">${panel.voltage}V ${panel.system_type.toUpperCase()}</Data></Cell>
    <Cell ss:StyleID="MetaLabel"><Data ss:Type="String">Date:</Data></Cell>
    <Cell ss:StyleID="MetaVal"><Data ss:Type="String">${dateStr}</Data></Cell>
   </Row>
   <Row>
    <Cell ss:StyleID="MetaLabel"><Data ss:Type="String">Engineer:</Data></Cell>
    <Cell ss:StyleID="MetaVal"><Data ss:Type="String">${escapeXml(engineerName)}</Data></Cell>
    <Cell ss:StyleID="MetaLabel"><Data ss:Type="String">Application:</Data></Cell>
    <Cell ss:StyleID="MetaVal"><Data ss:Type="String">${escapeXml(panel.panel_type.toUpperCase())}</Data></Cell>
    <Cell ss:StyleID="MetaLabel"><Data ss:Type="String">Revision:</Data></Cell>
    <Cell ss:StyleID="MetaVal"><Data ss:Type="String">01</Data></Cell>
   </Row>
   <Row>
    <Cell ss:StyleID="MetaLabel"><Data ss:Type="String">Design Standard:</Data></Cell>
    <Cell ss:StyleID="MetaVal"><Data ss:Type="String">${escapeXml(profile.name)} (${escapeXml(profile.codeReference)})</Data></Cell>
    <Cell ss:StyleID="MetaLabel"><Data ss:Type="String">Breaker / ΔV Factors:</Data></Cell>
    <Cell ss:StyleID="MetaVal"><Data ss:Type="String">Breaker: x${profile.breakerFactor} Ib | Feeder ΔV: ${profile.maxVoltageDropFeeder}% | Branch ΔV: ${profile.maxVoltageDropBranch}%</Data></Cell>
    <Cell ss:StyleID="MetaLabel"><Data ss:Type="String">Ambient &amp; Soil:</Data></Cell>
    <Cell ss:StyleID="MetaVal"><Data ss:Type="String">Air: ${profile.defaultAmbientAirTemp}°C | Grd: ${profile.defaultAmbientGroundTemp}°C | Soil: ${profile.defaultSoilResistivity} K·m/W</Data></Cell>
   </Row>
   <Row ss:Height="14"/>

   <!-- Schedule Table Headers -->
   <Row ss:Height="26">
    <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Ckt #</Data></Cell>
    <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Circuit Description</Data></Cell>
    <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Load Type</Data></Cell>
    <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Load Val</Data></Cell>
    <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Unit</Data></Cell>
    <Cell ss:StyleID="TableHeader"><Data ss:Type="String">P.F.</Data></Cell>
    <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Phase</Data></Cell>
    <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Length (m)</Data></Cell>
    <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Install Method</Data></Cell>
    <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Cable Type</Data></Cell>
    <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Ib (A)</Data></Cell>
    <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Breaker In (A)</Data></Cell>
    <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Cable Size (mm²)</Data></Cell>
    <Cell ss:StyleID="TableHeader"><Data ss:Type="String">ΔV (%)</Data></Cell>
    <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Protection</Data></Cell>
   </Row>
`;

  // Output circuit rows
  const startRow = 9;
  calculatedCircuits.forEach((c, idx) => {
    const isPass = c.protPass;
    xml += `   <Row>
    <Cell ss:StyleID="TableCell"><Data ss:Type="Number">${c.circuit_number}</Data></Cell>
    <Cell ss:StyleID="TableCellLeft"><Data ss:Type="String">${escapeXml(c.name)}</Data></Cell>
    <Cell ss:StyleID="TableCell"><Data ss:Type="String">${escapeXml((c.load_type || 'other').toUpperCase())}</Data></Cell>
    <Cell ss:StyleID="TableCellNum"><Data ss:Type="Number">${c.load_val || 0}</Data></Cell>
    <Cell ss:StyleID="TableCell"><Data ss:Type="String">${escapeXml(c.load_unit || 'kW')}</Data></Cell>
    <Cell ss:StyleID="TableCellNum"><Data ss:Type="Number">${c.pf || 0.9}</Data></Cell>
    <Cell ss:StyleID="TableCell"><Data ss:Type="String">${escapeXml(c.phase)}</Data></Cell>
    <Cell ss:StyleID="TableCell"><Data ss:Type="Number">${c.length_m || 20}</Data></Cell>
    <Cell ss:StyleID="TableCell"><Data ss:Type="String">${escapeXml((c.install_method || 'air').toUpperCase())}</Data></Cell>
    <Cell ss:StyleID="TableCell"><Data ss:Type="String">${escapeXml((c.cable_type || 'cu_xlpe').toUpperCase())}</Data></Cell>
    <Cell ss:StyleID="TableCellNum"><Data ss:Type="Number">${(c.Ib || 0).toFixed(2)}</Data></Cell>
    <Cell ss:StyleID="TableCell"><Data ss:Type="Number">${c.breaker || 20}</Data></Cell>
    <Cell ss:StyleID="TableCell"><Data ss:Type="String">${escapeXml(c.cableDisplay || '2.5')}</Data></Cell>
    <Cell ss:StyleID="TableCellNum"><Data ss:Type="Number">${(c.vDropPct || 0).toFixed(2)}</Data></Cell>
    <Cell ss:StyleID="${isPass ? 'TablePass' : 'TableFail'}"><Data ss:Type="String">${isPass ? 'PASS' : 'FAIL'}</Data></Cell>
   </Row>
`;
  });

  const endRow = startRow + Math.max(calculatedCircuits.length - 1, 0);

  // Summary Row with Excel formulas
  xml += `   <Row ss:Height="22">
    <Cell ss:StyleID="TotalRow"><Data ss:Type="String">TOTAL</Data></Cell>
    <Cell ss:StyleID="TotalRow"><Data ss:Type="String">${calculatedCircuits.length} Circuits</Data></Cell>
    <Cell ss:StyleID="TotalRow"/>
    <Cell ss:StyleID="TotalRowNum" ss:Formula="=SUM(R[${startRow - endRow - 1}]C:R[-1]C)"><Data ss:Type="Number">0</Data></Cell>
    <Cell ss:StyleID="TotalRow"/>
    <Cell ss:StyleID="TotalRow"/>
    <Cell ss:StyleID="TotalRow"/>
    <Cell ss:StyleID="TotalRowNum" ss:Formula="=SUM(R[${startRow - endRow - 1}]C:R[-1]C)"><Data ss:Type="Number">0</Data></Cell>
    <Cell ss:StyleID="TotalRow"/>
    <Cell ss:StyleID="TotalRow"/>
    <Cell ss:StyleID="TotalRowNum" ss:Formula="=SUM(R[${startRow - endRow - 1}]C:R[-1]C)"><Data ss:Type="Number">0</Data></Cell>
    <Cell ss:StyleID="TotalRow"/>
    <Cell ss:StyleID="TotalRow"/>
    <Cell ss:StyleID="TotalRow"/>
    <Cell ss:StyleID="TotalRow"/>
   </Row>
  </Table>
 </Worksheet>
`;

  // ==========================================
  // SHEET 2: CABLE SCHEDULE
  // ==========================================
  xml += ` <Worksheet ss:Name="Cable Schedule">
  <Table ss:DefaultRowHeight="20">
   <Column ss:Width="40"/>
   <Column ss:Width="100"/>
   <Column ss:Width="140"/>
   <Column ss:Width="200"/>
   <Column ss:Width="80"/>
   <Column ss:Width="70"/>
   <Column ss:Width="90"/>
   <Column ss:Width="65"/>
   <Column ss:Width="65"/>

   <Row ss:Height="22">
    <Cell ss:StyleID="SheetTitle"><Data ss:Type="String">CABLE SCHEDULE - ${escapeXml(panel.name)}</Data></Cell>
   </Row>
   <Row ss:Height="14"/>

   <Row ss:Height="26">
    <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Ckt #</Data></Cell>
    <Cell ss:StyleID="TableHeader"><Data ss:Type="String">From</Data></Cell>
    <Cell ss:StyleID="TableHeader"><Data ss:Type="String">To (Destination)</Data></Cell>
    <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Cable Tag &amp; Specification</Data></Cell>
    <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Size (mm²)</Data></Cell>
    <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Length (m)</Data></Cell>
    <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Method</Data></Cell>
    <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Ib (A)</Data></Cell>
    <Cell ss:StyleID="TableHeader"><Data ss:Type="String">ΔV (%)</Data></Cell>
   </Row>
`;

  const cableStartRow = 5;
  calculatedCircuits.forEach(c => {
    const cableTag = `${c.runs > 1 ? c.runs + 'x(' : ''}${c.phase === '3P' ? '4' : '3'}x${c.cableSize}mm² ${(c.conductor || 'Cu').toUpperCase()}/${(c.insulation || 'XLPE').toUpperCase()}`;
    xml += `   <Row>
    <Cell ss:StyleID="TableCell"><Data ss:Type="Number">${c.circuit_number}</Data></Cell>
    <Cell ss:StyleID="TableCell"><Data ss:Type="String">${escapeXml(panel.name)}</Data></Cell>
    <Cell ss:StyleID="TableCellLeft"><Data ss:Type="String">${escapeXml(c.name)}</Data></Cell>
    <Cell ss:StyleID="TableCellLeft"><Data ss:Type="String">${escapeXml(cableTag)}</Data></Cell>
    <Cell ss:StyleID="TableCell"><Data ss:Type="String">${escapeXml(c.cableDisplay || '2.5')}</Data></Cell>
    <Cell ss:StyleID="TableCellNum"><Data ss:Type="Number">${c.length_m || 20}</Data></Cell>
    <Cell ss:StyleID="TableCell"><Data ss:Type="String">${escapeXml((c.install_method || 'air').toUpperCase())}</Data></Cell>
    <Cell ss:StyleID="TableCellNum"><Data ss:Type="Number">${(c.Ib || 0).toFixed(2)}</Data></Cell>
    <Cell ss:StyleID="TableCellNum"><Data ss:Type="Number">${(c.vDropPct || 0).toFixed(2)}</Data></Cell>
   </Row>
`;
  });

  const cableEndRow = cableStartRow + Math.max(calculatedCircuits.length - 1, 0);
  xml += `   <Row ss:Height="22">
    <Cell ss:StyleID="TotalRow"><Data ss:Type="String">TOTAL</Data></Cell>
    <Cell ss:StyleID="TotalRow"/>
    <Cell ss:StyleID="TotalRow"/>
    <Cell ss:StyleID="TotalRow"/>
    <Cell ss:StyleID="TotalRow"><Data ss:Type="String">Total Meters:</Data></Cell>
    <Cell ss:StyleID="TotalRowNum" ss:Formula="=SUM(R[${cableStartRow - cableEndRow - 1}]C:R[-1]C)"><Data ss:Type="Number">0</Data></Cell>
    <Cell ss:StyleID="TotalRow"/>
    <Cell ss:StyleID="TotalRow"/>
    <Cell ss:StyleID="TotalRow"/>
   </Row>
  </Table>
 </Worksheet>
`;

  // ==========================================
  // SHEET 3: LOAD SCHEDULE & DEMAND
  // ==========================================
  xml += ` <Worksheet ss:Name="Load Schedule">
  <Table ss:DefaultRowHeight="20">
   <Column ss:Width="160"/>
   <Column ss:Width="90"/>
   <Column ss:Width="110"/>
   <Column ss:Width="100"/>
   <Column ss:Width="110"/>

   <Row ss:Height="22">
    <Cell ss:StyleID="SheetTitle"><Data ss:Type="String">LOAD SCHEDULE &amp; DEMAND FACTORS - ${escapeXml(panel.name)}</Data></Cell>
   </Row>
   <Row ss:Height="14"/>

   <Row ss:Height="26">
    <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Load Category</Data></Cell>
    <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Circuit Count</Data></Cell>
    <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Connected (kVA)</Data></Cell>
    <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Demand Factor</Data></Cell>
    <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Demand Load (kVA)</Data></Cell>
   </Row>
`;

  // Aggregate categories
  const categories = ['lighting', 'socket', 'motor', 'ac', 'other'];
  const catNames: Record<string, string> = {
    lighting: 'Lighting Circuits',
    socket: 'Socket & Small Power',
    motor: 'Motors & Pumps (NEC 430)',
    ac: 'HVAC & A/C Units',
    other: 'Other General Loads'
  };

  const loadStartRow = 5;
  categories.forEach(cat => {
    const matching = calculatedCircuits.filter(c => (c.load_type || 'other') === cat);
    const count = matching.length;
    const connectedKva = matching.reduce((sum, c) => sum + (c.connectedKva || 0), 0);
    const df = cat === 'lighting' ? 0.9 : (cat === 'socket' ? 0.7 : (cat === 'ac' ? 0.85 : 1.0));
    const demandKva = connectedKva * df;

    xml += `   <Row>
    <Cell ss:StyleID="TableCellLeft"><Data ss:Type="String">${escapeXml(catNames[cat] || cat)}</Data></Cell>
    <Cell ss:StyleID="TableCell"><Data ss:Type="Number">${count}</Data></Cell>
    <Cell ss:StyleID="TableCellNum"><Data ss:Type="Number">${connectedKva.toFixed(2)}</Data></Cell>
    <Cell ss:StyleID="TableCellNum"><Data ss:Type="Number">${df.toFixed(2)}</Data></Cell>
    <Cell ss:StyleID="TableCellNum"><Data ss:Type="Number">${demandKva.toFixed(2)}</Data></Cell>
   </Row>
`;
  });

  const loadEndRow = loadStartRow + categories.length - 1;
  xml += `   <Row ss:Height="22">
    <Cell ss:StyleID="TotalRow"><Data ss:Type="String">TOTAL</Data></Cell>
    <Cell ss:StyleID="TotalRowNum" ss:Formula="=SUM(R[${loadStartRow - loadEndRow - 1}]C:R[-1]C)"><Data ss:Type="Number">0</Data></Cell>
    <Cell ss:StyleID="TotalRowNum" ss:Formula="=SUM(R[${loadStartRow - loadEndRow - 1}]C:R[-1]C)"><Data ss:Type="Number">0</Data></Cell>
    <Cell ss:StyleID="TotalRow"/>
    <Cell ss:StyleID="TotalRowNum" ss:Formula="=SUM(R[${loadStartRow - loadEndRow - 1}]C:R[-1]C)"><Data ss:Type="Number">0</Data></Cell>
   </Row>
  </Table>
 </Worksheet>
`;

  // ==========================================
  // SHEET 4: BILL OF QUANTITIES (BOQ)
  // ==========================================
  xml += ` <Worksheet ss:Name="Bill of Quantities">
  <Table ss:DefaultRowHeight="20">
   <Column ss:Width="160"/>
   <Column ss:Width="280"/>
   <Column ss:Width="70"/>
   <Column ss:Width="90"/>

   <Row ss:Height="22">
    <Cell ss:StyleID="SheetTitle"><Data ss:Type="String">BILL OF QUANTITIES (BOQ) - ${escapeXml(panel.name)}</Data></Cell>
   </Row>
   <Row ss:Height="14"/>

   <!-- Section: Circuit Breakers -->
   <Row ss:Height="24">
    <Cell ss:StyleID="CompanyHeader"><Data ss:Type="String">1. CIRCUIT BREAKERS</Data></Cell>
   </Row>
   <Row ss:Height="24">
    <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Equipment Type</Data></Cell>
    <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Rating &amp; Specification</Data></Cell>
    <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Unit</Data></Cell>
    <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Quantity</Data></Cell>
   </Row>
`;

  boq.breakers.forEach(b => {
    xml += `   <Row>
    <Cell ss:StyleID="TableCellLeft"><Data ss:Type="String">${escapeXml(b.item)}</Data></Cell>
    <Cell ss:StyleID="TableCellLeft"><Data ss:Type="String">${escapeXml(b.specification)}</Data></Cell>
    <Cell ss:StyleID="TableCell"><Data ss:Type="String">${escapeXml(b.unit)}</Data></Cell>
    <Cell ss:StyleID="TableCellNum"><Data ss:Type="Number">${b.quantity}</Data></Cell>
   </Row>
`;
  });

  xml += `   <Row ss:Height="14"/>

   <!-- Section: Cables -->
   <Row ss:Height="24">
    <Cell ss:StyleID="CompanyHeader"><Data ss:Type="String">2. POWER CABLES &amp; CONDUCTORS</Data></Cell>
   </Row>
   <Row ss:Height="24">
    <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Cable Description</Data></Cell>
    <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Specification</Data></Cell>
    <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Unit</Data></Cell>
    <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Total Length (m)</Data></Cell>
   </Row>
`;

  boq.cables.forEach(c => {
    xml += `   <Row>
    <Cell ss:StyleID="TableCellLeft"><Data ss:Type="String">${escapeXml(c.item)}</Data></Cell>
    <Cell ss:StyleID="TableCellLeft"><Data ss:Type="String">${escapeXml(c.specification)}</Data></Cell>
    <Cell ss:StyleID="TableCell"><Data ss:Type="String">${escapeXml(c.unit)}</Data></Cell>
    <Cell ss:StyleID="TableCellNum"><Data ss:Type="Number">${c.quantity}</Data></Cell>
   </Row>
`;
  });

  xml += `   <Row ss:Height="14"/>

   <!-- Section: Conduits -->
   <Row ss:Height="24">
    <Cell ss:StyleID="CompanyHeader"><Data ss:Type="String">3. CONDUITS &amp; CONTAINMENT</Data></Cell>
   </Row>
   <Row ss:Height="24">
    <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Conduit Type</Data></Cell>
    <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Diameter &amp; Heavy Duty Class</Data></Cell>
    <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Unit</Data></Cell>
    <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Total Length (m)</Data></Cell>
   </Row>
`;

  boq.conduits.forEach(cd => {
    xml += `   <Row>
    <Cell ss:StyleID="TableCellLeft"><Data ss:Type="String">${escapeXml(cd.item)}</Data></Cell>
    <Cell ss:StyleID="TableCellLeft"><Data ss:Type="String">${escapeXml(cd.specification)}</Data></Cell>
    <Cell ss:StyleID="TableCell"><Data ss:Type="String">${escapeXml(cd.unit)}</Data></Cell>
    <Cell ss:StyleID="TableCellNum"><Data ss:Type="Number">${cd.quantity}</Data></Cell>
   </Row>
`;
  });

  xml += `  </Table>
 </Worksheet>
</Workbook>`;

  return xml;
}
