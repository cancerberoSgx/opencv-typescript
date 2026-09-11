// See CodeEditor.tsx's comment - minimal Monaco import, not the full-language-set barrel.
import * as monaco from "monaco-editor/esm/vs/editor/editor.api";
import { opencvTsLibs } from "virtual:opencv-ts-libs";
import playgroundGlobalsDts from "./playgroundGlobals.d.ts?raw";

const OPENCV_TS_ROOT = "file:///node_modules/opencv-ts/";

let installed = false;

/**
 * Feeds Monaco's TypeScript worker everything it needs to typecheck and autocomplete
 * example code exactly the way this app's own `src/` does: every `opencv-ts` `.d.ts` file
 * (mirroring its real relative layout, so the package's own internal relative imports like
 * `generated/dnn_Net.ts`'s `from '../hacks/scalars'` resolve), registered under a `opencv-ts`
 * `paths` mapping so `import type { Mat } from "opencv-ts"` resolves in the editor too; plus
 * this app's own small `playgroundGlobals.d.ts` (the `fromUrl`/`loadDataFile`/`toRgba`/
 * `CameraHelper` globals - see src/opencv/playgroundHelpers.ts). `opencv-ts`'s
 * `declare global { var cv: CV }` (in its index.d.ts, included below) is what then makes
 * bare `cv.imread(...)` etc resolve in example code with no import at all, matching how the
 * examples are written.
 */
export function installOpenCvTypesForMonaco(): void {
  if (installed) return;
  installed = true;

  const defaults = monaco.languages.typescript.typescriptDefaults;

  defaults.setCompilerOptions({
    target: monaco.languages.typescript.ScriptTarget.ES2020,
    module: monaco.languages.typescript.ModuleKind.ESNext,
    moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
    lib: ["es2022", "dom"],
    jsx: monaco.languages.typescript.JsxEmit.None,
    allowNonTsExtensions: true,
    baseUrl: "file:///",
    paths: {
      "opencv-ts": [OPENCV_TS_ROOT + "index.d.ts"],
    },
    strict: true,
    skipLibCheck: true,
    noEmit: true,
  });

  defaults.setDiagnosticsOptions({
    noSemanticValidation: false,
    noSyntaxValidation: false,
  });

  defaults.setEagerModelSync(true);

  for (const lib of opencvTsLibs) {
    defaults.addExtraLib(lib.content, OPENCV_TS_ROOT + lib.path);
  }
  defaults.addExtraLib(playgroundGlobalsDts, "file:///playground-globals.d.ts");
}
