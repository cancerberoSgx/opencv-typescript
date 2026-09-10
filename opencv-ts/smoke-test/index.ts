// Compiled (never run) as a publish gate: `tsc --noEmit` must pass here before this
// package is published. It's not a runtime test (no wasm binary is loaded) - it only
// proves the generated declarations type-check and give a reasonable DX for a handful of
// the most common opencv.js calls. See ../generation-report.json for what didn't make it
// into these types for this particular OpenCV build.

// style 1: ambient global (`<script src="opencv.js">` + `cv.onRuntimeInitialized`)
declare const document: any;
function ambientGlobalStyle() {
  const canvas = document.getElementById("canvas");
  const src = cv.imread(canvas); // inferred as `Mat` - avoid a `cv.Mat` type annotation,
  const dst = new cv.Mat(); //     `cv` is a value (`declare global { var cv: CV }`), not
  cv.cvtColor(src, dst, cv.COLOR_RGBA2GRAY); //  a namespace, so `cv.Mat` isn't a valid type position.
  const rects = new cv.RectVector();
  rects.push_back(new cv.Rect(0, 0, 10, 10));
  src.delete();
  dst.delete();
}

// style 2: module augmentation (`import cvFactory from 'opencv.js'`)
import type { Mat } from "../index";

function moduleStyle(cvModule: typeof cv) {
  const m: Mat = new cvModule.Mat(10, 10, cvModule.CV_8UC1);
  m.delete();
}

export {};
