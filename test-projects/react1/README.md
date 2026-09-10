# react1 — opencv-ts browser smoke test

A standalone Vite + React + TypeScript app that loads a real `opencv.js` build in the
browser and runs a few OpenCV operations against it. It exists to check, hands-on, that the
typings produced by `opencv-types-generator` (as packaged in `opencv-ts`) actually type-check
and give a reasonable developer experience for real code - not just `tsc --noEmit` against a
synthetic smoke-test file.

This app is 100% TypeScript; no `.js`/`.jsx` source files.

## Setup

`opencv-ts` is installed from the sibling package in this repo (`file:../../opencv-ts`), so
it always reflects whatever is currently generated there.

`opencv.js` itself is **not** committed to the repo (it's a large build artifact). Copy one
in before running - it must be the same OpenCV build/version `opencv-ts` was generated
from, since that's what determines whether the typings actually match the runtime API:

```sh
npm install
npm run setup:opencv   # copies /home/sg/git/opencv/build_js/bin/opencv.js -> public/opencv.js
```

(Edit the `setup:opencv` script in `package.json`, or copy a different `opencv.js` into
`public/opencv.js` yourself, to point at another build.)

## Run

```sh
npm run dev
```

Open the printed local URL. The page draws a small synthetic scene on a `<canvas>` (no
external image needed) and shows buttons to run OpenCV operations against it once
`opencv.js` finishes loading: grayscale, Gaussian blur, Canny edge detection, and a Sobel
gradient.

`npm run typecheck` runs `tsc -b --noEmit` on its own, useful for checking the typings
without starting the dev server.

## Deployed demo

This app is also published as a GitHub Pages demo at `pages/demos/react1` (see the root
[README](../../README.md#github-pages)). That build points at a shared `opencv.js` used by
every demo instead of bundling its own: `useOpenCv()` (`src/opencv/useOpenCv.ts`) defaults
to `/opencv.js` for local dev, but `scripts/build-demo-react1.sh` overrides that via the
`VITE_OPENCV_URL` build-time env var to a relative `../assets/opencv.js`, resolving to
`pages/demos/assets/opencv.js`. `vite.config.ts`'s `base: "./"` keeps every other asset URL
relative too, so the same build works under whatever subpath GitHub Pages serves it from.

## Notable typings/DX points this app exercises

- **Ambient global `cv`**: `opencv-ts` declares `declare global { var cv: CV }`. This app
  brings that into scope via `"types": ["opencv-ts"]` in `tsconfig.app.json` (one of the two
  options the `opencv-ts` README documents) rather than a bare `import "opencv-ts";` side-effect
  import - the latter is best avoided in bundler-driven code, since a plain (non-`type`)
  import asks the bundler to resolve and load `opencv-ts`'s `main` entry (`index.d.ts`) as a
  runtime module, which is fragile. Type-only imports (`import type { CV, Mat } from
  "opencv-ts";`, used in `src/opencv/`) are fully erased by the TypeScript/esbuild toolchain
  and never hit the bundler at runtime, so they're used instead wherever a type is needed by
  name.
- **Loading opencv.js itself**: see `src/opencv/loadOpenCv.ts` for why this particular
  build needs a pre-created `Module.onRuntimeInitialized` rather than the simpler
  `cv.onRuntimeInitialized = ...` pattern the `opencv-ts` README shows for older opencv.js
  builds - this build's UMD wrapper hands back an in-flight `Promise` as `window.cv`
  immediately, rather than a synchronous placeholder object.
- **Mat lifetime**: every operation in `src/opencv/operations.ts` returns a fresh `Mat` the
  caller (`App.tsx`) is responsible for `.delete()`-ing, alongside the source `Mat` created
  via `cv.matFromImageData` - exercising the hand-written `hacks/mat.d.ts` declarations
  (`matFromImageData`, `imshow`) alongside the generated ones (`cvtColor`, `GaussianBlur`,
  `Canny`, `Sobel`, `convertScaleAbs`, `Size`).
