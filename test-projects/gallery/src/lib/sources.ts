export const CANVAS_WIDTH = 480;
export const CANVAS_HEIGHT = 360;

export interface SourceScene {
  id: string;
  label: string;
  draw: (ctx: CanvasRenderingContext2D) => void;
}

/** General-purpose scene: soft gradient behind a few flat-colored shapes and text - good
 * default for most examples (has clean edges, flat regions and a bit of structure). */
function drawShapesScene(ctx: CanvasRenderingContext2D): void {
  const gradient = ctx.createLinearGradient(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  gradient.addColorStop(0, "#1e3a8a");
  gradient.addColorStop(1, "#f97316");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(140, 130, 70, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#facc15";
  ctx.beginPath();
  ctx.arc(360, 260, 40, 0, Math.PI * 2);
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

/** Checkerboard + a circle - makes geometric warps (rotate/scale/perspective) and
 * morphology/filter effects easy to read since every edge is a straight line. */
function drawCheckerboardScene(ctx: CanvasRenderingContext2D): void {
  ctx.fillStyle = "#0f172a";
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  const cell = 30;
  for (let y = 0; y * cell < CANVAS_HEIGHT; y++) {
    for (let x = 0; x * cell < CANVAS_WIDTH; x++) {
      if ((x + y) % 2 === 0) continue;
      ctx.fillStyle = "#e2e8f0";
      ctx.fillRect(x * cell, y * cell, cell, cell);
    }
  }

  ctx.fillStyle = "#dc2626";
  ctx.beginPath();
  ctx.arc(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, 50, 0, Math.PI * 2);
  ctx.fill();
}

/** Flat mid-gray field with heavy speckle noise - makes denoising/smoothing/thresholding
 * effects obvious since the "clean" result is otherwise a single flat value. */
function drawNoisyScene(ctx: CanvasRenderingContext2D): void {
  ctx.fillStyle = "#64748b";
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  ctx.fillStyle = "#0f172a";
  ctx.beginPath();
  ctx.arc(180, 180, 90, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#f8fafc";
  ctx.beginPath();
  ctx.arc(340, 180, 60, 0, Math.PI * 2);
  ctx.fill();

  const imageData = ctx.getImageData(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  const { data } = imageData;
  for (let i = 0; i < data.length; i += 4) {
    const n = (Math.random() - 0.5) * 90;
    data[i] = clamp255(data[i] + n);
    data[i + 1] = clamp255(data[i + 1] + n);
    data[i + 2] = clamp255(data[i + 2] + n);
  }
  ctx.putImageData(imageData, 0, 0);
}

/** Grid of colored blobs at varying sizes - a natural fit for contour/blob/Hough-circle
 * style examples, since it has several separable, closed shapes. */
function drawBlobsScene(ctx: CanvasRenderingContext2D): void {
  ctx.fillStyle = "#f8fafc";
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  const blobs: Array<[number, number, number, string]> = [
    [80, 90, 34, "#1d4ed8"],
    [200, 70, 22, "#059669"],
    [320, 110, 45, "#dc2626"],
    [420, 80, 18, "#7c3aed"],
    [110, 240, 50, "#ea580c"],
    [250, 260, 28, "#0891b2"],
    [380, 230, 38, "#ca8a04"],
    [60, 320, 20, "#be185d"],
  ];
  for (const [x, y, r, color] of blobs) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.strokeStyle = "#111827";
  ctx.lineWidth = 5;
  ctx.strokeRect(300, 260, 130, 70);
}

export const SOURCE_SCENES: readonly SourceScene[] = [
  { id: "shapes", label: "Shapes & gradient", draw: drawShapesScene },
  { id: "checkerboard", label: "Checkerboard", draw: drawCheckerboardScene },
  { id: "noisy", label: "Noisy gradient", draw: drawNoisyScene },
  { id: "blobs", label: "Colored blobs", draw: drawBlobsScene },
];

function clamp255(v: number): number {
  return v < 0 ? 0 : v > 255 ? 255 : v;
}
