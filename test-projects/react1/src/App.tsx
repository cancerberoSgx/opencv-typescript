import { useEffect, useRef, useState } from "react";
import type { Mat } from "opencv-ts";
import { useOpenCv } from "./opencv/useOpenCv";
import { blur, cannyEdges, sobelEdges, toGrayscale } from "./opencv/operations";

const CANVAS_WIDTH = 480;
const CANVAS_HEIGHT = 360;

type OperationKey = "original" | "grayscale" | "blur" | "canny" | "sobel";

const OPERATIONS: ReadonlyArray<{ key: OperationKey; label: string }> = [
  { key: "original", label: "Original" },
  { key: "grayscale", label: "Grayscale" },
  { key: "blur", label: "Gaussian blur" },
  { key: "canny", label: "Canny edges" },
  { key: "sobel", label: "Sobel" },
];

/** Draws a small synthetic scene so the demo needs no external image asset. */
function drawSampleScene(ctx: CanvasRenderingContext2D): void {
  const gradient = ctx.createLinearGradient(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  gradient.addColorStop(0, "#1e3a8a");
  gradient.addColorStop(1, "#f97316");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(140, 130, 70, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "#111827";
  ctx.lineWidth = 6;
  ctx.strokeRect(260, 60, 160, 120);

  ctx.fillStyle = "#22c55e";
  ctx.beginPath();
  ctx.moveTo(340, 220);
  ctx.lineTo(420, 320);
  ctx.lineTo(260, 320);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "#111827";
  ctx.font = "bold 28px sans-serif";
  ctx.fillText("opencv-ts", 30, 330);
}

function runOperation(key: OperationKey, src: Mat): Mat | null {
  switch (key) {
    case "original":
      return null;
    case "grayscale":
      return toGrayscale(src);
    case "blur":
      return blur(src);
    case "canny":
      return cannyEdges(src);
    case "sobel":
      return sobelEdges(src);
  }
}

function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const originalImageData = useRef<ImageData | null>(null);
  const { status, error } = useOpenCv();
  const [active, setActive] = useState<OperationKey>("original");
  const [opError, setOpError] = useState<string | null>(null);

  useEffect(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    drawSampleScene(ctx);
    originalImageData.current = ctx.getImageData(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  }, []);

  const handleClick = (key: OperationKey) => {
    const canvas = canvasRef.current;
    const original = originalImageData.current;
    if (!canvas || !original) return;

    setActive(key);
    setOpError(null);

    if (key === "original") {
      canvas.getContext("2d")?.putImageData(original, 0, 0);
      return;
    }

    let src: Mat | null = null;
    let dst: Mat | null = null;
    try {
      src = cv.matFromImageData(original);
      dst = runOperation(key, src);
      if (dst) cv.imshow(canvas, dst);
    } catch (err) {
      setOpError(err instanceof Error ? err.message : String(err));
    } finally {
      src?.delete();
      dst?.delete();
    }
  };

  return (
    <main className="app">
      <h1>opencv-ts smoke test</h1>
      <p className="subtitle">
        Vite + React + TypeScript loading a local <code>opencv.js</code> build, typed via{" "}
        <code>opencv-ts</code>.
      </p>

      <p className="status" data-status={status}>
        opencv.js status: <strong>{status}</strong>
        {error && <span className="error"> — {error}</span>}
      </p>

      <canvas ref={canvasRef} width={CANVAS_WIDTH} height={CANVAS_HEIGHT} />

      <div className="buttons">
        {OPERATIONS.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            disabled={status !== "ready"}
            className={active === key ? "active" : ""}
            onClick={() => handleClick(key)}
          >
            {label}
          </button>
        ))}
      </div>

      {opError && <p className="error">{opError}</p>}
    </main>
  );
}

export default App;
