// Hand-maintained, NOT generated. `Mat`'s doxygen-derived shape needs the JS/embind-only
// pieces patched in (typed-array views, pointer accessors, the InputArray/OutputArray
// family that in C++ are template/reference types with no direct runtime equivalent).
// Ported from mirada/doxygen2typescript's exportsHacks.ts#mat_.
//
// `Mat_` is the JS-only synthetic base `render/identifiers.py#RUNTIME_ONLY_BASES` gives
// `Mat` (`extends Mat_`) - there is no real C++ `Mat_` in this role, so it must be defined
// here, by hand, exactly like mirada's original.

import { Rect } from "./scalars";
import { Vector } from "./runtime";
import type { Mat } from "../generated/Mat";

export declare class Mat_ extends Vector<Mat> {
  data: Uint8Array;
  data8S: Int8Array;
  data8U: Uint8Array;
  data16U: Uint16Array;
  data16S: Int16Array;
  data32U: Uint32Array;
  data32S: Int32Array;
  data32F: Float32Array;
  data64F: Float64Array;
  ucharPtr(i: number, j?: number): Uint8Array;
  charPtr(i: number, j?: number): Int8Array;
  shortPtr(i: number, j?: number): Int16Array;
  ushortPtr(i: number, j?: number): Uint16Array;
  intPtr(i: number, j?: number): Int32Array;
  floatPtr(i: number, j?: number): Float32Array;
  doublePtr(i: number, j?: number): Float64Array;
  ucharAt(i: number, j?: number, k?: number): number;
  charAt(i: number, j?: number, k?: number): number;
  /**
   * Sometimes, you will have to play with certain regions of an image (a "region of
   * interest", ROI). Note: opencv.js only accepts a single `Rect` argument here.
   */
  roi(rect: Rect): Mat;
}

// In C++, InputArray/OutputArray/InputOutputArray etc. are reference/proxy types accepting
// a Mat, a Scalar, or a std::vector - at the opencv.js/embind boundary they're all just a
// Mat. Aliasing them keeps the generated signatures that mention these names valid.
export type InputArray = Mat;
export type OutputArray = Mat;
export type InputOutputArray = Mat;
export type InputArrayOfArrays = Mat;
export type OutputArrayOfArrays = Mat;
export type InputOutputArrayOfArrays = Mat;
export type MatVector = Vector<Mat>;

export declare function matFromImageData(imageData: ImageData): Mat;
export declare function matFromArray(
  rows: number,
  cols: number,
  type: number,
  array: number[] | ArrayBufferView
): Mat;

export declare class ImageData {
  constructor(data: Uint8ClampedArray, width: number, height: number);
  data: Uint8ClampedArray;
  width: number;
  height: number;
}

export declare function imread(canvasOrImageSource: HTMLElement | string): Mat;
export declare function imshow(canvasSource: HTMLElement | string, mat: Mat): void;

// opencv.js's binding_utils layer registers a handful of "<name>1"/"<name>2"-suffixed
// aliases for a JS-incompatible C++ overload (e.g. an output-param overload that doesn't
// fit embind's calling convention). These have no doxygen entry under that exact name -
// see generation-report.json's `functions.unmatched` for the authoritative list for a
// given opencv build; the ones below are the commonly-used, stable ones.
export declare function ellipse1(
  img: Mat,
  box: unknown,
  color: unknown,
  thickness?: number,
  lineType?: number
): void;
export declare function rectangle1(
  img: Mat,
  rec: Rect,
  color: unknown,
  thickness?: number,
  lineType?: number,
  shift?: number
): void;
export declare function norm1(src1: Mat, normType?: number, mask?: Mat): number;
export declare function divide1(src1: Mat, src2: Mat, dst: Mat, scale?: number, dtype?: number): void;
export declare function Canny1(
  dx: Mat,
  dy: Mat,
  edges: Mat,
  threshold1: number,
  threshold2: number,
  L2gradient?: boolean
): void;
export declare function integral2(src: Mat, sum: Mat, sqsum: Mat, sdepth?: number, sqdepth?: number): void;
export declare function goodFeaturesToTrack1(
  image: Mat,
  corners: Mat,
  maxCorners: number,
  qualityLevel: number,
  minDistance: number,
  mask: Mat,
  blockSize: number,
  gradientSize: number,
  useHarrisDetector?: boolean,
  k?: number
): void;

export declare class VideoCapture {
  constructor(videoSource: HTMLVideoElement | string);
  read(image: Mat): boolean;
  video: HTMLVideoElement;
}
