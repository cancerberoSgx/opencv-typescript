# react2 — opencv-ts Monaco playground

A Vite + React + TypeScript app: pick an OpenCV.js example from a gallery, edit it live in a
Monaco editor with full typecheck and autocomplete against this repo's `opencv-ts`, and run
it against a real `opencv.js` build. Same spirit as
[mirada-ts-playground](https://cancerberosgx.github.io/demos/mirada-ts-playground), rebuilt
against `opencv-ts`'s current typings instead of mirada's own bindings.

## Setup

```sh
npm install
npm run setup:opencv   # copies /home/sg/git/opencv/build_js/bin/opencv.js -> public/opencv.js
npm run dev
```

(Edit `setup:opencv` in `package.json`, or copy a different `opencv.js` into
`public/opencv.js` yourself, to point at another build - see `opencv-compiler`.)

## Architecture

- **`src/editor/setupOpenCvTypes.ts`** feeds Monaco's TypeScript worker every `.d.ts` file
  from the sibling `opencv-ts` package (via `vite.config.ts`'s `opencvTsLibsPlugin` /
  `virtual:opencv-ts-libs` - always the currently-generated `opencv-ts`, no separate "pack"
  step to keep in sync) plus this app's own `playgroundGlobals.d.ts`, so example code gets
  real typecheck/autocomplete for `cv.*` and this playground's small runtime helpers with no
  imports needed - exactly as it appears in the editor.
- **`src/opencv/playgroundHelpers.ts`** re-implements the handful of `mirada` runtime helpers
  (`fromUrl`, `loadDataFile`, `toRgba`, `CameraHelper`, `sleep`) the ported examples use, since
  `opencv-ts` is types-only. Published as globals via `installPlaygroundGlobals()`.
- **`src/editor/runExample.ts`** strips types from the editor's current text (via the real
  TypeScript compiler, `ts.transpileModule`) and runs it as an ES module through a Blob URL +
  dynamic `import()` - see its doc comment for why (isolated module scope per run, top-level
  `await` for free) and for the one real gotcha this shape has (a fire-and-forget example
  IIFE's *own* async failures don't reach the `import()` promise - handled via
  `window`'s `error`/`unhandledrejection` events instead).
- **`src/examples/manifest.ts`** is the gallery: each entry pairs a title/description with its
  source file's raw text (`?raw` import) from `src/examples/sources/*.example.ts`.

## Examples

Ported from mirada-ts-playground's `src/examples/toPack/**`, adapted to `opencv-ts`'s current
typings (see each file's own comment for what changed and why):

- **Working**: `dilate`, `watershed`, `trackbar`, `contourFunctionsShape`, `featuresEllipse`,
  `fft`.
- **`faceDetection`** is in the gallery but currently fails at runtime
  (`cv.CascadeClassifier is not a constructor`) - `CascadeClassifier` doesn't exist anywhere
  in this repo's opencv 5.x checkout (`opencv-compiler/output/opencv`) at all; it was
  apparently removed/restructured upstream since the version mirada's original example
  targeted. `opencv-ts/hacks/objdetect.d.ts` still declares it (typechecks fine, throws at
  runtime) - a real gap to revisit, likely by switching this example to `FaceDetectorYN` (a
  DNN-based replacement already in the curated whitelist) instead, which needs a fetched ONNX
  model file this app doesn't source yet.
- **Not yet ported**: `denseOpticalFlow`, `dnnHighLevelGeneration`, `faceDetectionCamera`,
  `faceRecognOtherModelsTest`, `lucasKanadeOpticalFlow`, `trackbarVideo`, `trainingTest`,
  `videoDisplay` - the camera/video ones need a live `getUserMedia` stream (`CameraHelper`
  already supports this, they just haven't been ported yet); the dnn/training ones need
  pretrained model assets this app doesn't fetch/bundle yet.

To add an example: drop a new `*.example.ts` file in `src/examples/sources/` (self-contained
IIFE, drawing to `#outputCanvas` - see any existing one) and add an entry to
`src/examples/manifest.ts`.

## Deployed demo

Published as a GitHub Pages demo at `pages/demos/react2` (see the root
[README](../../README.md#github-pages)) - `scripts/build-demo-react2.sh` points the build at
the shared `pages/demos/assets/opencv.js` via the `VITE_OPENCV_URL` build-time env var
(`useOpenCv()`, `src/opencv/useOpenCv.ts`), same convention as `react1`.
