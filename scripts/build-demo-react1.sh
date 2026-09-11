#!/usr/bin/env bash
# Builds the test-projects/react1 web demo and copies it into pages/demos/react1.
#
# The build points react1 at the shared pages/demos/assets/opencv.js (see
# fetch-opencv-asset.sh) instead of bundling its own copy - vite.config.ts's `base: "./"`
# keeps every asset URL relative, so the same build works no matter what path GitHub Pages
# serves it under.
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."

cd test-projects/react1
npm ci
VITE_OPENCV_URL=../assets/opencv.js npm run build
cd ../..

rm -rf pages/demos/react1
mkdir -p pages/demos/react1
cp -r test-projects/react1/dist/. pages/demos/react1/

# public/opencv.js (local-dev-only, see react1's `setup:opencv`) gets copied into dist/ by
# Vite along with everything else in public/ - strip it so the demo only ever ships from
# the single shared pages/demos/assets/opencv.js.
rm -f pages/demos/react1/opencv.js
