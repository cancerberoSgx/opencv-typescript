// Hand-maintained, NOT generated. opencv.js's helpers.js constructs these value types
// directly (they aren't produced by the same embind class_<> machinery the rest of this
// package is generated from), so doxygen has no reliable registration to derive them
// from. Ported from mirada/doxygen2typescript's exportsHacks.ts#scalarTypes, trimmed and
// kept as a real, type-checked source file instead of a template-literal string.

import { Vector } from "./runtime";

export declare class Range {
  start: number;
  end: number;
  constructor(start: number, end: number);
}

export declare class Scalar extends Array<number> {
  constructor(v0?: number, v1?: number, v2?: number, v3?: number);
  static all(...v: number[]): Scalar;
}
export { Scalar as GScalar };

export declare class Point {
  constructor(x: number, y: number);
  x: number;
  y: number;
}
export { Point as Point2f };
export { Point as Point2l };

export declare class KeyPoint {
  constructor();
  pt: Point;
  size: number;
  angle: number;
  response: number;
  octave: number;
  class_id: number;
}

export declare class Size {
  constructor(width: number, height: number);
  width: number;
  height: number;
}
export { Size as Point2d };
export { Size as Size2d };
export { Size as Size2f };
export { Size as Size2l };

export declare class Rect {
  constructor();
  constructor(point: Point, size: Size);
  constructor(x: number, y: number, width: number, height: number);
  x: number;
  y: number;
  width: number;
  height: number;
}
export { Rect as Rect_ };

export declare class RotatedRect {
  constructor(center: Point, size: Size, angle: number);
  center: Point;
  size: Size;
  angle: number;
  static points(obj: RotatedRect): [Point, Point, Point, Point];
  static boundingRect(obj: RotatedRect): Rect;
  static boundingRect2f(obj: RotatedRect): Rect;
}

export declare class TermCriteria {
  type: number;
  maxCount: number;
  epsilon: number;
  constructor();
  constructor(type: number, maxCount: number, epsilon: number);
}
export declare const TermCriteria_EPS: number;
export declare const TermCriteria_COUNT: number;
export declare const TermCriteria_MAX_ITER: number;

export declare class MinMaxLoc {
  minVal: number;
  maxVal: number;
  minLoc: Point;
  maxLoc: Point;
  constructor();
  constructor(minVal: number, maxVal: number, minLoc: Point, maxLoc: Point);
}

export declare class Circle {
  x: number;
  y: number;
  radius: number;
}

export type MatSize = () => Size;
export type MatStep = { buf: number[]; p: number };

export declare class RectVector extends Vector<Rect> {}
export declare class PointVector extends Vector<Point> {}
export declare class KeyPointVector extends Vector<KeyPoint> {}
export declare class DMatchVector extends Vector<any> {}
export declare class DMatchVectorVector extends Vector<Vector<any>> {}
