# PIBot Clinical Validation Report
## Mandibular Asymmetry Analysis — Items 1-3

> **Author:** PIBot (Clinical Validation Agent)
> **Date:** 2026-08-16
> **Status:** VALIDATION REPORT — read-only analysis, no code modified
> **Purpose:** Provide actionable implementation spec for CalculationBot and FrontendDevBot

---

## 1. FORMULA VALIDATION (Item 1)

### 1.1 Habets Asymmetry Index — `calculateAsymmetryIndex`

**Current implementation** (mandibularAsymmetry.ts, lines 72-77):
```
(R − L) / (R + L) × 100
```
Signed value: positive = right greater, negative = left greater.

**Task requirement:**
```
abs(Right − Left) / (Right + Left) × 100
```
Absolute (unsigned) value.

**Verdict: CHANGE_REQUIRED**

The current Habets formula uses a **signed** expression `(R − L) / (R + L) × 100`. The task requires it to use the **absolute** expression `abs(R − L) / (R + L) × 100`.

**Important clinical note:** The original Habets et al. (1988) formula IS signed — `(R−L)/(R+L) × 100` with positive = right greater. The project's own `docs/clinical-evidence.md` §4 and `docs/clinical-protocol.md` §5.2 both specify the signed formula. The task requirement to make it absolute appears to be a deliberate simplification to avoid signed-value confusion in the UI. Since PIBot validates against the task spec (which is the governing instruction), the formula must change to use `abs()`.

**Side-direction handling:** The current code preserves side direction via the sign (positive = right greater, negative = left greater). If the Habets index becomes absolute (unsigned), the side direction must be communicated separately via `determineDominantSide()` (which already returns "right"/"left"/"equal"). This is clinically sound — the UI should show the absolute Habets value alongside the "Larger measured side" label.

**Instructions for CalculationBot:**
1. In `calculateAsymmetryIndex(right, left)`, change the formula from `(right - left) / sum * 100` to `Math.abs(right - left) / sum * 100`.
2. Update the JSDoc comment: remove "Signed (positive = right greater, negative = left greater)" and replace with "Absolute (unsigned) asymmetry percentage. Range: 0% to +100%."
3. Update the `@returns` line to reflect `0% to +100%` instead of `−100% to +100%`.
4. The `sum === 0` guard is already present and correct — keep it.
5. **Remove all downstream code that interprets the sign of `asymmetryIndexPercent`** — specifically in `generateClinicalSummary()` (lines 397, 408, 429, 440) where `habetsDir` is computed from the sign. The direction must come from `dominantSide` instead.

**Instructions for FrontendDevBot:**
1. In `ResultsPanel.tsx`, remove the `> 0 ? "+" : ""` prefix on Habets index display (lines 116-117, 208-209). The value is now always non-negative.
2. Remove any sign-based direction display tied to the Habets index. Use the `dominantSide` / "Larger measured side" field for direction.

---

### 1.2 Relative Difference — `calculateRelativeDifference`

**Current implementation** (mandibularAsymmetry.ts, lines 59-64):
```
|R − L| / ((R + L) / 2) × 100
```
This is the "percentage deviation from bilateral mean" formula. Mathematically equals `2 × |Habets AI|`.

**Task requirement:**
```
abs(Right − Left) / max(Right, Left) × 100
```
This is the "percentage of the larger side" formula.

**Verdict: CHANGE_REQUIRED**

The current formula divides by the **mean** `(R+L)/2`. The task requires dividing by the **maximum** `max(R, L)`. These are mathematically different:

| Example | Current (÷mean) | Required (÷max) |
|---------|----------------|-----------------|
| R=60, L=50 | 10/55 = 18.2% | 10/60 = 16.7% |
| R=70, L=50 | 20/60 = 33.3% | 20/70 = 28.6% |
| R=52, L=48 | 4/50 = 8.0% | 4/52 = 7.7% |

The current formula produces values up to 200% (when one side is 0); the required formula produces values up to 100% (when one side is 0). The `max()` formula is more intuitive: "the smaller side is X% shorter than the larger side."

