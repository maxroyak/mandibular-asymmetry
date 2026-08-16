# Clinical Measurement Protocol: Mandibular Asymmetry Analysis on Panoramic Radiographs

> **Author:** OrthoBot  
> **Date:** 2026-08-16  
> **Status:** APPROVED — Definitive clinical protocol for MVP implementation  
> **Evidence base:** docs/clinical-evidence.md (ResearchBot, 40 references)  
> **Role:** Orthodontic clinical expert — landmark definitions, measurement protocol, interpretation wording, threshold decisions  
> **Next step:** ArchitectBot / DevBot to implement this protocol; TestBot to verify; QABot to gate

---

## Table of Contents

1. [Protocol Summary](#1-protocol-summary)
2. [Answers to ResearchBot's 8 Unresolved Questions](#2-answers-to-researchbots-8-unresolved-questions)
3. [Approved Landmark Set](#3-approved-landmark-set)
4. [Approved Measurements](#4-approved-measurements)
5. [Approved Formulas](#5-approved-formulas)
6. [Threshold and Classification System](#6-threshold-and-classification-system)
7. [Calibration Policy](#7-calibration-policy)
8. [Clinical Interpretation Wording Templates](#8-clinical-interpretation-wording-templates)
9. [Mandatory Limitation Statements](#9-mandatory-limitation-statements)
10. [Labeling Convention to Prevent Confusion](#10-labeling-convention-to-prevent-confusion)
11. [Domain Module Specification](#11-domain-module-specification)
12. [Deviations from ResearchBot Recommendations](#12-deviations-from-researchbot-recommendations)
13. [Protocol Metadata](#13-protocol-metadata)

---

## 1. Protocol Summary

### What this protocol defines

| Item | Decision |
|------|----------|
| **Primary measurement** | Ramus height (Co–Go), bilateral |
| **Secondary measurement** | Mandibular body length (Go–Me), bilateral — with reliability caveat |
| **Primary asymmetry metric** | Habets Asymmetry Index: (R−L)/(R+L) × 100 |
| **Secondary metric (display)** | Relative Difference: \|R−L\|/((R+L)/2) × 100 (= 2 × \|Habets\|) |
| **Habets decomposition** | NOT used — total height (Co–Go) only; sigmoid notch excluded |
| **Kjellberg index** | NOT included |
| **Threshold system** | Tiered: <3% / 3–6% / >6% (Habets index), presented as guidelines not diagnoses |
| **Calibration** | Optional (Mode B). Absolute mm displayed only when calibrated. Relative % always available. |
| **Midline landmark for body length** | Menton (Me) |
| **Dominant side wording** | Comparative: "right ramus height is X% greater/smaller than left" |

### Design principle

This is a **measurement and comparative decision-support tool**, not a diagnostic system. Every output uses comparative language, states 2D projection limitations, and recommends clinical correlation. No categorical severity labels ("mild," "moderate," "severe") are assigned to individual patients.

---

## 2. Answers to ResearchBot's 8 Unresolved Questions

### Q1: Should the full Habets decomposition (Co–Sn, Sn–Go, Co–Go) be used, or only total height (Co–Go)?

**Decision: Use total height (Co–Go) only. Do NOT include the sigmoid notch decomposition in the MVP.**

**Rationale:**

1. **Sigmoid notch is a low-reproducibility landmark.** ResearchBot's evidence review (§7) identifies sigmoid notch (Sn) as "Low–Moderate" reproducibility, with Chien et al. (2009) [PMID 19474253] showing it is farther from best estimate in 2D than in 3D. Adding Sn introduces a third bilateral landmark that is difficult to identify consistently on OPG, especially when the coronoid process overlaps the condylar region.

2. **Total height captures the same asymmetry signal.** Co–Go = (Co–Sn) + (Sn–Go). The total height asymmetry index reflects the combined vertical asymmetry of condyle and ramus. Decomposing adds granularity but not additional diagnostic accuracy — it adds noise.

3. **Clinical workflow simplicity.** The MVP targets a 30–60 second clinician workflow (per WORKFLOW.md Stage 4). Requiring 10 landmarks (CoR, SnR, GoR, CoL, SnL, GoL, Me = 7, or without Sn = 5) vs 5 landmarks is a significant usability difference. Fewer landmarks = faster placement = fewer identification errors.

4. **Condylar height has the worst specificity.** Türp (1995) [PMID 7610365] showed condylar height specificity of 0.20 at 80% sensitivity — worse than ramus height. Separating condylar height provides a number that is more likely to be a false positive. Total height (Co–Go) averages the condylar and ramal components, providing a more stable measurement.

5. **Literature support for Co–Go alone.** Multiple studies use Co–Go as a standalone measurement (Ongkosuwito 2009, Faryal & Shaikh 2022, Stăncioiu 2025, Bal 2018). The Habets decomposition is one tradition; Co–Go total height is equally well-supported.

**Clinical judgment note:** ResearchBot recommended against separation with "moderate confidence." OrthoBot concurs and upgrades this to **high confidence** based on the clinical workflow constraint and the reproducibility evidence. The full Habets decomposition may be revisited in Phase 2 if AI landmark detection reduces Sn identification error.

---

### Q2: Should mandibular body length be included despite lower reliability?

**Decision: YES — include mandibular body length (Go–Me) with an explicit, prominent reliability caveat.**

**Rationale:**

1. **PROJECT_CONTEXT.md mandates it.** MVP scope item 5 explicitly lists "Mandibular body length measurement." OrthoBot cannot override project scope decisions; PMBot owns scope.

2. **Clinical value with appropriate caveats.** Body length asymmetry is clinically relevant information even when measured with lower precision. A clinician who understands the limitation can still use the measurement as a screening signal. The alternative — hiding the measurement — denies the clinician information they need.

3. **The caveat must be explicit and unmissable.** The UI must display a visible warning adjacent to body length results: "⚠ Horizontal measurements on panoramic radiographs are less reliable than vertical measurements due to variable horizontal magnification. Interpret with caution." This warning must appear every time body length results are shown.

4. **Silvestrini-Biavati et al. (2014) [PMID 24992843] demonstrated clinical utility.** They found significant differences in body length asymmetry between crossbite and non-crossbite groups (index 2.3% vs 1.4%, p=0.04). This is weak but non-zero evidence of discriminative value.

5. **Relative comparisons partially mitigate horizontal distortion.** While absolute mm values for body length are unreliable without calibration, the relative difference (Habets index) between right and left body length is partially robust because symmetric horizontal magnification cancels in the ratio. The caveat remains necessary because head rotation (yaw) breaks this symmetry (Schulze 2000 [PMID 10900960]).

**Implementation requirement:** Body length results must be visually distinguished from ramus height results (e.g., different section, muted color, warning icon) to prevent the clinician from treating them with equal confidence.

---

### Q3: What midline landmark (Menton vs symphysis midpoint) for body length?

**Decision: Use Menton (Me).**

**Rationale:**

1. **Menton has the best reproducibility of all landmarks in this protocol.** ResearchBot's evidence (§7) shows Me has intra-examiner ICC 0.96 and inter-examiner ICC 0.90 (Pan et al. 2009 [PMID 19221572]). It is a single, well-defined point — the most inferior point of the mandibular symphysis.

2. **Menton is the standard reference in the literature.** Go–Me is the most commonly used body length measurement. Ongkosuwito et al. (2009) [PMID 19254052] and Silvestrini-Biavati et al. (2014) [PMID 24992843] both use Go–Me. Using a non-standard landmark would make results non-comparable to published norms.

3. **Symphysis midpoint is less well-defined.** The "midpoint of the mandibular symphysis" is ambiguous — midpoint in which dimension? Anterior surface? Posterior surface? Mid-height? This ambiguity introduces inter-observer variability that a single anatomical point (Me) avoids.

4. **Menton is on the inferior border, not the true midline — but this is acceptable.** Me is the most inferior point of the symphysis, which is on the midline sagittal plane. For body length comparison (GoR–Me vs GoL–Me), what matters is that Me is a single shared reference point. Whether it represents the "true midline" is less important than its reproducibility, and Me is highly reproducible.

5. **Clinical workflow.** Me is easy to identify on OPG and is already in the landmark set (required for PROJECT_CONTEXT.md's LandmarkName type). No additional landmark is needed.

**Note:** If Me cannot be identified on a specific radiograph (e.g., severe chin trauma, surgical resection), the clinician should be instructed to use the most inferior point of the symphyseal region as a best estimate and note the uncertainty. The system does not need a separate "symphysis midpoint" landmark for this edge case.

---

### Q4: How should thresholds be tiered and communicated (3% only? 3%/6% tiered?)

**Decision: Use a tiered system with three bands, presented as guidelines — not diagnostic categories.**

| Tier | Habets Index (absolute) | Relative Difference | Label | Wording |
|------|------------------------|---------------------|-------|---------|
| **Band 1** | < 3% | < 6% | Within typical range | "The measured difference is within the range commonly observed in asymptomatic individuals." |
| **Band 2** | 3–6% | 6–12% | Borderline | "The measured difference is in a borderline range that may include technical/positioning effects. Clinical correlation is recommended." |
| **Band 3** | > 6% | > 12% | Above technical error margin | "The measured difference exceeds the 6% technical error margin reported for panoramic radiography. Clinical correlation and 3D imaging (CBCT) are recommended when clinically indicated." |

**Rationale:**

1. **No validated threshold exists.** ResearchBot's evidence (§8) is clear: the 3% threshold is widely used but not clinically validated. Türp (1995) showed specificity of 0.20–0.25 at 80% sensitivity. Pinto-Wong (2024) found 81.4% of normal adults exceed 3% for condylar asymmetry. Using 3% as the sole cutoff would flag the majority of normal patients as "asymmetric."

2. **The 6% technical error margin is better supported.** Habets et al. (1987) [PMID 3478455] experimentally demonstrated that up to 6% of side-to-side difference may be attributable to technical/positioning factors alone. This is experimental data, not expert opinion. Values above 6% are more likely to represent true anatomical asymmetry.

3. **The tiered approach is honest.** Band 1 (< 3%) communicates "this is common and likely not meaningful." Band 2 (3–6%) communicates "this could be real or could be technical — we can't tell from a single OPG." Band 3 (> 6%) communicates "this is more likely real, but you still need to correlate clinically." This is more clinically useful than a binary "normal/abnormal."

4. **Labels are descriptive, not diagnostic.** The tier labels ("Within typical range," "Borderline," "Above technical error margin") describe the measurement's relationship to known technical parameters, not the patient's diagnosis. No patient is labeled as "having asymmetry."

5. **Both Habets and relative difference thresholds are shown.** Since the application displays both metrics (see Q7), both threshold columns are displayed. The clinician can use whichever they are familiar with, with clear labeling to prevent confusion.

6. **The threshold caveat must always be displayed.** Every time tiers are shown, the following caveat must appear: "Threshold values are based on published literature and the known technical error margin of panoramic radiography, not on validated clinical outcomes. They are guidelines for interpretation, not diagnostic criteria."

**Important:** Band 2 uses "3–6%" as an inclusive range at the lower bound and exclusive at the upper. Specifically: Band 1 = [0, 3), Band 2 = [3, 6], Band 3 = (6, ∞). A value of exactly 6.0% falls in Band 2 (borderline), because 6% is the upper limit of the technical error margin — at that value, we cannot exclude technical origin.

---

### Q5: Should absolute measurements (mm) be displayed (requiring calibration) or only relative/percentage values?

**Decision: Support both modes. Display absolute mm when calibrated (Mode B); display only relative % when uncalibrated (Mode A). Never display pixel values as mm.**

**Rationale:**

1. **Relative measurements are the primary output and do not require calibration.** The Habets index and relative difference are ratios — the calibration factor cancels (provided magnification is symmetric). This is the core clinical output and must work without calibration.

2. **Absolute measurements add clinical context when available.** Knowing "right ramus height is 52 mm and left is 48 mm" gives the clinician scale context that "4% difference" alone does not. If calibration is performed, absolute values should be displayed alongside relative values.

3. **Calibration must be optional, not mandatory.** Forcing calibration before any results are shown would violate the 30–60 second workflow target and could introduce its own error (Laster 2005 [PMID 16227476] showed arbitrary magnification correction is less accurate than internal calibration). The clinician should be able to get useful relative results immediately.

4. **Never display pixel values as mm.** If uncalibrated, the system must not show any value with a "mm" unit. Only percentage values are displayed. This prevents the clinician from misinterpreting raw pixel distances as real measurements.

5. **Mode A (uncalibrated) display:**
   - Habets Asymmetry Index (%)
   - Relative Difference (%)
   - Dominant side
   - Tier classification
   - "Calibration not performed — absolute measurements in mm are not displayed."

6. **Mode B (calibrated) display:**
   - All Mode A values, plus:
   - Right ramus height (mm)
   - Left ramus height (mm)
   - Right body length (mm)
   - Left body length (mm)
   - Calibration factor (mm/pixel)
   - "Measurements in mm are estimated based on user-provided calibration and are subject to panoramic magnification effects."

7. **Calibration method:** Clinician marks two points on the image with a known real-world distance (e.g., a radiographic ruler or known implant length). System computes mm_per_pixel = realDistanceMm / pixelDistance. This follows the Calibration type in PROJECT_CONTEXT.md.

8. **Absolute values carry an additional caveat.** Even when calibrated, absolute OPG measurements are not equivalent to direct anatomical measurements. The caveat must state: "Absolute measurements are estimated from a 2D projection and are subject to panoramic magnification. They should not be used as precise anatomical values."

---

### Q6: What exact clinical wording for dominant side communication?

**Decision: Use comparative anatomical language with the percentage difference. Never use "dominant" or "hypoplastic" in the clinical summary.**

**Wording templates:**

**For ramus height (primary measurement):**

| Scenario | Wording |
|----------|---------|
| Right > Left | "On this panoramic radiograph, the right ramus height is **X%** greater than the left." |
| Left > Right | "On this panoramic radiograph, the left ramus height is **X%** greater than the right." |
| Equal (≤ 0.5%) | "On this panoramic radiograph, the right and left ramus heights are approximately equal." |

**For mandibular body length (secondary measurement):**

| Scenario | Wording |
|----------|---------|
| Right > Left | "The right mandibular body length is **X%** greater than the left. ⚠ Horizontal measurements on OPG are less reliable than vertical measurements — interpret with caution." |
| Left > Right | "The left mandibular body length is **X%** greater than the right. ⚠ Horizontal measurements on OPG are less reliable than vertical measurements — interpret with caution." |
| Equal (≤ 0.5%) | "The right and left mandibular body lengths are approximately equal. ⚠ Horizontal measurements on OPG are less reliable than vertical measurements." |

**X% value to display:** The relative difference value (|R−L|/((R+L)/2) × 100) is used in the wording, because it represents the percentage deviation from the bilateral mean — the most intuitive interpretation for a clinician. The Habets index is displayed separately in the metrics table (see Q7).

**Why "greater than" and not "larger than" or "longer than":**
- "Greater" is neutral and comparative. "Larger" implies size judgment. "Longer" implies a specific dimension.
- For ramus height, "greater" correctly implies the vertical dimension without committing to "taller" or "longer."

**Why not "dominant side":**
- "Dominant" implies the side is functionally or pathologically dominant — a diagnostic inference we cannot make from a single OPG.
- "Right ramus height is X% greater than left" is purely descriptive.

**Why not "hypoplastic" or "hyperplastic":**
- These are diagnostic terms implying a pathological process. We are measuring a 2D projection difference, not diagnosing a growth disorder.
- Even if true hypoplasia or hyperplasia is present, it cannot be confirmed from a single OPG without clinical correlation and 3D imaging.

**Percentage value rounding:** Display to one decimal place (e.g., "5.8%"). Do not display more than one decimal — excessive precision implies false accuracy.

**Equal threshold:** A difference of ≤ 0.5% (relative difference) is labeled "approximately equal." Below this, the difference is within typical measurement noise and stating a direction is misleading.

---

### Q7: How to label Habets index vs relative difference to avoid confusion (2x factor)?

**Decision: Display both values in a metrics table with distinct, clearly labeled columns. Never display them side by side without explicit formula labels.**

**Labeling scheme:**

| Display Label | Formula | Value Range | Sign |
|---------------|---------|-------------|------|
| **Habets Asymmetry Index** | (R − L) / (R + L) × 100 | −100% to +100% | Signed (positive = right greater) |
| **Relative Difference** | \|R − L\| / ((R + L) / 2) × 100 | 0% to +200% | Always positive (absolute) |

**Implementation requirements:**

1. **Both values are always displayed together** in a metrics table, never one without the other. This ensures the clinician can see the relationship and understand why the numbers differ.

2. **The 2× relationship must be explicitly stated** in a footnote or tooltip beneath the metrics table: "The Relative Difference is exactly twice the absolute value of the Habets Asymmetry Index. For example, a Habets index of 3% corresponds to a Relative Difference of 6%."

3. **The Habets index is signed; the relative difference is unsigned.** The Habets index sign indicates direction (positive = right greater, negative = left greater). The relative difference is always positive and should be accompanied by the dominant side wording (Q6).

4. **Primary clinical wording uses relative difference.** The clinical summary text (Q6) uses the relative difference value because it is more intuitive — "X% greater than the other side" maps naturally to "the side deviates X% from the bilateral average."

5. **The Habets index is labeled as the research-standard metric.** A tooltip or info icon should explain: "The Habets Asymmetry Index is the standard metric used in the research literature (Habets et al. 1988). It expresses the difference as a percentage of the sum of both sides."

6. **The relative difference is labeled as the clinical communication metric.** A tooltip should explain: "The Relative Difference expresses how much one side deviates from the bilateral average. It is twice the absolute Habets index and may be more intuitive for clinical communication."

7. **Threshold columns match the metric.** When displaying thresholds (Q4), the Habets column uses Habets thresholds (3%, 6%) and the relative difference column uses relative difference thresholds (6%, 12%). Both columns must be shown together.

8. **No ambiguous labels.** Never use generic labels like "Asymmetry %" or "Difference Index" without specifying which formula. Every numeric value must be explicitly associated with its formula name.

---

### Q8: Should the Kjellberg index be included as an alternative?

**Decision: NO. Do not include the Kjellberg index in the MVP.**

**Rationale:**

1. **Insufficient literature support.** ResearchBot found that the Kjellberg index is "less commonly used than Habets in the literature" (§4, evidence quality "Low–Moderate"). The Habets index has 35+ years of validation literature. The Kjellberg index does not have comparable evidence behind it for OPG-based asymmetry assessment.

2. **Different scale creates confusion.** The Kjellberg index uses an inverted scale (100% = symmetric, lower = more asymmetric). Adding a third metric with a different scale, on top of the Habets index and relative difference, increases cognitive load and the risk of misinterpretation. Three metrics with two different scales is a usability problem.

3. **No incremental clinical value for the MVP.** The Kjellberg index measures the same underlying asymmetry as the Habets index — it just expresses it on a different scale. It does not provide information that the Habets index and relative difference do not already capture. Adding it would be adding complexity without adding signal.

4. **The MVP targets a 30–60 second workflow.** Every additional metric adds display complexity and decision overhead. Two well-labeled metrics (Habets + relative difference) is the maximum that can be clearly communicated in this time frame.

5. **OrthoBot's clinical environment.** In standard orthodontic practice, the Habets method is the recognized standard for OPG-based vertical asymmetry assessment. The Kjellberg index is not routinely used or expected by referring clinicians. Including it would not serve the MVP's target users.

6. **May be revisited in Phase 2.** If user feedback indicates demand for the Kjellberg index, it can be added as an optional display in a future release. The architecture should not preclude this, but the MVP should not include it.

---

## 3. Approved Landmark Set

### 3.1 Landmarks

| Landmark | Abbreviation | Side | Anatomical Definition | Identification Notes |
|----------|-------------|------|-----------------------|---------------------|
| **Condylion (Right)** | CoR | Right | Most superior point of the right condylar head | Most difficult landmark; clinician may manually adjust. If condyle is flattened/resorbed, use the most superior visible point of the condylar outline. |
| **Gonion (Right)** | GoR | Right | Most posterior-inferior point at the right mandibular angle | Constructed as the intersection of the posterior border tangent and the inferior border tangent. On OPG, identify as the lowest posterior point of the angle. |
| **Condylion (Left)** | CoL | Left | Most superior point of the left condylar head | Same identification as CoR, mirrored. |
| **Gonion (Left)** | GoL | Left | Most posterior-inferior point at the left mandibular angle | Same identification as GoR, mirrored. |
| **Menton** | Me | Midline | Most inferior point of the mandibular symphysis | Single midline landmark; shared by both sides for body length measurement. Best reproducibility of all landmarks. |

**Total: 5 landmarks.** No sigmoid notch (Sn) in the MVP.

### 3.2 Landmark Validation

OrthoBot validates the preliminary landmark scheme from PROJECT_CONTEXT.md with one modification:

- **CoR, CoL, GoR, GoL, Me: APPROVED** — all five are clinically appropriate and correctly defined.
- **Sigmoid notch (Sn): EXCLUDED** — see Q1. Not included in the MVP landmark set.

### 3.3 Landmark Set Type

```typescript
type LandmarkName = "CoR" | "GoR" | "CoL" | "GoL" | "Me";
```

This matches PROJECT_CONTEXT.md exactly. No changes to the type are needed.

### 3.4 Condylion Handling Protocol

Condylion (Co) is the least reproducible landmark in this set (ResearchBot §7). The following protocol applies:

1. **Default placement:** The clinician places Co at the most superior point of the condylar head visible on the OPG.
2. **Manual correction:** If the clinician judges that the most superior point is not accurately represented (e.g., due to superimposition, flattening, or image blur), they may manually adjust the landmark to the best estimate of the true condylar superior point.
3. **No automated correction:** The system does not snap, auto-place, or "correct" condylion. All placement is manual.
4. **Uncertainty flag (future):** In Phase 2, an AI-assisted confidence indicator may highlight low-confidence condylion placements. Not in MVP.

---

## 4. Approved Measurements

### 4.1 Primary Measurement: Ramus Height

| Property | Value |
|----------|-------|
| **Name** | Ramus Height (Posterior Mandibular Height) |
| **Landmarks** | Co → Go (bilateral: CoR→GoR, CoL→GoL) |
| **Type** | Vertical linear distance |
| **Reliability** | Moderate — comparable to lateral cephalogram (Ongkosuwito 2009, Faryal & Shaikh 2022, Stăncioiu 2025) |
| **Clinical role** | Primary asymmetry assessment |
| **Display priority** | 1 (top of results) |

### 4.2 Secondary Measurement: Mandibular Body Length

| Property | Value |
|----------|-------|
| **Name** | Mandibular Body Length |
| **Landmarks** | Go → Me (bilateral: GoR→Me, GoL→Me) |
| **Type** | Horizontal linear distance |
| **Reliability** | Low–Moderate — significant OPG vs cephalogram discrepancy (Faryal & Shaikh 2022, p=0.000; Stăncioiu 2025) |
| **Clinical role** | Supplementary asymmetry assessment with explicit caveat |
| **Display priority** | 2 (below ramus height, visually distinguished, with reliability warning) |
| **Mandatory warning** | "⚠ Horizontal measurements on panoramic radiographs are less reliable than vertical measurements due to variable horizontal magnification. Interpret with caution." |

### 4.3 Measurements NOT in MVP

| Excluded | Reason |
|----------|--------|
| Condylar height (Co–Sn) | Sigmoid notch excluded (Q1) |
| Ramus height proper (Sn–Go) | Sigmoid notch excluded (Q1) |
| Total mandibular length (Co–Me) | Not standard; combines vertical + horizontal; less interpretable |
| Gonial angle | Different methodology; not vertical asymmetry |
| Kjellberg index | Excluded (Q8) |
| Intergonial distance | Horizontal measurement; low reliability; not standard for asymmetry |

---

## 5. Approved Formulas

### 5.1 Distance Calculation

```
distance(A, B) = √((A.x − B.x)² + (A.y − B.y)²)
```

Where A and B are landmark points in normalized coordinates (0.0–1.0). The result is in normalized units. To convert to mm (Mode B only):

```
distance_mm = distance_normalized × mmPerPixel
```

Where `mmPerPixel` is derived from calibration.

### 5.2 Habets Asymmetry Index

```
Habets AI = (R − L) / (R + L) × 100
```

- **R** = right side measurement (CoR→GoR for ramus, GoR→Me for body)
- **L** = left side measurement (CoL→GoL for ramus, GoL→Me for body)
- **Signed value:** positive = right side greater, negative = left side greater
- **Range:** −100% to +100% (practically much smaller)

### 5.3 Relative Difference

```
Relative Difference = |R − L| / ((R + L) / 2) × 100
```

Which simplifies to:

```
Relative Difference = 2 × |R − L| / (R + L) × 100 = 2 × |Habets AI|
```

- **Always positive** (absolute value)
- **Range:** 0% to +200% (practically much smaller)
- **Interpretation:** percentage deviation of one side from the bilateral mean

### 5.4 Dominant Side Determination

```
if |R − L| ≤ tolerance:
    dominantSide = "equal"
elif R > L:
    dominantSide = "right"
else:
    dominantSide = "left"
```

Where `tolerance` is the "approximately equal" threshold:
- In normalized units: `tolerance = 0.005` (0.5% of the image dimension)
- In relative difference terms: differences producing a relative difference ≤ 0.5% are "equal"

### 5.5 Asymmetry Classification

```
classifyAsymmetry(habetsAbsValue):
    if habetsAbsValue < 3:
        return "within_typical_range"
    elif habetsAbsValue <= 6:
        return "borderline"
    else:
        return "above_technical_error_margin"
```

Where `habetsAbsValue = |Habets AI|` (absolute value of the Habets index).

Boundary rules:
- **[0, 3):** Band 1 — within typical range
- **[3, 6]:** Band 2 — borderline
- **(6, ∞):** Band 3 — above technical error margin

Note: A value of exactly 6.0% falls in Band 2 (borderline), because 6% is the upper limit of the technical error margin — at that value, we cannot exclude technical origin.

### 5.6 Calibration Calculation (Mode B)

```
mmPerPixel = realDistanceMm / pixelDistance
```

Where:
- `pixelDistance` = distance between the two calibration points in pixels
- `realDistanceMm` = the known real-world distance entered by the clinician

After calibration, absolute measurements:
```
measurement_mm = measurement_normalized × referenceDimension_pixels × mmPerPixel
```

**Implementation note:** The exact pixel-to-normalized conversion depends on the image dimensions stored in the application. The domain function receives the calibration factor and applies it; the UI layer handles the conversion from normalized to pixel coordinates.

---

## 6. Threshold and Classification System

### 6.1 Tiered Thresholds

| Band | Habets Index (absolute) | Relative Difference | Label | Interpretation Guidance |
|------|------------------------|---------------------|-------|-------------------------|
| **1** | < 3% | < 6% | Within typical range | "The measured difference is within the range commonly observed in asymptomatic individuals." |
| **2** | 3–6% | 6–12% | Borderline | "The measured difference is in a borderline range that may include technical/positioning effects. Clinical correlation is recommended." |
| **3** | > 6% | > 12% | Above technical error margin | "The measured difference exceeds the 6% technical error margin reported for panoramic radiography. Clinical correlation and 3D imaging (CBCT) are recommended when clinically indicated." |

### 6.2 Threshold Caveat (Mandatory Display)

Every time thresholds or tier classifications are displayed, the following caveat must appear:

> "Threshold values are based on published literature and the known technical error margin of panoramic radiography (Habets et al. 1987), not on validated clinical outcomes. They are guidelines for interpretation, not diagnostic criteria. Apparent asymmetry may reflect technical factors rather than true anatomical asymmetry."

### 6.3 No Severity Labels

The application must NOT use severity labels such as "mild," "moderate," or "severe." These imply a validated clinical severity scale that does not exist. The three bands are defined by technical parameters (normal variation range, technical error margin), not by clinical severity.

### 6.4 CBCT Recommendation

CBCT is recommended in the clinical summary when:
1. The ramus height asymmetry exceeds the 6% technical error margin (Band 3)
2. AND the clinician judges that clinical signs warrant further investigation

The application cannot assess clinical signs — it can only flag the measurement result. The CBCT recommendation is phrased as conditional: "Clinical correlation and 3D imaging (CBCT) are recommended **when clinically indicated**."

The application must NOT state that CBCT is required — only that it is recommended when clinically indicated. The decision to obtain CBCT is always the clinician's.

---

## 7. Calibration Policy

### 7.1 Two Modes

| Mode | Calibration | Displayed Values | Use Case |
|------|------------|------------------|----------|
| **Mode A** | Not performed | Relative % only (Habets index, relative difference, dominant side, tier) | Quick screening; when no calibration reference is available |
| **Mode B** | Performed by clinician | All Mode A values + absolute measurements in mm | When a calibration reference is visible on the image (radiographic ruler, known implant length) |

### 7.2 Rules

1. **Mode A is the default.** The application starts in Mode A. Calibration is optional.
2. **Relative results are always available.** The Habets index and relative difference do not require calibration. They are the primary clinical output.
3. **Absolute measurements are only displayed in Mode B.** If not calibrated, no mm values are shown. Pixel values are never displayed as mm.
4. **Calibration does not change relative results.** The Habets index and relative difference are ratios — calibration cancels. Calibrating does not alter these values (assuming symmetric magnification).
5. **Calibration caveat in Mode B:** "Measurements in mm are estimated based on user-provided calibration and are subject to panoramic magnification effects. They should not be used as precise anatomical values."
6. **Mode A caveat:** "Calibration not performed — absolute measurements in mm are not displayed. Relative asymmetry percentages are available."

### 7.3 Calibration Method

The clinician:
1. Activates calibration mode
2. Marks two points on the image with a known real-world distance between them
3. Enters the known distance in mm
4. The system computes `mmPerPixel = realDistanceMm / pixelDistance`
5. All subsequent measurements display both mm and % values

Per Laster et al. (2005) [PMID 16227476], internal calibration (using a reference visible on the image) is preferred over using the manufacturer's stated magnification factor. The system does not apply a default magnification factor.

---

## 8. Clinical Interpretation Wording Templates

### 8.1 Full Clinical Summary Template

The clinical summary is a structured text block generated by the domain layer. It includes:

```
[Mandatory limitation header — see §9]

RAMUS HEIGHT ANALYSIS (Primary Measurement)
On this panoramic radiograph, the {right/left} ramus height is {X.X}% greater 
than the {left/right}.

Habets Asymmetry Index: {±X.X}% ({right greater/left greater})
Relative Difference: {X.X}%
Classification: {Within typical range / Borderline / Above technical error margin}

{Tier-specific guidance text — see §6.1}

MANDIBULAR BODY LENGTH ANALYSIS (Secondary Measurement — Lower Reliability)
⚠ Horizontal measurements on panoramic radiographs are less reliable than vertical 
measurements due to variable horizontal magnification. Interpret with caution.

The {right/left} mandibular body length is {X.X}% greater than the {left/right}.

Habets Asymmetry Index: {±X.X}% ({right greater/left greater})
Relative Difference: {X.X}%
Classification: {Within typical range / Borderline / Above technical error margin}

{Tier-specific guidance text — see §6.1}

{If calibrated (Mode B):}
Absolute measurements (estimated):
  Right ramus height: {XX.X} mm
  Left ramus height: {XX.X} mm
  Right body length: {XX.X} mm
  Left body length: {XX.X} mm
  Calibration factor: {X.XXXX} mm/pixel

{If not calibrated (Mode A):}
Calibration not performed — absolute measurements in mm are not displayed.

[Mandatory limitation footer — see §9]
```

### 8.2 Equal Values

If a measurement difference is ≤ 0.5% (relative difference):

```
On this panoramic radiograph, the right and left ramus heights are approximately equal.
```

### 8.3 Wording Rules

1. **Always start with "On this panoramic radiograph"** — this frames the result as a measurement of a specific image, not a diagnosis of the patient.
2. **Always use "greater than"** — never "larger," "longer," "taller," "dominant," or "hypertrophic."
3. **Always use the relative difference value** in the summary text — it is more intuitive than the Habets index.
4. **Always display both Habets index and relative difference** in the metrics table — the summary text uses relative difference for readability; the table provides both for completeness.
5. **Never use diagnostic language** — no "hypoplasia," "hyperplasia," "hypertrophy," "atrophy," "asymmetry is present," "patient has."
6. **One decimal place** for all percentage values. **One decimal place** for mm values.
7. **Body length always includes the ⚠ warning** — it must never appear without it.

---

## 9. Mandatory Limitation Statements

### 9.1 Limitation Header (Top of Every Report)

```
CLINICAL MEASUREMENT REPORT — MANDIBULAR ASYMMETRY ANALYSIS

⚠ This is a measurement and comparative analysis tool, not a diagnostic system. 
Results are derived from a 2D projection of 3D anatomy and must be interpreted 
in the context of clinical examination and adjunct imaging.
```

### 9.2 Limitation Statements (Bottom of Every Report)

The following five statements must appear at the bottom of every clinical report, in this order:

```
LIMITATIONS

1. 2D PROJECTION: Measurements are derived from a 2D projection of 3D anatomy. 
   Panoramic radiographs have inherent magnification and distortion that may 
   affect measurement accuracy.

2. POSITIONING SENSITIVITY: Measurements are sensitive to patient head positioning 
   during image acquisition. Head rotation may create apparent asymmetry that does 
   not reflect true anatomy.

3. LANDMARK IDENTIFICATION: Measurements depend on manual landmark placement and 
   are subject to inter-observer variability, particularly for condylion (Co) 
   identification.

4. NOT DIAGNOSTIC: This is a measurement and comparative analysis tool, not a 
   diagnostic system. Results must be interpreted in the context of clinical 
   examination and adjunct imaging.

5. THRESHOLD CAVEAT: Threshold values are based on published literature and the 
   known technical error margin of panoramic radiography (Habets et al. 1987), 
   not on validated clinical outcomes. Apparent asymmetry may reflect technical 
   factors rather than true anatomical asymmetry.

6. HORIZONTAL MEASUREMENT CAVEAT: Mandibular body length measurements use horizontal 
   distances, which are less reliable on panoramic radiographs than vertical 
   measurements. Body length results should be interpreted with particular caution.
```

### 9.3 When CBCT Is Recommended

CBCT recommendation appears in the tier-specific guidance for Band 3 only:

```
"The measured difference exceeds the 6% technical error margin reported for 
panoramic radiography. Clinical correlation and 3D imaging (CBCT) are recommended 
when clinically indicated."
```

This is a recommendation, not a directive. The application does not state that CBCT is required.

---

## 10. Labeling Convention to Prevent Confusion

### 10.1 Metric Labels

| Metric | Display Label | Tooltip / Subtitle |
|--------|--------------|-------------------|
| Habets Asymmetry Index | "Habets Asymmetry Index" | "(R−L)/(R+L) × 100 — standard research metric (Habets et al. 1988). Positive = right greater." |
| Relative Difference | "Relative Difference" | "\|R−L\| / ((R+L)/2) × 100 — percentage deviation from bilateral mean. Always positive. = 2 × \|Habets Index\|." |

### 10.2 Relationship Footnote

Beneath the metrics table, always display:

> "The Relative Difference is exactly twice the absolute value of the Habets Asymmetry Index. For example, a Habets index of 3% corresponds to a Relative Difference of 6%."

### 10.3 Threshold Labels

| Column Header | Label |
|---------------|-------|
| Habets threshold column | "Habets Index Threshold" |
| Relative difference threshold column | "Relative Difference Threshold" |

### 10.4 Never Use

- "Asymmetry %" (ambiguous — which formula?)
- "Difference Index" (ambiguous)
- "AI" without qualification (could be confused with artificial intelligence)
- "Symmetry Index" without specifying which index
- Unlabeled percentage values

---

## 11. Domain Module Specification

This section provides the clinical specification for the domain module (`src/domain/mandibularAsymmetry.ts`). OrthoBot does not write code, but defines the clinical contract that the code must implement.

### 11.1 Required Pure Functions

| Function | Input | Output | Clinical Specification |
|----------|-------|--------|----------------------|
| `calculateDistance(A, B)` | Two Points (normalized 0–1) | Number (normalized distance) | Euclidean distance in normalized coordinate space |
| `calculateSideDifference(R, L)` | Right measurement, Left measurement | `{ difference, absoluteDifference }` | `difference = R − L`; `absoluteDifference = \|R − L\|` |
| `calculateRelativeDifference(R, L)` | Right measurement, Left measurement | Number (percentage) | `\|R − L\| / ((R + L) / 2) × 100` — always positive, rounded to 1 decimal |
| `calculateAsymmetryIndex(R, L)` | Right measurement, Left measurement | Number (percentage, signed) | `(R − L) / (R + L) × 100` — signed, rounded to 1 decimal |
| `determineDominantSide(R, L)` | Right measurement, Left measurement | `"right" \| "left" \| "equal"` | `equal` if relative difference ≤ 0.5%; otherwise side with larger value |
| `classifyAsymmetry(habetsAbsValue)` | Absolute Habets index (\|AI\|) | `"within_typical_range" \| "borderline" \| "above_technical_error_margin"` | `< 3` → within_typical_range; `[3, 6]` → borderline; `> 6` → above_technical_error_margin |
| `generateClinicalSummary(results)` | Full results object | String (structured clinical text) | Produces the full clinical summary per §8.1 template with limitations |

### 11.2 Measurements to Calculate

For each study, the domain layer computes:

**Ramus Height:**
1. `ramusRight = calculateDistance(CoR, GoR)`
2. `ramusLeft = calculateDistance(CoL, GoL)`
3. `ramusHabetsAI = calculateAsymmetryIndex(ramusRight, ramusLeft)`
4. `ramusRelativeDiff = calculateRelativeDifference(ramusRight, ramusLeft)`
5. `ramusDominantSide = determineDominantSide(ramusRight, ramusLeft)`
6. `ramusClassification = classifyAsymmetry(abs(ramusHabetsAI))`

**Mandibular Body Length:**
1. `bodyRight = calculateDistance(GoR, Me)`
2. `bodyLeft = calculateDistance(GoL, Me)`
3. `bodyHabetsAI = calculateAsymmetryIndex(bodyRight, bodyLeft)`
4. `bodyRelativeDiff = calculateRelativeDifference(bodyRight, bodyLeft)`
5. `bodyDominantSide = determineDominantSide(bodyRight, bodyLeft)`
6. `bodyClassification = classifyAsymmetry(abs(bodyHabetsAI))`

**Calibration (Mode B only):**
- If `calibration` is not null, convert all distances to mm using `mmPerPixel`.

### 11.3 Rounding Rules

- All percentage values: **1 decimal place** (e.g., 5.8%)
- All mm values: **1 decimal place** (e.g., 52.3 mm)
- Calibration factor: **4 decimal places** (e.g., 0.0832 mm/pixel)

### 11.4 Edge Cases

| Case | Handling |
|------|----------|
| R + L = 0 (both sides zero) | Return 0 for all percentage calculations; dominantSide = "equal"; classify as "within_typical_range" |
| R or L is negative (should not happen with distances, but guard) | Treat as absolute value for distance; log warning |
| Missing landmarks | Do not calculate the affected measurement; display "Landmarks incomplete — measurement not available" |
| Calibration with pixelDistance = 0 | Display calibration error; do not compute mmPerPixel |

---

## 12. Deviations from ResearchBot Recommendations

OrthoBot concurs with all of ResearchBot's recommendations. The following are explicit confirmations and one升级 (upgrade in confidence):

| ResearchBot Recommendation | OrthoBot Decision | Notes |
|---------------------------|-------------------|-------|
| Use Co–Go for ramus height | **Concur (High confidence)** | No deviation |
| Calculate Habets asymmetry index | **Concur (High confidence)** | No deviation |
| Calculate relative difference | **Concur (High confidence)** | No deviation |
| Display both Habets and relative difference | **Concur (High confidence)** | Enhanced labeling requirements (Q7) |
| Include body length with caveat | **Concur (High confidence)** | Upgraded from moderate; PROJECT_CONTEXT mandates it |
| Use 3% and 6% as informational thresholds | **Concur (Moderate confidence)** | Tiered system with explicit caveats (Q4) |
| Present thresholds as guidelines | **Concur (High confidence)** | No deviation |
| State 2D projection limitations | **Concur (High confidence)** | Expanded into mandatory limitation statements (§9) |
| Recommend CBCT when > 6% (Habets) | **Concur (Moderate confidence)** | Wording is conditional: "when clinically indicated" |
| Do NOT separate condylar height from ramus height | **Concur, upgraded to High confidence** | Upgraded from ResearchBot's "moderate confidence" based on clinical workflow constraint and Sn reproducibility evidence (Q1) |

**No deviations from ResearchBot's evidence-based recommendations.** OrthoBot's role was to make the clinical decisions on the 8 unresolved questions, all of which are consistent with ResearchBot's evidence review.

---

## 13. Protocol Metadata

| Field | Value |
|-------|-------|
| **Author** | OrthoBot |
| **Date** | 2026-08-16 |
| **Status** | APPROVED |
| **Evidence base** | docs/clinical-evidence.md (ResearchBot, 2026-08-16, 40 references) |
| **Landmarks** | 5 (CoR, GoR, CoL, GoL, Me) |
| **Measurements** | 2 (Ramus height, Mandibular body length) |
| **Asymmetry metrics** | 2 (Habets index, Relative difference) |
| **Threshold system** | 3 tiers (guidelines, not diagnoses) |
| **Calibration** | Optional (Mode A / Mode B) |
| **Clinical summary** | Structured template with mandatory limitations |
| **Next stage** | ArchitectBot / DevBot — architecture and implementation |
| **Change protocol** | Any formula change requires: ResearchBot → OrthoBot → PMBot → TestBot → QABot |

---

> **Clinical disclaimer:** This protocol defines a measurement and comparative decision-support tool. It is not a clinical guideline or diagnostic standard. All measurement methods, formulas, and thresholds described herein are based on published literature and expert clinical judgment. Results must be interpreted by a qualified clinician in the context of clinical examination and adjunct imaging. This tool does not replace clinical judgment.