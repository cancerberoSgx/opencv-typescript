import type { Mat } from "opencv-ts";
import type { ExampleDef } from "../lib/types";
import { num, odd, str } from "../lib/types";

const OPS = [
  { value: "erode", label: "Erode" },
  { value: "dilate", label: "Dilate" },
  { value: "open", label: "Open" },
  { value: "close", label: "Close" },
  { value: "gradient", label: "Gradient" },
  { value: "tophat", label: "Top hat" },
  { value: "blackhat", label: "Black hat" },
] as const;

const SHAPES = [
  { value: "rect", label: "Rectangle" },
  { value: "cross", label: "Cross" },
  { value: "ellipse", label: "Ellipse" },
] as const;

function morphOpCode(op: string): number {
  switch (op) {
    case "open":
      return cv.MORPH_OPEN;
    case "close":
      return cv.MORPH_CLOSE;
    case "gradient":
      return cv.MORPH_GRADIENT;
    case "tophat":
      return cv.MORPH_TOPHAT;
    default:
      return cv.MORPH_BLACKHAT;
  }
}

function shapeCode(shape: string): number {
  switch (shape) {
    case "cross":
      return cv.MORPH_CROSS;
    case "ellipse":
      return cv.MORPH_ELLIPSE;
    default:
      return cv.MORPH_RECT;
  }
}

export const morphologyExample: ExampleDef = {
  id: "morphology",
  title: "Morphology Studio",
  category: "Filtering & Morphology",
  summary:
    "Runs cv.erode/cv.dilate/cv.morphologyEx on an Otsu-thresholded binary mask so the structuring-element shape and size are easy to see.",
  defaultSourceId: "blobs",
  tutorialUrl: "https://docs.opencv.org/4.9.0/d9/d61/tutorial_py_morphological_ops.html",
  typingStatus: "full",
  controls: [
    { kind: "select", key: "op", label: "Operation", options: OPS, default: "dilate" },
    { kind: "select", key: "shape", label: "Kernel shape", options: SHAPES, default: "ellipse" },
    { kind: "slider", key: "ksize", label: "Kernel size", min: 1, max: 25, step: 2, default: 5 },
    { kind: "slider", key: "iterations", label: "Iterations", min: 1, max: 10, step: 1, default: 1 },
  ],
  run(src, params): Mat {
    const gray = new cv.Mat();
    cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);
    const binary = new cv.Mat();
    cv.threshold(gray, binary, 0, 255, cv.THRESH_BINARY | cv.THRESH_OTSU);
    gray.delete();

    const k = odd(num(params, "ksize"));
    const kernel = cv.getStructuringElement(shapeCode(str(params, "shape")), new cv.Size(k, k));
    const iterations = num(params, "iterations");
    const op = str(params, "op");

    const dst = new cv.Mat();
    if (op === "erode") {
      cv.erode(binary, dst, kernel, new cv.Point(-1, -1), iterations);
    } else if (op === "dilate") {
      cv.dilate(binary, dst, kernel, new cv.Point(-1, -1), iterations);
    } else {
      cv.morphologyEx(binary, dst, morphOpCode(op), kernel, new cv.Point(-1, -1), iterations);
    }

    binary.delete();
    kernel.delete();
    return dst;
  },
  code(params) {
    const k = odd(num(params, "ksize"));
    const op = str(params, "op");
    const kernelLine = `const kernel = cv.getStructuringElement(cv.MORPH_${str(params, "shape").toUpperCase()}, new cv.Size(${k}, ${k}));`;
    if (op === "erode" || op === "dilate") {
      return [kernelLine, `cv.${op}(binary, dst, kernel, new cv.Point(-1, -1), ${num(params, "iterations")});`].join("\n");
    }
    return [kernelLine, `cv.morphologyEx(binary, dst, cv.MORPH_${op.toUpperCase()}, kernel, new cv.Point(-1, -1), ${num(params, "iterations")});`].join(
      "\n",
    );
  },
};