**Important:** The 2× relationship between Relative Difference and Habets index will NO LONGER HOLD after this change. The current footnote in ResultsPanel.tsx (lines 353-357) and clinical-protocol.md §10.2 both state "Relative Difference is exactly twice the absolute value of the Habets Asymmetry Index." After both formula changes:
- Habets = `|R−L| / (R+L) × 100`
- Relative Diff = `|R−L| / max(R,L) × 100`

These are NOT in a fixed 2× relationship. The footnote must be removed.

**Instructions for CalculationBot:**
1. In `calculateRelativeDifference(right, left)`, change the formula from `Math.abs(right - left) / (sum / 2) * 100` to `Math.abs(right - left) / Math.max(right, left) * 100`.
2. Add a guard for `max(right, left) === 0`: if both values are 0, return 0 (already partially handled by `sum === 0` check, but replace with `Math.max(right, left) === 0` or `right === 0 && left === 0`).
3. Update the JSDoc: change formula description to `|R−L| / max(R,L) × 100`, change range to `0% to 100%`, remove the "Mathematically equivalent to 2 × |Habets AI|" comment.
4. Update the `@returns` line to `0% to 100%`.

**Instructions for FrontendDevBot:**
1. Remove the "2× relationship" footnote in `ResultsPanel.tsx` (lines 353-357).
2. Update `docs/clinical-protocol.md` §10.2 to remove the 2× relationship footnote.

---

### 1.3 Edge Case Validation

| Case | Current behavior | Required behavior | Status |
|------|-----------------|-------------------|--------|
| **Equal values (R = L)** | Habets = 0, RelDiff = 0, dominantSide = "equal" | Same — correct | ✅ PASS |
| **Both zero (R = 0, L = 0)** | `sum === 0` guard returns 0 for both formulas | Need `max(R,L) === 0` guard for new RelDiff formula | ⚠️ CHANGE_REQUIRED (CalculationBot: update guard) |
| **One side zero (R = 0, L > 0)** | Habets = −100% (signed), RelDiff = 200% | Habets = 100% (abs), RelDiff = 100% (÷max) | ⚠️ CHANGE_REQUIRED (handled by formula changes above) |
| **Negative values** | Not guarded — would produce nonsensical results | Distances can't be negative; add guard or document that inputs must be non-negative | ⚠️ CHANGE_REQUIRED (CalculationBot: add assertion or guard) |
| **NaN / Infinity** | Not guarded — NaN propagates | Should guard: if either input is NaN or not finite, return 0 or throw | ⚠️ CHANGE_REQUIRED (CalculationBot: add `Number.isFinite()` check) |
| **Missing landmarks** | Handled at store level — measurement is null | Same — correct | ✅ PASS |

**Instructions for CalculationBot (edge cases):**
1. Add `Number.isFinite()` validation at the top of `calculateAsymmetryIndex` and `calculateRelativeDifference`. If either input is not finite, return 0.
2. For `calculateRelativeDifference`, replace `if (sum === 0) return 0` with `if (Math.max(right, left) === 0) return 0`.
3. Consider adding input validation (non-negative check) or at minimum document in JSDoc that inputs must be non-negative distances.

---

### 1.4 `determineDominantSide` — Terminology

**Current function name:** `determineDominantSide`
**Current type name:** `DominantSide` (types.ts, line 61)
**Current return values:** `"right" | "left" | "equal"`

The term "Dominant" implies functional/pathological dominance — a diagnostic inference. The task requires renaming to "Larger measured side."

**Instructions for CalculationBot:**
1. Rename function `determineDominantSide` → `determineLargerSide` (or keep the function but rename the type and all UI references).
2. Rename type `DominantSide` → `LargerSide` in types.ts.
3. The return values `"right" | "left" | "equal"` are acceptable — they are purely descriptive.
4. The field name `dominantSide` in `MeasurementResult` (types.ts, line 83) and `BilateralMeasurement` (types.ts, line 111, as `longerSide`/`shorterSide`) must be renamed to `largerSide`.

**Note:** The `BilateralMeasurement` type already uses `longerSide` and `shorterSide` (types.ts, lines 111-112) which are acceptable descriptive terms. The `MeasurementResult` type uses `dominantSide` (line 83) which must change.

