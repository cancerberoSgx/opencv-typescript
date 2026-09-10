// Hand-maintained, NOT generated. `readNetFromCaffe`/`readNetFromTorch` have no doxygen
// entry this generator's current module set discovers (see `generated/dnn.d.ts`, which only
// covers the ONNX/TensorFlow/TFLite/generic `readNet*` family) even though they're real,
// stable opencv.js dnn bindings. Signatures ported from mirada's hand-written
// src/types/opencv/dnn.ts, trimmed to the embind-callable (file path) overload.
//
// Note `Net` itself (see `generated/_unresolved.d.ts`) is currently an unresolved `any` -
// that's a separate, pre-existing generator gap this file doesn't attempt to fix.
import type { Net } from "../generated/_unresolved";

export declare function readNetFromCaffe(prototxt: string, caffeModel?: string): Net;
export declare function readNetFromTorch(model: string, isBinary?: boolean, evaluate?: boolean): Net;
