#!/usr/bin/env bash
# Updates the single opencv.js committed to git at pages/demos/assets/opencv.js - the one
# every demo under pages/demos/** loads (e.g. via a relative "../assets/opencv.js" URL),
# instead of each demo bundling its own copy.
#
# This is a manual, local-only step (never run in CI) - copy in a build, review the diff,
# then `git add pages/demos/assets/opencv.js` and commit it like any other file, whenever
# the reference opencv.js needs updating (e.g. a new opencv version).
#
# Defaults to react1's local dev copy (already confirmed to work with this repo's demo
# loading code - see test-projects/react1/src/opencv/loadOpenCv.ts). Override with:
#   OPENCV_JS_SRC=../opencv-compiler/output/opencv/build_js/bin/opencv.js scripts/sync-opencv-asset.sh
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."

SRC="${OPENCV_JS_SRC:-test-projects/react1/public/opencv.js}"
DEST=pages/demos/assets/opencv.js

if [ ! -f "$SRC" ]; then
  echo "error: opencv.js source not found at '$SRC'" >&2
  echo "  Point OPENCV_JS_SRC at a built opencv.js, e.g.:" >&2
  echo "  OPENCV_JS_SRC=/path/to/opencv.js scripts/sync-opencv-asset.sh" >&2
  exit 1
fi

mkdir -p "$(dirname "$DEST")"
cp "$SRC" "$DEST"
echo "Copied $SRC -> $DEST ($(du -h "$DEST" | cut -f1))"
echo "Remember to 'git add $DEST' and commit."
