# Threshold Validation Decision Document

## Mandibular Asymmetry Analysis — Can the 3% and 6% thresholds be transferred to the simplified Co-Go measurement?

> **Author:** PIBot (Clinical Validation Agent)
> **Date:** 2026-08-16
> **Status:** SECOND REVIEW — Threshold transferability analysis
> **Trigger:** User challenge — the current five-landmark implementation uses a straight-line Co-Go Euclidean distance as the "ramus length proxy." The original Habets method used a different tracing geometry. Can the 3% and 6% thresholds be automatically transferred?
> **Scope:** This document addresses ONLY the threshold transferability question. It does not modify code. It is a clinical decision document for PMBot to act upon.

---

## Executive Summary

| Threshold | Source | Original Measurement | Matches Current Co-Go? | Recommendation |
|-----------|--------|---------------------|----------------------|----------------|
| **3%** | Bezuur et al. (1988) [PMID 3236126] | Condylar height (Co–Sn) vertical asymmetry | **NO** — different anatomical segment | **REMOVE** |
| **6%** | Habets et al. (1987) [PMID 3478455] | Vertical magnification error (experimental model) | **PARTIAL** — applies to vertical measurements, but current uses Euclidean distance | **QUALIFY** (retain as informational reference only, not as classification boundary) |

**Bottom line:** The 3-tier classification system (`within_typical_range` / `borderline` / `above_technical_error_margin`) should be **REMOVED** from the UI for the Co-Go measurement. Numerical results (Habets index, relative difference) should be displayed **without** tier badges. The 6% value may be retained as an annotated reference line with explicit caveats, but should not trigger automatic classification bands.

---

## 1. Source Identification: The 3% Threshold

### 1.1 Primary Source

**Paper:** Bezuur JN, Habets LL, Hansson TL. "The recognition of craniomandibular disorders—a comparison between clinical, tomographical, and dental panoramic radiographical findings in thirty-one subjects."
**Journal:** *Journal of Oral Rehabilitation* 1988; 15(6): 549–554.
**PMID:** 3236126
**DOI:** 10.1111/j.1365-2842.1988.tb00191.x

### 1.2 Population

- 31 **female** patients suffering from craniomandibular disorders (CMD)
- No control group of asymptomatic subjects in this paper
- Age range: the MeSH terms include Adolescent, Adult, Aged, Child, Middle Aged — suggesting a wide age range

### 1.3 Measurement Method

The abstract states: "Regarding **vertical condylar asymmetry** measured on the Orthopantomogram, it was found that 74% of the patients with CMD had more than the 3% of asymmetry regarded as within normal limits."

**Critical finding:** The 3% threshold was applied to **condylar asymmetry** — which in the Habets method framework is the **condylar height (Co–Sn)** measurement, NOT total height (Co–Go).

The Habets method (as defined in Habets et al. 1988, PMID 3244055) decomposes the mandible into three vertical measurements:
1. **Condylar height (Co–Sn)** — condylion to sigmoid notch
2. **Ramus height (Sn–Go)** — sigmoid notch to gonion
3. **Total height (Co–Go)** — condylion to gonion (= condylar + ramus)

Bezuur et al. (1988) measured "vertical condylar asymmetry" — this is measurement #1 (Co–Sn), not measurement #3 (Co–Go).

### 1.4 How Was 3% Established as "Normal Limits"?

The abstract states that 3% is "regarded as within normal limits" but **does not explain how this limit was determined**. It appears to be an **author assertion**, not a statistically validated cutoff. The paper does not describe:
- A control population from which 3% was derived
- A statistical method for determining the cutoff
- A sensitivity/specificity analysis at the 3% level

The 3% threshold was subsequently adopted by numerous studies (Halicioglu 2013, Abad-Santamaría 2014, Pinto-Wong 2024, Silvestrini-Biavati 2014) as a convention, but **none of these studies validated it against clinical outcomes**. It became a field convention through repeated citation, not through validation.

### 1.5 Evidence Against the 3% Threshold

- **Türp et al. (1995) [PMID 7610365]:** Achieving 80% sensitivity required accepting specificity of only 0.20–0.25, resulting in "a very high rate of false positive diagnoses." This was tested on dry skulls using the Habets method.
- **Pinto-Wong & Arriola-Guillén (2024) [PMID 39670032]:** In 210 adults, **81.4%** exceeded 3% for condylar asymmetry and **48.6%** exceeded 3% for ramus asymmetry. If nearly half of normal adults exceed the threshold for ramus/total height, the threshold lacks discriminative value for this measurement.
- **Bal et al. (2018) [PMID 29500898]:** Mean ramus asymmetry of 2.90% ± 2.58% in 776 normal young individuals — the mean is already close to the 3% threshold, and the standard deviation spans well beyond it.

