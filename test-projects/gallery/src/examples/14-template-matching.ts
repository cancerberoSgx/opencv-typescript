import type { Mat } from "opencv-ts";
import type { ExampleDef } from "../lib/types";
import { defaultRect, str } from "../lib/types";

const METHODS = [
  { value: "TM_CCOEFF_NORMED", label: "CCOEFF (normalized)" },
  { value: "TM_CCORR_NORMED", label: "CCORR (normalized)" },
  { value: "TM_SQDIFF_NORMED", label: "SQDIFF (normalized)" },
] as const;

const MINIMIZING_METHODS = new Set(["TM_SQDIFF", "TM_SQDIFF_NORMED"]);

function methodCode(method: string): number {
  switch (method) {
    case "TM_CCORR_NORMED":
      return cv.TM_CCORR_NORMED;
    case "TM_SQDIFF_NORMED":
      return cv.TM_SQDIFF_NORMED;
    default:
      return cv.TM_CCOEFF_NORMED;
  }
}

interface MinMaxLocResult {
  minVal: number;
  maxVal: number;
  minLoc: { x: number; y: number };
  maxLoc: { x: number; y: number };
}

export const templateMatchingExample: ExampleDef = {
  id: "template-matching",
  title: "Template Matching",
  category: "Shape & Structure",
  summary:
    "Drag the handles on the source canvas to pick a template patch, then cv.matchTemplate slides it over the image and cv.minMaxLoc finds the best match.",
  interaction: "rect",
  tutorialUrl: "https://docs.opencv.org/4.9.0/d4/dc6/tutorial_py_template_matching.html",
  typingStatus: "workaround",
  typingNote:
    "cv.minMaxLoc's generated signature (minVal/maxVal/minLoc/maxLoc as output-reference params returning void) mirrors OpenCV's C++ signature, but opencv.js's actual custom JS binding takes just (src, mask?) and returns a {minVal, maxVal, minLoc, maxLoc} object instead - the declared signature doesn't match what runs, so the call needs a cast back to its real shape.",
  controls: [{ kind: "select", key: "method", label: "Method", options: METHODS, default: "TM_CCOEFF_NORMED" }],
  run(src, params, interaction): Mat {
    const rect = interaction.rect ?? defaultRect(src.cols, src.rows);
    const x = Math.round(rect.x);
    const y = Math.round(rect.y);
    const w = Math.max(4, Math.round(rect.width));
    const h = Math.max(4, Math.round(rect.height));

    const template = src.roi(new cv.Rect(x, y, w, h));
    const result = new cv.Mat();
    cv.matchTemplate(src, template, result, methodCode(str(params, "method")));

    // See typingNote: cv.minMaxLoc really returns an object, despite its declared (void,
    // output-param) signature - cast the function itself back to its real shape once.
    const minMaxLoc = cv.minMaxLoc as unknown as (m: Mat) => MinMaxLocResult;
    const mm = minMaxLoc(result);
    const best = MINIMIZING_METHODS.has(str(params, "method")) ? mm.minLoc : mm.maxLoc;

    const dst = src.clone();
    cv.rectangle(dst, new cv.Point(best.x, best.y), new cv.Point(best.x + w, best.y + h), new cv.Scalar(250, 204, 21, 255), 3);

    template.delete();
    result.delete();
    return dst;
  },
  code(params) {
    return [
      "const template = src.roi(new cv.Rect(x, y, w, h)); // dragged handles",
      `cv.matchTemplate(src, template, result, cv.${str(params, "method")});`,
      "const { minLoc, maxLoc } = cv.minMaxLoc(result) as MinMaxLocResult; // see typing note",
      "cv.rectangle(dst, best, new cv.Point(best.x + w, best.y + h), color, 3);",
    ].join("\n");
  },
};