---

## 2. TERMINOLOGY VALIDATION (Item 2)

### 2.1 Measurement Labels

| Current label | Location | Required label | Status |
|--------------|----------|---------------|--------|
| `"Ramus Height (Co–Go)"` | ResultsPanel.tsx lines 295, 308 | `"Ramus length proxy"` | ⚠️ CHANGE_REQUIRED |
| `"Mandibular Body Length (Go–Me)"` | ResultsPanel.tsx lines 319, 332 | `"Mandibular body length proxy"` | ⚠️ CHANGE_REQUIRED |
| `"Dominant side"` / `"Greater side"` | ResultsPanel.tsx lines 120, 212 | `"Larger measured side"` | ⚠️ CHANGE_REQUIRED |
| `"gonial height"` | Not found in source — no action needed | N/A | ✅ PASS (not present) |

### 2.2 Detailed File-by-File Terminology Changes

#### `src/components/ResultsPanel.tsx`

| Line | Current text | Required text |
|------|-------------|---------------|
| 120 | `<span className="font-medium">Greater side:</span>` | `<span className="font-medium">Larger measured side:</span>` |
| 212 | `<span className="font-medium">Greater side:</span>` | `<span className="font-medium">Larger measured side:</span>` |
| 295 | `title="Ramus Height (Co–Go)"` | `title="Ramus length proxy"` |
| 308 | `title="Ramus Height (Co–Go)"` | `title="Ramus length proxy"` |
| 319 | `title="Mandibular Body Length (Go–Me)"` | `title="Mandibular body length proxy"` |
| 332 | `title="Mandibular Body Length (Go–Me)"` | `title="Mandibular body length proxy"` |

Also in ResultsPanel.tsx:
- Lines 121-125 and 213-217: The `dominantSide` field reference must be updated to `largerSide` if the type is renamed.

#### `src/domain/mandibularAsymmetry.ts`

| Line | Current text | Required text |
|------|-------------|---------------|
| 84 | `export function determineDominantSide` | `export function determineLargerSide` |
| 390 | `"RAMUS HEIGHT ANALYSIS (Primary Measurement)"` | Consider updating to use "proxy" language or add disclaimer |
| 420 | `"MANDIBULAR BODY LENGTH ANALYSIS (Secondary Measurement — Lower Reliability)"` | Consider updating to use "proxy" language or add disclaimer |
| 397, 401-404, 429, 433-436 | References to `rh.dominantSide` / `bl.dominantSide` | Update to `largerSide` |
| 408, 440 | `habetsDir` computed from sign of `asymmetryIndexPercent` | Remove sign-based direction; use `largerSide` instead |

#### `src/domain/types.ts`

| Line | Current | Required |
|------|---------|----------|
| 61 | `export type DominantSide = "right" | "left" | "equal"` | `export type LargerSide = "right" | "left" | "equal"` |
| 83 | `dominantSide: DominantSide` | `largerSide: LargerSide` |

#### `docs/clinical-protocol.md`

| Section | Current | Required |
|---------|---------|----------|
| §1 Protocol Summary, "Dominant side wording" row | `"Dominant side wording"` | `"Larger measured side wording"` |
| §5.4 | `determineDominantSide` | `determineLargerSide` |
| §5.2 | `Ramus Height (Posterior Mandibular Height)` as measurement name | Add "proxy" qualifier |
| §4.1 | `"Ramus Height (Posterior Mandibular Height)"` | `"Ramus length proxy"` |
| §4.2 | `"Mandibular Body Length"` | `"Mandibular body length proxy"` |
| §5.3 | `Relative Difference = |R − L| / ((R + L) / 2) × 100` | `Relative Difference = |R − L| / max(R, L) × 100` |
| §5.2 | `Habets AI = (R − L) / (R + L) × 100` (signed) | `Habets AI = |R − L| / (R + L) × 100` (absolute) |
| §10.2 | "The Relative Difference is exactly twice..." footnote | Remove entirely |
| §6.1 threshold table | Relative Difference column values (6%, 12%) | Must be recalculated for new formula |

