# How to Place Landmarks & Calibration Dots (User Guide)

This guide provides step-by-step instructions on identifying and placing the 5 anatomical landmarks and 2 calibration reference points on panoramic radiographs (OPG).

---

## 1. Overview of Landmarks & Orientation

> [!IMPORTANT]
> **Radiographic Orientation:** Panoramic radiographs are viewed as if facing the patient.
> - **Patient's Right (CoR, GoR):** Displayed on the **left side** of your screen (colored **Blue**).
> - **Patient's Left (CoL, GoL):** Displayed on the **right side** of your screen (colored **Green**).
> - **Menton (Me):** Located in the center midline (colored **Orange**).

```
   (Patient Right — Screen Left)                 (Patient Left — Screen Right)

               [CoR]                                         [CoL]
             (Condylion)                                   (Condylion)
                 \                                             /
                  \                                           /
                   \  (R Ramus)                   (L Ramus)  /
                    \                                       /
                     \                                     /
                    [GoR]                                [GoL]
                   (Gonion)                             (Gonion)
                       \                               /
                        \  (R Body)         (L Body)  /
                         \                           /
                          \_______   [Me]   ________/
                                   (Menton)
```

---

## 2. Anatomical Landmark Definitions & Placement

The application guides you through placing **5 landmarks** in sequence:

| Step | Dot / Landmark | Color | Anatomical Target | Identification & Placement Tips |
|:---:|---|:---:|---|---|
| **1** | **CoR**<br>*(Right Condylion)* | 🔵 **Blue** | Most superior point of the right condylar head | Locate the upper curved border of the right temporomandibular joint (TMJ) condyle. Place the dot on the **highest apex** of the condylar head. |
| **2** | **GoR**<br>*(Right Gonion)* | 🔵 **Blue** | Posterior-inferior point at the right mandibular angle | Look at the angle of the jaw where the vertical ramus meets the horizontal lower jaw border. Place the dot at the **outermost curvature/corner** (the intersection of the posterior and inferior tangents). |
| **3** | **CoL**<br>*(Left Condylion)* | 🟢 **Green** | Most superior point of the left condylar head | Same as CoR, but on the patient's left side (screen right). Place on the **highest apex** of the left condylar head. |
| **4** | **GoL**<br>*(Left Gonion)* | 🟢 **Green** | Posterior-inferior point at the left mandibular angle | Same as GoR, but on the patient's left side (screen right). Place on the **outermost curvature/corner** of the left mandibular angle. |
| **5** | **Me**<br>*(Menton)* | 🟠 **Orange** | Most inferior point of the mandibular symphysis (chin) | Locate the lower border of the chin. Place the dot on the **lowest point of the midline mandibular symphysis** below the incisors. |

---

## 3. Calibration Reference Dots (P1 & P2)

*Calibration is optional. It converts measurements from normalized/pixel units into real-world millimeters ($\text{mm}$).*

```
       [P1] (Top endpoint of reference object, e.g., dental implant)
         |
         |  Known Real Distance (e.g., 10.0 mm)
         |
       [P2] (Bottom endpoint of reference object)
```

1. Click **"Calibrate image"** in the sidebar.
2. **Point 1 (P1):** Click the **top endpoint** of a known reference object (e.g. dental implant, radiographic calibration sphere, or scale bar).
3. Confirm P1 by clicking **"Confirm Point 1"** (or drag to adjust).
4. **Point 2 (P2):** Click the **bottom endpoint** of the reference object.
5. Confirm P2 by clicking **"Confirm Point 2"** (or drag to adjust).
6. **Enter Known Distance:** Type the real-world distance in millimeters (e.g., `10.0`) and click **"Apply calibration"**.

---

## 4. Canvas Tools & Controls

### Precision Zoom & Pan
- **Zoom:** Use the mouse wheel or click the **`+`** / **`-`** buttons in the toolbar (supports 50% to 800% zoom).
- **Pan:** Hold the **Spacebar and drag with the mouse**, or activate the **Hand (Pan)** tool.
- **Image Adjustments:** Use the **Brightness** and **Contrast** sliders to clarify bone boundaries and cortical margins.
- **Fit / Reset:** Press **`0`** to fit the image to the screen or **`R`** to reset zoom and pan.

### Adjusting & Moving Dots
- To adjust any placed landmark or calibration dot, **click and drag** the dot directly on the radiograph. Measurements recalculate in real time.

### Deleting Dots
- **Canvas Delete:** Hover over or click the small red **`×`** badge next to any landmark marker.
- **Sidebar Palette Delete:** Click the trash icon next to the landmark in the right-hand panel.

---

## 5. Clinical Pitfalls & Placement Tips

1. **Cervical Spine Ghost Shadow:** The cervical spine produces a vertical radiopaque band down the midline of panoramic radiographs. Ensure **Menton (Me)** is placed on the true inferior mandibular cortex, not on the spine artifact.
2. **Condylar Flattening / Remodeling:** In patients with degenerative TMJ disease or condylar remodeling, place **Condylion (Co)** on the highest visible osseous margin.
3. **Gonion Curvature:** If the mandibular angle is broadly rounded, visually construct tangents along the posterior edge of the ascending ramus and the inferior border of the mandibular body; place Gonion at the apex of the curvature between them.
