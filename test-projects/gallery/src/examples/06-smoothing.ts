import type { Mat } from "opencv-ts";
import type { ExampleDef } from "../lib/types";
import { num, odd, str } from "../lib/types";

const FILTERS = [
  { value: "box", label: "Box blur" },
  { value: "gaussian", label: "Gaussian blur" },
  { value: "median", label: "Median blur" },
  { value: "bilateral", label: "Bilateral filter" },
] as const;

export const smoothingExample: ExampleDef = {
  id: "smoothing",
  title: "Smoothing Filters",
  category: "Filtering & Morphology",
  summary:
    "Compares OpenCV's four smoothing filters - a plain box average, a Gaussian-weighted average, a median (great at removing speckle noise), and an edge-preserving bilateral filter.",
  defaultSourceId: "noisy",
  tutorialUrl: "https://docs.opencv.org/4.9.0/d4/d13/tutorial_py_filtering.html",
  typingStatus: "full",
  controls: [
    { kind: "select", key: "filter", label: "Filter", options: FILTERS, default: "gaussian" },
    { kind: "slider", key: "ksize", label: "Kernel size", min: 1, max: 25, step: 2, default: 9 },
    { kind: "slider", key: "sigma", label: "Sigma (Gaussian/bilateral)", min: 0, max: 50, step: 1, default: 10 },
  ],
  run(src, params): Mat {
    const filter = str(params, "filter");
    const k = odd(num(params, "ksize"));
    const dst = new cv.Mat();

    switch (filter) {
      case "box":
        cv.blur(src, dst, new cv.Size(k, k));
        break;
      case "gaussian":
        cv.GaussianBlur(src, dst, new cv.Size(k, k), 0);
        break;
      case "median":
        cv.medianBlur(src, dst, k);
        break;
      case "bilateral": {
        // bilateralFilter can't operate in place and wants a 3/1-channel 8-bit source.
        const rgb = new cv.Mat();
        cv.cvtColor(src, rgb, cv.COLOR_RGBA2RGB);
        cv.bilateralFilter(rgb, dst, k, num(params, "sigma") * 2, num(params, "sigma") * 2);
        rgb.delete();
        break;
      }
    }
    return dst;
  },
  code(params) {
    const filter = str(params, "filter");
    const k = odd(num(params, "ksize"));
    switch (filter) {
      case "box":
        return `cv.blur(src, dst, new cv.Size(${k}, ${k}));`;
      case "gaussian":
        return `cv.GaussianBlur(src, dst, new cv.Size(${k}, ${k}), 0);`;
      case "median":
        return `cv.medianBlur(src, dst, ${k});`;
      default:
        return `cv.bilateralFilter(rgb, dst, ${k}, ${num(params, "sigma") * 2}, ${num(params, "sigma") * 2});`;
    }
  },
};
