import type { Mat } from "opencv-ts";
import type { ExampleDef } from "../lib/types";
import { bool, num, str } from "../lib/types";

const MODES = [
  { value: "EXTERNAL", label: "External only" },
  { value: "LIST", label: "List (no hierarchy)" },
  { value: "TREE", label: "Full tree" },
] as const;

const APPROX_METHODS = [
  { value: "SIMPLE", label: "Simple (compress segments)" },
  { value: "NONE", label: "None (every point)" },
] as const;

function modeCode(mode: string): number {
  switch (mode) {
    case "LIST":
      return cv.RETR_LIST;
    case "TREE":
      return cv.RETR_TREE;
    default:
      return cv.RETR_EXTERNAL;
  }
}

export const contoursExample: ExampleDef = {
  id: "contours",
  title: "Contours Explorer",
  category: "Shape & Structure",
  summary:
    "Finds contours in an Otsu-thresholded mask with cv.findContours, filters them by cv.contourArea, and outlines/boxes what's left with cv.drawContours and cv.boundingRect.",
  defaultSourceId: "blobs",
  tutorialUrl: "https://docs.opencv.org/4.9.0/d4/d73/tutorial_py_contours_begin.html",
  typingStatus: "workaround",
  typingNote:
    "cv.MatVector (required by findContours/drawContours) is only declared as a type alias in hacks/mat.d.ts (OutputArrayOfArrays = Mat), not as a real constructible class the way RectVector/PointVector/KeyPointVector are in hacks/scalars.d.ts - so it must be reached through `(cv as any).MatVector`.",
  controls: [
    { kind: "select", key: "mode", label: "Retrieval mode", options: MODES, default: "EXTERNAL" },
    { kind: "select", key: "approxMethod", label: "Approximation", options: APPROX_METHODS, default: "SIMPLE" },
    { kind: "slider", key: "minArea", label: "Min area filter", min: 0, max: 8000, step: 50, default: 200 },
    { kind: "checkbox", key: "outline", label: "Draw outline", default: true },
    { kind: "checkbox", key: "boundingBox", label: "Draw bounding box", default: false },
  ],
  run(src, params): Mat {
    const gray = new cv.Mat();
    cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);
    const binary = new cv.Mat();
    cv.threshold(gray, binary, 0, 255, cv.THRESH_BINARY_INV | cv.THRESH_OTSU);
    gray.delete();

    // `cv.MatVector` isn't typed as a constructible value at all - see typingNote above.
    const contours = new (cv as any).MatVector();
    const hierarchy = new cv.Mat();
    const approx = str(params, "approxMethod") === "NONE" ? cv.CHAIN_APPROX_NONE : cv.CHAIN_APPROX_SIMPLE;
    cv.findContours(binary, contours, hierarchy, modeCode(str(params, "mode")), approx);

    const dst = src.clone();
    const minArea = num(params, "minArea");
    const outline = bool(params, "outline");
    const boundingBox = bool(params, "boundingBox");
    const outlineColor = new cv.Scalar(74, 222, 128, 255);
    const boxColor = new cv.Scalar(250, 204, 21, 255);

    for (let i = 0; i < contours.size(); i++) {
      const cnt = contours.get(i) as Mat;
      if (cv.contourArea(cnt) < minArea) continue;
      if (outline) cv.drawContours(dst, contours, i, outlineColor, 2);
      if (boundingBox) {
        const rect = cv.boundingRect(cnt);
        cv.rectangle(dst, new cv.Point(rect.x, rect.y), new cv.Point(rect.x + rect.width, rect.y + rect.height), boxColor, 2);
      }
    }

    binary.delete();
    hierarchy.delete();
    contours.delete();
    return dst;
  },
  code(params) {
    return [
      "const contours = new (cv as any).MatVector(); // typings gap, see note below",
      "const hierarchy = new cv.Mat();",
      `cv.findContours(binary, contours, hierarchy, cv.RETR_${str(params, "mode")}, cv.CHAIN_APPROX_${str(params, "approxMethod")});`,
      "for (let i = 0; i < contours.size(); i++) {",
      `  if (cv.contourArea(contours.get(i)) < ${num(params, "minArea")}) continue;`,
      bool(params, "outline") ? "  cv.drawContours(dst, contours, i, color, 2);" : "",
      bool(params, "boundingBox") ? "  cv.rectangle(dst, tl, br, boxColor, 2); // from cv.boundingRect(contours.get(i))" : "",
      "}",
    ]
      .filter(Boolean)
      .join("\n");
  },
};