### 2.3 "Dominant side" / "Greater side" → "Larger measured side"

**Verdict: CHANGE_REQUIRED**

The term "Dominant" appears in:
- `determineDominantSide` function name (mandibularAsymmetry.ts, line 84)
- `DominantSide` type name (types.ts, line 61)
- `dominantSide` field in `MeasurementResult` (types.ts, line 83)
- ResultsPanel.tsx references to `result.dominantSide` (lines 121, 213)
- `docs/clinical-protocol.md` §5.4, §1

The term "Greater side" appears in:
- ResultsPanel.tsx lines 120, 212: `Greater side:` label

**All must be changed to "Larger measured side" (for UI labels) and `largerSide` (for code identifiers).**

### 2.4 Habets Protocol Reproduction Claim

**Verdict: CHANGE_REQUIRED**

The current application does NOT explicitly claim to reproduce the complete Habets tracing protocol, but it also does NOT include the required disclaimer. The clinical-protocol.md explicitly states in §1 that the Habets decomposition (Co–Sn, Sn–Go) is NOT used — only total height (Co–Go). However, the UI does not communicate this to the user.

The required disclaimer must be added:
> "This MVP performs a simplified landmark-based mandibular asymmetry analysis and uses the Habets normalization formula. It does not reproduce the complete original Habets tracing protocol."

**Instructions for FrontendDevBot:**
1. Add the disclaimer text to `ResultsPanel.tsx` — display it prominently, ideally near the top of the results section or in a dedicated info banner.
2. The disclaimer should be visible whenever results are shown (both calibrated and uncalibrated modes).
3. Suggested placement: between the calibration status banner and the first measurement section, or as a persistent info banner at the top of the Results panel.

**Instructions for CalculationBot:**
1. Add the disclaimer to `generateClinicalSummary()` in mandibularAsymmetry.ts — include it in the `LIMITATION_HEADER` constant (lines 344-348) or as a separate constant displayed near the top of the clinical summary text.

### 2.5 "gonial height"

**Verdict: PASS**

The term "gonial height" does not appear in any of the inspected source files (ResultsPanel.tsx, CalibrationPanel.tsx, mandibularAsymmetry.ts, types.ts). No action needed.

---

## 3. THRESHOLD/CLASSIFICATION VALIDATION (Item 3)

### 3.1 Current Threshold Implementation

**Current code** (mandibularAsymmetry.ts, lines 98-102):
```typescript
export function classifyAsymmetry(habetsAbsValue: number): AsymmetryTier {
  if (habetsAbsValue < 3) return "within_typical_range";
  if (habetsAbsValue <= 6) return "borderline";
  return "above_technical_error_margin";
}
```

Boundaries: `[0, 3)` → within_typical_range, `[3, 6]` → borderline, `(6, ∞)` → above_technical_error_margin.

### 3.2 Source and Intended Meaning of Each Threshold

| Threshold | Source | Intended meaning |
|-----------|--------|-----------------|
| **3%** | Bezuur et al. (1988) [PMID 3236126] — stated 3% is "within normal limits" for asymmetry | Boundary between "typical" and "borderline" — BUT not clinically validated. Türp (1995) showed 80% sensitivity requires only 0.20-0.25 specificity. Pinto-Wong (2024) found 81.4% of normal adults exceed 3% for condylar asymmetry, 48.6% for ramus. |
| **6%** | Habets et al. (1987) [PMID 3478455] — experimentally demonstrated up to 6% side-to-side difference may be due to technical/positioning factors alone | Upper limit of technical error margin. Values above 6% are more likely to represent true anatomical asymmetry rather than positioning artifact. This is experimental data, not expert opinion. |

**Evidence quality:** LOW for 3% (widely used but not validated); MODERATE for 6% (experimentally demonstrated).

### 3.3 Are These Thresholds Appropriate for Vertical Habets Measurements?

**Verdict: PASS (with caveat)**

The 3% and 6% thresholds were derived from studies using the Habets Asymmetry Index on **vertical** measurements (ramus height, condylar height) on panoramic radiographs. The original Habets et al. (1987) paper that established the 6% technical error margin specifically studied vertical magnification. The 3% threshold from Bezuur et al. (1988) was also applied to vertical measurements.

