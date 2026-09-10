# node1 — opencv-ts Node.js CLI smoke test

A standalone Node.js + TypeScript CLI that loads a real `opencv.js` build and runs an OpenCV
transformation against a `.png`/`.jpg`/`.jpeg` file on disk. It exists to check, hands-on,
that the typings produced by `opencv-types-generator` (as packaged in `opencv-ts`) actually
type-check and give a reasonable developer experience under Node - not just in a browser
(see the sibling `react1` project for that side) and not just against a synthetic
smoke-test file.

This app is 100% TypeScript; no `.js` source files (`dist/` is build output).

## How it fits together

- **`src/opencv/loadOpenCv.ts`** — loads opencv.js from disk via a dynamic `import()` of an
  absolute `file://` URL and awaits it into the ambient `cv` global. Node's story here is
  simpler than react1's browser one: this build's UMD wrapper takes its `module.exports =
  factory()` branch under Node, which immediately invokes opencv.js's async emscripten
  factory and hands back an already-in-flight `Promise<CV>` directly - no
  `Module.onRuntimeInitialized` dance needed.
- **`src/opencv/operations.ts`** — the same four operations react1 exercises
  (`toGrayscale`, `blur`, `cannyEdges`, `sobelEdges`), unchanged, against the generated
  `opencv-ts` API (`cvtColor`, `GaussianBlur`, `Canny`, `Sobel`, `convertScaleAbs`, `Size`).
- **`src/image.ts`** — the Node-side equivalent of react1's `cv.matFromImageData`/`cv.imshow`
  browser hacks: decodes a `.png`/`.jpg`/`.jpeg` file into an RGBA (`CV_8UC4`) `Mat` via
  [`jimp`](https://github.com/jimp-dev/jimp) + `cv.matFromArray` (this opencv.js build has no
  `imgcodecs` module compiled in, so there's no `cv.imread`/`cv.imencode` to reach for), and
  converts a result `Mat` (1- or 4-channel) back into a file the same way.
- **`src/cli.ts`** — the `--inputImage`/`--outputImage`/`--transformation` CLI itself, built
  on [`commander`](https://github.com/tj/commander.js).

## Setup

`opencv-ts` is installed from the sibling package in this repo (`file:../../opencv-ts`), so
it always reflects whatever is currently generated there.

```sh
npm install
```

`opencv.js` itself is **not** committed to the repo (it's a large build artifact) and is not
copied into this project - `loadOpenCv.ts` loads it directly from
`/home/sg/git/opencv/build_js/bin/opencv.js` by default. Set `OPENCV_JS_PATH` to point at a
different build (it must be the same OpenCV build/version `opencv-ts` was generated from,
since that's what determines whether the typings actually match the runtime API):

```sh
OPENCV_JS_PATH=/path/to/opencv.js node1 --inputImage in.png --outputImage out.png --transformation blur
```

## Run

```sh
npm run build
node dist/cli.js --inputImage ./in.png --outputImage ./out.png --transformation grayscale
```

(or `npm link` to install the `node1` bin, or `npm run dev -- --inputImage ...` to run
straight from TypeScript source via `tsx`, no build step needed.)

`--transformation` is one of:

- `grayscale`
- `blur`
- `cannyEdges`
- `sobelEdges`

`npm run typecheck` runs `tsc -b --noEmit` on its own, useful for checking the typings
without building.

## Notable typings/DX points this app exercises

- **Ambient global `cv`**: `opencv-ts` declares `declare global { var cv: CV }`. This app
  brings that into scope via `"types": ["opencv-ts"]` in `tsconfig.json` (the same approach
  react1 uses), so `cv.Mat`, `cv.matFromArray`, etc. are usable by name throughout `src/`
  with no import.
- **Loading opencv.js itself**: see `src/opencv/loadOpenCv.ts` for why Node's dynamic
  `import()` of this build hands back a `Promise<CV>` directly, in contrast to react1's
  browser-side `<script>`-tag-plus-`Module.onRuntimeInitialized` approach for the very same
  build.
- **Mat lifetime**: `cli.ts` `.delete()`s both the source `Mat` (from `readImageAsMat`) and
  the transformation's result `Mat`, exercising the hand-written `hacks/mat.d.ts`
  declarations (`matFromArray`) alongside the generated ones (`cvtColor`, `GaussianBlur`,
  `Canny`, `Sobel`, `convertScaleAbs`, `Size`, `Mat.channels()`, `Mat.rows`/`Mat.cols`).
