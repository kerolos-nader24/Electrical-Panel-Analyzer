# Known Bugs & Discrepancies in `panel_and_ac_sizing_calculator.html`

This document records all discrepancies, typos, and formula bugs identified in the original single-file HTML calculator. Per project requirements, the calculation engine in `packages/engine` strictly preserves the original numeric behavior for backward compatibility. These issues are logged here for future resolution.

---

## 1. Cable Catalogue Ampacity Typo (Non-Monotonic Step)
* **Location:** `T.cu_xlpe_3core_armoured`, size $6\text{ mm}^2$ (Line 730).
* **Observed Code:**
  ```javascript
  cu_xlpe_3core_armoured: {
    4:  { ground: 54, duct: 41, air: 46, dia: 15.3 },
    6:  { ground: 58, duct: 43, air: 44, dia: 17 },
    10: { ground: 88, duct: 68, air: 76, dia: 18.5 }
  }
  ```
* **Defect:**
  In free air (`air`), the ampacity drops from **$46\text{ A}$** at $4\text{ mm}^2$ to **$44\text{ A}$** at $6\text{ mm}^2$.
* **Root Cause:**
  The ratings for $6\text{ mm}^2$ in `cu_pvc_3core_armoured` (`{ ground: 58, duct: 43, air: 44, dia: 17 }`) were mistakenly copied directly into the XLPE table.
* **Expected Values (Elsewedy Catalogue p. 74):**
  XLPE 3-core armoured $6\text{ mm}^2$ should be approximately `{ ground: 68, duct: 52, air: 57, dia: 17 }` (consistent with 4-core XLPE).

---

## 2. Text Phrasing Typo in Non-Fused Disconnect Rule
* **Location:** Single Motor-Compressor, Line 485.
* **Observed Code:**
  ```javascript
  'For a non-fused disconnect, its ampere rating must be less than 115% of the calculated current.'
  ```
* **Defect:**
  Violates NEC 440.12(A)(1). The rating must be **not less than 115%** ($\ge 115\%$), never less than.
* **Resolution:**
  Correct the text note to read "not less than 115%".

---

## 3. Combination Loads Case B OCPD Multiplier Omission
* **Location:** Lines 606–608 (`computeCombo`).
* **Observed Code:**
  ```javascript
  ocpdHtml = ... + meter('Step 1 — starting OCPD rating', sumMcI + sumOtherI, '...');
  ```
* **Defect:**
  In Case B (where a general motor or non-compressor load is the largest on the circuit), NEC 440.22(B)(2) and NEC 430.62(A) require sizing the largest motor at its starting protection percentage (e.g. 175% for time-delay fuse or 250% for inverse-time breaker per NEC Table 430.52) plus the sum of all remaining loads.
  The existing code uses a multiplier of `1.0` (`sumMcI + sumOtherI`), which leaves no inrush headroom for the largest motor.

---

## 4. Combination Loads Conductor Sizing Basis
* **Location:** Line 615 (`computeCombo`).
* **Observed Code:**
  ```javascript
  const condAmp = 1.25 * largestMcI + (sumI - largestMcI);
  ```
* **Defect:**
  Per NEC 440.33, conductors must have an ampacity $\ge 125\%$ of the highest rated motor or motor-compressor in the group plus the sum of the other loads.
  If an "other motor" or fan is larger than the largest compressor on the circuit (e.g. 50 A fan vs 20 A compressor), the 125% multiplier must apply to the 50 A motor. The existing code applies 125% strictly to `largestMcI`.

---

## 5. AutoCAD SLD Tag Unbalanced Parentheses
* **Location:** Single-Core Tag Generator (Lines 1060–1068).
* **Observed Code:**
  ```javascript
  if (systemType === '3pn') {
    line1 = `(4(1CX${phaseSize}+1CX${neutralSize})mm2  ${cName}/${baseIns}`;
  }
  ```
* **Defect:**
  Opening parenthesis `(` is never closed before the text. Furthermore, the notation `(4(1CX...` ambiguously implies 4 runs of 2 cables (8 cables) instead of 4 individual single-core cables (3 phases + 1 neutral).

---

## 6. Motor Efficiency Omission in HP Conversion
* **Location:** Line 819 (`calculateDesignCurrent`).
* **Observed Code:**
  ```javascript
  const kw = loadValue * 0.746;
  kvaConnected = kw / pFactor;
  ```
* **Defect:**
  Assumes 100% electrical-to-mechanical conversion efficiency ($\eta = 1.00$). Standard industrial motors have efficiencies between $0.80$ and $0.94$. Input kVA is underestimated by 10%–20% compared to empirical NEC Table 430.250 Full-Load Current values.
