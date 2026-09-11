# opencv-compiler

Builds the two inputs [`opencv-types-generator`](../opencv-types-generator) needs, entirely
inside Docker: the only thing you need installed locally is **Docker**.

1. `git clone`s [opencv](https://github.com/opencv/opencv)
2. compiles **opencv.js** (emscripten/wasm, via `platforms/js/build_js.py`)
3. compiles opencv's **doxygen docs with XML output** (`cmake -DBUILD_DOCS=ON` + `make doxygen`,
   with `GENERATE_XML=YES` patched into `doc/Doxyfile.in`)

Both build folders are written to a host directory so they're immediately usable as
`opencv-types-generator`'s `--opencv-build-dir` / `--opencv-doc-build-dir`.

Heads up on resources: compiling opencv.js and its docs is heavy - expect 30-90+ minutes,
several CPU cores used, and 10+ GB of disk for the opencv checkout and both build folders.

## Usage

```sh
cd opencv-compiler
./build.sh
```

That's it. On success you'll see:

```
opencv.js build dir:   opencv-compiler/output/opencv/build_js
doxygen XML build dir: opencv-compiler/output/opencv/build
```

Feed those straight into `opencv-types-generator`:

```sh
cd ../opencv-types-generator
opencv-types-generator \
  --opencv-build-dir ../opencv-compiler/output/opencv/build_js \
  --opencv-doc-build-dir ../opencv-compiler/output/opencv/build \
  --out-dir ../opencv-ts \
  --package-name opencv-ts \
  --package-version <opencv version> \
  --jobs 8
```

`--package-version` should match the opencv version you built here - see `OPENCV_REF` below.

Run `./build.sh` again later and it reuses the checkout/build already under `output/opencv`
instead of redoing the slow parts (unless you set `FORCE_REBUILD_OPENCVJS` / `FORCE_REBUILD_DOCS`,
or switch `OPENCV_REF` to a different ref that needs a fresh build).

### Configuration

All of these are optional, and can be set as environment variables or in a `.env` file next
to `build.sh` (see `.env.example`):

| Variable                  | Default                                 | Meaning                                                          |
| -------------------------- | ---------------------------------------- | ------------------------------------------------------------------ |
| `OPENCV_REPO`              | `https://github.com/opencv/opencv.git`  | opencv git repo to clone                                            |
| `OPENCV_REF`               | `5.x`                                   | branch/tag/commit to check out (pick the version you want typings for) |
| `OUTPUT_DIR`               | `./output/opencv`                       | host dir the opencv checkout and both build folders land in         |
| `FORCE_REBUILD_OPENCVJS`   | `0`                                      | set to `1` to recompile opencv.js even if cached                    |
| `FORCE_REBUILD_DOCS`       | `0`                                      | set to `1` to rebuild the doxygen XML docs even if cached           |
| `BUILD_JOBS`               | all cores                               | parallel `make` jobs for the doxygen build                          |
| `RUN_AS_HOST_USER`         | `0`                                      | set to `1` to run the container as your host uid/gid (avoids root-owned output; may not work on every emsdk base image - if it fails, leave at `0` and `sudo rm -rf output` when you need to clean up) |
| `EMBIND_ALL`               | `1`                                      | see "Binding everything" below                                      |

Extra arguments to `build.sh` are forwarded to `docker build` (e.g. `./build.sh --no-cache`).

### Binding everything

opencv's own `platforms/js/build_js.py` only binds into opencv.js whatever's explicitly
listed in its hand-curated `platforms/js/opencv_js.config.py` whitelist - most of OpenCV's
public API is left out of opencv.js (and therefore out of any typings generated from it)
simply because nobody added it to that list, not because it can't be bound.

With the default `EMBIND_ALL=1`, `entrypoint.sh` runs
[`patch-embindgen-bind-all.py`](patch-embindgen-bind-all.py) on opencv's
`modules/js/generator/embindgen.py` right after cloning, before building. It adds an
`OPENCV_JS_BIND_ALL=1` bypass: every class, method and free function the header parser
discovers in whichever modules are being built gets bound, ignoring
`opencv_js.config.py`'s whitelist entirely (`embindgen.py`'s own `ignore_list` - a few dozen
genuinely un-embindable signatures - still applies, and still needs occasional additions as
new build failures surface upstream). This only touches the ephemeral in-container checkout,
never anything in this repo's git history, and is idempotent (skipped on a re-run against an
already-patched checkout).

Set `EMBIND_ALL=0` to fall back to opencv's normal, smaller, curated opencv.js instead
(faster to build, much less surface area for `opencv-types-generator` to turn into typings).

### Emscripten / C++ standard

The image tracks `emscripten/emsdk:latest`. Recent emscripten versions require C++17 for
Embind, but opencv's own `CMakeLists.txt` doesn't raise `CMAKE_CXX_STANDARD` past its default
(11) on its own - `entrypoint.sh` forces it with `--cmake_option="-DCMAKE_CXX_STANDARD=17"`
(and `_STANDARD_REQUIRED=ON`) when building opencv.js, so this works out of the box.

### Clearing the cache

```sh
rm -rf output    # or: sudo rm -rf output, if RUN_AS_HOST_USER was left at 0
```

removes the checkout and both build folders, so the next `./build.sh` starts from a fresh
`git clone`.

## Files

- `build.sh` - the single entry point: builds the Docker image and runs it, bind-mounting
  `OUTPUT_DIR` on the host to `/work/opencv` in the container.
- `Dockerfile` - `emscripten/emsdk` base image (ships emcc/em++, python3, git, cmake, make,
  Node.js) plus `doxygen`.
- `entrypoint.sh` - runs inside the container: clone → build opencv.js → build doxygen XML,
  each step skipped on re-run if its output marker file already exists.

This does **not** run `opencv-types-generator` itself - that's a separate step, in the
sibling `opencv-types-generator` project (Python, runs on the host, not in Docker).
