import { useEffect } from "react";
import { AnalysisPage } from "./pages/AnalysisPage";
import { initStudyStore } from "./store/studyStore";

export default function App() {
  useEffect(() => {
    initStudyStore();
  }, []);

  return <AnalysisPage />;
}