// Ported from mirada-ts-playground's examples/toPack/featuresEllipse.ts, adapted to
// opencv-ts. Finds the largest contour in a thresholded shape image and fits an ellipse to
// it. Uses `cv.ellipse1` - opencv.js's JS bindings only expose the output-param overload of
// `ellipse` under that "1"-suffixed name (see opencv-ts/hacks/mat.d.ts's comment on why).
export {};

(async () => {
  const canvas = document.getElementById("outputCanvas") as HTMLCanvasElement;
  const src = await fromUrl("assets/shape.jpg");
  const dst = cv.Mat.zeros(src.rows, src.cols, cv.CV_8UC3);
  cv.cvtColor(src, src, cv.COLOR_RGBA2GRAY, 0);
  cv.threshold(src, src, 177, 200, cv.THRESH_BINARY);
  const contours = new cv.MatVector();
  const hierarchy = new cv.Mat();
  cv.findContours(src, contours, hierarchy, cv.RETR_CCOMP, cv.CHAIN_APPROX_SIMPLE);
  const cnt = contours.get(0);
  const rotatedRect = cv.fitEllipse(cnt);
  const contoursColor = new cv.Scalar(255, 255, 255);
  const ellipseColor = new cv.Scalar(255, 0, 0);
  cv.drawContours(dst, contours, 0, contoursColor, 1, cv.LINE_8, hierarchy, 100);
  cv.ellipse1(dst, rotatedRect, ellipseColor, 1, cv.LINE_8);
  cv.imshow(canvas, dst);
  src.delete();
  dst.delete();
  contours.delete();
  hierarchy.delete();
  cnt.delete();
})();
