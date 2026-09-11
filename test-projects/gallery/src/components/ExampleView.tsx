import { useEffect, useRef, useState } from "react";
import type { Mat } from "opencv-ts";
import type { ExampleDef, Interaction, Params, ParamValue } from "../lib/types";
import { defaultParams } from "../lib/types";
import { CANVAS_HEIGHT, CANVAS_WIDTH, SOURCE_SCENES } from "../lib/sources";
import { ControlsPanel } from "./ControlsPanel";
import { SourcePicker } from "./SourcePicker";
import { InteractionOverlay } from "./InteractionOverlay";
import { CodePanel } from "./CodePanel";

interface ExampleViewProps {
  example: ExampleDef;
  cvReady: boolean;
}

export function ExampleView({ example, cvReady }: ExampleViewProps) {
  const sourceCanvasRef = useRef<HTMLCanvasElement>(null);
  const resultCanvasRef = useRef<HTMLCanvasElement>(null);

  const [sceneId, setSceneId] = useState(example.defaultSourceId ?? SOURCE_SCENES[0].id);
  const [uploadedImage, setUploadedImage] = useState<HTMLImageElement | null>(null);
  const [sourceImageData, setSourceImageData] = useState<ImageData | null>(null);
  const [params, setParams] = useState<Params>(() => defaultParams(example.controls));
  const [interaction, setInteraction] = useState<Interaction>({});
  const [error, setError] = useState<string | null>(null);

  // Draw the chosen source (built-in scene or uploaded image) onto the source canvas.
  useEffect(() => {
    const canvas = sourceCanvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    if (uploadedImage) {
      const scale = Math.min(CANVAS_WIDTH / uploadedImage.width, CANVAS_HEIGHT / uploadedImage.height);
      const w = uploadedImage.width * scale;
      const h = uploadedImage.height * scale;
      ctx.fillStyle = "#0f172a";
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      ctx.drawImage(uploadedImage, (CANVAS_WIDTH - w) / 2, (CANVAS_HEIGHT - h) / 2, w, h);
    } else {
      const scene = SOURCE_SCENES.find((s) => s.id === sceneId) ?? SOURCE_SCENES[0];
      scene.draw(ctx);
    }
    setSourceImageData(ctx.getImageData(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT));
  }, [sceneId, uploadedImage]);

  // Run the example's OpenCV pipeline whenever its inputs change. Debounced a touch so
  // dragging a slider or a handle doesn't queue up a burst of Mat allocations.
  useEffect(() => {
    if (!cvReady || !sourceImageData) return;
    const canvas = resultCanvasRef.current;
    if (!canvas) return;

    const timer = window.setTimeout(() => {
      let src: Mat | null = null;
      let dst: Mat | null = null;
      try {
        src = cv.matFromImageData(sourceImageData);
        dst = example.run(src, params, interaction);
        cv.imshow(canvas, dst);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        src?.delete();
        dst?.delete();
      }
    }, 30);

    return () => window.clearTimeout(timer);
  }, [cvReady, sourceImageData, params, interaction, example]);

  const handleParamChange = (key: string, value: ParamValue) => {
    setParams((prev) => ({ ...prev, [key]: value }));
  };

  const handleUpload = (file: File) => {
    const img = new Image();
    img.onload = () => setUploadedImage(img);
    img.src = URL.createObjectURL(file);
  };

  return (
    <section className="example-view">
      <header>
        <h2>{example.title}</h2>
        <p>{example.summary}</p>
      </header>

      <SourcePicker
        sceneId={uploadedImage ? "" : sceneId}
        onSceneChange={(id) => {
          setUploadedImage(null);
          setSceneId(id);
        }}
        onUpload={handleUpload}
      />

      <div className="canvas-row">
        <div className="canvas-card">
          <span className="canvas-label">Source</span>
          <div className="canvas-stack">
            <canvas ref={sourceCanvasRef} width={CANVAS_WIDTH} height={CANVAS_HEIGHT} />
            {example.interaction && (
              <InteractionOverlay
                mode={example.interaction}
                canvasWidth={CANVAS_WIDTH}
                canvasHeight={CANVAS_HEIGHT}
                interaction={interaction}
                onChange={setInteraction}
              />
            )}
          </div>
        </div>
        <div className="canvas-card">
          <span className="canvas-label">Result</span>
          <div className="canvas-stack">
            <canvas ref={resultCanvasRef} width={CANVAS_WIDTH} height={CANVAS_HEIGHT} />
            {!cvReady && <div className="canvas-overlay-message">Loading opencv.js…</div>}
          </div>
        </div>
      </div>

      {error && <p className="error">{error}</p>}

      <ControlsPanel controls={example.controls} values={params} onChange={handleParamChange} />

      <CodePanel
        code={example.code(params, interaction)}
        tutorialUrl={example.tutorialUrl}
        typingStatus={example.typingStatus}
        typingNote={example.typingNote}
      />
    </section>
  );
}
