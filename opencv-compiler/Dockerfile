# opencv-compiler build image
#
# Bundles everything needed to, in one container run:
#   1. git-clone opencv
#   2. compile opencv.js (emscripten/wasm)
#   3. compile the opencv doxygen docs with XML output enabled
#
# The two resulting build folders (build_js/ and build/) are what
# opencv-types-generator (the sibling project in this repo) consumes via its
# --opencv-build-dir / --opencv-doc-build-dir flags.
#
# emscripten/emsdk already ships emcc/em++, python3, git, cmake, make and a
# recent Node.js - everything build_js.py and the doxygen cmake target need
# except doxygen itself.
FROM emscripten/emsdk:latest

RUN apt-get update \
  && apt-get install -y --no-install-recommends doxygen \
  && rm -rf /var/lib/apt/lists/*

ENV OPENCV_DIR=/work/opencv
ENV OPENCV_REPO=https://github.com/opencv/opencv.git
ENV OPENCV_REF=4.x
ENV FORCE_REBUILD_OPENCVJS=0
ENV FORCE_REBUILD_DOCS=0
ENV BUILD_JOBS=0

COPY entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

WORKDIR /work
VOLUME ["/work/opencv"]

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
