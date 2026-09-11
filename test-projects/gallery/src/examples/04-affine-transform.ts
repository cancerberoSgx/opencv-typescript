import type { Mat } from "opencv-ts";
import type { ExampleDef } from "../lib/types";
import { num } from "../lib/types";

export const affineTransformExample: ExampleDef = {
  id: "affine-transform",
  title: "Affine Transform",
  category: "Core Image Ops",
  summary:
    "Rotates, scales and translates the image in one warp with cv.getRotationMatrix2D + cv.warpAffine - the standard way to build a 2x3 affine matrix without typing it by hand.",
  defaultSourceId: "checkerboard",
  tutorialUrl: "https://docs.opencv.org/4.9.0/da/d6e/tutorial_py_geometric_transformations.html",
  typingStatus: "full",
  controls: [
    { kind: "slider", key: "scale", label: "Scale", min: 0.2, max: 2.5, step: 0.05, default: 1 },
    { kind: "slider", key: "angle", label: "Rotation", min: 0, max: 360, step: 1, default: 0, unit: "°" },
    { kind: "slider", key: "tx", label: "Translate X", min: -200, max: 200, step: 1, default: 0, unit: "px" },
    { kind: "slider", key: "ty", label: "Translate Y", min: -150, max: 150, step: 1, default: 0, unit: "px" },
  ],
  run(src, params): Mat {
    const center = new cv.Point(src.cols / 2, src.rows / 2);
    const M = cv.getRotationMatrix2D(center, num(params, "angle"), num(params, "scale"));
    // getRotationMatrix2D only produces rotation+scale about `center` - fold the
    // translation sliders in by editing the matrix's own translation column directly.
    M.data64F[2] += num(params, "tx");
    M.data64F[5] += num(params, "ty");

    const dst = new cv.Mat();
    cv.warpAffine(src, dst, M, new cv.Size(src.cols, src.rows));
    M.delete();
    return dst;
  },
  code(params) {
    return [
      `const M = cv.getRotationMatrix2D(center, ${num(params, "angle")}, ${num(params, "scale")});`,
      `M.data64F[2] += ${num(params, "tx")}; // tx`,
      `M.data64F[5] += ${num(params, "ty")}; // ty`,
      "cv.warpAffine(src, dst, M, new cv.Size(src.cols, src.rows));",
    ].join("\n");
  },
};
