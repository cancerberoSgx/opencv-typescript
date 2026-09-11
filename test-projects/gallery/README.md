# gallery — interactive opencv-ts examples

An interactive gallery of OpenCV.js examples (Vite + React + TypeScript, typed via
`opencv-ts`). Each example has its own live controls (sliders/selects/checkboxes, and for
a few, draggable handles on the canvas itself) wired straight to the `cv.*` call it's
demonstrating - move a control, the result canvas updates.

Unlike `../react1` (a handful of buttons to smoke-test a few operations), this project
tries to cover a meaningful cross-section of the OpenCV.js tutorial API surface
(https://docs.opencv.org/4.9.0/d5/d10/tutorial_js_root.html) with something to actually
play with per example, and to report - per example - how good the `opencv-ts` typings
actually are for it.

This app is 100% TypeScript; no `.js`/`.jsx` source files.

## Setup

```sh
npm install
npm run setup:opencv   # copies /home/sg/git/opencv/build_js/bin/opencv.js -> public/opencv.js
npm run dev
```

(`opencv-ts` is installed from the sibling package in this repo, same as `react1`.)

## Examples (round 1 - 14 of a planned 20)

Grouped into three categories in the sidebar:

- **Core Image Ops**: Colorspace Explorer, Arithmetic & Bitwise Blend, Thresholding Lab,
  Affine Transform, Perspective Warp.
- **Filtering & Morphology**: Smoothing Filters, Morphology Studio, Edge Detection Suite,
  Image Pyramids, Border & Padding.
- **Shape & Structure**: Contours Explorer, Hough Line Detection, Hough Circle Detection,
  Template Matching.

Six more (histograms/CLAHE, watershed, grabCut, feature detection/matching, optical flow,
background subtraction) are designed but not yet built - several of them hit real
`opencv-ts` typings gaps in their own right (see below), which is exactly why they're a
good second batch rather than a first one.

## Typing-status badges

Every example shows a badge next to its code panel:

- 🟢 **Fully typed** - runs with no casts, straight against `opencv-ts`'s generated types.
- 🔴 **Needs a runtime cast** - the example works, but only by reaching past a real typings
  gap. Two are on display here:
  - **Contours Explorer**: `cv.MatVector` (required by `findContours`/`drawContours`) is
    only declared as a *type alias* in `opencv-ts/hacks/mat.d.ts`
    (`OutputArrayOfArrays = Mat`), not as a real constructible class the way its siblings
    (`RectVector`, `PointVector`, `KeyPointVector`, ...) are in `hacks/scalars.d.ts`. Needs
    `new (cv as any).MatVector()`.
  - **Template Matching**: `cv.minMaxLoc`'s generated signature mirrors OpenCV's C++
    signature (`minVal`/`maxVal`/`minLoc`/`maxLoc` as output-reference params, returning
    `void`) but opencv.js's actual custom JS binding takes `(src, mask?)` and *returns* a
    `{minVal, maxVal, minLoc, maxLoc}` object - the declared signature doesn't match what
    actually runs, so the call needs a cast back to its real shape.

  Both are worth fixing in `opencv-types-generator` itself (make `MatVector` a real class
  like its siblings; special-case `minMaxLoc`'s binding-utils signature) rather than worked
  around forever in every consumer.

## Architecture

- `src/opencv/` - `loadOpenCv.ts`/`useOpenCv.ts`, copied verbatim from `react1`.
- `src/lib/types.ts` - the `ExampleDef`/`Control` shape every example implements, plus
  small `num`/`str`/`bool`/`odd` param-reading helpers.
- `src/lib/sources.ts` - synthetic sample scenes (no external image assets needed), same
  spirit as `react1`'s canvas-drawn scene.
- `src/components/` - generic, example-agnostic UI: `ControlsPanel` (renders a `Control[]`
  as inputs), `InteractionOverlay` (draggable rect/corner handles for the handful of
  examples that need mouse input), `SourcePicker`, `CodePanel`, `Sidebar`, `ExampleView`
  (the glue: draws the source, runs the example's pipeline debounced on every change,
  `imshow`s the result, cleans up every `Mat`).
- `src/examples/*.ts` - one file per example, each exporting an `ExampleDef`. This is
  where all the actual `cv.*` calls live.
