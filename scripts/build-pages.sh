#!/usr/bin/env bash
# Builds everything under pages/ that's generated (the API docs, the react1 demo) before
# it's published to GitHub Pages. pages/demos/assets/opencv.js is NOT built here - it's
# committed to git directly (see scripts/sync-opencv-asset.sh) and just comes along with
# the checkout.
#
# .github/workflows/pages.yml runs this on every push to main and uploads pages/ directly
# as the Pages artifact. Safe to run locally too, e.g. to preview with
# `npx http-server pages`.
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."

scripts/build-api-docs.sh

if [ -f pages/demos/assets/opencv.js ]; then
  scripts/build-demo-react1.sh
  scripts/build-demo-react2.sh
else
  echo "warning: pages/demos/assets/opencv.js is missing - skipping the react1/react2 demo builds." >&2
  echo "  Run scripts/sync-opencv-asset.sh once and commit it." >&2
fi

touch pages/.nojekyll
echo "pages/ ready to publish."
