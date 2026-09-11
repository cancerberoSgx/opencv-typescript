// Ambient declarations for the small runtime surface `src/opencv/playgroundHelpers.ts`
// publishes as globals (see its `installPlaygroundGlobals()`). This file serves two
// purposes: it's included in this app's own tsconfig (so App.tsx's `window.fromUrl = ...`
// etc typecheck), and its *text* is also fed to Monaco as an extra lib (see
// src/editor/setupOpenCvTypes.ts) so example code in the editor gets the same
// autocomplete/typechecking for `fromUrl(...)`, `new CameraHelper(...)` etc as it does for
// `cv`.
import type { Mat } from "opencv-ts";

declare global {
  /** Loads an image from a URL into a Mat. See playgroundHelpers.ts#fromUrl. */
  function fromUrl(url: string): Promise<Mat>;

  /**
   * Fetches `url` into opencv.js's in-memory filesystem (`cv.FS`) and returns the file name
   * it was written under, ready for e.g. `CascadeClassifier#load`. See
   * playgroundHelpers.ts#loadDataFile.
   */
  function loadDataFile(url: string, name?: string): Promise<string>;

  /** Converts a 1/3/4-channel Mat to 4-channel RGBA. See playgroundHelpers.ts#toRgba. */
  function toRgba(mat: Mat, dst?: Mat): Mat;

  function sleep(ms?: number): Promise<void>;

  /** Starts/stops a getUserMedia camera stream. See playgroundHelpers.ts#CameraHelper. */
  class CameraHelper {
    streaming: boolean;
    videoInput: HTMLVideoElement;
    outputCanvas: HTMLCanvasElement;
    callback: () => void;
    constructor(videoInput: HTMLVideoElement, outputCanvas: HTMLCanvasElement, callback: () => void);
    start(): void;
    stop(): void;
  }
}

export {};
