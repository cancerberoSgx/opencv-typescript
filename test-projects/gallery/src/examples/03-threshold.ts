import type { Mat } from "opencv-ts";
import type { ExampleDef } from "../lib/types";
import { bool, num, odd, str } from "../lib/types";

const MODES = [
  { value: "global", label: "Global" },
  { value: "otsu", label: "Otsu (auto)" },
  { value: "adaptive", label: "Adaptive" },
] as const;

const ADAPTIVE_METHODS = [
  { value: "mean", label: "Mean" },
  { value: "gaussian", label: "Gaussian" },
] as const;

export const thresholdExample: ExampleDef = {
  id: "threshold",
  title: "Thresholding Lab",
  category: "Core Image Ops",
  summary:
    "Turns the image into a binary mask with cv.threshold (global or Otsu-chosen) or cv.adaptiveThreshold (a per-neighborhood threshold, better for uneven lighting).",
  defaultSourceId: "noisy",
  tutorialUrl: "https://docs.opencv.org/4.9.0/d7/d4d/tutorial_py_thresholding.html",
  typingStatus: "full",
  controls: [
    { kind: "select", key: "mode", label: "Mode", options: MODES, default: "global" },
    { kind: "slider", key: "thresh", label: "Threshold", min: 0, max: 255, step: 1, default: 127 },
    { kind: "slider", key: "maxval", label: "Max value", min: 0, max: 255, step: 1, default: 255 },
    { kind: "select", key: "adaptiveMethod", label: "Adaptive method", options: ADAPTIVE_METHODS, default: "mean" },
    { kind: "slider", key: "blockSize", label: "Block size", min: 3, max: 51, step: 2, default: 11 },
    { kind: "slider", key: "C", label: "C (subtracted constant)", min: -20, max: 20, step: 1, default: 2 },
    { kind: "checkbox", key: "invert", label: "Invert", default: false },
  ],
  run(src, params): Mat {
    const mode = str(params, "mode");
    const invert = bool(params, "invert");
    const maxval = num(params, "maxval");

    const gray = new cv.Mat();
    cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);
    const dst = new cv.Mat();

    if (mode === "adaptive") {
      const method = str(params, "adaptiveMethod") === "mean" ? cv.ADAPTIVE_THRESH_MEAN_C : cv.ADAPTIVE_THRESH_GAUSSIAN_C;
      const type = invert ? cv.THRESH_BINARY_INV : cv.THRESH_BINARY;
      cv.adaptiveThreshold(gray, dst, maxval, method, type, odd(num(params, "blockSize")), num(params, "C"));
    } else {
      let type = invert ? cv.THRESH_BINARY_INV : cv.THRESH_BINARY;
      if (mode === "otsu") type |= cv.THRESH_OTSU;
      cv.threshold(gray, dst, num(params, "thresh"), maxval, type);
    }

    gray.delete();
    return dst;
  },
  code(params) {
    const mode = str(params, "mode");
    const invert = bool(params, "invert") ? "THRESH_BINARY_INV" : "THRESH_BINARY";
    if (mode === "adaptive") {
      const method = str(params, "adaptiveMethod") === "mean" ? "ADAPTIVE_THRESH_MEAN_C" : "ADAPTIVE_THRESH_GAUSSIAN_C";
      return `cv.adaptiveThreshold(gray, dst, ${num(params, "maxval")}, cv.${method}, cv.${invert}, ${odd(num(params, "blockSize"))}, ${num(params, "C")});`;
    }
    const type = mode === "otsu" ? `cv.${invert} | cv.THRESH_OTSU` : `cv.${invert}`;
    return `cv.threshold(gray, dst, ${num(params, "thresh")}, ${num(params, "maxval")}, ${type});`;
  },
};
