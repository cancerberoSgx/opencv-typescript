import { useEffect, useMemo, useRef, useState } from "react";
import { CodeEditor, type CodeEditorHandle } from "./components/CodeEditor";
import { runExample } from "./editor/runExample";
import { examples } from "./examples/manifest";
import { installPlaygroundGlobals } from "./opencv/playgroundHelpers";
import { useOpenCv } from "./opencv/useOpenCv";

const CANVAS_WIDTH = 480;
const CANVAS_HEIGHT = 360;

/** Runs `fn` with `console.log/warn/error` temporarily redirected into `onLine` as well as
 * their normal destination - several examples log intermediate results (see
 * contourFunctionsShape.example.ts), and surfacing those in the UI is more useful for a
 * playground than leaving them only in the browser devtools console. */
async function withCapturedConsole(onLine: (line: string) => void, fn: () => Promise<void>) {
  const original = { log: console.log, warn: console.warn, error: console.error };
  const capture =
    (prefix: string, real: (...args: unknown[]) => void) =>
    (...args: unknown[]) => {
      real(...args);
      onLine(`${prefix}${args.map((a) => (typeof a === "string" ? a : JSON.stringify(a))).join(" ")}`);
    };
  console.log = capture("", original.log);
  console.warn = capture("⚠ ", original.warn);
  console.error = capture("✗ ", original.error);
  try {
    await fn();
  } finally {
    Object.assign(console, original);
  }
}

function App() {
  const { status, error } = useOpenCv();
  const [exampleId, setExampleId] = useState(examples[0].id);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; timeMs: number; error?: string } | null>(null);
  const [log, setLog] = useState<string[]>([]);
  const editorRef = useRef<CodeEditorHandle>(null);

  useEffect(() => {
    if (status === "ready") installPlaygroundGlobals();
  }, [status]);

  const example = useMemo(
    () => examples.find((e) => e.id === exampleId) ?? examples[0],
    [exampleId],
  );

  const handleRun = async () => {
    const source = editorRef.current?.getValue() ?? example.source;
    setRunning(true);
    setResult(null);
    setLog([]);
    const ctx = document.getElementById("outputCanvas") as HTMLCanvasElement | null;
    ctx?.getContext("2d")?.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    let r!: Awaited<ReturnType<typeof runExample>>;
    await withCapturedConsole(
      (line) => setLog((prev) => [...prev, line]),
      async () => {
        // See runExample's doc comment: examples are fire-and-forget IIFEs, so a failure
        // after their first `await` surfaces here, not in `r`/the returned promise.
        r = await runExample(source, (message) => setLog((prev) => [...prev, `✗ ${message}`]));
      },
    );
    setResult(r);
    setRunning(false);
  };

  return (
    <div className="app">
      <header className="topbar">
        <div className="titles">
          <h1>opencv-ts playground</h1>
          <p className="subtitle">
            A Monaco-editor gallery of OpenCV.js examples ported from{" "}
            <a href="https://github.com/cancerberoSgx/mirada" target="_blank" rel="noreferrer">
              mirada-ts-playground
            </a>
            , typechecked and autocompleted live against this repo&apos;s <code>opencv-ts</code>.
          </p>
        </div>
        <div className="controls">
          <label>
            Example{" "}
            <select value={exampleId} onChange={(e) => setExampleId(e.target.value)}>
              {examples.map((ex) => (
                <option key={ex.id} value={ex.id}>
                  {ex.title}
                </option>
              ))}
            </select>
          </label>
          <button onClick={() => void handleRun()} disabled={status !== "ready" || running}>
            {running ? "Running…" : "▶ Run"}
          </button>
          <button
            className="secondary"
            onClick={() => editorRef.current?.reset()}
            disabled={running}
            title="Discard edits, reload the original example source"
          >
            Reset
          </button>
        </div>
      </header>

      <p className="description">{example.description}</p>

      <p className="status" data-status={status}>
        opencv.js: <strong>{status}</strong>
        {error && <span className="error"> — {error}</span>}
      </p>

      <main className="grid">
        <div className="pane editor-pane">
          <CodeEditor ref={editorRef} exampleId={example.id} source={example.source} />
        </div>
        <div className="pane output-pane">
          <canvas id="outputCanvas" width={CANVAS_WIDTH} height={CANVAS_HEIGHT} />
          {/* Hidden by default - only examples using CameraHelper (see
              src/opencv/playgroundHelpers.ts) need it, none of the current gallery does. */}
          <video id="videoInput" width={320} height={240} muted className="hidden" />
          {result && (
            <p className={"result " + (result.ok ? "ok" : "error")}>
              {result.ok ? `✓ ran in ${result.timeMs.toFixed(0)}ms` : `✗ ${result.error}`}
            </p>
          )}
          {log.length > 0 && (
            <pre className="log">
              {log.join("\n")}
            </pre>
          )}
        </div>
      </main>
    </div>
  );
}

export default App;