**Caveat:** The thresholds are NOT clinically validated. They are technical/descriptive guidelines. The current tier labels ("Within typical range," "Borderline," "Above technical error margin") are appropriately descriptive and non-diagnostic. The tier guidance text (TIER_GUIDANCE, lines 333-340) correctly uses comparative language and recommends clinical correlation.

**However:** After the formula change to absolute Habets (`|R−L|/(R+L)×100`), the thresholds remain valid because the absolute value of the signed Habets index IS the same as the new absolute Habets formula. The sign change only removes directionality, not magnitude. `|R−L|/(R+L)×100` = `|(R−L)/(R+L)×100|`. So `classifyAsymmetry(abs(habetsAI))` in the old code produces the same classification as `classifyAsymmetry(habetsAI)` in the new code. **No threshold change needed for the Habets index.**

### 3.4 Should These Thresholds Be Applied to Go–Me (Mandibular Body Length Proxy)?

**Verdict: CHANGE_REQUIRED**

The 3% and 6% thresholds were derived from **vertical** measurements. The 6% technical error margin (Habets et al. 1987) was specifically measured for vertical magnification. Horizontal measurements on panoramic radiographs have **significantly higher** and **more variable** magnification (Scarfe et al. 1998: horizontal magnification 1.01–1.63× vs vertical 1.24–1.37×; Devlin & Yuan 2013: horizontal SD 0.0445 vs vertical SD 0.0067).

The clinical-protocol.md §4.2 and the clinical-evidence.md §3 both state that horizontal measurements are "less reliable" and should be "interpreted with caution." The evidence review explicitly concludes:

> "Vertical measurements (ramus height, condylar height) are suitable for OPG-based asymmetry assessment. Horizontal measurements (body length, intergonial distance) are less reliable and should be interpreted with caution."

The current code applies the same `classifyAsymmetry()` to both ramus height and body length (per protocol §11.2, lines 693-701). This is **not appropriate** because:
1. The 6% technical error margin has NOT been validated for horizontal measurements.
2. Horizontal magnification variability is much higher than vertical.
3. Applying vertical-derived thresholds to horizontal measurements may produce false confidence in the classification.

**Instructions for CalculationBot:**
1. Do NOT apply `classifyAsymmetry()` to the mandibular body length proxy measurement.
2. For body length, show the numerical values (Habets index, relative difference, mm if calibrated) **without** a tier classification.
3. Instead of a tier badge, display a descriptive note: "Classification thresholds are based on vertical measurement data and are not applied to horizontal (body length) measurements. Interpret the numerical values with caution."

**Instructions for FrontendDevBot:**
1. In `ResultsPanel.tsx`, for the body length section (`isBody={true}`), do NOT render the `ThresholdBadge` component.
2. Replace the badge with the descriptive note above.
3. The ramus height section continues to show the `ThresholdBadge` as before.
4. Remove `TIER_GUIDANCE` text from the body length section — it should not show tier-specific guidance since no tier is assigned.

### 3.5 Classification Descriptive Quality

**Verdict: PASS (for ramus height)**

Current tier labels and guidance:
- "Within typical range" — descriptive, non-diagnostic ✅
- "Borderline" — descriptive, non-diagnostic ✅
- "Above technical error margin" — descriptive, references technical parameter ✅

Current guidance text (TIER_GUIDANCE):
- Uses "The measured difference is..." — comparative, not diagnostic ✅
- Recommends "clinical correlation" — appropriate ✅
- Band 3 recommends "3D imaging (CBCT) ... when clinically indicated" — conditional, not directive ✅

No severity labels ("mild," "moderate," "severe") are used. ✅
No diagnostic language ("hypoplasia," "hyperplasia," "patient has") is used. ✅

The threshold caveat is displayed in ResultsPanel.tsx (lines 369-374) and in the LIMITATION_FOOTER. ✅

### 3.6 Threshold Table Update for New Relative Difference Formula

**Verdict: CHANGE_REQUIRED**

