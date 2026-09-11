import { useMemo, useState } from "react";
import { useOpenCv } from "./opencv/useOpenCv";
import { Sidebar } from "./components/Sidebar";
import { ExampleView } from "./components/ExampleView";
import { CATEGORIES, EXAMPLES, groupByCategory } from "./examples";

function App() {
  const { status, error } = useOpenCv("/opencv.js");
  const [activeId, setActiveId] = useState(EXAMPLES[0].id);
  const examplesByCategory = useMemo(() => groupByCategory(EXAMPLES), []);
  const activeExample = EXAMPLES.find((e) => e.id === activeId) ?? EXAMPLES[0];

  return (
    <div className="layout">
      <Sidebar
        categories={CATEGORIES}
        examplesByCategory={examplesByCategory}
        activeId={activeExample.id}
        onSelect={setActiveId}
      />
      <main className="main">
        <p className="status" data-status={status}>
          opencv.js: <strong>{status}</strong>
          {error && <span className="error"> — {error}</span>}
        </p>
        {/* Keyed by example id so switching examples remounts fresh state instead of
            reconciling old params/interaction against a differently-shaped example. */}
        <ExampleView key={activeExample.id} example={activeExample} cvReady={status === "ready"} />
      </main>
    </div>
  );
}

export default App;
