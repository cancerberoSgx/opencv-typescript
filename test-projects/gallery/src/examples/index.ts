import type { Category, ExampleDef } from "../lib/types";
import { colorspaceExample } from "./01-colorspace";
import { blendExample } from "./02-blend";
import { thresholdExample } from "./03-threshold";
import { affineTransformExample } from "./04-affine-transform";
import { perspectiveWarpExample } from "./05-perspective-warp";
import { smoothingExample } from "./06-smoothing";
import { morphologyExample } from "./07-morphology";
import { edgesExample } from "./08-edges";
import { pyramidsExample } from "./09-pyramids";
import { bordersExample } from "./10-borders";
import { contoursExample } from "./11-contours";
import { houghLinesExample } from "./12-hough-lines";
import { houghCirclesExample } from "./13-hough-circles";
import { templateMatchingExample } from "./14-template-matching";

export const EXAMPLES: readonly ExampleDef[] = [
  colorspaceExample,
  blendExample,
  thresholdExample,
  affineTransformExample,
  perspectiveWarpExample,
  smoothingExample,
  morphologyExample,
  edgesExample,
  pyramidsExample,
  bordersExample,
  contoursExample,
  houghLinesExample,
  houghCirclesExample,
  templateMatchingExample,
];

export const CATEGORIES: readonly Category[] = ["Core Image Ops", "Filtering & Morphology", "Shape & Structure"];

export function groupByCategory(examples: readonly ExampleDef[]): Map<Category, ExampleDef[]> {
  const map = new Map<Category, ExampleDef[]>();
  for (const example of examples) {
    const list = map.get(example.category) ?? [];
    list.push(example);
    map.set(example.category, list);
  }
  return map;
}
