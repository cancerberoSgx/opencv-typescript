// Ported from mirada-ts-playground's examples/toPack/fft.ts, adapted to opencv-ts.
// Computes the 2D discrete Fourier transform of an image and displays its (log-scaled,
// quadrant-swapped) magnitude spectrum.
export {};

(async () => {
  const canvas = document.getElementById("outputCanvas") as HTMLCanvasElement;
  const src = await fromUrl("assets/lenna.jpg");
  cv.cvtColor(src, src, cv.COLOR_RGB2RGBA);
  cv.cvtColor(src, src, cv.COLOR_RGBA2GRAY, 0);

  // get optimal size of DFT
  const optimalRows = cv.getOptimalDFTSize(src.rows);
  const optimalCols = cv.getOptimalDFTSize(src.cols);
  // Not `cv.Scalar.all(0)`: opencv.js's own helpers.js implements it as `Scalar(v,v,v,v)`
  // (no `new`), which throws ("this.push is not a function") when called from strict-mode
  // code - which an ES module (what every example here runs as) always is.
  const s0 = new cv.Scalar(0, 0, 0, 0);
  const padded = new cv.Mat();
  cv.copyMakeBorder(src, padded, 0, optimalRows - src.rows, 0, optimalCols - src.cols, cv.BORDER_CONSTANT, s0);

  // Use cv.MatVector to distribute space for real part and imaginary part - merge/split's
  // multi-Mat side is `InputArrayOfArrays`/`OutputArrayOfArrays`, a real MatVector at
  // runtime, not a Mat (see contourFunctionsShape.example.ts's comment on the same thing).
  const plane0 = new cv.Mat();
  padded.convertTo(plane0, cv.CV_32F);
  const planes = new cv.MatVector();
  const complexI = new cv.Mat();
  const plane1 = cv.Mat.zeros(padded.rows, padded.cols, cv.CV_32F);
  planes.push_back(plane0);
  planes.push_back(plane1);
  cv.merge(planes, complexI);

  // in-place dft transform
  cv.dft(complexI, complexI);

  // compute log(1 + sqrt(Re(DFT(img))**2 + Im(DFT(img))**2))
  cv.split(complexI, planes);
  cv.magnitude(planes.get(0), planes.get(1), planes.get(0));
  let mag = planes.get(0);
  const m1 = cv.Mat.ones(mag.rows, mag.cols, mag.type());
  cv.add(mag, m1, mag);
  cv.log(mag, mag);

  // crop the spectrum, if it has an odd number of rows or columns
  const rect = new cv.Rect(0, 0, mag.cols & -2, mag.rows & -2);
  mag = mag.roi(rect);

  // rearrange the quadrants of the Fourier image so the origin is at the image center
  const cx = mag.cols / 2;
  const cy = mag.rows / 2;
  const tmp = new cv.Mat();

  const rect0 = new cv.Rect(0, 0, cx, cy);
  const rect1 = new cv.Rect(cx, 0, cx, cy);
  const rect2 = new cv.Rect(0, cy, cx, cy);
  const rect3 = new cv.Rect(cx, cy, cx, cy);

  const q0 = mag.roi(rect0);
  const q1 = mag.roi(rect1);
  const q2 = mag.roi(rect2);
  const q3 = mag.roi(rect3);

  // exchange quadrants 1 and 4
  q0.copyTo(tmp);
  q3.copyTo(q0);
  tmp.copyTo(q3);

  // exchange quadrants 2 and 3
  q1.copyTo(tmp);
  q2.copyTo(q1);
  tmp.copyTo(q2);

  cv.normalize(mag, mag, 0, 1, cv.NORM_MINMAX);
  const output = toRgba(mag);
  cv.imshow(canvas, output);
  src.delete();
  padded.delete();
  planes.delete();
  complexI.delete();
  m1.delete();
  tmp.delete();
  output.delete();
})();