After the Relative Difference formula changes from `|R−L|/((R+L)/2)×100` to `|R−L|/max(R,L)×100`, the 2× relationship with the Habets index no longer holds. The protocol's threshold table (§6.1) lists "Relative Difference" equivalents (6%, 12%) that assumed the 2× relationship. These must be recalculated.

For the new formula `|R−L|/max(R,L)×100`:
- When Habets = 3%: `|R−L|/(R+L) = 0.03`, so `R−L = 0.03(R+L)`. If R > L, then `R−L = 0.03(R+L)`, `R = L + 0.03(R+L)`, `R(1-0.03) = L(1+0.03)`, `R/L = 1.03/0.97 ≈ 1.0619`. Relative Diff = `(R−L)/R = 0.03(R+L)/R = 0.03 × (1 + L/R) = 0.03 × (1 + 0.9417) = 0.03 × 1.9417 ≈ 5.8%`.
- When Habets = 6%: Similarly, `R/L = 1.06/0.94 ≈ 1.1277`. Relative Diff = `0.06 × (1 + 0.8868) = 0.06 × 1.8868 ≈ 11.3%`.

**These are approximate and depend on the R:L ratio.** The new Relative Difference thresholds are NOT fixed multiples of the Habets thresholds. The classification function uses `habetsAbsValue` (not relative difference), so the classification logic itself is unaffected. However, any display that maps Relative Difference to threshold bands must be updated or removed.

**Instructions for FrontendDevBot:**
1. Do NOT show "Relative Difference" threshold columns in the UI. The classification is based on the Habets index only.
2. If threshold bands are displayed alongside the Relative Difference value, remove the band mapping for Relative Difference. Show only the raw percentage value.
3. Update `docs/clinical-protocol.md` §6.1 to remove or recalculate the "Relative Difference" threshold column.

---

## SUMMARY TABLE

| Item | Sub-item | Verdict | Primary owner |
|------|----------|---------|---------------|
| 1 | Habets formula (signed → absolute) | **CHANGE_REQUIRED** | CalculationBot |
| 1 | Relative Difference formula (÷mean → ÷max) | **CHANGE_REQUIRED** | CalculationBot |
| 1 | Edge cases (zero, NaN, negative, infinity) | **CHANGE_REQUIRED** | CalculationBot |
| 1 | Sign/direction handling | **CHANGE_REQUIRED** | CalculationBot + FrontendDevBot |
| 1 | determineDominantSide → determineLargerSide | **CHANGE_REQUIRED** | CalculationBot |
| 2 | "Ramus Height (Co–Go)" → "Ramus length proxy" | **CHANGE_REQUIRED** | FrontendDevBot |
| 2 | "Mandibular Body Length (Go–Me)" → "Mandibular body length proxy" | **CHANGE_REQUIRED** | FrontendDevBot |
| 2 | "Dominant side"/"Greater side" → "Larger measured side" | **CHANGE_REQUIRED** | FrontendDevBot + CalculationBot |
| 2 | "gonial height" term | **PASS** (not present) | — |
| 2 | Habets protocol disclaimer | **CHANGE_REQUIRED** | FrontendDevBot + CalculationBot |
| 2 | 2× relationship footnote removal | **CHANGE_REQUIRED** | FrontendDevBot |
| 3 | Thresholds appropriate for vertical (ramus) | **PASS** | — |
| 3 | Thresholds applied to body length (horizontal) | **CHANGE_REQUIRED** (remove) | CalculationBot + FrontendDevBot |
| 3 | Classification descriptive/non-diagnostic | **PASS** (for ramus) | — |
| 3 | Threshold table for new Relative Diff formula | **CHANGE_REQUIRED** | FrontendDevBot |

---

## CONSOLIDATED INSTRUCTIONS

### For CalculationBot (domain layer — `src/domain/mandibularAsymmetry.ts`, `src/domain/types.ts`)

1. **`calculateAsymmetryIndex`**: Change formula from `(right - left) / sum * 100` to `Math.abs(right - left) / sum * 100`. Update JSDoc to reflect absolute value, range 0% to +100%.

