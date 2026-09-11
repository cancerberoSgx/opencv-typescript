import type { Mat } from "opencv-ts";
import type { ExampleDef } from "../lib/types";
import { num } from "../lib/types";

export const houghCirclesExample: ExampleDef = {
  id: "hough-circles",
  title: "Hough Circle Detection",
  category: "Shape & Structure",
  summary: "Blurs the image and runs cv.HoughCircles (Hough gradient method) to find circles, drawing each center and outline.",
  defaultSourceId: "blobs",
  tutorialUrl: "https://docs.opencv.org/4.9.0/da/d53/tutorial_py_houghcircles.html",
  typingStatus: "full",
  controls: [
    { kind: "slider", key: "dp", label: "dp (accumulator resolution)", min: 1, max: 3, step: 0.1, default: 1.2 },
    { kind: "slider", key: "minDist", label: "Min distance between centers", min: 1, max: 200, step: 1, default: 30 },
    { kind: "slider", key: "param1", label: "Canny high threshold", min: 1, max: 300, step: 1, default: 100 },
    { kind: "slider", key: "param2", label: "Accumulator threshold", min: 1, max: 100, step: 1, default: 30 },
    { kind: "slider", key: "minRadius", label: "Min radius", min: 0, max: 100, step: 1, default: 0 },
    { kind: "slider", key: "maxRadius", label: "Max radius (0 = auto)", min: 0, max: 200, step: 1, default: 0 },
  ],
  run(src, params): Mat {
    const gray = new cv.Mat();
    cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);
    cv.GaussianBlur(gray, gray, new cv.Size(9, 9), 2);

    const circles = new cv.Mat();
    cv.HoughCircles(
      gray,
      circles,
      cv.HOUGH_GRADIENT,
      num(params, "dp"),
      num(params, "minDist"),
      num(params, "param1"),
      num(params, "param2"),
      num(params, "minRadius"),
      num(params, "maxRadius"),
    );
    gray.delete();

    const dst = src.clone();
    const strokeColor = new cv.Scalar(74, 222, 128, 255);
    const centerColor = new cv.Scalar(250, 204, 21, 255);
    for (let i = 0; i < circles.cols; i++) {
      const [x, y, radius] = circles.data32F.subarray(i * 3, i * 3 + 3);
      const center = new cv.Point(x, y);
      cv.circle(dst, center, Math.round(radius), strokeColor, 2);
      cv.circle(dst, center, 3, centerColor, -1);
    }

    circles.delete();
    return dst;
  },
  code(params) {
    return [
      "cv.GaussianBlur(gray, gray, new cv.Size(9, 9), 2);",
      `cv.HoughCircles(gray, circles, cv.HOUGH_GRADIENT, ${num(params, "dp")}, ${num(params, "minDist")}, ${num(params, "param1")}, ${num(params, "param2")}, ${num(params, "minRadius")}, ${num(params, "maxRadius")});`,
      "for (let i = 0; i < circles.cols; i++) {",
      "  const [x, y, radius] = circles.data32F.subarray(i * 3, i * 3 + 3);",
      "  cv.circle(dst, new cv.Point(x, y), radius, color, 2);",
      "}",
    ].join("\n");
  },
};
