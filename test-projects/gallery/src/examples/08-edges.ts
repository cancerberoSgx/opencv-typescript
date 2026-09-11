import type { Mat } from "opencv-ts";
import type { ExampleDef } from "../lib/types";
import { bool, num, odd, str } from "../lib/types";

const ALGORITHMS = [
  { value: "canny", label: "Canny" },
  { value: "sobel", label: "Sobel" },
  { value: "scharr", label: "Scharr" },
  { value: "laplacian", label: "Laplacian" },
] as const;

const DIRECTIONS = [
  { value: "x", label: "X" },
  { value: "y", label: "Y" },
  { value: "both", label: "Both (magnitude)" },
] as const;

/** Sobel/Scharr share the same "derivative in X and/or Y, then magnitude" shape - this
 * runs whichever one `deriv` is for the requested direction(s) at CV_32F and combines them. */
function derivativeEdges(direction: string, deriv: (dst: Mat, dx: number, dy: number) => void): Mat {
  const dst = new cv.Mat();
  if (direction !== "both") {
    const grad = new cv.Mat();
    deriv(grad, direction === "x" ? 1 : 0, direction === "x" ? 0 : 1);
    cv.convertScaleAbs(grad, dst);
    grad.delete();
    return dst;
  }

  const gx = new cv.Mat();
  const gy = new cv.Mat();
  deriv(gx, 1, 0);
  deriv(gy, 0, 1);
  const mag = new cv.Mat();
  cv.magnitude(gx, gy, mag);
  cv.convertScaleAbs(mag, dst);
  gx.delete();
  gy.delete();
  mag.delete();
  return dst;
}

export const edgesExample: ExampleDef = {
  id: "edges",
  title: "Edge Detection Suite",
  category: "Filtering & Morphology",
  summary:
    "Compares OpenCV's edge operators: the multi-stage cv.Canny detector against the gradient-based cv.Sobel, cv.Scharr and cv.Laplacian operators.",
  tutorialUrl: "https://docs.opencv.org/4.9.0/da/d22/tutorial_py_canny.html",
  typingStatus: "full",
  controls: [
    { kind: "select", key: "algorithm", label: "Algorithm", options: ALGORITHMS, default: "canny" },
    { kind: "slider", key: "threshold1", label: "Canny threshold 1", min: 0, max: 255, step: 1, default: 50 },
    { kind: "slider", key: "threshold2", label: "Canny threshold 2", min: 0, max: 255, step: 1, default: 100 },
    { kind: "checkbox", key: "l2gradient", label: "Canny: use L2 gradient", default: false },
    { kind: "select", key: "direction", label: "Sobel/Scharr direction", options: DIRECTIONS, default: "both" },
    { kind: "slider", key: "ksize", label: "Sobel/Laplacian kernel size", min: 1, max: 7, step: 2, default: 3 },
  ],
  run(src, params): Mat {
    const algorithm = str(params, "algorithm");
    const gray = new cv.Mat();
    cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);

    let dst: Mat;
    if (algorithm === "canny") {
      dst = new cv.Mat();
      cv.Canny(gray, dst, num(params, "threshold1"), num(params, "threshold2"), 3, bool(params, "l2gradient"));
    } else if (algorithm === "sobel") {
      const k = odd(num(params, "ksize"));
      dst = derivativeEdges(str(params, "direction"), (out, dx, dy) => cv.Sobel(gray, out, cv.CV_32F, dx, dy, k));
    } else if (algorithm === "scharr") {
      dst = derivativeEdges(str(params, "direction"), (out, dx, dy) => cv.Scharr(gray, out, cv.CV_32F, dx, dy));
    } else {
      const k = odd(num(params, "ksize"));
      const lap = new cv.Mat();
      cv.Laplacian(gray, lap, cv.CV_32F, k);
      dst = new cv.Mat();
      cv.convertScaleAbs(lap, dst);
      lap.delete();
    }

    gray.delete();
    return dst;
  },
  code(params) {
    const algorithm = str(params, "algorithm");
    if (algorithm === "canny") {
      return `cv.Canny(gray, dst, ${num(params, "threshold1")}, ${num(params, "threshold2")}, 3, ${bool(params, "l2gradient")});`;
    }
    if (algorithm === "laplacian") {
      return [
        `cv.Laplacian(gray, lap, cv.CV_32F, ${odd(num(params, "ksize"))});`,
        "cv.convertScaleAbs(lap, dst);",
      ].join("\n");
    }
    const fn = algorithm === "sobel" ? `cv.Sobel(gray, out, cv.CV_32F, dx, dy, ${odd(num(params, "ksize"))})` : "cv.Scharr(gray, out, cv.CV_32F, dx, dy)";
    return [`// direction = ${str(params, "direction")}`, fn, "cv.magnitude(gx, gy, mag); // when direction === \"both\"", "cv.convertScaleAbs(mag, dst);"].join(
      "\n",
    );
  },
};
