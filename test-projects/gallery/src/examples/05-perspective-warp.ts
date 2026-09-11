import type { Mat } from "opencv-ts";
import type { ExampleDef } from "../lib/types";
import { defaultCorners } from "../lib/types";

/** Builds the 4x1 CV_32FC2 point Mat cv.getPerspectiveTransform expects, from plain
 * {x,y} objects - no vector type needed, matFromArray takes a flat number array. */
function pointsToMat(points: ReadonlyArray<{ x: number; y: number }>): Mat {
  const flat: number[] = [];
  for (const p of points) flat.push(p.x, p.y);
  return cv.matFromArray(4, 1, cv.CV_32FC2, flat);
}

export const perspectiveWarpExample: ExampleDef = {
  id: "perspective-warp",
  title: "Perspective Warp",
  category: "Core Image Ops",
  summary:
    "Drag the four corner handles on the source canvas to build a homography with cv.getPerspectiveTransform and apply it with cv.warpPerspective - like straightening a photographed document.",
  interaction: "corners",
  defaultSourceId: "checkerboard",
  tutorialUrl: "https://docs.opencv.org/4.9.0/da/d6e/tutorial_py_geometric_transformations.html",
  typingStatus: "full",
  controls: [],
  run(src, _params, interaction): Mat {
    const corners = interaction.corners ?? defaultCorners(src.cols, src.rows);
    const from = pointsToMat([
      { x: 0, y: 0 },
      { x: src.cols, y: 0 },
      { x: src.cols, y: src.rows },
      { x: 0, y: src.rows },
    ]);
    const to = pointsToMat(corners);

    const M = cv.getPerspectiveTransform(from, to);
    const dst = new cv.Mat();
    cv.warpPerspective(src, dst, M, new cv.Size(src.cols, src.rows));

    from.delete();
    to.delete();
    M.delete();
    return dst;
  },
  code(_params, interaction) {
    const corners = interaction.corners ?? defaultCorners(480, 360);
    const pts = corners.map((p) => `[${Math.round(p.x)}, ${Math.round(p.y)}]`).join(", ");
    return [
      `const from = cv.matFromArray(4, 1, cv.CV_32FC2, [0,0, w,0, w,h, 0,h]);`,
      `const to = cv.matFromArray(4, 1, cv.CV_32FC2, /* dragged corners */ [${pts}].flat());`,
      "const M = cv.getPerspectiveTransform(from, to);",
      "cv.warpPerspective(src, dst, M, new cv.Size(w, h));",
    ].join("\n");
  },
};
