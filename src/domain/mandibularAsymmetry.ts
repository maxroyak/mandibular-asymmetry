// ── Mandibular Asymmetry Domain Module ───────────────────────
// Pure calculation functions ONLY. No React imports. No side effects.
// All clinical formulas per docs/clinical-protocol.md (OrthoBot, APPROVED).
// Evidence base: docs/clinical-evidence.md (ResearchBot, 40 references).

import type {
  Point,
  SideDifference,
  LargerSide,
  FullResults,
} from "./types";

// ── Helper ──────────────────────────────────────────────────

/**
 * Round a number to specified decimal places.
 * Exported for testability.
 */
export function round(value: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

// ── 7 Pure Domain Functions ─────────────────────────────────

/**
 * Euclidean distance between two normalized points.
 * @returns distance in normalized units (0.0–1.414, the diagonal of a unit square)
 */
export function calculateDistance(a: Point, b: Point): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Signed and absolute difference between right and left measurements.
 * @param right - right-side measurement value
 * @param left  - left-side measurement value
 * @returns { difference: R−L, absoluteDifference: |R−L| }
 */
export function calculateSideDifference(
  right: number,
  left: number
): SideDifference {
  return {
    difference: right - left,
    absoluteDifference: Math.abs(right - left),
  };
}

/**
 * Relative difference: |R−L| / max(R,L) × 100
 * Always positive. Rounded to 1 decimal place.
 * Represents the percentage by which the smaller side differs from the larger side.
 * @returns percentage (0% to 100%)
 */
export function calculateRelativeDifference(right: number, left: number): number {
  if (!Number.isFinite(right) || !Number.isFinite(left)) return 0;
  const maxVal = Math.max(right, left);
  if (maxVal === 0) return 0;
  const result = (Math.abs(right - left) / maxVal) * 100;
  return round(result, 1);
}

/**
 * Habets Asymmetry Index: |R−L| / (R+L) × 100
 * Absolute (unsigned) asymmetry percentage. Range: 0% to +100%.
 * Rounded to 1 decimal place.
 * @returns percentage (0% to +100%)
 */
export function calculateAsymmetryIndex(right: number, left: number): number {
  if (!Number.isFinite(right) || !Number.isFinite(left)) return 0;
  const sum = right + left;
  if (sum === 0) return 0;
  const result = (Math.abs(right - left) / sum) * 100;
  return round(result, 1);
}

/**
 * Determine which side is larger.
 * "equal" if relative difference ≤ 0.5%.
 * @returns "right" | "left" | "equal"
 */
export function determineLargerSide(right: number, left: number): LargerSide {
  const relDiff = calculateRelativeDifference(right, left);
  if (relDiff <= 0.5) return "equal";
  return right > left ? "right" : "left";
}

// NOTE: The classifyAsymmetry function and the 3-tier classification system
// (within_typical_range / borderline / above_technical_error_margin) have been
// REMOVED per PIBot threshold validation (docs/threshold-validation.md).
// The 3% threshold was derived from condylar height (Co-Sn), not Co-Go.
// The 6% threshold is a vertical magnification error margin, not a validated
// diagnostic boundary. Classification is now always null for all measurements.
// TIER_LABELS and TIER_GUIDANCE are retained as empty/deprecated stubs for
// backward compatibility with any code that may still import them.

/** @deprecated The 3-tier classification system has been removed. */
export const TIER_LABELS: Record<string, string> = {};

/** @deprecated The 3-tier classification system has been removed. */
export const TIER_GUIDANCE: Record<string, string> = {};

/** Label for unclassified measurements — shown instead of a tier badge */
export const UNCLASSIFIED_LABEL = "Not classified — no validated threshold";

// ── Calibration Pure Functions ──────────────────────────────

/**
 * Compute mm_per_pixel calibration factor.
 * mmPerPixel = realDistanceMm / pixelDistance
 * @param pixelDistance - distance between calibration points in image pixels
 * @param realDistanceMm - known real-world distance in mm
 * @returns mm per pixel factor
 */
export function computeMmPerPixel(
  pixelDistance: number,
  realDistanceMm: number
): number {
  if (pixelDistance === 0) return 0;
  return realDistanceMm / pixelDistance;
}

/**
 * Convert a normalized distance (0.0–1.0) to millimeters using calibration.
 * normalizedDistance → image pixels → mm
 * pixelDistance = normalizedDistance × max(imageWidth, imageHeight)
 * mmDistance = pixelDistance × mmPerPixel
 * @param normalizedDistance - distance in normalized units (0.0–1.0)
 * @param imageWidth - image width in pixels
 * @param imageHeight - image height in pixels
 * @param mmPerPixel - calibration factor
 * @returns distance in mm, rounded to 1 decimal place
 */
export function convertDistanceToMm(
  normalizedDistance: number,
  imageWidth: number,
  imageHeight: number,
  mmPerPixel: number
): number {
  const pixelDistance = normalizedDistance * Math.max(imageWidth, imageHeight);
  const mm = pixelDistance * mmPerPixel;
  // Store full floating-point precision — display layer uses toFixed(1)
  return mm;
}

// ── Bilateral mm Measurement Functions (Part 2) ────────────

/**
 * Signed difference between right and left measurements in mm.
 * Positive = right longer, negative = left longer.
 */
export function calculateDifferenceMm(rightMm: number, leftMm: number): number {
  return rightMm - leftMm;
}

/**
 * Determine which side is longer based on mm values.
 * Threshold: >0.5 mm difference → "right" or "left"; ≤0.5 mm → "equal".
 */
export function determineLongerSide(
  rightMm: number,
  leftMm: number
): "right" | "left" | "equal" {
  const diff = rightMm - leftMm;
  if (Math.abs(diff) <= 0.5) return "equal";
  return diff > 0 ? "right" : "left";
}

/**
 * Determine which side is shorter based on mm values.
 * Threshold: >0.5 mm difference → "right" or "left"; ≤0.5 mm → "equal".
 */
export function determineShorterSide(
  rightMm: number,
  leftMm: number
): "right" | "left" | "equal" {
  const diff = rightMm - leftMm;
  if (Math.abs(diff) <= 0.5) return "equal";
  return diff > 0 ? "left" : "right";
}

/**
 * Generate a side-to-side comparison sentence for the ramus.
 * Examples:
 *   "The right mandibular ramus is 2.0 mm longer than the left."
 *   "The left mandibular ramus is 3.0 mm shorter than the right."
 *   "Mandibular ramus lengths are approximately equal."
 */
export function generateRamusComparison(
  rightMm: number,
  leftMm: number,
  locale: "en" | "ru" = "en"
): string {
  const longer = determineLongerSide(rightMm, leftMm);
  if (longer === "equal") {
    return locale === "ru"
      ? "Длина ветвей нижней челюсти приблизительно симметрична."
      : "Mandibular ramus lengths are approximately equal.";
  }
  const absDiff = round(Math.abs(rightMm - leftMm), 1);
  if (longer === "right") {
    return locale === "ru"
      ? `Правая ветвь нижней челюсти на ${absDiff.toFixed(1)} мм длиннее левой.`
      : `The right mandibular ramus is ${absDiff.toFixed(1)} mm longer than the left.`;
  }
  return locale === "ru"
    ? `Левая ветвь нижней челюсти на ${absDiff.toFixed(1)} мм длиннее правой.`
    : `The left mandibular ramus is ${absDiff.toFixed(1)} mm longer than the right.`;
}

/**
 * Generate a side-to-side comparison sentence for the mandibular body.
 * Same pattern as ramus.
 */
export function generateBodyComparison(
  rightMm: number,
  leftMm: number,
  locale: "en" | "ru" = "en"
): string {
  const longer = determineLongerSide(rightMm, leftMm);
  if (longer === "equal") {
    return locale === "ru"
      ? "Длина тела нижней челюсти приблизительно симметрична."
      : "Mandibular body lengths are approximately equal.";
  }
  const absDiff = round(Math.abs(rightMm - leftMm), 1);
  if (longer === "right") {
    return locale === "ru"
      ? `Правая часть тела нижней челюсти на ${absDiff.toFixed(1)} мм длиннее левой.`
      : `The right mandibular body is ${absDiff.toFixed(1)} mm longer than the left.`;
  }
  return locale === "ru"
    ? `Левая часть тела нижней челюсти на ${absDiff.toFixed(1)} мм длиннее правой.`
    : `The left mandibular body is ${absDiff.toFixed(1)} mm longer than the right.`;
}

/**
 * Generate a structured clinical conclusion evaluating ramus and body independently.
 * Threshold for "differs": >0.5 mm.
 * CRITICAL: Evaluates each measurement independently — does NOT assume the same
 * side is larger in both. Never reverses right and left in the text.
 */
export function generateMandibularAsymmetryConclusion(
  ramusRightMm: number,
  ramusLeftMm: number,
  bodyRightMm: number,
  bodyLeftMm: number,
  locale: "en" | "ru" = "en"
): string {
  const ramusDiffers = Math.abs(ramusRightMm - ramusLeftMm) > 0.5;
  const bodyDiffers = Math.abs(bodyRightMm - bodyLeftMm) > 0.5;

  if (locale === "ru") {
    const buildRamusSentenceRu = (): string => {
      const longer = determineLongerSide(ramusRightMm, ramusLeftMm);
      if (longer === "equal") {
        return (
          `Ветвь справа составляет ${ramusRightMm.toFixed(1)} мм, ветвь слева — ` +
          `${ramusLeftMm.toFixed(1)} мм; длина ветвей приблизительно симметрична.`
        );
      }
      const absDiff = Math.abs(ramusRightMm - ramusLeftMm).toFixed(1);
      if (longer === "right") {
        return (
          `Ветвь справа составляет ${ramusRightMm.toFixed(1)} мм и на ${absDiff} мм ` +
          `длиннее ветви слева (${ramusLeftMm.toFixed(1)} мм).`
        );
      }
      return (
        `Ветвь слева составляет ${ramusLeftMm.toFixed(1)} мм и на ${absDiff} мм ` +
        `длиннее ветви справа (${ramusRightMm.toFixed(1)} мм).`
      );
    };

    const buildBodySentenceRu = (): string => {
      const longer = determineLongerSide(bodyRightMm, bodyLeftMm);
      if (longer === "equal") {
        return (
          `Тело челюсти слева составляет ${bodyLeftMm.toFixed(1)} мм, тело челюсти справа — ` +
          `${bodyRightMm.toFixed(1)} мм; длина тела челюсти приблизительно симметрична.`
        );
      }
      const absDiff = Math.abs(bodyRightMm - bodyLeftMm).toFixed(1);
      if (longer === "right") {
        return (
          `Тело челюсти справа составляет ${bodyRightMm.toFixed(1)} мм и на ${absDiff} мм ` +
          `длиннее тела челюсти слева (${bodyLeftMm.toFixed(1)} мм).`
        );
      }
      return (
        `Тело челюсти слева составляет ${bodyLeftMm.toFixed(1)} мм и на ${absDiff} мм ` +
        `длиннее тела челюсти справа (${bodyRightMm.toFixed(1)} мм).`
      );
    };

    const ramusSentence = buildRamusSentenceRu();
    const bodySentence = buildBodySentenceRu();

    if (ramusDiffers && bodyDiffers) {
      return (
        "Текущие 2D измерения демонстрируют скелетную асимметрию нижней челюсти " +
        "с вовлечением как ветви, так и тела челюсти. " +
        ramusSentence +
        " " +
        bodySentence
      );
    }

    if (ramusDiffers && !bodyDiffers) {
      return (
        "Текущие 2D измерения демонстрируют преимущественно асимметрию ветви нижней челюсти. " +
        ramusSentence +
        " " +
        bodySentence.replace(/; длина тела челюсти\s+приблизительно симметрична\.$/, ".") +
        " Длина тела челюсти приблизительно симметрична в текущей проекции."
      );
    }

    if (!ramusDiffers && bodyDiffers) {
      return (
        "Текущие 2D измерения демонстрируют преимущественно асимметрию тела нижней челюсти. " +
        bodySentence +
        " " +
        ramusSentence.replace(/; длина ветвей\s+приблизительно симметрична\.$/, ".") +
        " Длина ветвей приблизительно симметрична в текущей проекции."
      );
    }

    return (
      "Текущие 2D измерения не демонстрируют выраженной скелетной асимметрии нижней челюсти. " +
      ramusSentence.replace(/; длина ветвей приблизительно симметрична\.$/, ".") +
      " " +
      bodySentence.replace(/; длина тела челюсти приблизительно симметрична\.$/, ".") +
      " Длина ветвей и тела челюсти приблизительно симметрична в текущей проекции."
    );
  }

  // Build comparison sentences that include actual measured mm values (English).
  function buildRamusSentence(): string {
    const longer = determineLongerSide(ramusRightMm, ramusLeftMm);
    if (longer === "equal") {
      return (
        `The right ramus measures ${ramusRightMm.toFixed(1)} mm and the left ramus ` +
        `measures ${ramusLeftMm.toFixed(1)} mm; ramus lengths are approximately equal.`
      );
    }
    const absDiff = Math.abs(ramusRightMm - ramusLeftMm).toFixed(1);
    if (longer === "right") {
      return (
        `The right ramus measures ${ramusRightMm.toFixed(1)} mm and is ${absDiff} mm ` +
        `longer than the left ramus, which measures ${ramusLeftMm.toFixed(1)} mm.`
      );
    }
    return (
      `The left ramus measures ${ramusLeftMm.toFixed(1)} mm and is ${absDiff} mm ` +
      `longer than the right ramus, which measures ${ramusRightMm.toFixed(1)} mm.`
    );
  }

  function buildBodySentence(): string {
    const longer = determineLongerSide(bodyRightMm, bodyLeftMm);
    if (longer === "equal") {
      return (
        `The left mandibular body measures ${bodyLeftMm.toFixed(1)} mm and the right ` +
        `mandibular body measures ${bodyRightMm.toFixed(1)} mm; mandibular body lengths ` +
        `are approximately equal.`
      );
    }
    const absDiff = Math.abs(bodyRightMm - bodyLeftMm).toFixed(1);
    if (longer === "right") {
      return (
        `The right mandibular body measures ${bodyRightMm.toFixed(1)} mm and is ${absDiff} mm ` +
        `longer than the left mandibular body, which measures ${bodyLeftMm.toFixed(1)} mm.`
      );
    }
    return (
      `The left mandibular body measures ${bodyLeftMm.toFixed(1)} mm and is ${absDiff} mm ` +
      `longer than the right mandibular body, which measures ${bodyRightMm.toFixed(1)} mm.`
    );
  }

  const ramusSentence = buildRamusSentence();
  const bodySentence = buildBodySentence();

  if (ramusDiffers && bodyDiffers) {
    return (
      "The current 2D measurements demonstrate mandibular skeletal asymmetry " +
      "involving both the ramus and mandibular body. " +
      ramusSentence +
      " " +
      bodySentence
    );
  }

  if (ramusDiffers && !bodyDiffers) {
    return (
      "The current 2D measurements demonstrate predominantly ramus asymmetry. " +
      ramusSentence +
      " " +
      bodySentence.replace(/; mandibular body lengths\s+are approximately equal\.$/, ".") +
      " Mandibular body lengths are approximately equal in the current projection."
    );
  }

  if (!ramusDiffers && bodyDiffers) {
    return (
      "The current 2D measurements demonstrate predominantly mandibular body asymmetry. " +
      bodySentence +
      " " +
      ramusSentence.replace(/; ramus lengths are approximately equal\.$/, ".") +
      " Ramus lengths are approximately equal in the current projection."
    );
  }

  return (
    "The current 2D measurements do not demonstrate significant mandibular " +
    "skeletal asymmetry. " +
    ramusSentence.replace(/; ramus lengths are approximately equal\.$/, ".") +
    " " +
    bodySentence.replace(/; mandibular body lengths are approximately equal\.$/, ".") +
    " Ramus and mandibular body lengths are approximately equal in the current projection."
  );
}

// ── Tier Labels and Guidance (DEPRECATED) ───────────────────
// The 3-tier classification system has been removed per PIBot threshold
// validation. See note above. TIER_LABELS and TIER_GUIDANCE are empty stubs.

// ── Mandatory Limitation Statements ─────────────────────────

export const LIMITATION_HEADER =
  "CLINICAL MEASUREMENT REPORT — MANDIBULAR ASYMMETRY ANALYSIS\n\n" +
  "⚠ This is a measurement and comparative analysis tool, not a diagnostic system.\n" +
  "Results are derived from a 2D projection of 3D anatomy and must be interpreted\n" +
  "in the context of clinical examination and adjunct imaging.\n\n" +
  "This MVP performs a simplified landmark-based mandibular asymmetry analysis and\n" +
  "uses the Habets normalization formula. It does not reproduce the complete\n" +
  "original Habets tracing protocol.";

export const LIMITATION_HEADER_RU =
  "ОТЧЕТ КЛИНИЧЕСКИХ ИЗМЕРЕНИЙ — АНАЛИЗ АСИММЕТРИИ НИЖНЕЙ ЧЕЛЮСТИ\n\n" +
  "⚠ Данный инструмент предназначен для сравнительного анализа и не является диагностической системой.\n" +
  "Результаты получены на основе 2D проекции 3D анатомии и должны интерпретироваться\n" +
  "в контексте клинического осмотра и дополнительных методов лучевой диагностики.\n\n" +
  "В данном приложении выполняется упрощенный точечный анализ асимметрии нижней челюсти\n" +
  "с использованием формулы нормализации Хабетса. Полный протокол ручной графической\n" +
  "разметки Хабетса не воспроизводится.";

export const LIMITATION_FOOTER =
  "LIMITATIONS\n\n" +
  "1. 2D PROJECTION: Measurements are derived from a 2D projection of 3D anatomy.\n" +
  "   Panoramic radiographs have inherent magnification and distortion that may\n" +
  "   affect measurement accuracy.\n\n" +
  "2. POSITIONING SENSITIVITY: Measurements are sensitive to patient head positioning\n" +
  "   during image acquisition. Head rotation may create apparent asymmetry that does\n" +
  "   not reflect true anatomy.\n\n" +
  "3. LANDMARK IDENTIFICATION: Measurements depend on manual landmark placement and\n" +
  "   are subject to inter-observer variability, particularly for condylion (Co)\n" +
  "   identification.\n\n" +
  "4. NOT DIAGNOSTIC: This is a measurement and comparative analysis tool, not a\n" +
  "   diagnostic system. Results must be interpreted in the context of clinical\n" +
  "   examination and adjunct imaging.\n\n" +
  "5. THRESHOLD CAVEAT: Threshold values are based on published literature and the\n" +
  "   known technical error margin of panoramic radiography (Habets et al. 1987),\n" +
  "   not on validated clinical outcomes. Apparent asymmetry may reflect technical\n" +
  "   factors rather than true anatomical asymmetry.\n\n" +
  "6. HORIZONTAL MEASUREMENT CAVEAT: Mandibular body length measurements use horizontal\n" +
  "   distances, which are less reliable on panoramic radiographs than vertical\n" +
  "   measurements. Body length results should be interpreted with particular caution.";

export const LIMITATION_FOOTER_RU =
  "ОГРАНИЧЕНИЯ МЕТОДА\n\n" +
  "1. 2D ПРОЕКЦИЯ: Измерения получены из 2D проекции трехмерной анатомии.\n" +
  "   Панорамные рентгенограммы имеют неравномерное увеличение и проекционные искажения.\n\n" +
  "2. ЧУВСТВИТЕЛЬНОСТЬ К УКЛАДКЕ: Измерения чувствительны к положению головы пациента.\n" +
  "   Ротация головы может создавать видимость асимметрии при ее фактическом отсутствии.\n\n" +
  "3. ИДЕНТИФИКАЦИЯ ТОЧЕК: Точность зависит от ручной расстановки анатомических ориентиров,\n" +
  "   особенно при локализации суставных головок (Co).\n\n" +
  "4. НЕ ЯВЛЯЕТСЯ ДИАГНОЗОМ: Инструмент предназначен только для сравнительных измерений.\n" +
  "   Результаты оцениваются врачом в сочетании с клинической картиной и КЛКТ.\n\n" +
  "5. ПОРОГОВЫЕ ЗНАЧЕНИЯ: Пороги отражают техническую погрешность панорамной рентгенографии\n" +
  "   (Habets et al. 1987), а не валидированные диагностические критерии патологии.\n\n" +
  "6. ГОРИЗОНТАЛЬНЫЕ ИЗМЕРЕНИЯ: Измерения длины тела челюсти менее надежны из-за\n" +
  "   неравномерного горизонтального увеличения.";

// ── Clinical Summary Generation ─────────────────────────────

/**
 * Generate the full structured clinical summary text.
 * Includes: limitation header, ramus analysis, body analysis,
 * absolute measurements (if calibrated), mandatory limitations footer.
 * Per protocol §8.1 template.
 * @param results - full results object
 * @param locale - language ("en" | "ru")
 * @returns structured clinical text per protocol §8.1
 */
export function generateClinicalSummary(
  results: FullResults,
  locale: "en" | "ru" = "en"
): string {
  const { ramusHeight, bodyLength, calibration, calibrationMode } = results;

  const lines: string[] = [];
  lines.push(locale === "ru" ? LIMITATION_HEADER_RU : LIMITATION_HEADER);
  lines.push("");

  if (locale === "ru") {
    // ── Анализ ветви ──
    lines.push("ОЦЕНКА ДЛИНЫ ВЕТВИ ЧЕЛЮСТИ (Основное измерение)");
    lines.push("");

    if (ramusHeight) {
      const rh = ramusHeight;
      const relDiffStr = rh.relativeDifferencePercent.toFixed(1);
      const habetsStr = rh.asymmetryIndexPercent.toFixed(1);

      if (rh.largerSide === "equal") {
        lines.push("На данном снимке высота ветви справа и слева приблизительно одинакова.");
      } else if (rh.largerSide === "right") {
        lines.push(`На данном снимке высота ветви справа на ${relDiffStr}% больше, чем слева.`);
      } else {
        lines.push(`На данном снимке высота ветви слева на ${relDiffStr}% больше, чем справа.`);
      }

      lines.push("");
      lines.push(`Индекс асимметрии Хабетса: ${habetsStr}% (${rh.largerSide === "equal" ? "симметрично" : rh.largerSide === "right" ? "справа больше" : "слева больше"})`);
      lines.push(`Относительная разница: ${relDiffStr}%`);
      lines.push(`Градация: ${UNCLASSIFIED_LABEL}`);
      lines.push("");
      lines.push("Для данного измерения отсутствуют валидированные классификационные пороги.");
      lines.push("Числовые значения предназначены исключительно для сравнительного скрининга.");
    } else {
      lines.push("Точки не расставлены — измерение недоступно.");
    }

    lines.push("");

    // ── Анализ тела ──
    lines.push("ОЦЕНКА ДЛИНЫ ТЕЛА ЧЕЛЮСТИ (Вторичное измерение — меньшая надежность)");
    lines.push("⚠ Горизонтальные измерения менее надежны из-за переменного горизонтального увеличения.");
    lines.push("");

    if (bodyLength) {
      const bl = bodyLength;
      const relDiffStr = bl.relativeDifferencePercent.toFixed(1);
      const habetsStr = bl.asymmetryIndexPercent.toFixed(1);

      if (bl.largerSide === "equal") {
        lines.push("Длина тела нижней челюсти справа и слева приблизительно одинакова.");
      } else if (bl.largerSide === "right") {
        lines.push(`Длина тела нижней челюсти справа на ${relDiffStr}% больше, чем слева.`);
      } else {
        lines.push(`Длина тела нижней челюсти слева на ${relDiffStr}% больше, чем справа.`);
      }

      lines.push("");
      lines.push(`Индекс асимметрии Хабетса: ${habetsStr}% (${bl.largerSide === "equal" ? "симметрично" : bl.largerSide === "right" ? "справа больше" : "слева больше"})`);
      lines.push(`Относительная разница: ${relDiffStr}%`);
      lines.push(`Градация: ${UNCLASSIFIED_LABEL}`);
    } else {
      lines.push("Точки не расставлены — измерение недоступно.");
    }

    lines.push("");

    // ── Калибровка ──
    if (calibrationMode === "B" && calibration) {
      lines.push("Абсолютные измерения (калиброванные):");
      if (ramusHeight && ramusHeight.rightMm !== null && ramusHeight.leftMm !== null) {
        lines.push(`  Высота ветви справа: ${ramusHeight.rightMm.toFixed(1)} мм`);
        lines.push(`  Высота ветви слева: ${ramusHeight.leftMm.toFixed(1)} мм`);
      }
      if (bodyLength && bodyLength.rightMm !== null && bodyLength.leftMm !== null) {
        lines.push(`  Длина тела справа: ${bodyLength.rightMm.toFixed(1)} мм`);
        lines.push(`  Длина тела слева: ${bodyLength.leftMm.toFixed(1)} мм`);
      }
      lines.push(`  Масштаб калибровки: ${calibration.mmPerPixel.toFixed(4)} мм/пиксель`);
      lines.push("");
      lines.push("Значения в мм рассчитаны на основе пользовательской калибровки и подвержены проекционным искажениям.");
    } else {
      lines.push("Калибровка не выполнена — абсолютные измерения в мм не отображаются.");
      lines.push("Доступны относительные проценты асимметрии.");
    }

    lines.push("");
    lines.push(LIMITATION_FOOTER_RU);
    return lines.join("\n");
  }

  // ── Ramus Length Proxy Analysis (English) ──
  lines.push("RAMUS LENGTH PROXY ANALYSIS (Primary Measurement)");
  lines.push("");

  if (ramusHeight) {
    const rh = ramusHeight;
    const relDiffStr = rh.relativeDifferencePercent.toFixed(1);
    const habetsStr = rh.asymmetryIndexPercent.toFixed(1);

    if (rh.largerSide === "equal") {
      lines.push("On this panoramic radiograph, the right and left ramus heights are approximately equal.");
    } else if (rh.largerSide === "right") {
      lines.push(`On this panoramic radiograph, the right ramus height is ${relDiffStr}% greater than the left.`);
    } else {
      lines.push(`On this panoramic radiograph, the left ramus height is ${relDiffStr}% greater than the right.`);
    }

    lines.push("");
    lines.push(`Habets Asymmetry Index: ${habetsStr}% (${rh.largerSide === "equal" ? "equal" : rh.largerSide + " larger"})`);
    lines.push(`Relative Difference: ${relDiffStr}%`);
    lines.push(`Classification: ${UNCLASSIFIED_LABEL}`);
    lines.push("");
    lines.push("No validated classification thresholds exist for this measurement.");
    lines.push("The 3% and 6% thresholds commonly cited were derived from the original");
    lines.push("Habets tracing method using vertical height measurements with segmental");
    lines.push("decomposition. This tool uses a simplified Co-Go Euclidean distance.");
    lines.push("Numerical values are for comparative screening only.");
  } else {
    lines.push("Landmarks incomplete — measurement not available.");
  }

  lines.push("");

  // ── Body Length Proxy Analysis ──
  lines.push("MANDIBULAR BODY LENGTH PROXY ANALYSIS (Secondary Measurement — Lower Reliability)");
  lines.push("⚠ Horizontal measurements on panoramic radiographs are less reliable than vertical");
  lines.push("measurements due to variable horizontal magnification. Interpret with caution.");
  lines.push("");

  if (bodyLength) {
    const bl = bodyLength;
    const relDiffStr = bl.relativeDifferencePercent.toFixed(1);
    const habetsStr = bl.asymmetryIndexPercent.toFixed(1);

    if (bl.largerSide === "equal") {
      lines.push("The right and left mandibular body lengths are approximately equal.");
    } else if (bl.largerSide === "right") {
      lines.push(`The right mandibular body length is ${relDiffStr}% greater than the left.`);
    } else {
      lines.push(`The left mandibular body length is ${relDiffStr}% greater than the right.`);
    }

    lines.push("");
    lines.push(`Habets Asymmetry Index: ${habetsStr}% (${bl.largerSide === "equal" ? "equal" : bl.largerSide + " larger"})`);
    lines.push(`Relative Difference: ${relDiffStr}%`);
    lines.push(`Classification: ${UNCLASSIFIED_LABEL}`);
    lines.push("Thresholds are based on vertical measurement data and are not applied");
    lines.push("to horizontal (body length) measurements.");
  } else {
    lines.push("Landmarks incomplete — measurement not available.");
  }

  lines.push("");

  // ── Calibration Display ──
  if (calibrationMode === "B" && calibration) {
    lines.push("Absolute measurements (estimated):");
    if (ramusHeight && ramusHeight.rightMm !== null && ramusHeight.leftMm !== null) {
      lines.push(`  Right ramus height: ${ramusHeight.rightMm.toFixed(1)} mm`);
      lines.push(`  Left ramus height: ${ramusHeight.leftMm.toFixed(1)} mm`);
    }
    if (bodyLength && bodyLength.rightMm !== null && bodyLength.leftMm !== null) {
      lines.push(`  Right body length: ${bodyLength.rightMm.toFixed(1)} mm`);
      lines.push(`  Left body length: ${bodyLength.leftMm.toFixed(1)} mm`);
    }
    lines.push(`  Calibration factor: ${calibration.mmPerPixel.toFixed(4)} mm/pixel`);
    lines.push("");
    lines.push("Measurements in mm are estimated based on user-provided calibration and are subject to panoramic magnification effects.");
  } else {
    lines.push("Calibration not performed — absolute measurements in mm are not displayed.");
    lines.push("Relative asymmetry percentages are available.");
  }

  lines.push("");
  lines.push(LIMITATION_FOOTER);

  return lines.join("\n");
}