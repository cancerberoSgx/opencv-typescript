import type { Mat } from "opencv-ts";
import type { ExampleDef } from "../lib/types";
import { bool, str } from "../lib/types";

const SPACES = [
  { value: "HSV", label: "HSV" },
  { value: "YCrCb", label: "YCrCb" },
  { value: "Lab", label: "CIE Lab" },
  { value: "GRAY", label: "Grayscale" },
] as const;

function forwardCode(space: string): number {
  switch (space) {
    case "HSV":
      return cv.COLOR_RGB2HSV;
    case "YCrCb":
      return cv.COLOR_RGB2YCrCb;
    default:
      return cv.COLOR_RGB2Lab;
  }
}

function backwardCode(space: string): number {
  switch (space) {
    case "HSV":
      return cv.COLOR_HSV2RGB;
    case "YCrCb":
      return cv.COLOR_YCrCb2RGB;
    default:
      return cv.COLOR_Lab2RGB;
  }
}

export const colorspaceExample: ExampleDef = {
  id: "colorspace",
  title: "Colorspace Explorer",
  category: "Core Image Ops",
  summary:
    "Converts the image into another colorspace with cv.cvtColor. Non-grayscale spaces are shown as a false-color view of their raw planes, unless you round-trip back to true color.",
  tutorialUrl: "https://docs.opencv.org/4.9.0/df/d9d/tutorial_py_colorspaces.html",
  typingStatus: "full",
  controls: [
    { kind: "select", key: "space", label: "Target space", options: SPACES, default: "HSV" },
    { kind: "checkbox", key: "roundTrip", label: "Convert back to true color", default: false },
  ],
  run(src, params): Mat {
    const space = str(params, "space");

    if (space === "GRAY") {
      const gray = new cv.Mat();
      cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);
      return gray;
    }

    const rgb = new cv.Mat();
    cv.cvtColor(src, rgb, cv.COLOR_RGBA2RGB);
    const converted = new cv.Mat();
    cv.cvtColor(rgb, converted, forwardCode(space));
    rgb.delete();

    if (!bool(params, "roundTrip")) return converted;

    const back = new cv.Mat();
    cv.cvtColor(converted, back, backwardCode(space));
    converted.delete();
    return back;
  },
  code(params) {
    const space = str(params, "space");
    if (space === "GRAY") return "cv.cvtColor(src, dst, cv.COLOR_RGBA2GRAY);";
    const lines = [
      "cv.cvtColor(src, rgb, cv.COLOR_RGBA2RGB);",
      `cv.cvtColor(rgb, dst, cv.COLOR_RGB2${space});`,
    ];
    if (bool(params, "roundTrip")) lines.push(`cv.cvtColor(dst, dst, cv.COLOR_${space}2RGB);`);
    return lines.join("\n");
  },
};
