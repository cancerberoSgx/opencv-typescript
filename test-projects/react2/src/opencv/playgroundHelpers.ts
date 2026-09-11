import type { Mat } from "opencv-ts";

// The 13 examples under src/examples/sources/ were ported from mirada-ts-playground's
// src/examples/toPack/**, which leaned on a handful of small `mirada` runtime helpers
// (`Mirada.fromUrl`, `Mirada.loadDataFile`, `Mirada.toRgba`, `Mirada.CameraHelper`) on top
// of plain opencv.js calls. `opencv-ts` is types-only (see its README - "zero code"), so
// this module re-implements that small runtime surface against opencv-ts's typings, ported
// from mirada's own sources (see each function's doc comment for exactly where from).
// `installPlaygroundGlobals()` (called once from App.tsx after `cv` is ready) publishes them
// as globals - see src/editor/playgroundGlobals.d.ts for the matching ambient declarations
// Monaco is fed, so example code can call e.g. `fromUrl(...)` directly, exactly as it
// appears in the editor, with no import statement (matching opencv-ts's own ambient global
// `cv`, and how the original examples used `mirada`'s namespace import).

/**
 * Loads an image from a URL into a Mat, by drawing it to an offscreen canvas and running it
 * through `cv.imread`. Ported from mirada's `File.fromUrl(...).asMat()`
 * (src/file.ts + src/browser/imageCreation.ts#fetchImageData), collapsed into one step since
 * this playground never needs the intermediate `File` wrapper.
 */
export function fromUrl(url: string): Promise<Mat> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("2d canvas context unavailable"));
        return;
      }
      ctx.drawImage(img, 0, 0);
      try {
        resolve(cv.imread(canvas));
      } catch (err) {
        reject(err);
      }
    };
    img.onerror = () => reject(new Error(`Failed to load image from "${url}".`));
    img.src = url;
  });
}

/**
 * Fetches `url` and writes it into opencv.js's in-memory filesystem (`cv.FS`, see
 * `opencv-ts`'s `hacks/emscripten-fs.d.ts`) under `name` (defaulting to the URL's basename),
 * skipping the fetch if a file by that name already exists there - `cv.FS.createDataFile`
 * throws if called twice for the same path. Returns the name, ready to pass to e.g.
 * `CascadeClassifier#load` or `readNetFromCaffe`. Ported from mirada's
 * src/util/fileUtil.ts#loadDataFile.
 */
export async function loadDataFile(url: string, name?: string): Promise<string> {
  const fileName = name ?? url.substring(url.lastIndexOf("/") + 1);
  if (!cv.FS.readdir("/").includes(fileName)) {
    const response = await fetch(url);
    const buffer = await response.arrayBuffer();
    cv.FS.createDataFile("/", fileName, new Uint8Array(buffer), true, false, false);
  }
  return fileName;
}

/**
 * Returns a new image identical to `mat` (1, 3 or 4 channels) converted to 4-channel RGBA,
 * suitable for `cv.imshow`. Ported from mirada's src/util/imageUtil.ts#toRgba.
 */
export function toRgba(mat: Mat, dst = new cv.Mat()): Mat {
  const depth = mat.type() % 8;
  const scale = depth <= cv.CV_8S ? 1.0 : depth <= cv.CV_32S ? 1.0 / 256.0 : 255.0;
  const shift = depth === cv.CV_8S || depth === cv.CV_16S ? 128.0 : 0.0;
  mat.convertTo(dst, cv.CV_8U, scale, shift);
  switch (dst.type()) {
    case cv.CV_8UC1:
      cv.cvtColor(dst, dst, cv.COLOR_GRAY2RGBA);
      break;
    case cv.CV_8UC3:
      cv.cvtColor(dst, dst, cv.COLOR_RGB2RGBA);
      break;
    case cv.CV_8UC4:
      break;
    default:
      throw new Error("Bad number of channels (source image must have 1, 3 or 4 channels)");
  }
  return dst;
}

export function sleep(ms = 1000): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Starts/stops a `getUserMedia` camera stream into a `<video>`, sizing an output `<canvas>`
 * to match once it does, and re-invoking `callback` once streaming starts (the example is
 * then responsible for its own render loop, see e.g. examples/sources/videoDisplay.ts).
 * Ported from mirada's `src/browser/cameraHelper.ts#CameraHelper` (itself marked
 * `@deprecated` there in favor of a newer `VideoRenderer`, but it's what every ported
 * example here actually uses).
 */
export class CameraHelper {
  streaming = false;
  private stream: MediaStream | undefined;
  private onCameraStarted: (() => void) | undefined;

  constructor(
    public videoInput: HTMLVideoElement,
    public outputCanvas: HTMLCanvasElement,
    public callback: () => void
  ) {
    this.onVideoCanPlay = this.onVideoCanPlay.bind(this);
  }

  start(): void {
    if (this.streaming) return;
    navigator.mediaDevices
      .getUserMedia({ video: true, audio: false })
      .then((stream) => {
        this.videoInput.srcObject = stream;
        void this.videoInput.play();
        this.stream = stream;
        this.onCameraStarted = () => this.onVideoStarted();
        this.videoInput.addEventListener("canplay", this.onVideoCanPlay, false);
      })
      .catch((err: unknown) => console.error(err));
  }

  stop(): void {
    if (!this.streaming) return;
    this.stopCamera();
    this.onVideoStopped();
  }

  private stopCamera(): void {
    this.videoInput.pause();
    this.videoInput.srcObject = null;
    this.videoInput.removeEventListener("canplay", this.onVideoCanPlay);
    this.stream?.getVideoTracks().forEach((t) => t.stop());
  }

  private onVideoStarted(): void {
    this.streaming = true;
    this.outputCanvas.width = this.videoInput.videoWidth;
    this.outputCanvas.height = this.videoInput.videoHeight;
    this.callback();
  }

  private onVideoStopped(): void {
    this.streaming = false;
    this.outputCanvas.getContext("2d")?.clearRect(0, 0, this.outputCanvas.width, this.outputCanvas.height);
  }

  private onVideoCanPlay(): void {
    this.onCameraStarted?.();
  }
}

export function installPlaygroundGlobals(): void {
  Object.assign(window, { fromUrl, loadDataFile, toRgba, sleep, CameraHelper });
}
