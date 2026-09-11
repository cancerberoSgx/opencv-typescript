// Hand-maintained, NOT generated. `CascadeClassifier` (objdetect module) has no doxygen
// class entry this generator's current module set discovers - see generation-report.json's
// `unmatched.classes` (empty: it isn't even attempted, the doxygen input for the objdetect
// module isn't part of this run) - so it can never be produced automatically. It is a real,
// commonly-used opencv.js binding (Haar/LBP cascade face & eye detection), hand-added here
// the same way `hacks/mat.d.ts` adds other generator-gap runtime pieces. Signature ported
// from mirada's hand-written src/types/opencv/CascadeClassifier.ts, trimmed to the
// JS-callable shape (embind flattens the C++ overload set to the one below).
import type { Mat } from "../generated/Mat";
import type { RectVector, Size } from "./scalars";

export declare class CascadeClassifier {
  constructor();
  constructor(filename: string);

  /**
   * @param filename Name of the file (in the emscripten `FS`, see `hacks/emscripten-fs.d.ts`)
   * to load the classifier from - a Haar or LBP cascade XML.
   */
  load(filename: string): boolean;

  detectMultiScale(
    image: Mat,
    objects: RectVector,
    scaleFactor?: number,
    minNeighbors?: number,
    flags?: number,
    minSize?: Size,
    maxSize?: Size
  ): void;

  empty(): boolean;
  delete(): void;
}
