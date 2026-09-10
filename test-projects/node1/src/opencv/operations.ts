import type { Mat } from "opencv-ts";

// Each operation below allocates its own output Mat(s) and returns exactly one `Mat` the
// caller is responsible for `.delete()`-ing (see cli.ts) - it never mutates or deletes `src`,
// matching the ownership convention opencv.js's own examples use. `cv` here is the ambient
// global from opencv-ts (see loadOpenCv.ts and tsconfig.json's `types`).
//
// These are intentionally the same four operations react1 exercises against opencv.js's
// browser-side `cv.matFromImageData`, just fed here from `image.ts`'s Node/jimp-based
// `cv.matFromArray` instead - same RGBA (`CV_8UC4`) source Mat shape either way.

export function toGrayscale(src: Mat): Mat {
  const dst = new cv.Mat();
  cv.cvtColor(src, dst, cv.COLOR_RGBA2GRAY);
  return dst;
}

export function blur(src: Mat): Mat {
  const dst = new cv.Mat();
  const ksize = new cv.Size(9, 9);
  cv.GaussianBlur(src, dst, ksize, 0);
  return dst;
}

export function cannyEdges(src: Mat): Mat {
  const gray = toGrayscale(src);
  const edges = new cv.Mat();
  cv.Canny(gray, edges, 50, 100);
  gray.delete();
  return edges;
}

export function sobelEdges(src: Mat): Mat {
  const gray = toGrayscale(src);
  const gradX = new cv.Mat();
  cv.Sobel(gray, gradX, cv.CV_16S, 1, 0);
  const absGradX = new cv.Mat();
  cv.convertScaleAbs(gradX, absGradX);
  gray.delete();
  gradX.delete();
  return absGradX;
}
