#!/usr/bin/env bash
# opencv-compiler
#
# Single entry point: clones opencv, compiles opencv.js (emscripten) and the
# opencv doxygen XML docs, all inside Docker. The only host dependency is
# Docker itself.
#
# Usage:
#   ./build.sh
#
# Config (env vars, or a .env file next to this script - see .env.example):
#   OPENCV_REPO             git repo to clone            (default: https://github.com/opencv/opencv.git)
#   OPENCV_REF              branch/tag/commit to build    (default: 5.x)
#   OUTPUT_DIR               host dir the opencv checkout/build lands in (default: ./output/opencv)
#   FORCE_REBUILD_OPENCVJS  1 = recompile opencv.js even if cached (default: 0)
#   FORCE_REBUILD_DOCS      1 = rebuild the doxygen XML docs even if cached (default: 0)
#   BUILD_JOBS              parallel make jobs for the doc build (default: all cores)
#   RUN_AS_HOST_USER        1 = run the container as your host uid/gid, so output
#                           files aren't root-owned (default: 0 - runs as root,
#                           which is more portable across emsdk image versions;
#                           if left at 0 and you need to remove ./output later,
#                           use `sudo rm -rf output`)
#
# Extra arguments are forwarded to `docker build` (e.g. --no-cache).

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

log() { printf '\n\033[1;36m==> %s\033[0m\n' "$*"; }

if [ -f .env ]; then
  # shellcheck disable=SC1091
  set -a && source .env && set +a
fi

: "${OPENCV_REPO:=https://github.com/opencv/opencv.git}"
: "${OPENCV_REF:=5.x}"
: "${OUTPUT_DIR:=$SCRIPT_DIR/output/opencv}"
: "${FORCE_REBUILD_OPENCVJS:=0}"
: "${FORCE_REBUILD_DOCS:=0}"
: "${BUILD_JOBS:=0}"
: "${RUN_AS_HOST_USER:=0}"

if ! command -v docker >/dev/null 2>&1; then
  echo "docker is required but was not found on PATH. Install Docker and try again." >&2
  exit 1
fi

mkdir -p "$OUTPUT_DIR"

IMAGE_TAG="opencv-compiler:latest"

log "Building image ($IMAGE_TAG)"
docker build -t "$IMAGE_TAG" "$@" "$SCRIPT_DIR"

USER_ARGS=()
if [ "$RUN_AS_HOST_USER" = "1" ]; then
  USER_ARGS=(--user "$(id -u):$(id -g)")
fi

log "Running build (opencv=$OPENCV_REPO@$OPENCV_REF, output=$OUTPUT_DIR)"
docker run --rm \
  "${USER_ARGS[@]}" \
  -v "$OUTPUT_DIR:/work/opencv" \
  -e OPENCV_REPO="$OPENCV_REPO" \
  -e OPENCV_REF="$OPENCV_REF" \
  -e FORCE_REBUILD_OPENCVJS="$FORCE_REBUILD_OPENCVJS" \
  -e FORCE_REBUILD_DOCS="$FORCE_REBUILD_DOCS" \
  -e BUILD_JOBS="$BUILD_JOBS" \
  -e HOME=/tmp \
  "$IMAGE_TAG"

JS_BUILD_DIR="$OUTPUT_DIR/build_js"
DOC_BUILD_DIR="$OUTPUT_DIR/build"

log "Build complete"
cat <<EOF
opencv.js build dir:   $JS_BUILD_DIR
doxygen XML build dir: $DOC_BUILD_DIR

Feed these into opencv-types-generator, e.g. from the opencv-types-generator/ folder:

  opencv-types-generator \\
    --opencv-build-dir $JS_BUILD_DIR \\
    --opencv-doc-build-dir $DOC_BUILD_DIR \\
    --out-dir ../opencv-ts \\
    --package-name opencv-ts \\
    --package-version <opencv version, e.g. 4.x> \\
    --jobs 8
EOF
