// Hand-maintained, NOT generated. `cv.FS` is emscripten's own in-memory filesystem API,
// attached directly to the Module object at runtime (it's what backs `FS_createDataFile`,
// already declared in `hacks/runtime.d.ts`, and the classifier/model-loading functions that
// take a file path). It has no C++/doxygen origin, so generation can never produce it.
// Ported from mirada's src/types/emscripten.ts#FS, trimmed to the subset opencv.js example
// code commonly uses (reading/writing files before handing their path to e.g.
// `CascadeClassifier#load` or `readNetFromCaffe`).
export interface FSStat {
  mode: number;
  size: number;
}

export interface EmscriptenFS {
  isFile(mode: number): boolean;
  isDir(mode: number): boolean;
  mkdir(path: string, mode?: number): unknown;
  readdir(path: string): string[];
  unlink(path: string): void;
  stat(path: string, dontFollow?: boolean): FSStat;
  readFile(path: string, opts?: { encoding: string; flags: string }): ArrayBufferView;
  writeFile(
    path: string,
    data: ArrayBufferView | string,
    opts?: { encoding: string; flags: string }
  ): void;
  /**
   * @param canRead @param canWrite @param canOwn as understood by emscripten's MEMFS - opencv.js
   * example code conventionally passes `true, false, false`.
   */
  createDataFile(
    parent: string,
    name: string,
    data: ArrayBufferView,
    canRead: boolean,
    canWrite: boolean,
    canOwn: boolean
  ): void;
}

export declare const FS: EmscriptenFS;
