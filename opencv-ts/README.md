# opencv-ts

Community TypeScript type declarations for [opencv.js](https://docs.opencv.org/5.0/js_tutorials/js_tutorials.html),
generated from OpenCV's own doxygen XML API docs cross-referenced against the
`bindings.cpp` file its build produces (the source of truth for what's actually exposed
on the `cv` object at runtime) - see
[opencv-types-generator](https://github.com/) for the generator itself.

## Install

```sh
npm install opencv-ts opencv.js
```

## Usage

**Ambient global** (`<script src="opencv.js"></script>` + `cv.onRuntimeInitialized`):

```ts
import "opencv-ts"; // side-effect import: brings the ambient `cv` global into scope

cv.onRuntimeInitialized = () => {
  const mat = new cv.Mat();
  // ...
};
```

**Module import** (bundler-driven `opencv.js` load):

```ts
import cv from "opencv.js";

const mat = new cv.Mat();
```

If your bundler/tsconfig doesn't pick up the ambient global declarations automatically,
add this package to your `tsconfig.json`'s `compilerOptions.types` array, or add a single
`import "opencv-ts";` somewhere in your program's entry point.

## Coverage

Not every OpenCV API makes it into these types - only what OpenCV's own opencv.js build
actually registers via embind is generated. `generation-report.json` (shipped in this
package) lists every `bindings.cpp` registration that had no matching doxygen XML node for
this particular build, if you're missing something.

## License

MIT
