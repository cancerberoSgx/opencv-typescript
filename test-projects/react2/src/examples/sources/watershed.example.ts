// Ported from mirada-ts-playground's examples/toPack/watershed.ts, adapted to opencv-ts.
// Marker-based watershed segmentation of a coin image: separates touching coins by
// computing sure background/foreground regions from a distance transform, then lets
// `cv.watershed` fill in the boundaries.
export {};

(async () => {
  const canvas = document.getElementById("outputCanvas") as HTMLCanvasElement;
  const src = await fromUrl("assets/coins.png");
  const gray = new cv.Mat();
  const opening = new cv.Mat();
  const coinsBg = new cv.Mat();
  const coinsFg = new cv.Mat();
  const distTrans = new cv.Mat();
  const unknown = new cv.Mat();
  const markers = new cv.Mat();
  // gray and threshold image
  cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY, 0);
  cv.threshold(gray, gray, 0, 255, cv.THRESH_BINARY_INV + cv.THRESH_OTSU);
  // get background
  const kernel = cv.Mat.ones(3, 3, cv.CV_8U);
  cv.erode(gray, gray, kernel);
  cv.dilate(gray, opening, kernel);
  cv.dilate(opening, coinsBg, kernel, new cv.Point(-1, -1), 3);
  // distance transform
  cv.distanceTransform(opening, distTrans, cv.DIST_L2, 5);
  cv.normalize(distTrans, distTrans, 1, 0, cv.NORM_INF);
  // get foreground
  cv.threshold(distTrans, coinsFg, 0.7 * 1, 255, cv.THRESH_BINARY);
  coinsFg.convertTo(coinsFg, cv.CV_8U, 1, 0);
  cv.subtract(coinsBg, coinsFg, unknown);
  // get connected components markers
  cv.connectedComponents(coinsFg, markers);
  for (let i = 0; i < markers.rows; i++) {
    for (let j = 0; j < markers.cols; j++) {
      markers.intPtr(i, j)[0] = markers.ucharPtr(i, j)[0] + 1;
      if (unknown.ucharPtr(i, j)[0] === 255) {
        markers.intPtr(i, j)[0] = 0;
      }
    }
  }
  cv.cvtColor(src, src, cv.COLOR_RGBA2RGB, 0);
  cv.watershed(src, markers);
  // draw barriers in red
  for (let i = 0; i < markers.rows; i++) {
    for (let j = 0; j < markers.cols; j++) {
      if (markers.intPtr(i, j)[0] === -1) {
        src.ucharPtr(i, j)[0] = 255; // R
        src.ucharPtr(i, j)[1] = 0; // G
        src.ucharPtr(i, j)[2] = 0; // B
      }
    }
  }
  const dest = toRgba(src);
  cv.imshow(canvas, dest);
  src.delete();
  gray.delete();
  opening.delete();
  coinsBg.delete();
  dest.delete();
  coinsFg.delete();
  distTrans.delete();
  unknown.delete();
  markers.delete();
  kernel.delete();
})();
