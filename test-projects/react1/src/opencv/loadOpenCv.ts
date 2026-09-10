import type { CV } from "opencv-ts";

// NOTE on this module: opencv.js is loaded as a classic (non-module) <script> tag because
// its own UMD wrapper expects to run that way and assign globals - it is NOT imported as
// an ES module. `opencv-ts`'s `declare global { var cv: CV }` (see its README's "ambient
// global" usage) is what makes the resulting runtime global type-check as `CV` in the rest
// of this app; it's brought into the program via `compilerOptions.types` in tsconfig.app.json.
//
// The specific opencv.js build this project points at (see public/opencv.js /
// package.json's `setup:opencv` script) uses emscripten's newer async Module factory
// internally: its UMD wrapper synchronously assigns `window.cv = <the factory's Promise>`,
// so `window.cv` is briefly a `Promise<CV>`, not a `CV`, until that resolves. Relying on
// `cv.onRuntimeInitialized` the classic way doesn't work with a bare `{}` Module object in
// that case (there is no synchronous `cv` object yet to attach the callback to in time).
//
// What *does* still work with this build: pre-creating a `Module` object with an
// `onRuntimeInitialized` callback *before* the script loads. Emscripten uses that
// pre-existing global `Module` (instead of allocating an empty one) as the object it
// progressively attaches the whole `cv` API onto, and still invokes
// `Module.onRuntimeInitialized` once the wasm runtime is ready - regardless of whether the
// factory itself is sync or async/Promise-returning. So we read the ready API back off of
// `moduleConfig` itself (not off of `window.cv`) and only then publish it as `window.cv`,
// which is what the rest of the app (and opencv-ts's types) expect to find.
interface OpenCvModuleConfig {
  onRuntimeInitialized: () => void;
}

declare global {
  interface Window {
    Module?: OpenCvModuleConfig;
  }
}

const SCRIPT_ELEMENT_ID = "opencv-js-runtime";

let openCvPromise: Promise<CV> | undefined;

/** Injects opencv.js and resolves once `cv` is fully initialized and ready to use. */
export function loadOpenCv(scriptUrl = "/opencv.js"): Promise<CV> {
  if (openCvPromise) {
    return openCvPromise;
  }

  openCvPromise = new Promise<CV>((resolve, reject) => {
    const moduleConfig: OpenCvModuleConfig = {
      onRuntimeInitialized() {
        const cvReady = moduleConfig as unknown as CV;
        window.cv = cvReady;
        resolve(cvReady);
      },
    };
    window.Module = moduleConfig;

    document.getElementById(SCRIPT_ELEMENT_ID)?.remove();

    const script = document.createElement("script");
    script.id = SCRIPT_ELEMENT_ID;
    script.src = scriptUrl;
    script.async = true;
    script.onerror = () => {
      openCvPromise = undefined;
      reject(new Error(`Failed to load opencv.js from "${scriptUrl}".`));
    };
    document.body.appendChild(script);
  });

  return openCvPromise;
}
