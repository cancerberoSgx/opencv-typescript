// Ported from mirada-ts-playground's examples/toPack/faceDetection.ts, adapted to
// opencv-ts. Originally from the opencv.js tutorials: loads two Haar cascades (face, eye)
// and runs them against an image, drawing a rectangle around each detection. Exercises
// opencv-ts's hand-added `CascadeClassifier` and `cv.FS` (see opencv-ts/hacks/objdetect.d.ts
// and hacks/emscripten-fs.d.ts) - neither has a doxygen entry, so they can't be generated.
export {};

(async () => {
  const canvas = document.getElementById("outputCanvas") as HTMLCanvasElement;
  const src = await fromUrl("assets/lenna.jpg");
  const gray = new cv.Mat();
  cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY, 0);
  const faces = new cv.RectVector();
  const eyes = new cv.RectVector();
  const faceCascade = new cv.CascadeClassifier();
  const eyeCascade = new cv.CascadeClassifier();

  async function loadCascadeFile(url: string) {
    const name = url.substring(url.lastIndexOf("/") + 1);
    // Heads up! we need to verify the file doesn't already exist - cv.FS.createDataFile
    // throws if it does.
    if (!cv.FS.readdir("/").includes(name)) {
      const r = await fetch(url);
      cv.FS.createDataFile("/", name, new Uint8Array(await r.arrayBuffer()), true, false, false);
    }
    return name;
  }

  // Load the pre-trained classifier files from this app's public/assets/.
  faceCascade.load(await loadCascadeFile("assets/haarcascade_frontalface_default.xml"));
  eyeCascade.load(await loadCascadeFile("assets/haarcascade_eye.xml"));

  // detect faces
  const minSize = new cv.Size(0, 0);
  faceCascade.detectMultiScale(gray, faces, 1.1, 3, 0, minSize, minSize);
  for (let i = 0; i < faces.size(); ++i) {
    const face = faces.get(i);
    const roiGray = gray.roi(face);
    const roiSrc = src.roi(face);
    const point1 = new cv.Point(face.x, face.y);
    const point2 = new cv.Point(face.x + face.width, face.y + face.height);
    cv.rectangle(src, point1, point2, [255, 0, 0, 255]);
    // detect eyes in the face ROI
    eyeCascade.detectMultiScale(roiGray, eyes);
    for (let j = 0; j < eyes.size(); ++j) {
      const eye = eyes.get(j);
      const eyePoint1 = new cv.Point(eye.x, eye.y);
      const eyePoint2 = new cv.Point(eye.x + eye.width, eye.y + eye.height);
      cv.rectangle(roiSrc, eyePoint1, eyePoint2, [0, 0, 255, 255]);
    }
    roiGray.delete();
    roiSrc.delete();
  }
  cv.imshow(canvas, src);
  src.delete();
  gray.delete();
  faceCascade.delete();
  eyeCascade.delete();
  faces.delete();
  eyes.delete();
})();
