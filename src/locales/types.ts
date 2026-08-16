// ── Internationalization Types ────────────────────────────────
// Type definitions for multi-language support (English & Russian).

export type Locale = "en" | "ru";

export interface LandmarkTranslation {
  label: string;
  fullName: string;
  hint: string;
}

export interface Translations {
  common: {
    appName: string;
    appSubtitle: string;
    uploadToBegin: string;
    loading: string;
    ok: string;
    cancel: string;
    delete: string;
    back: string;
    right: string;
    left: string;
    mm: string;
    uncalibratedUnit: string;
    absDiff: string;
    relativeDifference: string;
    habetsIndex: string;
    largerSide: string;
    sideRight: string;
    sideLeft: string;
    sideEqual: string;
    notClassified: string;
    close: string;
  };
  imageQuality: {
    title: string;
    loadedText: (width: number, height: number) => string;
    lowResWarning: string;
    highResWarning: string;
  };
  upload: {
    dragDropTitle: string;
    dragDropSubtitle: string;
    supportedFormats: string;
    invalidImageError: string;
    imageTooLargeError: string;
    imageLoadError: string;
    fileReadError: string;
  };
  viewer: {
    zoomIn: string;
    zoomOut: string;
    fitScreen: string;
    resetView: string;
    panTool: string;
    showOverlay: string;
    hideOverlay: string;
    brightness: string;
    contrast: string;
    deleteLandmark: string;
  };
  landmarks: {
    title: string;
    placedCount: (count: number) => string;
    allPlaced: string;
    stepOf: (step: number) => string;
    clickToPlace: string;
    placing: (name: string) => string;
    clickOnRadiograph: string;
    cancelEsc: string;
    definitions: Record<"CoR" | "GoR" | "CoL" | "GoL" | "Me", LandmarkTranslation>;
  };
  overlay: {
    ramusR: string;
    ramusL: string;
    bodyR: string;
    bodyL: string;
    calibrationRequired: string;
    calibratedDistance: (mm: string) => string;
  };
  calibration: {
    title: string;
    calibrateImage: string;
    recalibrate: string;
    removeCalibration: string;
    cancelCalibration: string;
    back: string;
    step1Title: string;
    step1Desc: string;
    step1Review: string;
    step1ReviewDesc: string;
    confirmPoint1: string;
    replacePoint1: string;
    step2Title: string;
    step2Desc: string;
    step2Review: string;
    step2ReviewDesc: string;
    confirmPoint2: string;
    replacePoint2: string;
    step3Title: string;
    step3Desc: string;
    knownDistanceMm: string;
    applyCalibration: string;
    calibratedBanner: (scale: string) => string;
    calibratedDesc: string;
    calReqTitle: string;
    calReqDesc: string;
    invalidDistanceError: string;
    pointsTooCloseError: (px: number, min: number) => string;
    unreasonableScaleError: (scale: string) => string;
    point1: string;
    point2: string;
  };
  results: {
    title: string;
    placeAllToSee: string;
    ramusTitle: string;
    bodyTitle: string;
    conclusion: string;
    clinicalInterpretation: string;
    habetsNoticeTitle: string;
    habetsNoticeText: string;
    approximateValuesTitle: string;
    approximateValuesText: string;
    reference6Title: string;
    reference6Text: string;
    thresholdDisclaimerTitle: string;
    thresholdDisclaimerText: string;
    bodyReliabilityWarning: string;
    medicalDisclaimerTitle: string;
    medicalDisclaimerText: string;
  };
  warnings: {
    title: string;
    disclaimer: string;
    coBelowGoR: string;
    coBelowGoL: string;
    mentonOutside: string;
    sameLocation: (name1: string, name2: string) => string;
    ramusZeroR: string;
    ramusZeroL: string;
    bodyZeroR: string;
    bodyZeroL: string;
    lrReversed: string;
    outsideBounds: (name: string) => string;
  };
  studyManager: {
    saveStudy: string;
    newStudy: string;
    saved: string;
    unsavedChanges: string;
    noStudy: string;
    patientIdPlaceholder: string;
    patient: string;
    unassigned: string;
    savedStudiesCount: (count: number) => string;
    deleteStudyConfirm: string;
    discardStudyConfirm: string;
    localPersistenceNote: string;
    loadFailedError: string;
    loadingStudy: string;
  };
  report: {
    exportButton: string;
    printButton: string;
    modalTitle: string;
    reportTitle: string;
    reportSubtitle: string;
    patientId: string;
    studyDate: string;
    calibrationStatus: string;
    calibratedValue: (scale: string) => string;
    uncalibratedValue: string;
    overlayTitle: string;
    tableTitle: string;
    colMeasurement: string;
    colRight: string;
    colLeft: string;
    colAbsDiff: string;
    colRelDiff: string;
    colHabetsIndex: string;
    conclusionTitle: string;
    disclaimerTitle: string;
    disclaimerBody: string;
    pageIndicator: string;
  };
}
