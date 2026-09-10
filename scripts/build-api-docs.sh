#!/usr/bin/env bash
# Generates the opencv-ts API docs (TypeDoc) into pages/opencv-ts-docs (see
# generate-api-docs/typedoc.json). Output is git-ignored - regenerated on every publish.
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."

cd generate-api-docs
npm ci
npm run generate
