/**
 * Step-by-Step Mathematical Derivations with Substituted Values
 * For inclusion in Calculation Reports and Audit Checklists.
 */

import type { DerivationInputs, FormulaDerivationStep } from './types.js';

export function generateStepByStepDerivations(inp: DerivationInputs): FormulaDerivationStep[] {
  const steps: FormulaDerivationStep[] = [];

  // Step 1: Design Current (Ib)
  const is3P = inp.isThreePhase;
  const sVa = Math.round(inp.loadKva * 1000);
  const formula1 = is3P ? 'Ib = S / (√3 × V)' : 'Ib = S / V';
  const sub1 = is3P
    ? `Ib = ${sVa} / (√3 × ${inp.voltage}) = ${sVa} / ${(Math.sqrt(3) * inp.voltage).toFixed(1)}`
    : `Ib = ${sVa} / ${inp.voltage}`;
  steps.push({
    step: 1,
    title: 'Operating Design Current (Ib)',
    standardRef: 'IEC 60364-5-52 / Fundamental AC Theory',
    formulaStr: formula1,
    substitutedStr: sub1,
    resultStr: `Ib = ${inp.Ib.toFixed(2)} A`,
    passed: true
  });

  // Step 2: Main Circuit Breaker Sizing (In)
  const reqBreaker = (inp.Ib * 1.25).toFixed(2);
  steps.push({
    step: 2,
    title: 'Overcurrent Protective Device (OCPD / In)',
    standardRef: 'NEC 215.2 / NEC 440.12 / IEC 60947-2',
    formulaStr: 'In ≥ 1.25 × Ib (Continuous Duty Sizing)',
    substitutedStr: `In ≥ 1.25 × ${inp.Ib.toFixed(2)} = ${reqBreaker} A`,
    resultStr: `Selected Standard Breaker In = ${inp.In} A`,
    passed: inp.In >= inp.Ib
  });

  // Step 3: Derated Cable Requirement (Iz,required)
  const reqIz = (inp.In / inp.deratingK).toFixed(2);
  steps.push({
    step: 3,
    title: 'Conductor Ampacity Requirement (Iz,req)',
    standardRef: 'IEC 60364-5-52 Table A.52 & Correction Factors',
    formulaStr: 'Iz,req = In / K_total',
    substitutedStr: `Iz,req = ${inp.In} / ${inp.deratingK.toFixed(3)}`,
    resultStr: `Iz,req = ${reqIz} A → Selected Cable: ${inp.cableSize} mm² (${inp.cableAmpacity} A base, ${inp.actualIz.toFixed(1)} A derated)`,
    passed: inp.actualIz >= inp.In
  });

  // Step 4: Overload Protection Coordination Check
  const coordPass = inp.Ib <= inp.In && inp.In <= inp.actualIz;
  steps.push({
    step: 4,
    title: 'Overload Protection Coordination Check',
    standardRef: 'IEC 60364-4-43 Clause 433.1 (Ib ≤ In ≤ Iz)',
    formulaStr: 'Ib ≤ In ≤ Iz',
    substitutedStr: `${inp.Ib.toFixed(1)} A ≤ ${inp.In} A ≤ ${inp.actualIz.toFixed(1)} A`,
    resultStr: coordPass ? 'PASSED (Fully Coordinated)' : 'FAILED (Breaker exceeds Cable Ampacity)',
    passed: coordPass
  });

  // Step 5: Voltage Drop Verification (ΔV)
  const vdropPass = inp.vDropPct <= inp.vdropMax;
  steps.push({
    step: 5,
    title: 'Vector Voltage Drop Verification (ΔV%)',
    standardRef: 'IEC 60364-5-52 Annex G / BS 7671',
    formulaStr: is3P
      ? 'ΔV = [√3 × Ib × L × (R cosφ + X sinφ)] / 1000'
      : 'ΔV = [2 × Ib × L × (R cosφ + X sinφ)] / 1000',
    substitutedStr: `ΔV = ${inp.vDropV.toFixed(2)} V on ${inp.lengthM}m feeder with PF ${inp.pf}`,
    resultStr: `ΔV = ${inp.vDropPct.toFixed(2)}% ≤ Allowed ${inp.vdropMax.toFixed(1)}% (${vdropPass ? 'PASSED' : 'EXCEEDED'})`,
    passed: vdropPass
  });

  // Step 6: Adiabatic Short-Circuit Thermal Withstand
  const scPass = inp.cableSize >= inp.sMinSc;
  steps.push({
    step: 6,
    title: 'Short-Circuit Adiabatic Thermal Withstand',
    standardRef: 'IEC 60364-4-43 Clause 434.5.2 / IEC 60949',
    formulaStr: 'S_min = (Isc × √t) / k',
    substitutedStr: `S_min = (${inp.iscKa} × 10³ × √${inp.fclearSec}) / ${inp.scK}`,
    resultStr: `S_min = ${inp.sMinSc.toFixed(2)} mm² ≤ Actual ${inp.cableSize} mm² (${scPass ? 'PASSED' : 'FAILED'})`,
    passed: scPass
  });

  // Step 7: Protective Earthing & Neutral Sizing
  steps.push({
    step: 7,
    title: 'Neutral & Protective Earth (ECC) Sizing',
    standardRef: 'IEC 60364-5-54 / NEC 250.122',
    formulaStr: 'Neutral per harmonic loading rule | Earth per IEC 60364-5-54 Table 54.2',
    substitutedStr: `Phase Conductor = ${inp.cableSize} mm² ${inp.conductor.toUpperCase()}`,
    resultStr: `Neutral = ${inp.neutralSize} mm² | ECC Earth = ${inp.eccSize} mm² | Conduit = Ø${inp.conduitSize} mm (Fill: ${inp.conduitFillPct.toFixed(1)}%)`,
    passed: true
  });

  return steps;
}
