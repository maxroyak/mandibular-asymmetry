# How to Calibrate Your X-Ray Image

Calibration lets the app show measurements in **millimeters (mm)** instead of
just percentages. You only need it if you want mm values.

You will need something on the x-ray whose real-world size you know — for
example, a dental implant of a known length.

---

## Step 1 — Place Your Landmarks First

1. Upload your panoramic x-ray image.
2. Place all the anatomical landmarks on the image as usual.
3. The results panel will appear on the right side.

At the top of the results, you will see a **yellow/orange box** that says:

> **"Calibration required to display millimeters"**
> Showing relative percentages only. Calibrate the image to enable
> millimeter measurements.

Inside that box there is a blue button labeled **"Calibrate image"**.

> If you don't need mm values, you can stop here. The app already shows
> percentage comparisons between left and right sides.

---

## Step 2 — Click "Calibrate image"

1. Click the blue **"Calibrate image"** button.

A **blue box** appears in the calibration panel (left side). It says:

> **Image Calibration**
> Mark two points on the radiograph with a known real-world distance
> (e.g., implant length, known anatomical distance).

Below that text you will see two small status dots:

- **Point 1** — a grey dot with the text "(click image)"
- **Point 2** — a grey dot with the text "(click image)"

---

## Step 3 — Click Two Points on the Image

1. Find something on the x-ray whose real length you know (e.g., an implant).
2. **Click on the image** at the **top end** of that object.
   - The **Point 1** dot turns **green** with a checkmark (✓).
3. **Click on the image** at the **bottom end** of that same object.
   - The **Point 2** dot turns **green** with a checkmark (✓).

> **Tip:** Place the two points as precisely as you can on the exact
> endpoints. The accuracy of every mm measurement depends on this.

---

## Step 4 — Type the Known Distance

1. In the blue calibration box, find the field labeled **"Known distance:"**.
2. Click the empty number box next to it.
3. Type the real-world length between your two points, in millimeters.
   - For example, if the implant is 13 mm long, type **13**.
   - Decimals are fine — e.g., type **10.5** for 10.5 mm.
4. The **"mm"** label next to the box confirms the unit.

---

## Step 5 — Click "Confirm"

1. Click the blue **"Confirm"** button.

**If everything is correct:**

- The blue calibration box closes.
- The results panel shows a **green banner**:
  > ✓ Calibrated: _0.XXXX_ mm/pixel (user-marked reference distance) —
  > Measurements in mm.
- All measurements now show **mm values** in colored boxes:
  - **Right** (blue box) — length in mm
  - **Left** (green box) — length in mm
  - **Difference** (grey box) — side-to-side difference in mm

**If something is wrong**, you will see a **red error message**:

| Message | What to do |
|---|---|
| "Mark two points on the radiograph first." | Go back to Step 3 — you need to click both points on the image. |
| "Calibration points must be different." | The two clicks landed in the same spot. Click Point 2 at a different location. |
| "Distance must be a positive number." | The known distance box is empty or zero. Type a number greater than 0. |

Fix the issue, then click **Confirm** again.

---

## How to Change or Remove Calibration

After calibrating, the calibration panel shows your current mm/pixel value and
two buttons.

### To recalibrate with a different reference:

1. Click the **"Recalibrate"** button.
2. The blue calibration box reappears (back to Step 3).
3. Mark two new points, type the new distance, and click **Confirm**.

### To remove calibration entirely:

1. Click the **"Remove"** button (red text).
2. The calibration is cleared.
3. The app goes back to showing **percentages only** — no mm values.

### To cancel mid-calibration:

1. If you started calibrating but changed your mind, click the **"Cancel"**
   button (grey outline) in the blue box.
2. Any points you marked are discarded. Nothing changes.

---

## What You See With vs Without Calibration

| | Not Calibrated | Calibrated |
|---|---|---|
| Right side length | Percentage only | **mm** and percentage |
| Left side length | Percentage only | **mm** and percentage |
| Side-to-side difference | Percentage only | **mm** and percentage |
| Overall conclusion | Not shown | **Shown** (uses mm values) |
| Asymmetry index & dominant side | Shown | Shown |

---

## Things to Keep in Mind

- **Calibration is an estimate.** Panoramic x-rays have varying magnification
  across the image, so mm values are approximate — not exact.
- **Pick a reference close to what you're measuring.** If you're measuring
  ramus height, a reference object in the back of the mouth is better than one
  in the front.
- **Recalibrate for each new x-ray.** The scale from one image does not apply
  to another.
- **For precise mm measurements, use CBCT or 3D imaging.** This app's mm
  values support comparison, not surgical planning.

---

*This guide covers the calibration feature of the Mandibular Asymmetry
Analysis application. For landmark placement or measurement interpretation,
refer to their respective guides.*