### 1.6 Citation Error in Project Documentation

The project's `docs/clinical-evidence.md` cites Bezuur et al. (1988) as "J Oral Rehabil 15(5): 475–480." The correct citation from PubMed is **J Oral Rehabil 15(6): 549–554**. The pages 475–480 belong to Habets et al. (1987) [PMID 3478455]. This is a citation error that should be corrected in the evidence document.

---

## 2. Source Identification: The 6% Threshold

### 2.1 Primary Source

**Paper:** Habets LLM, Bezuur JN, van Ooij CP, Hansson TL. "The orthopantomogram, an aid in diagnosis of temporomandibular joint problems. I. The factor of vertical magnification."
**Journal:** *Journal of Oral Rehabilitation* 1987; 14(5): 475–480.
**PMID:** 3478455
**DOI:** 10.1111/j.1365-2842.1987.tb00742.x

### 2.2 Population/Model

This was **not a patient study**. It used an **experimental model** designed to resemble a human mandible. The model was positioned at nine different horizontal positions in the orthopantomograph to simulate positioning errors.

### 2.3 Measurement Method

The abstract states: "By changing the position of the model in the horizontal plane of the orthopantomograph, nine different images were analysed for changes of **vertical magnifications**. Emphasis was put on large parts of the mandible like the condyle."

Finding: "In positions that had been altered less than 10 mm from the originally centred position of the mandible in the orthopantomograph, **vertical differences between the left and right sides were less than 6%**. Observed condylar asymmetries within a 6% difference might, therefore, be due to technical failures."

### 2.4 What the 6% Represents

The 6% is a **technical error margin for vertical magnification** on panoramic radiographs. It represents the maximum side-to-side vertical measurement difference that can be attributed to positioning/magnification alone (within 10 mm of centered position).

**Key characteristics:**
- It is a property of the **imaging modality**, not of a specific anatomical measurement
- It applies to **vertical** measurements (magnification in the vertical dimension)
- It was measured on an **experimental model**, not on patient radiographs
- It represents positioning error within a **10 mm displacement range** — larger displacements may produce larger errors
- The authors specifically mention "condylar asymmetries" in the conclusion, but the 6% applies to vertical magnification generally

### 2.5 Citation Error in Project Documentation

The project's `docs/clinical-evidence.md` cites Habets et al. (1987) as "J Oral Rehabil 14(5): 465–471." The correct citation from PubMed is **J Oral Rehabil 14(5): 475–480**. The pages 465–471 belong to Habets et al. (1988) [PMID 3244055]. This is a citation error that should be corrected.

---

## 3. Did the Original Habets et al. (1988) Use the Same Co-Go Straight-Line Distance?

### 3.1 The Habets Method (Part II, PMID 3244055)

The abstract states: "**Vertical measurements** of the Orthopantomograms of 152 patients were made for **condylar and rami heights**. The symmetry between the right (R) and the left (L) side was calculated with the formula: [(R-L)/(R + L)]."

### 3.2 What "Vertical Measurements" Means

The Habets method used **tracing paper overlays** on pantomographic images. The measurements were **vertical heights** — distances measured along the vertical axis of the image, perpendicular to the occlusal reference plane. This is fundamentally different from a **Euclidean (straight-line) distance** between two landmark points.

| Aspect | Original Habets Method | Current Implementation |
|--------|----------------------|----------------------|
| **Measurement type** | Vertical height (traced perpendicular to reference) | Euclidean distance (√(dx² + dy²)) |
| **Landmarks** | Co, Sn, Go (3 bilateral) | Co, Go only (2 bilateral) |
| **Segments measured** | Co–Sn (condylar), Sn–Go (ramal), Co–Go (total) | Co–Go only (total) |
| **Asymmetry index** | Calculated separately for each segment | Calculated for Co–Go only |
| **Image modality** | Traced on physical pantomographic film | Digital landmarks on digital image |

### 3.3 The Geometry Mismatch

The current implementation computes:
```
distance(Co, Go) = √((Co.x − Go.x)² + (Co.y − Go.y)²)
```

This is the **straight-line Euclidean distance** between condylion and gonion. In the original Habets method, the measurement was the **vertical component** of this distance — the height difference along the vertical axis, not the diagonal distance.

