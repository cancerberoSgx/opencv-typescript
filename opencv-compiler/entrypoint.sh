#!/usr/bin/env bash
# Runs inside the opencv-compiler container:
#   1. clone opencv (or reuse the cached checkout mounted at $OPENCV_DIR)
#   2. compile opencv.js (emcmake + build_js.py --build_wasm --simd)
#   3. compile the opencv doxygen docs with GENERATE_XML=YES
#
# Steps 2 and 3 are skipped on re-runs if their output already exists (so the
# opencv checkout/build can live in a mounted volume across container runs)
# unless FORCE_REBUILD_OPENCVJS / FORCE_REBUILD_DOCS are set to 1.

set -euo pipefail

log() { printf '\n\033[1;36m==> %s\033[0m\n' "$*"; }

# The bind-mounted checkout is typically owned by the host user, which makes
# git refuse to touch it ("detected dubious ownership"). This container has
# nothing else to protect, so trust everything under it.
git config --global --add safe.directory '*'

: "${OPENCV_DIR:=/work/opencv}"
: "${OPENCV_REPO:=https://github.com/opencv/opencv.git}"
: "${OPENCV_REF:=4.x}"
: "${FORCE_REBUILD_OPENCVJS:=0}"
: "${FORCE_REBUILD_DOCS:=0}"
: "${BUILD_JOBS:=0}"

if [ "$BUILD_JOBS" = "0" ]; then
  BUILD_JOBS="$(nproc)"
fi

OPENCV_JS_BUILD_DIR="$OPENCV_DIR/build_js"
OPENCV_DOC_BUILD_DIR="$OPENCV_DIR/build"
OPENCV_JS_MARKER="$OPENCV_JS_BUILD_DIR/bin/opencv.js"
OPENCV_DOC_MARKER="$OPENCV_DOC_BUILD_DIR/doc/doxygen/xml/index.xml"

# --- step 0: clone opencv (or reuse cached checkout) ------------------------
if [ -d "$OPENCV_DIR/.git" ]; then
  log "Reusing existing opencv checkout at $OPENCV_DIR"
else
  log "Cloning $OPENCV_REPO ($OPENCV_REF) into $OPENCV_DIR"
  git clone "$OPENCV_REPO" "$OPENCV_DIR"
fi
git -C "$OPENCV_DIR" checkout "$OPENCV_REF"

# --- step 1: compile opencv.js ----------------------------------------------
if [ "$FORCE_REBUILD_OPENCVJS" = "1" ] || [ ! -f "$OPENCV_JS_MARKER" ]; then
  log "Building opencv.js (emcmake build_js.py --build_wasm --simd)"
  # Recent emscripten (this image tracks emsdk's "latest") requires C++17 for
  # Embind, but opencv's own CMakeLists.txt doesn't raise CMAKE_CXX_STANDARD
  # past its default (11) on its own - force it here.
  ( cd "$OPENCV_DIR" && emcmake python3 platforms/js/build_js.py "$OPENCV_JS_BUILD_DIR" --build_wasm --simd \
      --cmake_option="-DCMAKE_CXX_STANDARD=17" \
      --cmake_option="-DCMAKE_CXX_STANDARD_REQUIRED=ON" )
else
  log "opencv.js already built ($OPENCV_JS_MARKER exists), skipping. Set FORCE_REBUILD_OPENCVJS=1 to force."
fi

# --- step 2: compile opencv docs with XML output -----------------------------
if [ "$FORCE_REBUILD_DOCS" = "1" ] || [ ! -f "$OPENCV_DOC_MARKER" ]; then
  log "Enabling GENERATE_XML in doc/Doxyfile.in"
  sed -i -E 's/^([[:space:]]*GENERATE_XML[[:space:]]*=)[[:space:]]*NO/\1 YES/' "$OPENCV_DIR/doc/Doxyfile.in"

  log "Configuring opencv build (cmake -DBUILD_DOCS=ON) and building the doxygen target"
  mkdir -p "$OPENCV_DOC_BUILD_DIR"
  ( cd "$OPENCV_DOC_BUILD_DIR" && cmake -DBUILD_DOCS=ON .. && make -j"$BUILD_JOBS" doxygen )
else
  log "Doxygen XML docs already built ($OPENCV_DOC_MARKER exists), skipping. Set FORCE_REBUILD_DOCS=1 to force."
fi

log "Done."
echo "  opencv.js build dir:  $OPENCV_JS_BUILD_DIR  ($OPENCV_JS_MARKER)"
echo "  doxygen XML build dir: $OPENCV_DOC_BUILD_DIR  ($OPENCV_DOC_MARKER)"
