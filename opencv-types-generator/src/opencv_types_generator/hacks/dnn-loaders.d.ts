// Hand-maintained, NOT generated. `readNetFromCaffe`/`readNetFromTorch` have no doxygen
// entry this generator's current module set discovers (see `generated/dnn.d.ts`, which only
// covers the ONNX/TensorFlow/TFLite/generic `readNet*` family) even though they're real,
// stable opencv.js dnn bindings. Signatures ported from mirada's hand-written
// src/types/opencv/dnn.ts, trimmed to the embind-callable (file path) overload.
import type { dnn_Net as Net } from "../generated/dnn_Net";

export declare function readNetFromCaffe(prototxt: string, caffeModel?: string): Net;
export declare function readNetFromTorch(model: string, isBinary?: boolean, evaluate?: boolean): Net;