When Co and Go are not perfectly vertically aligned (which is the common case — the condyle is postero-superior and gonion is postero-inferior), the Euclidean distance is **longer** than the true vertical height. The asymmetry index computed from Euclidean distances will differ from the index computed from vertical heights, because:

1. The horizontal offset between Co and Go varies between sides
2. The Euclidean distance is sensitive to both vertical and horizontal components
3. Horizontal magnification on OPG is more variable than vertical magnification (Scarfe 1998, Devlin & Yuan 2013)

**This means the current implementation's Co-Go measurement is NOT the same measurement that the Habets method produced.** It is a related but geometrically different quantity.

### 3.4 Does Co-Go Appear in the Original Habets Method?

Yes — but as one of three measurements, not as the sole measurement. The Habets method measured Co-Go as "total height," and the asymmetry index was calculated for total height as well. However:

1. The original Co-Go was a **vertical height**, not a Euclidean distance
2. The thresholds (especially 3%) were **not derived from the total height (Co-Go) measurement** — they were derived from the **condylar height (Co-Sn) measurement**
3. The original method provided three indices (condylar, ramal, total), allowing the clinician to interpret asymmetry in context. The current implementation provides only one (total), removing the contextual information.

---

## 4. Did Bezuur et al. (1988) Use the Same Measurement as the Current Implementation?

### 4.1 Answer: NO

Bezuur et al. (1988) [PMID 3236126] measured **"vertical condylar asymmetry"** — this is the **condylar height (Co–Sn)** component of the Habets decomposition, not the total height (Co–Go).

The current implementation measures **Co–Go (total height)** using Euclidean distance.

These are **different measurements**:
- **Co–Sn (condylar height):** The height of the condylar head alone, from the top of the condyle to the sigmoid notch. This is the most variable segment — condylar morphology varies widely, and condylar asymmetry is consistently reported as more prevalent and more severe than ramal or total height asymmetry.
- **Co–Go (total height):** The combined height from condylion to gonion, incorporating both condylar and ramal components. This is a more stable measurement that averages out some of the condylar variability.

### 4.2 Why This Matters for Threshold Transfer

The 3% threshold was established in the context of **condylar height asymmetry** — the most variable and most asymmetric segment. Applying it to **total height** — a more stable measurement with lower baseline asymmetry — is a measurement mismatch. The appropriate threshold for total height, if one exists, would likely be **different** (potentially lower, since total height has less baseline variation).

However, no study has specifically validated a threshold for Co-Go total height asymmetry. The field has uncritically transferred the 3% condylar threshold to other measurements without validation.

### 4.3 Empirical Evidence of the Measurement Difference

| Study | Measurement | Prevalence > 3% |
|-------|-------------|-----------------|
| Pinto-Wong (2024) | Condylar (Co–Sn) | 81.4% of normal adults |
| Pinto-Wong (2024) | Ramus (Sn–Go or Co–Go) | 48.6% of normal adults |

The nearly 2× difference in prevalence between condylar and ramus measurements above 3% demonstrates that the 3% threshold has **different implications** for different anatomical segments. A threshold derived from condylar measurements cannot be assumed to apply to total height measurements.

---

## 5. Analysis: Can the Thresholds Be Automatically Transferred?

### 5.1 The 3% Threshold — Transfer Assessment

| Criterion | Assessment |
|-----------|------------|
| Same measurement? | **NO** — 3% was from condylar height (Co–Sn), current uses total height (Co–Go) |
| Same geometry? | **NO** — original was vertical height, current is Euclidean distance |
| Same population? | **NO** — original was 31 female CMD patients, no normal controls |
| Validated for Co–Go? | **NO** — no study has validated 3% specifically for total height |
| Clinically validated? | **NO** — Türp (1995) showed specificity of 0.20–0.25 at 80% sensitivity |
| Transferable? | **NO** — measurement mismatch + no validation + high false positive rate |

**Conclusion:** The 3% threshold **cannot** be automatically transferred to the current Co-Go Euclidean distance measurement. The threshold was derived from a different anatomical segment (condylar height, Co–Sn), using a different measurement geometry (vertical height vs Euclidean distance), in a different population (CMD patients, no controls), and has never been validated for total height (Co–Go) measurements.

### 5.2 The 6% Threshold — Transfer Assessment

| Criterion | Assessment |
|-----------|------------|
| Same measurement? | **PARTIAL** — 6% is a general vertical magnification property, not measurement-specific |
| Same geometry? | **PARTIAL** — 6% applies to vertical measurements; current uses Euclidean distance (includes horizontal component) |
| Same population? | **N/A** — experimental model, not patients |
| Validated for Co–Go? | **NO** — not specifically, but the 6% is about imaging physics, not anatomy |
| Transferable? | **PARTIALLY** — can be referenced as an approximate technical error indicator, but not as a precise classification boundary |

