import type { Mat } from "opencv-ts";
import type { ExampleDef } from "../lib/types";
import { num } from "../lib/types";

export const houghLinesExample: ExampleDef = {
  id: "hough-lines",
  title: "Hough Line Detection",
  category: "Shape & Structure",
  summary:
    "Runs Canny edge detection then cv.HoughLinesP (the probabilistic Hough transform) to find straight line segments and draws them back onto the image.",
  tutorialUrl: "https://docs.opencv.org/4.9.0/d6/d10/tutorial_py_houghlines.html",
  typingStatus: "full",
  controls: [
    { kind: "slider", key: "cannyLow", label: "Canny threshold 1", min: 0, max: 255, step: 1, default: 50 },
    { kind: "slider", key: "cannyHigh", label: "Canny threshold 2", min: 0, max: 255, step: 1, default: 150 },
    { kind: "slider", key: "threshold", label: "Hough threshold (votes)", min: 1, max: 200, step: 1, default: 50 },
    { kind: "slider", key: "minLineLength", label: "Min line length", min: 0, max: 200, step: 1, default: 30 },
    { kind: "slider", key: "maxLineGap", label: "Max line gap", min: 0, max: 50, step: 1, default: 10 },
  ],
  run(src, params): Mat {
    const gray = new cv.Mat();
    cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);
    const edges = new cv.Mat();
    cv.Canny(gray, edges, num(params, "cannyLow"), num(params, "cannyHigh"));
    gray.delete();

    const lines = new cv.Mat();
    cv.HoughLinesP(edges, lines, 1, Math.PI / 180, num(params, "threshold"), num(params, "minLineLength"), num(params, "maxLineGap"));
    edges.delete();

    const dst = src.clone();
    const color = new cv.Scalar(74, 222, 128, 255);
    for (let i = 0; i < lines.rows; i++) {
      const [x1, y1, x2, y2] = lines.data32S.subarray(i * 4, i * 4 + 4);
      cv.line(dst, new cv.Point(x1, y1), new cv.Point(x2, y2), color, 2);
    }

    lines.delete();
    return dst;
  },
  code(params) {
    return [
      `cv.Canny(gray, edges, ${num(params, "cannyLow")}, ${num(params, "cannyHigh")});`,
      `cv.HoughLinesP(edges, lines, 1, Math.PI / 180, ${num(params, "threshold")}, ${num(params, "minLineLength")}, ${num(params, "maxLineGap")});`,
      "for (let i = 0; i < lines.rows; i++) {",
      "  const [x1, y1, x2, y2] = lines.data32S.subarray(i * 4, i * 4 + 4);",
      "  cv.line(dst, new cv.Point(x1, y1), new cv.Point(x2, y2), color, 2);",
      "}",
    ].join("\n");
  },
};
