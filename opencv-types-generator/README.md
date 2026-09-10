# opencv-types-generator

Generates a complete, installable **npm TypeScript typings package** for
[opencv.js](https://docs.opencv.org/5.0/js_tutorials/js_tutorials.html) from OpenCV's own
doxygen XML API docs, cross-referenced against the `bindings.cpp` file its build produces
(the literal embind registration of every class/function/constant actually exposed on the
`cv` object at runtime).

Written in Python so per-compound parsing and rendering can run across every CPU core in
parallel (`concurrent.futures.ProcessPoolExecutor`). Independent from, and not affiliated
with, the [mirada](https://www.npmjs.com/package/mirada) project - though it draws on the
approach (and known pitfalls) of mirada's `doxygen2typescript` tool.

## What this is not

This tool does **not** build opencv.js or its docs. You need, beforehand:

1. An opencv.js build (produces `modules/js_bindings_generator/gen/bindings.cpp`).
2. That build's doxygen XML docs, with `GENERATE_XML=YES` (produces `doc/doxygen/xml/`).

See OpenCV's own [js_tutorials](https://docs.opencv.org/5.0/js_tutorials/js_tutorials.html)
and `platforms/js/build_js.py` for building opencv.js; enable `BUILD_DOCS=ON` +
`GENERATE_XML=YES` in the same or a parallel CMake build to get the doxygen XML.

## Usage

```sh
cd opencv-types-generator
pip install -e .
opencv-types-generator
```

All arguments are optional and default to the values below (matching the layout produced by
`opencv-compiler`), so the bare command above is equivalent to:

```sh
opencv-types-generator \
  --opencv-build-dir ../opencv-compiler/output/opencv/build_js \
  --opencv-doc-build-dir ../opencv-compiler/output/opencv/build \
  --out-dir ../opencv-ts \
  --package-name opencv-ts \
  --package-version 5.0.0 \
  --jobs 8
```

Pass `--opencv-doc-build-dir` explicitly if your build produces the wasm build and docs in
different directories. The result in `--out-dir` is a complete npm project - `cd` into it,
`npm install`, `npm install typescript --save-dev`, and
`npx tsc -p smoke-test/tsconfig.json` to type-check the bundled smoke test.

## Architecture

See [`ARCHITECTURE.md`](./ARCHITECTURE.md) for the full pipeline, the two structural fixes
applied vs. mirada's `doxygen2typescript` (identifier + inheritance resolution), and how
generated code cross-references itself and the hand-maintained `hacks/*.d.ts` runtime glue.

## Development

```sh
python3 -m venv .venv && ./.venv/bin/pip install -e ".[dev]"
./.venv/bin/pytest
```

Tests run against real fixture data in `tests/fixtures/` (`mat.xml`, `bindings.sample.cpp`,
`index.sample.xml` are genuine artifacts from a real opencv.js build) plus a small synthetic
`tests/fixtures/mini_build/` used for the full-pipeline end-to-end test, which also
type-checks its output with a real `tsc` when Node/npm is available.