**Conclusion:** The 6% threshold is **more transferable** than the 3% because it represents a property of the imaging modality (vertical magnification error) rather than a property of a specific anatomical measurement. However, two caveats apply:

1. **Euclidean vs vertical:** The current implementation uses Euclidean distance, which includes a horizontal component subject to different (larger, more variable) magnification error. The 6% margin was measured for vertical magnification only and may underestimate the technical error for Euclidean distance measurements.

2. **Experimental model, not patients:** The 6% was measured on a physical model in controlled positioning conditions. Real patient OPGs have additional sources of variation (patient movement, anatomy variation, image quality) that may increase the effective technical error beyond 6%.

The 6% can be retained as an **informational reference point** — "values above 6% may be less likely to be entirely due to technical factors" — but should not be used as a hard classification boundary.

---

## 6. Recommendations

### 6.1 The 3% Threshold: **REMOVE**

**Rationale:**
1. The 3% threshold was derived from **condylar height (Co–Sn)** asymmetry, not total height (Co–Go). This is a fundamental measurement mismatch.
2. The threshold was never validated for Co–Go measurements.
3. The threshold was never clinically validated — it is an author assertion from Bezuur et al. (1988), not a statistically derived cutoff.
4. Türp et al. (1995) demonstrated that the Habets method has very low diagnostic specificity (0.20–0.25 at 80% sensitivity).
5. 48.6% of normal adults exceed 3% for ramus/total height measurements (Pinto-Wong 2024), rendering the threshold non-discriminative for this measurement.
6. The current implementation uses Euclidean distance, not vertical height, further diverging from the original measurement context.

**Action:** Remove 3% as a classification boundary. The `classifyAsymmetry` function should not classify a value as "within_typical_range" vs "borderline" based on the 3% cutoff.

### 6.2 The 6% Threshold: **QUALIFY** (retain as informational reference only)

**Rationale:**
1. The 6% represents a vertical magnification error margin that is a property of the imaging modality, making it more transferable than the 3% threshold.
2. However, the current implementation uses Euclidean distance (not purely vertical), and the 6% was measured on an experimental model (not patient images).
3. The 6% should not trigger automatic tier classification but can be shown as an annotated reference line.

**Action:** Retain the 6% value as an informational reference point with explicit caveats. Do not use it as a hard boundary for a "borderline" vs "above technical error margin" classification tier.

### 6.3 The 3-Tier Classification System: **REMOVE**

The current 3-tier system depends on BOTH thresholds:
- Band 1 (< 3%): "Within typical range" — depends on the 3% threshold (REMOVED)
- Band 2 (3–6%): "Borderline" — depends on BOTH thresholds (3% REMOVED, 6% QUALIFIED)
- Band 3 (> 6%): "Above technical error margin" — depends on the 6% threshold (QUALIFIED)

Since the 3% threshold is removed and the 6% is qualified to informational-only status, the **3-tier classification system cannot be maintained**. The tiers should be removed from the UI and from the `classifyAsymmetry` function's output.

### 6.4 What to Show Instead

**Display the following for the ramus length proxy (Co–Go):**

1. **Habets Asymmetry Index** (numerical value, e.g., "4.2%")
2. **Relative Difference** (numerical value, e.g., "8.0%")
3. **Larger measured side** ("right" / "left" / "equal")
4. **6% reference annotation** (informational, not a classification):
   > "The 6% value is shown as a reference line. It represents the vertical magnification error margin reported by Habets et al. (1987) for panoramic radiography positioning within 10 mm of centered position. Values below 6% may include technical/positioning effects; values above 6% are more likely to include a true anatomical component. This reference was derived from an experimental model and applies to vertical measurements; the current implementation uses Euclidean distance, which includes a horizontal component subject to additional magnification error. This is an informational reference, not a validated diagnostic threshold."

5. **Mandatory disclaimer** (replacing the tier caveat):
   > "No validated clinical threshold exists for this measurement. The 3% threshold commonly cited in the literature was derived from condylar height (Co–Sn) asymmetry [Bezuur et al. 1988, PMID 3236126], not from the total height (Co–Go) measurement used here. The original Habets method used a different tracing geometry (vertical height on traced pantomographic images, with decomposition into condylar and ramal segments). These thresholds have not been validated for the simplified Co–Go Euclidean distance used in this tool. Numerical values are provided for comparative purposes only and must be interpreted by a qualified clinician in the context of clinical examination and adjunct imaging."

