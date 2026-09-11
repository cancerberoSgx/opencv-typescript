import type { Mat } from "opencv-ts";
import type { ExampleDef } from "../lib/types";
import { num, str } from "../lib/types";

const BORDER_TYPES = [
  { value: "CONSTANT", label: "Constant color" },
  { value: "REPLICATE", label: "Replicate edge" },
  { value: "REFLECT", label: "Reflect" },
  { value: "REFLECT_101", label: "Reflect 101" },
  { value: "WRAP", label: "Wrap around" },
] as const;

function borderCode(type: string): number {
  switch (type) {
    case "REPLICATE":
      return cv.BORDER_REPLICATE;
    case "REFLECT":
      return cv.BORDER_REFLECT;
    case "REFLECT_101":
      return cv.BORDER_REFLECT_101;
    case "WRAP":
      return cv.BORDER_WRAP;
    default:
      return cv.BORDER_CONSTANT;
  }
}

export const bordersExample: ExampleDef = {
  id: "borders",
  title: "Border & Padding",
  category: "Filtering & Morphology",
  summary:
    "Pads the image with cv.copyMakeBorder - the same border-handling modes every filter in this gallery uses internally at the edges of the image.",
  tutorialUrl: "https://docs.opencv.org/4.9.0/dc/da3/tutorial_copyMakeBorder.html",
  typingStatus: "full",
  controls: [
    { kind: "select", key: "borderType", label: "Border type", options: BORDER_TYPES, default: "REFLECT" },
    { kind: "slider", key: "size", label: "Border size", min: 0, max: 100, step: 1, default: 40, unit: "px" },
  ],
  run(src, params): Mat {
    const size = num(params, "size");
    const dst = new cv.Mat();
    cv.copyMakeBorder(src, dst, size, size, size, size, borderCode(str(params, "borderType")), new cv.Scalar(220, 38, 38, 255));
    return dst;
  },
  code(params) {
    const size = num(params, "size");
    return `cv.copyMakeBorder(src, dst, ${size}, ${size}, ${size}, ${size}, cv.BORDER_${str(params, "borderType")}, new cv.Scalar(220, 38, 38, 255));`;
  },
};
