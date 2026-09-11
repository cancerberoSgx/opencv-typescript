// Ported from mirada-ts-playground's examples/toPack/contourFunctionsShape.ts, adapted to
// opencv-ts. Finds contours in a coin image, compares two of them with `cv.matchShapes`, and
// draws both in different colors.
//
// `findContours`'s `contours` parameter is typed `OutputArrayOfArrays` - opencv-ts's
// hacks/mat.d.ts aliases that to `MatVector` (a real `std::vector<Mat>` at the embind
// boundary), not `Mat` - passing a plain `Mat` there throws at runtime ("Expected null or
// instance of MatVector, got an instance of Mat").
export {};

(async () => {
  const canvas = document.getElementById("outputCanvas") as HTMLCanvasElement;
  const src = await fromUrl("assets/coins.png");
  const dst = cv.Mat.zeros(src.rows, src.cols, cv.CV_8UC3);
  cv.cvtColor(src, src, cv.COLOR_RGBA2GRAY, 0);
  cv.threshold(src, src, 177, 200, cv.THRESH_BINARY);
  const contours = new cv.MatVector();
  const hierarchy = new cv.Mat();
  cv.findContours(src, contours, hierarchy, cv.RETR_CCOMP, cv.CHAIN_APPROX_SIMPLE);
  const contourID0 = 10;
  const contourID1 = 5;
  const color0 = new cv.Scalar(255, 0, 0);
  const color1 = new cv.Scalar(0, 0, 255);
  const similarity = cv.matchShapes(contours.get(contourID0), contours.get(contourID1), 1, 0);
  console.log(`contourFunctionsShape: matchShapes similarity = ${similarity}`);
  cv.drawContours(dst, contours, contourID0, color0, 1, cv.LINE_8, hierarchy, 100);
  cv.drawContours(dst, contours, contourID1, color1, 1, cv.LINE_8, hierarchy, 100);
  cv.imshow(canvas, dst);
  src.delete();
  dst.delete();
  contours.delete();
  hierarchy.delete();
})();