6. **If calibrated (Mode B):** Right ramus height (mm), left ramus height (mm), mm difference

### 6.5 For Mandibular Body Length Proxy (Go–Me)

The body length measurement was already unclassified in the current implementation (per the first PIBot report, §3.4). This remains correct — no thresholds apply to horizontal measurements. Continue showing numerical values only with the horizontal reliability caveat.

---

## 7. UI Caveat Text (Exact Wording)

### 7.1 Replacing the Tier Badge for Ramus Length Proxy

**Remove:** The `ThresholdBadge` component and `TIER_GUIDANCE` text for the ramus length proxy.

**Replace with:** An informational reference annotation displaying:

> **Reference value: 6%**
> The dashed line at 6% represents the vertical magnification error margin for panoramic radiography reported by Habets et al. (1987). Values below this margin may include positioning/magnification effects; values above are more likely to include a true anatomical component. This reference was derived from an experimental model and applies to vertical measurements — the current tool uses Euclidean distance, which includes an additional horizontal component. This is an informational reference, not a validated diagnostic threshold.

### 7.2 Mandatory Disclaimer (Display Prominently Near Results)

> **No validated classification thresholds exist for this measurement.**
> The 3% and 6% thresholds commonly cited in the literature were derived from the original Habets tracing method, which used vertical height measurements on traced pantomographic images with decomposition into condylar (Co–Sn) and ramal (Sn–Go) segments. This tool uses a simplified Co–Go Euclidean distance without segmental decomposition. The 3% threshold originated from condylar height (Co–Sn) asymmetry data [Bezuur et al. 1988, PMID 3236126], not total height (Co–Go). No study has validated these thresholds for the measurement used here. Numerical values are provided for comparative screening purposes only.

### 7.3 Clinical Documentation Text (for docs/clinical-protocol.md update)

> **Threshold status:** The 3-tier classification system (< 3% / 3–6% / > 6%) has been removed. The 3% threshold [Bezuur et al. 1988, PMID 3236126] was derived from condylar height (Co–Sn) asymmetry, not the total height (Co–Go) measurement used in this tool, and has not been validated for Co–Go. The 6% technical error margin [Habets et al. 1987, PMID 3478455] is retained as an informational reference line only. All results are displayed as numerical values without tier classification. This decision was made by PIBot (Clinical Validation Agent) on 2026-08-16 in response to a user challenge regarding threshold transferability from the original Habets tracing geometry to the simplified Co–Go Euclidean distance. See docs/threshold-validation.md for the full analysis.

---

## 8. Summary of Citation Corrections Needed

The following citation errors were found in `docs/clinical-evidence.md` and should be corrected (by the appropriate agent — not PIBot, which does not edit files other than this decision document):

| Paper | clinical-evidence.md says | PubMed correct citation |
|-------|--------------------------|----------------------|
| Habets et al. (1987) | J Oral Rehabil 14(5): 465–471 | J Oral Rehabil 14(5): **475–480** |
| Bezuur et al. (1988) | J Oral Rehabil 15(5): 475–480 | J Oral Rehabil **15(6): 549–554** |
| Bezuur et al. (1989) | J Oral Rehabil 16(2): 161–166 | J Oral Rehabil **16(3): 257–260** |

The page numbers for Habets 1987 and Bezuur 1988 appear to have been swapped in the evidence document. Habets 1988 Part II (PMID 3244055) is correctly cited as 15(5): 465–471.

---

## 9. Document Metadata

- **Created by:** PIBot (Clinical Validation Agent)
- **Date:** 2026-08-16
- **Review type:** Second review (threshold transferability challenge)
- **Files inspected:** docs/PIBot-clinical-validation-report.md, docs/clinical-evidence.md, docs/clinical-protocol.md, src/domain/mandibularAsymmetry.ts, src/domain/types.ts
- **External sources verified:** PubMed abstracts for PMIDs 3478455, 3244055, 3236126, 2746413, 2795316, 7610365 (retrieved via NCBI E-utilities API on 2026-08-16)
- **Code edited:** None
- **Decision file:** docs/threshold-validation.md (this file)

---

> **Clinical disclaimer:** This document is a clinical validation analysis intended for software development purposes. It is not a clinical guideline. All threshold decisions must be reviewed by a qualified clinical expert (OrthoBot) before implementation. The recommendations herein are based on PubMed-verified source analysis and the project's own evidence base.