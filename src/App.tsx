import { useEffect } from "react";
import { AnalysisPage } from "./pages/AnalysisPage";
import { useStudyStore } from "./store/studyStore";

export default function App() {
  // Auto-load the last active study on mount.
  // The store also calls loadCurrentStudy() at module-load time,
  // but this useEffect ensures it runs on every React mount (e.g. HMR)
  // and is idempotent if the study is already loaded.
  const loadCurrentStudy = useStudyStore((s) => s.loadCurrentStudy);
  const studyId = useStudyStore((s) => s.studyId);
  useEffect(() => {
    if (!studyId) {
      loadCurrentStudy();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <AnalysisPage />;
}