# Mandibular Asymmetry Analysis — UX Design Specification

> **Author:** UXBot  
> **Audience:** DevBot (implementation reference), PMBot (review)  
> **Target:** Clinician completes full analysis in 30–60 seconds

---

## 1. Main Screen Layout

A two-column layout optimized for single-screen clinical use.

```
┌────────────────────────────────────┬──────────────────────────┐
│                                    │  RIGHT PANEL (workflow)   │
│                                    │                          │
│         RADIOGRAPH VIEWER          │  1. Image Quality         │
│         (large, centered)          │  2. Place Landmarks       │
│                                    │  3. Results              │
│         [toolbar: zoom, pan,       │  4. Interpretation        │
│          fit, brightness,          │                          │
│          contrast, reset]          │  [Save Study] [New Study] │
│                                    │                          │
└────────────────────────────────────┴──────────────────────────┘
```

### Left / Center — Radiograph Viewer
- Occupies ~65–70% of screen width.
- Toolbar sits at top of viewer or as a floating overlay.
- Controls: zoom in/out, pan toggle, fit-to-screen, brightness slider, contrast slider, reset all.
- Viewer is the persistent visual anchor; it never collapses or re-renders the uploaded image unnecessarily.

### Right Panel — Workflow (top to bottom)
1. **Image Quality status** — shows upload confirmation, image dimensions, calibration status.
2. **Place Landmarks** — sequential guided placement with anatomical hints.
3. **Results** — ramus height, body length, right/left values, differences, asymmetry %, dominant side.
4. **Interpretation** — structured clinical summary (comparative language, projection caveats).

Panel width ~30–35%, fixed. Scrolls independently if content overflows on small screens.

**Constraint:** The right panel must always be visible alongside the image — no tab switching that hides results while placing landmarks.

---

## 2. Image Viewer Interaction Model

### Core Interactions
| Action | Input | Behavior |
|--------|-------|----------|
| Zoom | Mouse wheel / pinch / toolbar buttons | Zoom toward cursor position; range 0.5x–8x |
| Pan | Click-drag (when not placing landmarks) or dedicated pan toggle | Smooth pan within bounds |
| Fit-to-screen | Toolbar button | Resets zoom to fit image in viewport |
| Brightness | Slider (toolbar) | CSS filter / canvas adjustment, range 50%–150% |
| Contrast | Slider (toolbar) | CSS filter / canvas adjustment, range 50%–150% |
| Reset | Toolbar button | Resets zoom, pan, brightness, contrast to defaults |

### Design Principles
- Zoom and pan must not interfere with landmark placement — when a landmark placement step is active, click places the landmark; dragging moves the image only via a dedicated pan toggle or spacebar-hold modifier.
- Brightness/contrast adjustments are live and non-destructive (never modify source data).
- The image viewer is a separate rendering layer from the measurement overlay — image transforms (zoom/pan) apply to both layers together so landmarks track the image.

### Keyboard Shortcuts (for speed)
| Key | Action |
|-----|--------|
| `+` / `-` | Zoom in / out |
| `0` | Fit-to-screen |
| `R` | Reset viewer |
| `Space` (hold) | Pan mode (temporary) |
| `Esc` | Cancel current landmark placement |

---

## 3. Landmark Placement Workflow

Sequential guided workflow. Each landmark is placed one at a time with an anatomical hint.

### Sequence
1. **CoR** — "Most superior point of the right condylar head"
2. **GoR** — "Most posterior-inferior point of the right gonial angle"
3. **CoL** — "Most superior point of the left condylar head"
4. **GoL** — "Most posterior-inferior point of the left gonial angle"
5. **Me** — "Most inferior point of the mental symphysis (menton)"

### Placement Interaction
- The right panel displays the current landmark name, its anatomical hint, and a numbered progress indicator (e.g., "Step 2 of 5").
- A single click on the radiograph places the current landmark.
- After placement, the system auto-advances to the next landmark in sequence.
- Placed landmarks appear immediately on the overlay with their label (CoR, GoR, etc.).
- A "Back" button allows re-placing the previous landmark.

### Post-Placement Editing
- All landmarks are **draggable** — click and drag to reposition.
- Each landmark has a context action (right-click or small delete button on hover) to **delete** it.
- Deleting a landmark regresses the workflow to that step.
- Landmark edits trigger **immediate recalculation** — no manual "Recalculate" button.

