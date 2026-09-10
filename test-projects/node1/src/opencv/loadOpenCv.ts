import type { CV } from "opencv-ts";
import { pathToFileURL } from "node:url";

// NOTE on this module: unlike react1's browser-side loadOpenCv.ts (which has to fight
// opencv.js's UMD wrapper into publishing a synchronous `window.cv`), Node's story here is
// much simpler and doesn't need a pre-created `Module.onRuntimeInitialized` hack at all.
//
// This build's UMD wrapper detects `typeof module === "object" && module.exports` (Node) and
// takes the `module.exports = factory()` branch, which *immediately invokes* opencv.js's own
// async emscripten factory function and assigns its return value - a `Promise<CV>` - as
// `module.exports`. So requiring/importing opencv.js under Node hands back that
// already-in-flight `Promise<CV>` directly (verified against the actual build this project
// points at); all that's needed here is to await it and publish the result as the ambient
// `cv` global that `opencv-ts`'s types (and the rest of this app) expect.
//
// opencv.js is loaded via a *dynamic* `import()` of an absolute file:// URL rather than a
// static import, both because its path is configurable (see `OPENCV_JS_PATH` below) and
// because - being a large, non-package build artifact outside this project - it has no
// specifier `tsc`/Node's resolver could statically resolve.
const DEFAULT_OPENCV_JS_PATH = "../../opencv-compiler/output/opencv/build_js/bin/opencv.js";

let openCvPromise: Promise<CV> | undefined;

/** Loads opencv.js from disk and resolves once `cv` is fully initialized and ready to use. */
export function loadOpenCv(scriptPath = process.env.OPENCV_JS_PATH ?? DEFAULT_OPENCV_JS_PATH): Promise<CV> {
  if (openCvPromise) {
    return openCvPromise;
  }

  openCvPromise = (async () => {
    let mod: unknown;
    try {
      mod = await import(pathToFileURL(scriptPath).href);
    } catch (err) {
      throw new Error(
        `Failed to load opencv.js from "${scriptPath}" (set OPENCV_JS_PATH to override): ${
          err instanceof Error ? err.message : String(err)
        }`
      );
    }

    const cvReady = await (mod as { default: Promise<CV> }).default;
    globalThis.cv = cvReady;
    return cvReady;
  })();

  return openCvPromise;
}
