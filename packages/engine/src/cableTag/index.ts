import type { CableForm, CableTagResult, ConductorMaterial, InsulationType, SelectedCable, SystemType } from '../types/common.js';
import { calculateEarth, calculateNeutral } from '../neutralAndEarth/index.js';

/**
 * Generates AutoCAD / Single-Line Diagram (SLD) drawing cable tag text matching the exact output from the HTML calculator.
 */
export function generateCableTag(
  cable: SelectedCable | null,
  cores: number,
  cond: ConductorMaterial,
  form: CableForm,
  insul: InsulationType,
  systemType: SystemType,
  runs: number = 1
): CableTagResult {
  if (!cable) {
    return { line1: '—', line2: '—', full: '—', phaseSize: '—', neutralSize: '—', eccSize: '—' };
  }

  const cName = cond === 'cu' ? 'CU' : 'AL';
  const baseIns = insul === 'pvc' ? 'PVC/PVC' : 'XLPE/PVC';
  const armTag = form === 'armoured' ? ' SWA' : '';
  const phaseSize = cable.size;
  const neutralSize = calculateNeutral(phaseSize, systemType);
  const eccSize = calculateEarth(phaseSize);
  const runPrefix = runs > 1 ? `${runs}x` : '';


  let line1 = '';
  if (form === 'single') {
    if (systemType === '3pn') {
      line1 = `${runPrefix}(4(1CX${phaseSize}+1CX${neutralSize})mm2  ${cName}/${baseIns}`;
    } else if (systemType === '3p') {
      line1 = `${runPrefix}(3(1CX${phaseSize})mm2  ${cName}/${baseIns}`;
    } else {
      line1 = `${runPrefix}(2(1CX${phaseSize})mm2  ${cName}/${baseIns}`;
    }
  } else {
    if (systemType === '3pn') {
      line1 = `${runPrefix}(4X${phaseSize})mm2  ${cName}/${baseIns}${armTag}`;
    } else if (systemType === '3p') {
      line1 = `${runPrefix}(3X${phaseSize})mm2  ${cName}/${baseIns}${armTag}`;
    } else {
      line1 = `${runPrefix}(2X${phaseSize})mm2  ${cName}/${baseIns}${armTag}`;
    }
  }

  const line2 = `${runs > 1 ? runs + 'x' : '1x'}${eccSize}mm2  ${cName}/PVC ECC`;
  const full = `${line1}\n${line2}`;


  return {
    line1,
    line2,
    full,
    phaseSize: phaseSize.toString(),
    neutralSize: neutralSize !== null ? neutralSize.toString() : '—',
    eccSize: eccSize.toString()
  };
}