### Visual Representation
- Landmarks rendered as small circles (10–12px effective size) with distinct color per side:
  - Right side landmarks: blue (#2563eb)
  - Left side landmarks: green (#16a34a)
  - Midline landmark (Me): amber (#d97706)
- Each landmark shows a text label adjacent to it.
- Selected/active landmark is highlighted with a larger ring.

### Completion
- When all 5 landmarks are placed, the workflow section collapses to a compact summary ("✓ 5/5 landmarks placed — click any to reposition") and the Results section expands automatically.

---

## 4. Results Panel Layout

Displayed in the right panel below landmark placement. Becomes active once all landmarks are placed.

### Structure
```
RESULTS
├── Ramus Length Proxy (Co–Go)
│   ├── Right:    XX.X px  [XX.X mm if calibrated]
│   ├── Left:     XX.X px  [XX.X mm if calibrated]
│   ├── Difference:        XX.X px  (XX.X%)
│   └── Larger measured side:  Right / Left / Equal
│
├── Body Length Proxy (Go–Me)
│   ├── Right:    XX.X px  [XX.X mm if calibrated]
│   ├── Left:     XX.X px  [XX.X mm if calibrated]
│   ├── Difference:        XX.X px  (XX.X%)
│   └── Larger measured side:  Right / Left / Equal
│
├── Asymmetry Summary
│   ├── Habets Index:      XX.X%
│   └── Threshold indicator: <3% / 3–6% / >6%
│
└── [Reliability notice for body length measurement]
```

### Threshold Display
A 3-tier visual indicator for the **ramus length proxy** (vertical measurement) only:
| Tier | Range | Color | Label |
|------|-------|-------|-------|
| 1 | < 3% | Green | Within typical range |
| 2 | 3–6% | Amber | Borderline — clinical correlation advised |
| 3 | > 6% | Red | Above technical error margin — further investigation recommended |

**Body length proxy does not receive threshold classifications** because the thresholds were derived from vertical measurement data.

These thresholds are **guidelines only** — the label text must clarify they are not diagnostic criteria. Actual clinical wording is defined by OrthoBot.

### Calibration-Dependent Display
- **Mode A (no calibration, default):** Values shown in pixels and percentages only. No mm values displayed. A note reads: "Uncalibrated — relative percentages only."
- **Mode B (calibrated):** Values shown in both mm and pixels, with percentages. Calibration factor (mm/px) shown in Image Quality section.

### Hover Interaction
When the user hovers over any measurement row (e.g., "Ramus Height — Right"), the corresponding measurement line on the radiograph is **highlighted** (thicker stroke, brighter color, or glow effect). This creates a direct visual link between the results panel and the image overlay.

### Body Length Reliability Notice
A small informational banner beneath body length results:
> ⚠ Body length measurement on OPG is less reliable due to horizontal projection distortion. Use with caution and correlate clinically.

---

## 5. Measurement Overlay Behavior

The overlay is a separate rendering layer on top of the radiograph image.

### Elements Drawn
| Element | Style |
|---------|-------|
| Right ramus line (CoR→GoR) | Blue line, 2px, with distance label |
| Left ramus line (CoL→GoL) | Green line, 2px, with distance label |
| Right body line (GoR→Me) | Blue line, 2px, with distance label |
| Left body line (GoL→Me) | Green line, 2px, with distance label |
| Landmarks (CoR, GoR, CoL, GoL, Me) | Colored circles with labels |
| Midline reference (optional) | Dashed vertical line through Me |

### Dynamic Behavior
- Lines appear progressively as landmarks are placed (a line draws when both its endpoints exist).
- Distance labels show measurement value (px or mm depending on calibration mode), positioned near the midpoint of each line.
- Hover from results panel highlights the corresponding line (see §4).
- Highlighted lines: increased stroke width (3–4px), added glow/shadow, label background change.
- Non-highlighted lines during hover: reduced opacity (40–50%) to focus attention.

### Visual Clutter Reduction
- Lines are thin (2px default) to avoid obscuring anatomy.
- Labels are small, non-overlapping, positioned with leader lines if needed.
- Overlay opacity can be toggled via a toolbar button ("Show/Hide measurements").
- Landmark labels can be toggled ("Show/Hide labels") for clinicians who prefer a cleaner view.

---

## 6. Clinical Interpretation Display

A structured, text-based summary displayed in the right panel below results. Becomes active once all landmarks are placed.

### Layout
```
INTERPRETATION
┌──────────────────────────────────────────────┐
│ [Comparative summary — 2-3 sentences]        │
│                                              │
│ Ramus: "Right ramus height is X% shorter      │
│  than left"                                  │
│                                              │
│ Body: "Right body length is X% longer         │
│  than left"                                  │
│                                              │
│ Larger measured side: Right / Left / Equal          │
│                                              │
│ ──────────────────────────────────────────  │
│ ⚠ 2D PROJECTION LIMITATION NOTICE            │
│ Panoramic radiographs are 2D projections      │
│ with inherent distortion. These measurements │
│ are screening-level only. Clinical correlation │
│ and 3D imaging (CBCT) recommended when        │
│ asymmetry exceeds thresholds.               │
└──────────────────────────────────────────────┘
```

### Rules (from PROJECT_CONTEXT.md)
- Must use **comparative language**, not diagnostic conclusions.
- Must NOT state "The patient has [diagnosis]."
- Must always include the 2D projection limitation notice.
- Must recommend clinical correlation and 3D imaging when indicated.
- All clinical wording is defined by OrthoBot — this section specifies layout and display behavior only.

### Display Behavior
- Auto-generates when all landmarks are placed; updates live as landmarks are edited.
- Presented in a bordered card with clear visual separation from numeric results.
- The 2D limitation notice is always visible, not collapsible or dismissible.

---

## 7. Calibration Interface

### Mode A (Default — No Calibration)
- No calibration UI shown initially.
- Results display in pixels + percentages only.
- A subtle prompt in Image Quality section: "💡 Calibrate for millimeter measurements →" linking to Mode B.

### Mode B (Calibrated)
**Calibration workflow:**
1. User clicks "Calibrate" in Image Quality section.
2. Instruction: "Mark two points with a known real-world distance (e.g., implant length, known anatomical distance)."
3. User clicks two points on the radiograph.
4. A small input appears: "Known distance: [___] mm"
5. User enters the known distance and confirms.
6. System computes mm/pixel and displays: "Calibration factor: X.XX mm/px"
7. Results switch to dual display (mm + px + %).
8. Calibration factor persists with the study.

### Calibration Display in Image Quality
```
IMAGE QUALITY
  ✓ Image loaded: 2400 × 1200 px
  Calibration: Not calibrated [Calibrate →]
  — or —
  Calibration: X.XX mm/px  [Recalibrate] [Remove]
```

---

## 8. Study Management

### Saving
- "Save Study" button at bottom of right panel.
- Saves to localStorage (metadata) + IndexedDB (images): study ID, patient ID, landmarks, calibration, measurements, interpretation, timestamps. Image stored separately in IndexedDB.
- Confirmation toast: "Study saved."

### Loading
- A study list accessible from a header or sidebar menu.
- List shows: patient ID (or "Unassigned"), date, dominant side, asymmetry %.
- Click to load — restores image, landmarks, calibration, and full state.

### New Study
- "New Study" button clears current state and returns to upload screen.
- Confirms if current study is unsaved: "Discard current study? Unsaved changes will be lost."

### Navigation Safety
- Navigation must not reset study data (per PROJECT_CONTEXT.md).
- Unsaved changes warning on any navigation that would lose data.

---

## 9. Image Upload Flow

### Initial State
When no image is loaded, the viewer area displays a drop zone:
```
┌────────────────────────────────────┐
│                                    │
│         📁 Drop radiograph here     │
│         or click to browse          │
│                                    │
│    Supported: JPG, PNG, BMP, TIFF   │
│    Max size: 20 MB                 │
│                                    │
└────────────────────────────────────┘
```

### After Upload
- Image loads into viewer, auto-fit to screen.
- Right panel activates: Image Quality shows metadata, Landmark placement becomes available.
- A brief loading indicator while the image renders.

---

## 10. Image Quality Status

Compact section at the top of the right panel.

```
IMAGE QUALITY
  ✓ Image loaded — 2400 × 1200 px
  Calibration: Not calibrated  [Calibrate →]
```

- Green checkmark when image is loaded.
- Warning icon if image is very small (<800px) or very large (>10,000px): "⚠ Low/high resolution image — measurement precision may be affected."
- Calibration status is always visible here.

---

## 11. Responsive & Accessibility Considerations

### Minimum Screen Size
- Designed for clinical desktop / laptop monitors (1280px+ wide).
- On screens <1024px: right panel can collapse to a tabbed view (Image | Workflow), but landmark placement and results should remain on a single scroll path.
- Not designed for mobile in MVP — display a notice on screens <768px: "This tool is optimized for desktop use."

### Accessibility
- All toolbar buttons have tooltips and keyboard shortcuts.
- Color choices meet WCAG AA contrast ratios against radiograph backgrounds.
- Results panel is screen-reader compatible (semantic HTML, ARIA labels).
- Landmarks are keyboard-navigable: Tab to select, arrow keys to nudge position, Enter to confirm.
- Threshold colors are supplemented by text labels (not color-only indicators).

---

## 12. Error & Edge Case Handling

| Scenario | Handling |
|----------|----------|
| Image fails to load | Error message in viewer area with retry option |
| Landmark placed outside image bounds | Snap to nearest edge, brief flash warning |
| Only partial landmarks placed | Results section shows "Place all landmarks to see results" with progress indicator |
| All measurements are equal | Dominant side shows "Equal", thresholds show green tier |
| Calibration input is 0 or negative | Validation error: "Distance must be a positive number" |
| Image too small for reliable measurement | Warning in Image Quality, but analysis proceeds |
| localStorage/IndexedDB full or unavailable | Error banner: "⚠ Storage limit exceeded. Could not save study. Try deleting old studies or clearing browser data." |
| Study data corrupted on load | Error message, offer to start new study |

---

## 13. Estimated Time-to-Complete & Efficiency Optimization

### Target: 30–60 seconds for a trained clinician

### Time Breakdown (Trained User)
| Step | Estimated Time |
|------|----------------|
| Upload radiograph | 3–5 s |
| Adjust brightness/contrast (if needed) | 5–10 s |
| Place 5 landmarks | 15–25 s |
| Review results & interpretation | 5–10 s |
| Save study | 2–3 s |
| **Total** | **30–53 s** |

### Efficiency Design Decisions
1. **Auto-advancing landmark sequence** — no need to click "Next" between landmarks.
2. **Immediate recalculation** — results appear instantly as the last landmark is placed; no "Calculate" button.
3. **Auto-expanding results** — Results section opens automatically when all landmarks are placed, no need to scroll or click.
4. **Hover-to-highlight** — instant visual correlation between results and image without clicking.
5. **Keyboard shortcuts** — zoom/fit/reset without moving mouse to toolbar.
6. **Drag-to-adjust** — landmarks are repositionable without re-entering placement mode.
7. **Persistent viewer** — image never re-renders unnecessarily; only the overlay updates.
8. **One-screen layout** — no page navigation, no modal dialogs, no multi-step wizards beyond the linear landmark sequence.

---

## UX Constraints for DevBot

1. **No manual recalculate button** — recalculation is automatic on any landmark change.
2. **Separate rendering layers** — image and overlay must be independent layers that transform together.
3. **Normalized coordinates** — landmarks stored as 0.0–1.0, never screen pixels.
4. **No diagnostic language** — all clinical wording comes from OrthoBot's interpretation spec; UI only renders it.
5. **No calculation in UI** — all measurements computed in `src/domain/`; UI calls domain functions.
6. **Navigation safety** — study state must survive navigation; no data loss on route changes.
7. **Hover state management** — hovering a result row must highlight the corresponding overlay line; this requires a shared state link between results panel and overlay renderer.
8. **Calibration mode toggle** — switching between Mode A and Mode B must update all result displays and labels without re-loading the image.
9. **Threshold colors** — use semantic colors (green/amber/red) with text labels, never color alone.
10. **2D limitation notice** — always visible in interpretation, not dismissible.

---

## Summary

This UX design enables a clinician to upload an OPG, place 5 landmarks sequentially with anatomical guidance, and immediately see comparative right/left measurements with a structured clinical interpretation — all within 30–60 seconds on a single screen. The design prioritizes workflow speed, visual clarity, and medical safety (comparative language, projection caveats, no diagnostic conclusions). All clinical wording and threshold definitions are deferred to OrthoBot; this document specifies layout, interaction, and display behavior only.