2. **`calculateRelativeDifference`**: Change formula from `Math.abs(right - left) / (sum / 2) * 100` to `Math.abs(right - left) / Math.max(right, left) * 100`. Replace `sum === 0` guard with `Math.max(right, left) === 0` guard. Update JSDoc: range 0% to 100%, remove "2 × |Habets AI|" equivalence note.

3. **Add input validation**: At the top of both `calculateAsymmetryIndex` and `calculateRelativeDifference`, add `if (!Number.isFinite(right) || !Number.isFinite(left)) return 0;`. Consider adding non-negative validation or documentation.

4. **Rename `determineDominantSide`** → `determineLargerSide`. Rename type `DominantSide` → `LargerSide` in types.ts. Rename field `dominantSide` → `largerSide` in `MeasurementResult` (types.ts line 83).

5. **Remove sign-based direction from `generateClinicalSummary`**: Lines 397, 408, 429, 440 compute `habetsDir` from the sign of `asymmetryIndexPercent`. Remove this and use `largerSide` field instead.

6. **Do NOT classify body length**: In `generateClinicalSummary()`, for the body length section, do not call `classifyAsymmetry()` or display a tier. Show the numerical values only with a note that thresholds are not applied to horizontal measurements.

7. **Add Habets protocol disclaimer**: Add the disclaimer text to the `LIMITATION_HEADER` or as a new constant: "This MVP performs a simplified landmark-based mandibular asymmetry analysis and uses the Habets normalization formula. It does not reproduce the complete original Habets tracing protocol."

8. **Update all JSDoc comments** to reflect the new formulas and terminology.

9. **Update test suite**: All unit tests that assert signed Habets values, mean-based relative difference values, or `determineDominantSide` function name must be updated. The 2× relationship tests must be removed.

### For FrontendDevBot (UI layer — `src/components/ResultsPanel.tsx`, `src/components/CalibrationPanel.tsx`)

1. **Rename labels in ResultsPanel.tsx**:
   - Line 295, 308: `title="Ramus Height (Co–Go)"` → `title="Ramus length proxy"`
   - Line 319, 332: `title="Mandibular Body Length (Go–Me)"` → `title="Mandibular body length proxy"`
   - Line 120, 212: `Greater side:` → `Larger measured side:`
   - Lines 121-125, 213-217: Update `result.dominantSide` references to `result.largerSide`

2. **Remove Habets index sign display**: Lines 116-117, 208-209 — remove `result.asymmetryIndexPercent > 0 ? "+" : ""` prefix. The value is now always non-negative.

3. **Remove 2× relationship footnote**: Lines 353-357 — delete the entire "Relationship footnote" div.

4. **Remove ThresholdBadge from body length section**: In the `CalibratedMmSection` and `UncalibratedSection` components, when `isBody={true}`, do not render `<ThresholdBadge>`. Replace with a descriptive note: "Classification thresholds are based on vertical measurement data and are not applied to horizontal (body length) measurements."

5. **Remove TIER_GUIDANCE from body length section**: When `isBody`, do not display `TIER_GUIDANCE[result.classification]` text.

6. **Add Habets protocol disclaimer banner**: Add a visible info banner near the top of the Results panel (between the calibration status banner and the first measurement section) with the text: "This MVP performs a simplified landmark-based mandibular asymmetry analysis and uses the Habets normalization formula. It does not reproduce the complete original Habets tracing protocol."

7. **Update docs**: Update `docs/clinical-protocol.md` to reflect all formula and terminology changes (§5.2, §5.3, §5.4, §6.1, §10.2, §1).

---

## DOCUMENT METADATA

- **Created by:** PIBot (Clinical Validation Agent)
- **Date:** 2026-08-16
- **Files inspected:** AGENTS.md, agents/PROJECT_CONTEXT.md, agents/WORKFLOW.md, agents/OrthoBot.md, src/domain/mandibularAsymmetry.ts, src/domain/types.ts, src/components/ResultsPanel.tsx, src/components/CalibrationPanel.tsx, docs/clinical-protocol.md, docs/clinical-evidence.md
- **Code edited:** None (read-only validation)
- **Report file:** docs/PIBot-clinical-validation-report.md