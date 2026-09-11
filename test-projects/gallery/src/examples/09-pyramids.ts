import type { Mat } from "opencv-ts";
import type { ExampleDef } from "../lib/types";
import { num } from "../lib/types";

export const pyramidsExample: ExampleDef = {
  id: "pyramids",
  title: "Image Pyramids",
  category: "Filtering & Morphology",
  summary:
    "Repeatedly applies cv.pyrDown (blur + halve) or cv.pyrUp (double + blur) to build a Gaussian pyramid level, then scales the result back up so the blur/aliasing from each level is easy to compare.",
  tutorialUrl: "https://docs.opencv.org/4.9.0/dc/dff/tutorial_py_pyramids.html",
  typingStatus: "full",
  controls: [{ kind: "slider", key: "level", label: "Pyramid level", min: -3, max: 3, step: 1, default: 1 }],
  run(src, params): Mat {
    const level = num(params, "level");
    let current: Mat = src.clone();

    const steps = Math.abs(level);
    for (let i = 0; i < steps; i++) {
      const next = new cv.Mat();
      if (level > 0) cv.pyrDown(current, next);
      else cv.pyrUp(current, next);
      current.delete();
      current = next;
    }

    if (level === 0) return current;

    // Scale back to the original canvas size so pyrDown's information loss (not just its
    // smaller dimensions) is what's visible in the result.
    const dst = new cv.Mat();
    cv.resize(current, dst, new cv.Size(src.cols, src.rows), 0, 0, cv.INTER_NEAREST);
    current.delete();
    return dst;
  },
  code(params) {
    const level = num(params, "level");
    if (level === 0) return "// level 0: original image, no pyramid step applied";
    const fn = level > 0 ? "cv.pyrDown" : "cv.pyrUp";
    return [`for (let i = 0; i < ${Math.abs(level)}; i++) ${fn}(current, current);`, "cv.resize(current, dst, new cv.Size(w, h), 0, 0, cv.INTER_NEAREST);"].join(
      "\n",
    );
  },
};
