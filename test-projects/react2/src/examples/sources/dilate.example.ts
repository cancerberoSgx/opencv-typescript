// Ported from mirada-ts-playground's examples/toPack/dilate.ts, adapted to opencv-ts.
// A morphological dilation: expands bright regions, tending to close small dark gaps and
// thicken bright features.
export {};

(async () => {
  const canvas = document.getElementById("outputCanvas") as HTMLCanvasElement;
  const src = await fromUrl("assets/lenna.jpg");
  const dst = new cv.Mat();
  const kernel = cv.Mat.ones(5, 5, cv.CV_8U);
  const anchor = new cv.Point(-1, -1);
  cv.dilate(src, dst, kernel, anchor, 1, cv.BORDER_CONSTANT, cv.morphologyDefaultBorderValue());
  cv.imshow(canvas, dst);
  src.delete();
  dst.delete();
  kernel.delete();
})();
