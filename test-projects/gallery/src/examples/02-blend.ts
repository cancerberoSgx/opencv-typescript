import type { Mat } from "opencv-ts";
import type { ExampleDef } from "../lib/types";
import { num, str } from "../lib/types";

const MODES = [
  { value: "weighted", label: "Alpha blend (addWeighted)" },
  { value: "and", label: "Bitwise AND" },
  { value: "or", label: "Bitwise OR" },
  { value: "xor", label: "Bitwise XOR" },
] as const;

/** The "second image" is just a horizontally-flipped copy of the source (cv.flip) - keeps
 * this example self-contained (one source picker, one canvas pair) while still showing
 * real two-operand arithmetic/bitwise ops. */
export const blendExample: ExampleDef = {
  id: "blend",
  title: "Arithmetic & Bitwise Blend",
  category: "Core Image Ops",
  summary:
    "Combines the image with a horizontally-flipped copy of itself using cv.addWeighted or a bitwise op - the two classic ways to combine two images pixel-by-pixel.",
  tutorialUrl: "https://docs.opencv.org/4.9.0/d0/d86/tutorial_py_image_arithmetics.html",
  typingStatus: "full",
  controls: [
    { kind: "select", key: "mode", label: "Mode", options: MODES, default: "weighted" },
    { kind: "slider", key: "alpha", label: "Alpha (source weight)", min: 0, max: 1, step: 0.05, default: 0.5 },
  ],
  run(src, params): Mat {
    const mode = str(params, "mode");
    const flipped = new cv.Mat();
    cv.flip(src, flipped, 1);

    const dst = new cv.Mat();
    if (mode === "weighted") {
      const alpha = num(params, "alpha");
      cv.addWeighted(src, alpha, flipped, 1 - alpha, 0, dst);
    } else if (mode === "and") {
      cv.bitwise_and(src, flipped, dst);
    } else if (mode === "or") {
      cv.bitwise_or(src, flipped, dst);
    } else {
      cv.bitwise_xor(src, flipped, dst);
    }
    flipped.delete();
    return dst;
  },
  code(params) {
    const mode = str(params, "mode");
    const lines = ["cv.flip(src, flipped, 1); // mirror as the 2nd operand"];
    if (mode === "weighted") {
      lines.push(`cv.addWeighted(src, ${num(params, "alpha")}, flipped, ${1 - num(params, "alpha")}, 0, dst);`);
    } else {
      lines.push(`cv.bitwise_${mode}(src, flipped, dst);`);
    }
    return lines.join("\n");
  },
};
